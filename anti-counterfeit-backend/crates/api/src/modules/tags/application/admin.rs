use crate::app::error::AppError;
use crate::modules::scan_tokens::application::ports::ScanTokenRepository;
use crate::modules::tags::application::ports::{
    AuditEventRepository, CryptoService, ItemRepository, TagRepository,
};
use crate::modules::tags::application::provision::{
    EnrollTagUseCase, GeneratedBatch, OneTimeTokenRecord, build_dynamic_message,
};
use crate::modules::tags::domain::entities::{AuditEvent, TagMode, TagStatus};
use chrono::Utc;
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

pub struct RevokeTagUseCase {
    tag_repo: Arc<dyn TagRepository>,
    audit_repo: Arc<dyn AuditEventRepository>,
}

impl RevokeTagUseCase {
    pub fn new(
        tag_repo: Arc<dyn TagRepository>,
        audit_repo: Arc<dyn AuditEventRepository>,
    ) -> Self {
        Self {
            tag_repo,
            audit_repo,
        }
    }

    pub async fn execute(&self, tag_id: Uuid) -> Result<(), AppError> {
        let tag = self
            .tag_repo
            .find_by_id(tag_id)
            .await?
            .ok_or(AppError::TagNotFound)?;

        if tag.status == TagStatus::Revoked {
            return Ok(());
        }

        self.tag_repo.revoke(tag_id).await?;
        self.audit_repo
            .save(&AuditEvent {
                id: Uuid::new_v4(),
                tag_id: Some(tag_id),
                event_type: "TAG_REVOKED".to_string(),
                metadata: None,
                created_at: Utc::now(),
            })
            .await?;

        Ok(())
    }
}

pub struct RotateKeyUseCase {
    tag_repo: Arc<dyn TagRepository>,
    audit_repo: Arc<dyn AuditEventRepository>,
}

impl RotateKeyUseCase {
    pub fn new(
        tag_repo: Arc<dyn TagRepository>,
        audit_repo: Arc<dyn AuditEventRepository>,
    ) -> Self {
        Self {
            tag_repo,
            audit_repo,
        }
    }

    pub async fn execute(&self, tag_id: Uuid) -> Result<i32, AppError> {
        let tag = self
            .tag_repo
            .find_by_id(tag_id)
            .await?
            .ok_or(AppError::TagNotFound)?;

        if tag.status == TagStatus::Revoked {
            return Err(AppError::TagRevoked);
        }

        if tag.mode != TagMode::DynamicCmac {
            return Err(AppError::UnsupportedTagMode);
        }

        let new_version = tag.key_version + 1;
        self.tag_repo.rotate_key(tag_id, new_version, true).await?;
        self.audit_repo
            .save(&AuditEvent {
                id: Uuid::new_v4(),
                tag_id: Some(tag_id),
                event_type: "TAG_KEY_ROTATED".to_string(),
                metadata: Some(json!({ "key_version": new_version }).to_string()),
                created_at: Utc::now(),
            })
            .await?;

        Ok(new_version)
    }
}

pub struct ReconfigureTagUseCase {
    tag_repo: Arc<dyn TagRepository>,
    item_repo: Arc<dyn ItemRepository>,
    audit_repo: Arc<dyn AuditEventRepository>,
    enroll_usecase: Arc<EnrollTagUseCase>,
    scan_token_repo: Arc<dyn ScanTokenRepository>,
}

pub struct ReconfigureTagRequest {
    pub tag_id: Uuid,
    pub reset_counter: bool,
    pub rotate_key: bool,
    pub revoke_existing_batch: bool,
    pub token_count: Option<u32>,
    pub ttl_seconds: Option<i64>,
}

pub struct ReconfigureTagResponse {
    pub tag_id: Uuid,
    pub mode: TagMode,
    pub payload: ReconfigurePayload,
}

pub enum ReconfigurePayload {
    DynamicCmac {
        key_version: i32,
        counter_initial: i64,
    },
    OneTimeTokens {
        revoked_batches: u64,
        batch_id: Uuid,
        records: Vec<OneTimeTokenRecord>,
    },
}

impl ReconfigureTagUseCase {
    pub fn new(
        tag_repo: Arc<dyn TagRepository>,
        item_repo: Arc<dyn ItemRepository>,
        audit_repo: Arc<dyn AuditEventRepository>,
        enroll_usecase: Arc<EnrollTagUseCase>,
        scan_token_repo: Arc<dyn ScanTokenRepository>,
    ) -> Self {
        Self {
            tag_repo,
            item_repo,
            audit_repo,
            enroll_usecase,
            scan_token_repo,
        }
    }

