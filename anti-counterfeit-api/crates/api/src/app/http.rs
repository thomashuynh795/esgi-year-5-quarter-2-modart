use crate::modules::scan_tokens::application::scan_tokens::{
    ConsumeScanTokenUseCase, GenerateScanTokensUseCase,
};
use crate::modules::scan_tokens::infrastructure::web::handlers as scan_token_handlers;
use crate::modules::tags::application::admin::{RevokeTagUseCase, RotateKeyUseCase};
use crate::modules::tags::application::provision::ProvisionTagUseCase;
use crate::modules::tags::application::verify::VerifyTagUseCase;
use crate::modules::tags::infrastructure::web::handlers as tag_handlers;
use axum::{
    Router,
    routing::{get, post},
};
use std::sync::Arc;
use tower_http::trace::TraceLayer;

pub struct AppState {
    pub api_base_url: String,
    pub admin_api_key: String,
    pub provision_usecase: Arc<ProvisionTagUseCase>,
    pub verify_usecase: Arc<VerifyTagUseCase>,
    pub revoke_usecase: Arc<RevokeTagUseCase>,
    pub rotate_usecase: Arc<RotateKeyUseCase>,
    pub generate_scan_tokens_usecase: Arc<GenerateScanTokensUseCase>,
    pub consume_scan_token_usecase: Arc<ConsumeScanTokenUseCase>,
}

pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        .route("/health", get(health_check))
        .route("/provision", post(tag_handlers::provision_tag))
        .route("/verify", post(tag_handlers::verify_tag))
        .route(
            "/admin/tags/{tag_id}/revoke",
            post(tag_handlers::revoke_tag),
        )
        .route(
            "/admin/tags/{tag_id}/rotate-key",
            post(tag_handlers::rotate_key),
        )
        .route("/v1/scan", get(scan_token_handlers::scan_token))
        .route(
            "/v1/products/{pid}/scan-tokens",
            post(scan_token_handlers::generate_scan_tokens),
        )
        .with_state(state)
        .layer(TraceLayer::new_for_http())
}

pub async fn health_check() -> &'static str {
    "OK"
}
