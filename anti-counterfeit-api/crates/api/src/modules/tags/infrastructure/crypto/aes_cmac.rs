use crate::app::error::AppError;
use crate::modules::tags::application::ports::CryptoService;
use aes::Aes128;
use async_trait::async_trait;
use cmac::{Cmac, Mac};
use std::env;

pub struct AesCmacService {
    master_key: Vec<u8>,
    current_version: i32,
}

impl AesCmacService {
    pub fn new() -> Result<Self, AppError> {
        let key_hex = env::var("MASTER_KEY_HEX")
            .unwrap_or_else(|_| "000102030405060708090a0b0c0d0e0f".to_string());
        let master_key = hex::decode(&key_hex)
            .map_err(|error| AppError::Internal(format!("Invalid MASTER_KEY_HEX: {error}")))?;

        Ok(Self {
            master_key,
            current_version: 1,
        })
    }

    fn derive_key(&self, version: i32, tag_uid: &str) -> Result<Vec<u8>, AppError> {
        let mut mac = Cmac::<Aes128>::new_from_slice(&self.master_key)
            .map_err(|e| AppError::Internal(format!("Key init error: {}", e)))?;

        mac.update(tag_uid.as_bytes());
        mac.update(&version.to_be_bytes());

        let result = mac.finalize();
        Ok(result.into_bytes().to_vec())
    }
}

#[async_trait]
impl CryptoService for AesCmacService {
    async fn verify_cmac(
        &self,
        key_version: i32,
        tag_uid: &str,
        message: &[u8],
        signature: &[u8],
    ) -> Result<bool, AppError> {
        let derived_key = self.derive_key(key_version, tag_uid)?;

        let mut mac = Cmac::<Aes128>::new_from_slice(&derived_key)
            .map_err(|e| AppError::Internal(format!("Derived key init error: {}", e)))?;

        mac.update(message);

        Ok(mac.verify_slice(signature).is_ok())
    }

    async fn generate_keys(&self) -> Result<(i32, String), AppError> {
        Ok((
            self.current_version,
            "master-key-id-placeholder".to_string(),
        ))
    }
}
