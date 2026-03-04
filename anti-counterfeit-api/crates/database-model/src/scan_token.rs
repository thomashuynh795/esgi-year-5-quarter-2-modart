use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "scan_tokens")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub token_id: Uuid,

    pub product_public_id: String,

    pub expires_at: DateTimeWithTimeZone,

    pub status: String,

    pub created_at: DateTimeWithTimeZone,

    pub used_at: Option<DateTimeWithTimeZone>,

    pub used_ip: Option<String>,

    pub used_user_agent: Option<String>,

    pub token_hash: Option<Vec<u8>>,
}

#[derive(Copy, Clone, Debug, EnumIter)]
pub enum Relation {
    ScanEvents,
}

impl RelationTrait for Relation {
    fn def(&self) -> RelationDef {
        match self {
            Self::ScanEvents => Entity::has_many(super::scan_event::Entity).into(),
        }
    }
}

impl ActiveModelBehavior for ActiveModel {}
