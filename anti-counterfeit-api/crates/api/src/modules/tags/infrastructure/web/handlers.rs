use crate::app::http::AppState;
use crate::app::http_error::{map_app_error, require_admin};
use crate::modules::tags::application::provision::ProvisionRequest;
use crate::modules::tags::application::verify::VerifyRequest;
use crate::modules::tags::infrastructure::web::dtos::{
    CreateTagRequest, CreateTagResponse, ProductDto, VerifyTagRequest, VerifyTagResponse,
};
use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use std::sync::Arc;

pub async fn provision_tag(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<CreateTagRequest>,
) -> impl IntoResponse {
    if let Err(error) = require_admin(&headers, &state.admin_api_key) {
        return map_app_error(error);
    }

    let req = ProvisionRequest {
        tag_uid: payload.tag_uid,
        product_code: payload.product_code,
        size: payload.size,
        color: payload.color,
    };

    match state.provision_usecase.execute(req).await {
        Ok(res) => (
            StatusCode::CREATED,
            [("Location", format!("/tags/{}", res.tag_id))],
            Json(CreateTagResponse {
                tag_id: res.tag_id,
                item_id: res.item_id,
                initial_key_version: res.initial_key_version,
                message: "Tag provisioned successfully".to_string(),
            }),
        )
            .into_response(),
        Err(error) => map_app_error(error),
    }
}

pub async fn verify_tag(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<VerifyTagRequest>,
) -> impl IntoResponse {
    let req = VerifyRequest {
        tag_uid: payload.tag_uid,
        counter: payload.counter,
        cmac: payload.cmac,
    };

    match state.verify_usecase.execute(req).await {
        Ok(res) => (
            StatusCode::OK,
            Json(VerifyTagResponse {
                verdict: res.verdict.to_string(),
                product: res.product_info.map(|p| ProductDto { tag_id: p.tag_id }),
            }),
        )
            .into_response(),
        Err(error) => map_app_error(error),
    }
}

pub async fn revoke_tag(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    axum::extract::Path(tag_id): axum::extract::Path<uuid::Uuid>,
) -> impl IntoResponse {
    if let Err(error) = require_admin(&headers, &state.admin_api_key) {
        return map_app_error(error);
    }

    match state.revoke_usecase.execute(tag_id).await {
        Ok(_) => (StatusCode::OK, "Tag revoked").into_response(),
        Err(error) => map_app_error(error),
    }
}

pub async fn rotate_key(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    axum::extract::Path(tag_id): axum::extract::Path<uuid::Uuid>,
) -> impl IntoResponse {
    if let Err(error) = require_admin(&headers, &state.admin_api_key) {
        return map_app_error(error);
    }

    match state.rotate_usecase.execute(tag_id).await {
        Ok(new_ver) => (
            StatusCode::OK,
            Json(
                crate::modules::tags::infrastructure::web::dtos::RotateKeyResponse {
                    new_key_version: new_ver,
                    message: "Key rotated successfully".to_string(),
                },
            ),
        )
            .into_response(),
        Err(error) => map_app_error(error),
    }
}
