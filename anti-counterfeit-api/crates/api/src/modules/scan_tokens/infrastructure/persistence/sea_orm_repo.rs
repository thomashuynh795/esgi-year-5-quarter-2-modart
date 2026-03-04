use crate::app::error::AppError;
use crate::modules::scan_tokens::application::ports::ScanTokenRepository;
use crate::modules::scan_tokens::domain::entities::{ScanToken, ScanTokenStatus};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use database_model::scan_token;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use std::sync::Arc;
use uuid::Uuid;

impl From<scan_token::Model> for ScanToken {
    fn from(model: scan_token::Model) -> Self {
        ScanToken {
            token_id: model.token_id,
            product_public_id: model.product_public_id,
            expires_at: model.expires_at.into(),
            status: match model.status.as_str() {
                "USED" => ScanTokenStatus::Used,
                "REVOKED" => ScanTokenStatus::Revoked,
                _ => ScanTokenStatus::Unused,
            },
            created_at: model.created_at.into(),
            used_at: model.used_at.map(Into::into),
            used_ip: model.used_ip,
            used_user_agent: model.used_user_agent,
            token_hash: model.token_hash,
        }
    }
}

pub struct SeaOrmScanTokenRepository {
    db: Arc<DatabaseConnection>,
}

impl SeaOrmScanTokenRepository {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }
}

#[async_trait]
impl ScanTokenRepository for SeaOrmScanTokenRepository {
    async fn save_many(&self, tokens: &[ScanToken]) -> Result<(), AppError> {
        if tokens.is_empty() {
            return Ok(());
        }

        let active_models = tokens.iter().map(|token| scan_token::ActiveModel {
            token_id: Set(token.token_id),
            product_public_id: Set(token.product_public_id.clone()),
            expires_at: Set(token.expires_at.into()),
            status: Set(token.status.to_string()),
            created_at: Set(token.created_at.into()),
            used_at: Set(token.used_at.map(Into::into)),
            used_ip: Set(token.used_ip.clone()),
            used_user_agent: Set(token.used_user_agent.clone()),
            token_hash: Set(token.token_hash.clone()),
        });

        scan_token::Entity::insert_many(active_models)
            .exec(&*self.db)
            .await
            .map_err(|error| AppError::Internal(error.to_string()))?;

        Ok(())
    }

    async fn find_by_id(&self, token_id: Uuid) -> Result<Option<ScanToken>, AppError> {
        let result = scan_token::Entity::find_by_id(token_id)
            .one(&*self.db)
            .await
            .map_err(|error| AppError::Internal(error.to_string()))?;

        Ok(result.map(ScanToken::from))
    }

    async fn consume_if_unused(
        &self,
        token_id: Uuid,
        used_at: DateTime<Utc>,
        used_ip: Option<String>,
        used_user_agent: Option<String>,
    ) -> Result<bool, AppError> {
        let result = scan_token::Entity::update_many()
            .col_expr(
                scan_token::Column::Status,
                sea_orm::sea_query::Expr::value("USED".to_string()),
            )
            .col_expr(
                scan_token::Column::UsedAt,
                sea_orm::sea_query::Expr::value(used_at),
            )
            .col_expr(
                scan_token::Column::UsedIp,
                sea_orm::sea_query::Expr::value(used_ip),
            )
            .col_expr(
                scan_token::Column::UsedUserAgent,
                sea_orm::sea_query::Expr::value(used_user_agent),
            )
            .filter(scan_token::Column::TokenId.eq(token_id))
            .filter(scan_token::Column::Status.eq("UNUSED"))
            .exec(&*self.db)
            .await
            .map_err(|error| AppError::Internal(error.to_string()))?;

        Ok(result.rows_affected == 1)
    }
}
