use anyhow::{Context, Result};
use api::{app, config, db, modules};
use modules::scan_tokens::infrastructure::crypto::hmac_scan_token::HmacScanTokenService;
use modules::scan_tokens::infrastructure::persistence::sea_orm_repo::SeaOrmScanTokenRepository;
use modules::tags::infrastructure::crypto::aes_cmac::AesCmacService;
use modules::tags::infrastructure::persistence::sea_orm_repo::{
    SeaOrmItemRepository, SeaOrmScanEventRepository, SeaOrmTagRepository,
};
use std::path::PathBuf;
use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<()> {
    let workspace_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|path| path.parent())
        .context("workspace root should exist")?
        .to_path_buf();
    let env_file = workspace_root.join(".env");
    dotenvy::from_path(&env_file)
        .with_context(|| format!("Failed to load .env from {}", env_file.display()))?;

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "api=debug,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = config::Config::from_env()?;
    let database_connexion = db::connect(&config.database_url)
        .await
        .context("Failed to connect to Postgres")?;
    let shared_database_connexion = Arc::new(database_connexion);

    let tag_repo = Arc::new(SeaOrmTagRepository::new(shared_database_connexion.clone()));
    let item_repo = Arc::new(SeaOrmItemRepository::new(shared_database_connexion.clone()));
    let scan_repo = Arc::new(SeaOrmScanEventRepository::new(
        shared_database_connexion.clone(),
    ));
    let scan_token_repo = Arc::new(SeaOrmScanTokenRepository::new(
        shared_database_connexion.clone(),
    ));

    let crypto_service = Arc::new(AesCmacService::new()?);
    let scan_token_service = Arc::new(HmacScanTokenService::new(&config.scan_token_secret));

    let provision_usecase = Arc::new(
        modules::tags::application::provision::ProvisionTagUseCase::new(
            tag_repo.clone(),
            item_repo.clone(),
            crypto_service.clone(),
        ),
    );

    let verify_usecase = Arc::new(modules::tags::application::verify::VerifyTagUseCase::new(
        tag_repo.clone(),
        scan_repo.clone(),
        crypto_service.clone(),
    ));

    let revoke_usecase = Arc::new(modules::tags::application::admin::RevokeTagUseCase::new(
        tag_repo.clone(),
    ));
    let rotate_usecase = Arc::new(modules::tags::application::admin::RotateKeyUseCase::new(
        tag_repo.clone(),
    ));
    let generate_scan_tokens_usecase = Arc::new(
        modules::scan_tokens::application::scan_tokens::GenerateScanTokensUseCase::new(
            item_repo.clone(),
            scan_token_repo.clone(),
            scan_token_service.clone(),
        ),
    );
    let consume_scan_token_usecase = Arc::new(
        modules::scan_tokens::application::scan_tokens::ConsumeScanTokenUseCase::new(
            scan_token_repo.clone(),
            scan_repo.clone(),
            scan_token_service.clone(),
        ),
    );

    let state = Arc::new(app::http::AppState {
        api_base_url: config.scan_base_url(),
        admin_api_key: config.admin_api_key.clone(),
        provision_usecase,
        verify_usecase,
        revoke_usecase,
        rotate_usecase,
        generate_scan_tokens_usecase,
        consume_scan_token_usecase,
    });

    let app = app::http::create_router(state);

    let listener = tokio::net::TcpListener::bind(&config.address)
        .await
        .with_context(|| format!("Failed to bind TCP listener on {}", config.address))?;
    tracing::info!("Listening on {}", config.address);

    axum::serve(listener, app)
        .await
        .context("HTTP server terminated with an error")?;

    Ok(())
}
