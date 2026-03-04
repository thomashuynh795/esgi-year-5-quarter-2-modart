use crate::app::error::AppError;
use crate::modules::tags::application::ports::{
    ItemRepository, ScanEventRepository, TagRepository,
};
use crate::modules::tags::domain::entities::{Item, ScanEvent, Tag, TagStatus};
use async_trait::async_trait;
use database_model::{item, scan_event, tag};
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use std::sync::Arc;
use uuid::Uuid;

impl From<tag::Model> for Tag {
    fn from(model: tag::Model) -> Self {
        Tag {
            id: model.id,
            tag_uid: model.tag_uid,
            status: match model.status.as_str() {
                "PROVISIONED" => TagStatus::Provisioned,
                "ACTIVE" => TagStatus::Active,
                "REVOKED" => TagStatus::Revoked,
                _ => TagStatus::Provisioned,
            },
            key_version: model.key_version,
            last_counter: model.last_counter,
            created_at: model.created_at.into(),
            updated_at: model.updated_at.into(),
        }
    }
}

impl From<item::Model> for Item {
    fn from(model: item::Model) -> Self {
        Item {
            id: model.id,
            product_code: model.product_code,
            size: model.size,
            color: model.color,
            tag_id: model.tag_id,
            created_at: model.created_at.into(),
            updated_at: model.updated_at.into(),
        }
    }
}

pub struct SeaOrmTagRepository {
    db: Arc<DatabaseConnection>,
}

impl SeaOrmTagRepository {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }
}

#[async_trait]
impl TagRepository for SeaOrmTagRepository {
    async fn save(&self, tag: &Tag) -> Result<Tag, AppError> {
        let active_model = tag::ActiveModel {
            id: Set(tag.id),
            tag_uid: Set(tag.tag_uid.clone()),
            status: Set(tag.status.to_string()),
            key_version: Set(tag.key_version),
            last_counter: Set(tag.last_counter),
            created_at: Set(tag.created_at.into()),
            updated_at: Set(tag.updated_at.into()),
        };

        let res = tag::Entity::insert(active_model)
            .exec_with_returning(&*self.db)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(Tag::from(res))
    }

    async fn find_by_uid(&self, tag_uid: &str) -> Result<Option<Tag>, AppError> {
        let res = tag::Entity::find()
            .filter(tag::Column::TagUid.eq(tag_uid))
            .one(&*self.db)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(res.map(Tag::from))
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Tag>, AppError> {
        let res = tag::Entity::find_by_id(id)
            .one(&*self.db)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(res.map(Tag::from))
    }

    async fn update_counter(&self, tag_id: Uuid, new_counter: i64) -> Result<(), AppError> {
        let mut active: tag::ActiveModel = tag::ActiveModel {
            id: Set(tag_id),
            ..Default::default()
        };
        active.last_counter = Set(Some(new_counter));
        active.updated_at = Set(chrono::Utc::now().into());

        active
            .update(&*self.db)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(())
    }

    async fn revoke(&self, tag_id: Uuid) -> Result<(), AppError> {
        let mut active: tag::ActiveModel = tag::ActiveModel {
            id: Set(tag_id),
            ..Default::default()
        };
        active.status = Set("REVOKED".to_string());
        active.updated_at = Set(chrono::Utc::now().into());

        active
            .update(&*self.db)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(())
    }

    async fn rotate_key(&self, tag_id: Uuid, new_version: i32) -> Result<(), AppError> {
        let mut active: tag::ActiveModel = tag::ActiveModel {
            id: Set(tag_id),
            ..Default::default()
        };
        active.key_version = Set(new_version);
        active.updated_at = Set(chrono::Utc::now().into());

        active
            .update(&*self.db)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(())
    }
}

pub struct SeaOrmItemRepository {
    db: Arc<DatabaseConnection>,
}

impl SeaOrmItemRepository {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }
}

#[async_trait]
impl ItemRepository for SeaOrmItemRepository {
    async fn save(&self, item: &Item) -> Result<Item, AppError> {
        let active_model = item::ActiveModel {
            id: Set(item.id),
            product_code: Set(item.product_code.clone()),
            size: Set(item.size.clone()),
            color: Set(item.color.clone()),
            tag_id: Set(item.tag_id),
            created_at: Set(item.created_at.into()),
            updated_at: Set(item.updated_at.into()),
        };

        let res = item::Entity::insert(active_model)
            .exec_with_returning(&*self.db)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(Item::from(res))
    }

    async fn find_by_tag_id(&self, tag_id: Uuid) -> Result<Option<Item>, AppError> {
        let res = item::Entity::find()
            .filter(item::Column::TagId.eq(tag_id))
            .one(&*self.db)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(res.map(Item::from))
    }

    async fn exists_by_product_code(&self, product_code: &str) -> Result<bool, AppError> {
        let result = item::Entity::find()
            .filter(item::Column::ProductCode.eq(product_code))
            .one(&*self.db)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(result.is_some())
    }
}

pub struct SeaOrmScanEventRepository {
    db: Arc<DatabaseConnection>,
}

impl SeaOrmScanEventRepository {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }
}

#[async_trait]
impl ScanEventRepository for SeaOrmScanEventRepository {
    async fn save(&self, event: &ScanEvent) -> Result<ScanEvent, AppError> {
        let active_model = scan_event::ActiveModel {
            id: Set(event.id),
            tag_id: Set(event.tag_id),
            token_id: Set(event.token_id),
            product_public_id: Set(event.product_public_id.clone()),
            received_counter: Set(event.received_counter),
            result: Set(event.result.clone()),
            ip: Set(event.ip.clone()),
            user_agent: Set(event.user_agent.clone()),
            scanned_at: Set(event.created_at.into()),
        };

        let _res = scan_event::Entity::insert(active_model)
            .exec_with_returning(&*self.db)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(event.clone())
    }
}
