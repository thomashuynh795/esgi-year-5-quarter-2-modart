use crate::app::error::AppError;
use crate::modules::tags::application::ports::TagRepository;
use crate::modules::tags::domain::entities::TagStatus;
use std::sync::Arc;
use uuid::Uuid;

pub struct RevokeTagUseCase {
    tag_repo: Arc<dyn TagRepository>,
}

impl RevokeTagUseCase {
    pub fn new(tag_repo: Arc<dyn TagRepository>) -> Self {
        Self { tag_repo }
    }

    pub async fn execute(&self, tag_id: Uuid) -> Result<(), AppError> {
        let tag = self
            .tag_repo
            .find_by_id(tag_id)
            .await?
            .ok_or(AppError::TagNotFound)?;

        // If already revoked, maybe idempotent ok? Or error?
        // Let's make it idempotent.
        if tag.status == TagStatus::Revoked {
            return Ok(());
        }

        self.tag_repo.revoke(tag_id).await
    }
}

pub struct RotateKeyUseCase {
    tag_repo: Arc<dyn TagRepository>,
}

impl RotateKeyUseCase {
    pub fn new(tag_repo: Arc<dyn TagRepository>) -> Self {
        Self { tag_repo }
    }

    pub async fn execute(&self, tag_id: Uuid) -> Result<i32, AppError> {
        let tag = self
            .tag_repo
            .find_by_id(tag_id)
            .await?
            .ok_or(AppError::TagNotFound)?;

        if tag.status == TagStatus::Revoked {
            return Err(AppError::Validation(
                "Cannot rotate key of a revoked tag".to_string(),
            ));
        }

        let new_version = tag.key_version + 1;
        self.tag_repo.rotate_key(tag_id, new_version).await?;

        Ok(new_version)
    }
}
