use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ScanToken {
    pub token_id: Uuid,
    pub product_public_id: String,
    pub expires_at: DateTime<Utc>,
    pub status: ScanTokenStatus,
    pub created_at: DateTime<Utc>,
    pub used_at: Option<DateTime<Utc>>,
    pub used_ip: Option<String>,
    pub used_user_agent: Option<String>,
    pub token_hash: Option<Vec<u8>>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ScanTokenStatus {
    Unused,
    Used,
    Revoked,
}

impl ToString for ScanTokenStatus {
    fn to_string(&self) -> String {
        match self {
            ScanTokenStatus::Unused => "UNUSED".to_string(),
            ScanTokenStatus::Used => "USED".to_string(),
            ScanTokenStatus::Revoked => "REVOKED".to_string(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum StaticScanResult {
    Ok,
    Replay,
    Invalid,
    Expired,
    Revoked,
    NotFound,
}

impl ToString for StaticScanResult {
    fn to_string(&self) -> String {
        match self {
            StaticScanResult::Ok => "OK".to_string(),
            StaticScanResult::Replay => "REPLAY".to_string(),
            StaticScanResult::Invalid => "INVALID".to_string(),
            StaticScanResult::Expired => "EXPIRED".to_string(),
            StaticScanResult::Revoked => "REVOKED".to_string(),
            StaticScanResult::NotFound => "NOT_FOUND".to_string(),
        }
    }
}
