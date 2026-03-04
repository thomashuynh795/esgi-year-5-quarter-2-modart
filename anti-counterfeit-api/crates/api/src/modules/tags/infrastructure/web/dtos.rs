use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

#[derive(Deserialize)]
pub struct CreateTagRequest {
    pub tag_uid: String,
    pub product_code: String,
    pub size: Option<String>,
    pub color: Option<String>,
}

#[derive(Serialize)]
pub struct CreateTagResponse {
    pub tag_id: Uuid,
    pub item_id: Uuid,
    pub initial_key_version: i32,
    pub message: String,
}

#[derive(Deserialize)]
pub struct VerifyTagRequest {
    pub tag_uid: String,
    pub counter: i64,
    pub cmac: String,
}

#[derive(Serialize)]
pub struct VerifyTagResponse {
    pub verdict: String,
    pub product: Option<ProductDto>,
}

#[derive(Serialize)]
pub struct ProductDto {
    pub tag_id: Uuid,
}

#[derive(Serialize)]
pub struct RotateKeyResponse {
    pub new_key_version: i32,
    pub message: String,
}