    pub async fn execute(
        &self,
        request: ReconfigureTagRequest,
    ) -> Result<ReconfigureTagResponse, AppError> {
        let tag = self
            .tag_repo
            .find_by_id(request.tag_id)
            .await?
            .ok_or(AppError::TagNotFound)?;

        if tag.status == TagStatus::Revoked {
            return Err(AppError::TagRevoked);
        }

        let item = self
            .item_repo
            .find_by_tag_id(tag.id)
            .await?
            .ok_or(AppError::ProductNotFound)?;

        let now = Utc::now();
        let payload = match tag.mode {
            TagMode::DynamicCmac => {
                let mut key_version = tag.key_version;
                if request.rotate_key {
                    key_version += 1;
                    self.tag_repo.rotate_key(tag.id, key_version, true).await?;
                } else if request.reset_counter {
                    self.tag_repo.reset_counter(tag.id).await?;
                }

                ReconfigurePayload::DynamicCmac {
                    key_version,
                    counter_initial: 0,
                }
            }
            TagMode::OneTimeTokens => {
                let revoked_batches = if request.revoke_existing_batch {
                    self.scan_token_repo
                        .revoke_active_batch_for_tag(tag.id, now)
                        .await?
                } else {
                    0
                };
                let GeneratedBatch { batch_id, records } = self
                    .enroll_usecase
                    .generate_token_batch(
                        tag.id,
                        &item.product_code,
                        request.token_count.unwrap_or(3),
                        request.ttl_seconds.unwrap_or(86_400),
                    )
                    .await?;

                ReconfigurePayload::OneTimeTokens {
                    revoked_batches,
                    batch_id,
                    records,
                }
            }
        };

        self.audit_repo
            .save(&AuditEvent {
                id: Uuid::new_v4(),
                tag_id: Some(tag.id),
                event_type: "TAG_RECONFIGURED".to_string(),
                metadata: Some(
                    json!({
                        "mode": tag.mode.as_str(),
                        "reset_counter": request.reset_counter,
                        "rotate_key": request.rotate_key,
                        "revoke_existing_batch": request.revoke_existing_batch,
                    })
                    .to_string(),
                ),
                created_at: now,
            })
            .await?;

        Ok(ReconfigureTagResponse {
            tag_id: tag.id,
            mode: tag.mode,
            payload,
        })
    }
}

pub struct RevokeScanTokenUseCase {
    scan_token_repo: Arc<dyn ScanTokenRepository>,
}

impl RevokeScanTokenUseCase {
    pub fn new(scan_token_repo: Arc<dyn ScanTokenRepository>) -> Self {
        Self { scan_token_repo }
    }

    pub async fn execute(&self, token_id: Uuid) -> Result<(), AppError> {
        let revoked = self.scan_token_repo.revoke(token_id, Utc::now()).await?;
        if revoked {
            Ok(())
        } else {
            Err(AppError::ScanTokenNotFound)
        }
    }
}

pub struct NextMessagesUseCase {
    tag_repo: Arc<dyn TagRepository>,
    crypto_service: Arc<dyn CryptoService>,
}

pub struct NextMessagesRequest {
    pub tag_id: Uuid,
    pub count: u32,
    pub starting_counter: Option<i64>,
}

pub struct NextMessagesResponse {
    pub tag_id: Uuid,
    pub tag_uid: String,
    pub key_version: i32,
    pub messages: Vec<GeneratedMessage>,
}

pub struct GeneratedMessage {
    pub counter: i64,
    pub cmac: String,
}

impl NextMessagesUseCase {
    pub fn new(tag_repo: Arc<dyn TagRepository>, crypto_service: Arc<dyn CryptoService>) -> Self {
        Self {
            tag_repo,
            crypto_service,
        }
    }

    pub async fn execute(
        &self,
        request: NextMessagesRequest,
    ) -> Result<NextMessagesResponse, AppError> {
        if request.count == 0 || request.count > 50 {
            return Err(AppError::Validation(
                "count must be between 1 and 50".to_string(),
            ));
        }

        let tag = self
            .tag_repo
            .find_by_id(request.tag_id)
            .await?
            .ok_or(AppError::TagNotFound)?;

        if tag.status == TagStatus::Revoked {
            return Err(AppError::TagRevoked);
        }

        if tag.mode != TagMode::DynamicCmac {
            return Err(AppError::UnsupportedTagMode);
        }

        let start = request
            .starting_counter
            .unwrap_or_else(|| tag.last_counter.unwrap_or(0) + 1);
        if start <= 0 {
            return Err(AppError::Validation(
                "starting_counter must be greater than 0".to_string(),
            ));
        }

        let mut messages = Vec::with_capacity(request.count as usize);
        for offset in 0..request.count {
            let counter = start + i64::from(offset);
            let message = build_dynamic_message(&tag.tag_uid, counter)?;
            let cmac = self
                .crypto_service
                .generate_cmac(tag.key_version, &tag.tag_uid, &message)
                .await?;
            messages.push(GeneratedMessage {
                counter,
                cmac: hex::encode_upper(cmac),
            });
        }

        Ok(NextMessagesResponse {
            tag_id: tag.id,
            tag_uid: tag.tag_uid,
            key_version: tag.key_version,
            messages,
        })
    }
}
