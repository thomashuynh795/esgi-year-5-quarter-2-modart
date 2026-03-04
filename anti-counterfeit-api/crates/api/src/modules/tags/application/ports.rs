use crate::app::error::AppError;
use crate::modules::tags::domain::entities::{Item, ScanEvent, Tag};
use uuid::Uuid;

#[async_trait::async_trait]
pub trait TagRepository: Send + Sync {
    async fn save(&self, tag: &Tag) -> Result<Tag, AppError>;
    async fn find_by_uid(&self, tag_uid: &str) -> Result<Option<Tag>, AppError>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Tag>, AppError>;
    async fn update_counter(&self, tag_id: Uuid, new_counter: i64) -> Result<(), AppError>;
    async fn revoke(&self, tag_id: Uuid) -> Result<(), AppError>;
    async fn rotate_key(&self, tag_id: Uuid, new_version: i32) -> Result<(), AppError>;
}

#[async_trait::async_trait]
pub trait ItemRepository: Send + Sync {
    async fn save(&self, item: &Item) -> Result<Item, AppError>;
    async fn find_by_tag_id(&self, tag_id: Uuid) -> Result<Option<Item>, AppError>;
    async fn exists_by_product_code(&self, product_code: &str) -> Result<bool, AppError>;
}

#[async_trait::async_trait]
pub trait ScanEventRepository: Send + Sync {
    async fn save(&self, event: &ScanEvent) -> Result<ScanEvent, AppError>;
}

#[async_trait::async_trait]
pub trait CryptoService: Send + Sync {
    async fn verify_cmac(
        &self,
        key_version: i32,
        tag_uid: &str,
        message: &[u8],
        signature: &[u8],
    ) -> Result<bool, AppError>;

    async fn generate_keys(&self) -> Result<(i32, String), AppError>;
}
