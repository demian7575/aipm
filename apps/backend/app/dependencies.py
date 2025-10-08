from __future__ import annotations

from fastapi import Depends, Header, HTTPException, Query, Request

from .repositories import DataStore, data_store, ErrorCodes
from .schemas import ErrorResponse


def get_datastore() -> DataStore:
    return data_store


def get_validation_policy(
    policy: str = Query("warn", regex="^(warn|block)$"),
    header_policy: str | None = Header(None, alias="X-Validation-Policy"),
) -> str:
    if header_policy:
        header_policy = header_policy.lower()
        if header_policy not in {"warn", "block"}:
            raise HTTPException(status_code=400, detail=ErrorResponse(code=ErrorCodes.VALIDATION, message="Invalid policy").dict())
        return header_policy
    return policy


def get_request_id(request: Request, x_request_id: str | None = Header(None, alias="X-Request-ID")) -> str:
    if x_request_id:
        request.state.request_id = x_request_id
        return x_request_id
    generated = request.headers.get("X-Request-ID") or request.scope.get("request_id")
    if generated is None:
        generated = "req-" + request.scope.get("trace_id", "")
    request.state.request_id = generated
    return generated
