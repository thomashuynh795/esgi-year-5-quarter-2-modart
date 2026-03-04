use thiserror::Error;

#[derive(Debug, Error, Clone, PartialEq, Eq)]
pub enum AppError {
    #[error("Tag not found")]
    TagNotFound,
    #[error("Product not found")]
    ProductNotFound,
    #[error("Tag already exists")]
    TagAlreadyExists,
    #[error("Invalid key version")]
    InvalidKeyVersion,
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Internal error: {0}")]
    Internal(String),
}
