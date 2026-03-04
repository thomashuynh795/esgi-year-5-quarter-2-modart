use api::app::error::AppError;
use api::app::http::{AppState, create_router};
use api::modules::scan_tokens::application::ports::{ScanTokenRepository, ScanTokenService};
use api::modules::scan_tokens::application::scan_tokens::{
    ConsumeScanTokenUseCase, GenerateScanTokensUseCase,
};
use api::modules::scan_tokens::domain::entities::{ScanToken, ScanTokenStatus};
use api::modules::scan_tokens::infrastructure::crypto::hmac_scan_token::HmacScanTokenService;
use api::modules::tags::application::admin::{RevokeTagUseCase, RotateKeyUseCase};
use api::modules::tags::application::ports::{
    CryptoService, ItemRepository, ScanEventRepository, TagRepository,
};
use api::modules::tags::application::provision::ProvisionTagUseCase;
use api::modules::tags::application::verify::VerifyTagUseCase;
use api::modules::tags::domain::entities::{Item, ScanEvent, Tag};
use async_trait::async_trait;
use axum::body::{Body, to_bytes};
use axum::http::{Request, StatusCode};
use chrono::{Duration, Utc};
use serde_json::json;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use tokio::task::JoinHandle;
use tower::ServiceExt;
use uuid::Uuid;

#[derive(Default)]
struct InMemoryTagRepository;

#[async_trait]
impl TagRepository for InMemoryTagRepository {
    async fn save(&self, tag: &Tag) -> Result<Tag, AppError> {
        Ok(tag.clone())
    }

    async fn find_by_uid(&self, _tag_uid: &str) -> Result<Option<Tag>, AppError> {
        Ok(None)
    }

    async fn find_by_id(&self, _id: Uuid) -> Result<Option<Tag>, AppError> {
        Ok(None)
    }

    async fn update_counter(&self, _tag_id: Uuid, _new_counter: i64) -> Result<(), AppError> {
        Ok(())
    }

    async fn revoke(&self, _tag_id: Uuid) -> Result<(), AppError> {
        Ok(())
    }

    async fn rotate_key(&self, _tag_id: Uuid, _new_version: i32) -> Result<(), AppError> {
        Ok(())
    }
}

#[derive(Default)]
struct InMemoryItemRepository {
    products: Mutex<HashSet<String>>,
}

#[async_trait]
impl ItemRepository for InMemoryItemRepository {
    async fn save(&self, item: &Item) -> Result<Item, AppError> {
        self.products
            .lock()
            .unwrap()
            .insert(item.product_code.clone());
        Ok(item.clone())
    }

    async fn find_by_tag_id(&self, _tag_id: Uuid) -> Result<Option<Item>, AppError> {
        Ok(None)
    }

    async fn exists_by_product_code(&self, product_code: &str) -> Result<bool, AppError> {
        Ok(self.products.lock().unwrap().contains(product_code))
    }
}

#[derive(Default)]
struct InMemoryScanTokenRepository {
    tokens: Mutex<HashMap<Uuid, ScanToken>>,
}

#[async_trait]
impl ScanTokenRepository for InMemoryScanTokenRepository {
    async fn save_many(&self, tokens: &[ScanToken]) -> Result<(), AppError> {
        let mut store = self.tokens.lock().unwrap();
        for token in tokens {
            store.insert(token.token_id, token.clone());
        }
        Ok(())
    }

    async fn find_by_id(&self, token_id: Uuid) -> Result<Option<ScanToken>, AppError> {
        Ok(self.tokens.lock().unwrap().get(&token_id).cloned())
    }

    async fn consume_if_unused(
        &self,
        token_id: Uuid,
        used_at: chrono::DateTime<Utc>,
        used_ip: Option<String>,
        used_user_agent: Option<String>,
    ) -> Result<bool, AppError> {
        let mut store = self.tokens.lock().unwrap();
        let Some(token) = store.get_mut(&token_id) else {
            return Ok(false);
        };

        if token.status != ScanTokenStatus::Unused {
            return Ok(false);
        }

        token.status = ScanTokenStatus::Used;
        token.used_at = Some(used_at);
        token.used_ip = used_ip;
        token.used_user_agent = used_user_agent;
        Ok(true)
    }
}

#[derive(Default)]
struct InMemoryScanEventRepository;

#[async_trait]
impl ScanEventRepository for InMemoryScanEventRepository {
    async fn save(&self, event: &ScanEvent) -> Result<ScanEvent, AppError> {
        Ok(event.clone())
    }
}

struct NoopCryptoService;

#[async_trait]
impl CryptoService for NoopCryptoService {
    async fn verify_cmac(
        &self,
        _key_version: i32,
        _tag_uid: &str,
        _message: &[u8],
        _signature: &[u8],
    ) -> Result<bool, AppError> {
        Ok(true)
    }

    async fn generate_keys(&self) -> Result<(i32, String), AppError> {
        Ok((1, "noop".to_string()))
    }
}

