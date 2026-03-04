use anyhow::{Context, Result};

pub struct Config {
    pub address: String,
    pub database_url: String,
    pub api_domain: String,
    pub scan_token_secret: String,
    pub admin_api_key: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let address = std::env::var("ADDRESS").unwrap_or_else(|_| "0.0.0.0:3000".into());
        let database_url =
            std::env::var("DATABASE_URL").context("DATABASE_URL is required in the root .env")?;
        let api_domain = std::env::var("API_DOMAIN").unwrap_or_else(|_| "localhost:3000".into());
        let scan_token_secret = std::env::var("HMAC_SECRET")
            .or_else(|_| std::env::var("SCAN_TOKEN_SECRET"))
            .context("HMAC_SECRET or SCAN_TOKEN_SECRET is required in the root .env")?;
        let admin_api_key =
            std::env::var("ADMIN_API_KEY").context("ADMIN_API_KEY is required in the root .env")?;

        Ok(Self {
            address,
            database_url,
            api_domain,
            scan_token_secret,
            admin_api_key,
        })
    }

    pub fn scan_base_url(&self) -> String {
        if self.api_domain.starts_with("http://") || self.api_domain.starts_with("https://") {
            self.api_domain.trim_end_matches('/').to_string()
        } else {
            format!("https://{}", self.api_domain.trim_end_matches('/'))
        }
    }
}
