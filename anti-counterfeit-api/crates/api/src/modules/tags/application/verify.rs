use crate::app::error::AppError;
use crate::modules::tags::application::ports::{CryptoService, ScanEventRepository, TagRepository};
use crate::modules::tags::domain::entities::{ScanEvent, ScanVerdict, TagStatus};
use chrono::Utc;
use std::sync::Arc;
use uuid::Uuid;

pub struct VerifyTagUseCase {
    tag_repo: Arc<dyn TagRepository>,
    scan_repo: Arc<dyn ScanEventRepository>,
    crypto_service: Arc<dyn CryptoService>,
}

pub struct VerifyRequest {
    pub tag_uid: String,
    pub counter: i64,
    pub cmac: String,
}

#[derive(Debug)]
pub struct VerifyResponse {
    pub verdict: ScanVerdict,
    pub product_info: Option<ProductInfo>,
}

#[derive(Debug, Clone)]
pub struct ProductInfo {
    pub tag_id: Uuid,
}

impl VerifyTagUseCase {
    pub fn new(
        tag_repo: Arc<dyn TagRepository>,
        scan_repo: Arc<dyn ScanEventRepository>,
        crypto_service: Arc<dyn CryptoService>,
    ) -> Self {
        Self {
            tag_repo,
            scan_repo,
            crypto_service,
        }
    }

    pub async fn execute(&self, req: VerifyRequest) -> Result<VerifyResponse, AppError> {
        let tag_opt = self.tag_repo.find_by_uid(&req.tag_uid).await?;

        let mut verdict = ScanVerdict::Valid;
        let mut tag_found = None;

        if let Some(tag) = tag_opt {
            tag_found = Some(tag.clone());

            if tag.status == TagStatus::Revoked {
                verdict = ScanVerdict::TagRevoked;
            } else {
                let last_counter = tag.last_counter.unwrap_or(0);
                // Strict greater than
                if req.counter <= last_counter {
                    verdict = ScanVerdict::ReplayDetected;
                } else {
                    let sig_bytes = hex::decode(&req.cmac).unwrap_or_default();
                    if sig_bytes.is_empty() {
                        verdict = ScanVerdict::InvalidSignature;
                    } else {
                        let message = format!("{}:{}", req.tag_uid, req.counter).into_bytes();

                        let valid_sig = self
                            .crypto_service
                            .verify_cmac(tag.key_version, &req.tag_uid, &message, &sig_bytes)
                            .await?;

                        if !valid_sig {
                            verdict = ScanVerdict::InvalidSignature;
                        }
                    }
                }
            }
        } else {
            verdict = ScanVerdict::TagNotFound;
        }

        // Only update counter if VALID
        if verdict == ScanVerdict::Valid {
            if let Some(t) = &tag_found {
                self.tag_repo.update_counter(t.id, req.counter).await?;
            }
        }

        let event = ScanEvent {
            id: Uuid::new_v4(),
            tag_id: tag_found.as_ref().map(|t| t.id),
            token_id: None,
            product_public_id: None,
            received_counter: Some(req.counter),
            result: verdict.to_string(),
            ip: None,
            user_agent: None,
            created_at: Utc::now(),
        };
        self.scan_repo.save(&event).await?;

        Ok(VerifyResponse {
            verdict,
            product_info: tag_found.map(|t| ProductInfo { tag_id: t.id }),
        })
    }
}
