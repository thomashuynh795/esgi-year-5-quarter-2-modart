use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Tag {
    pub id: Uuid,
    pub tag_uid: String,
    pub status: TagStatus,
    pub key_version: i32,
    pub last_counter: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum TagStatus {
    Provisioned,
    Active,
    Revoked,
}

impl Default for TagStatus {
    fn default() -> Self {
        Self::Provisioned
    }
}

impl ToString for TagStatus {
    fn to_string(&self) -> String {
        match self {
            TagStatus::Provisioned => "PROVISIONED".to_string(),
            TagStatus::Active => "ACTIVE".to_string(),
            TagStatus::Revoked => "REVOKED".to_string(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Item {
    pub id: Uuid,
    pub product_code: String,
    pub size: Option<String>,
    pub color: Option<String>,
    pub tag_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ScanEvent {
    pub id: Uuid,
    pub tag_id: Option<Uuid>,
    pub token_id: Option<Uuid>,
    pub product_public_id: Option<String>,
    pub received_counter: Option<i64>,
    pub result: String,
    pub ip: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ScanVerdict {
    Valid,
    InvalidSignature,
    ReplayDetected,
    TagRevoked,
    TagNotFound,
}

impl ToString for ScanVerdict {
    fn to_string(&self) -> String {
        match self {
            ScanVerdict::Valid => "VALID".to_string(),
            ScanVerdict::InvalidSignature => "INVALID_SIGNATURE".to_string(),
            ScanVerdict::ReplayDetected => "REPLAY_DETECTED".to_string(),
            ScanVerdict::TagRevoked => "TAG_REVOKED".to_string(),
            ScanVerdict::TagNotFound => "TAG_NOT_FOUND".to_string(),
        }
    }
}