async fn build_app() -> (axum::Router, Arc<InMemoryScanTokenRepository>) {
    let tag_repo = Arc::new(InMemoryTagRepository);
    let item_repo = Arc::new(InMemoryItemRepository::default());
    let scan_repo = Arc::new(InMemoryScanEventRepository);
    let token_repo = Arc::new(InMemoryScanTokenRepository::default());
    let crypto_service = Arc::new(NoopCryptoService);
    let token_service = Arc::new(HmacScanTokenService::new("test-secret"));

    item_repo
        .save(&Item {
            id: Uuid::new_v4(),
            product_code: "SKU-123".to_string(),
            size: None,
            color: None,
            tag_id: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        })
        .await
        .unwrap();

    let state = Arc::new(AppState {
        api_base_url: "https://api.example.com".to_string(),
        admin_api_key: "admin-secret".to_string(),
        provision_usecase: Arc::new(ProvisionTagUseCase::new(
            tag_repo.clone(),
            item_repo.clone(),
            crypto_service.clone(),
        )),
        verify_usecase: Arc::new(VerifyTagUseCase::new(
            tag_repo.clone(),
            scan_repo.clone(),
            crypto_service.clone(),
        )),
        revoke_usecase: Arc::new(RevokeTagUseCase::new(tag_repo.clone())),
        rotate_usecase: Arc::new(RotateKeyUseCase::new(tag_repo)),
        generate_scan_tokens_usecase: Arc::new(GenerateScanTokensUseCase::new(
            item_repo,
            token_repo.clone(),
            token_service.clone(),
        )),
        consume_scan_token_usecase: Arc::new(ConsumeScanTokenUseCase::new(
            token_repo.clone(),
            scan_repo,
            token_service,
        )),
    });

    (create_router(state), token_repo)
}

#[tokio::test]
async fn generate_scan_tokens_route_returns_urls() {
    let (app, _) = build_app().await;

    let response = app
        .oneshot(
            Request::post("/v1/products/SKU-123/scan-tokens")
                .header("x-admin-key", "admin-secret")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"count": 3, "ttl_seconds": Duration::hours(1).num_seconds()})
                        .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    let value: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(value["product_public_id"], "SKU-123");
    assert_eq!(value["tokens"].as_array().unwrap().len(), 3);
}

#[tokio::test]
async fn scan_route_rejects_second_use_of_same_token() {
    let (app, token_repo) = build_app().await;
    let token_service = HmacScanTokenService::new("test-secret");
    let expires_at = Utc::now() + Duration::hours(1);
    let generated = token_service.generate_token("SKU-123", expires_at).unwrap();

    token_repo
        .save_many(&[ScanToken {
            token_id: generated.token_id,
            product_public_id: "SKU-123".to_string(),
            expires_at,
            status: ScanTokenStatus::Unused,
            created_at: Utc::now(),
            used_at: None,
            used_ip: None,
            used_user_agent: None,
            token_hash: Some(token_service.hash_token(&generated.token)),
        }])
        .await
        .unwrap();

    let first_response = app
        .clone()
        .oneshot(
            Request::get(format!("/v1/scan?pid=SKU-123&t={}", generated.token))
                .header("user-agent", "integration-test")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(first_response.status(), StatusCode::OK);

    let first_body = to_bytes(first_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let first_json: serde_json::Value = serde_json::from_slice(&first_body).unwrap();
    assert_eq!(first_json["result"], "OK");
    assert_eq!(first_json["authentic"], true);

    let second_response = app
        .oneshot(
            Request::get(format!("/v1/scan?pid=SKU-123&t={}", generated.token))
                .header("user-agent", "integration-test")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(second_response.status(), StatusCode::CONFLICT);

    let second_body = to_bytes(second_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let second_json: serde_json::Value = serde_json::from_slice(&second_body).unwrap();
    assert_eq!(second_json["result"], "REPLAY");
    assert_eq!(second_json["authentic"], false);
}

#[tokio::test]
async fn generate_scan_tokens_route_requires_admin_key() {
    let (app, _) = build_app().await;

    let response = app
        .oneshot(
            Request::post("/v1/products/SKU-123/scan-tokens")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"count": 1, "ttl_seconds": Duration::hours(1).num_seconds()})
                        .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn concurrent_scan_requests_consume_token_only_once() {
    let (app, token_repo) = build_app().await;
    let token_service = HmacScanTokenService::new("test-secret");
    let expires_at = Utc::now() + Duration::hours(1);
    let generated = token_service.generate_token("SKU-123", expires_at).unwrap();

    token_repo
        .save_many(&[ScanToken {
            token_id: generated.token_id,
            product_public_id: "SKU-123".to_string(),
            expires_at,
            status: ScanTokenStatus::Unused,
            created_at: Utc::now(),
            used_at: None,
            used_ip: None,
            used_user_agent: None,
            token_hash: Some(token_service.hash_token(&generated.token)),
        }])
        .await
        .unwrap();

    let path = format!("/v1/scan?pid=SKU-123&t={}", generated.token);
    let mut handles: Vec<JoinHandle<StatusCode>> = Vec::new();

    for _ in 0..8 {
        let app = app.clone();
        let path = path.clone();
        handles.push(tokio::spawn(async move {
            app.oneshot(
                Request::get(path)
                    .header("user-agent", "integration-test")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap()
            .status()
        }));
    }

    let mut ok_count = 0;
    let mut conflict_count = 0;

    for handle in handles {
        match handle.await.unwrap() {
            StatusCode::OK => ok_count += 1,
            StatusCode::CONFLICT => conflict_count += 1,
            status => panic!("unexpected status: {status}"),
        }
    }

    assert_eq!(ok_count, 1);
    assert_eq!(conflict_count, 7);
}
