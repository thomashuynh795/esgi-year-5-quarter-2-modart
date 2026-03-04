use crate::app::error::AppError;
use crate::modules::tags::application::ports::{CryptoService, ItemRepository, TagRepository};
use crate::modules::tags::domain::entities::{Item, Tag, TagStatus};
use chrono::Utc;
use std::sync::Arc;
use uuid::Uuid;

pub struct ProvisionTagUseCase {
    tag_repo: Arc<dyn TagRepository>,
    item_repo: Arc<dyn ItemRepository>,
    crypto_service: Arc<dyn CryptoService>,
}

pub struct ProvisionRequest {
    pub tag_uid: String,
    pub product_code: String,
    pub size: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug)]
pub struct ProvisionResponse {
    pub tag_id: Uuid,
    pub item_id: Uuid,
    pub initial_key_version: i32,
}

impl ProvisionTagUseCase {
    pub fn new(
        tag_repo: Arc<dyn TagRepository>,
        item_repo: Arc<dyn ItemRepository>,
        crypto_service: Arc<dyn CryptoService>,
    ) -> Self {
        Self {
            tag_repo,
            item_repo,
            crypto_service,
        }
    }

    pub async fn execute(&self, req: ProvisionRequest) -> Result<ProvisionResponse, AppError> {
        // Validation
        if req.tag_uid.is_empty() || !req.tag_uid.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(AppError::Validation(
                "Tag UID must be a valid hex string".to_string(),
            ));
        }

        if req.product_code.is_empty() {
            return Err(AppError::Validation(
                "Product code cannot be empty".to_string(),
            ));
        }

        if let Some(_) = self.tag_repo.find_by_uid(&req.tag_uid).await? {
            return Err(AppError::TagAlreadyExists);
        }

        let (key_version, _master_key_id) = self.crypto_service.generate_keys().await?;

        let tag_id = Uuid::new_v4();
        let tag = Tag {
            id: tag_id,
            tag_uid: req.tag_uid,
            status: TagStatus::Provisioned,
            key_version,
            last_counter: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        self.tag_repo.save(&tag).await?;

        let item_id = Uuid::new_v4();
        let item = Item {
            id: item_id,
            product_code: req.product_code,
            size: req.size,
            color: req.color,
            tag_id,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        self.item_repo.save(&item).await?;

        Ok(ProvisionResponse {
            tag_id,
            item_id,
            initial_key_version: key_version,
        })
    }
}
