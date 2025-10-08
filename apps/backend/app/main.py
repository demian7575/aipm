from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .dependencies import get_datastore, get_validation_policy
from .logging import get_logger, setup_logging
from .models import AcceptanceTest, MergeRequest, Status, Story
from .repositories import DataStore, ErrorCodes
from .schemas import (
    AcceptanceTestCreate,
    AcceptanceTestResponse,
    AcceptanceTestUpdate,
    BranchUpdateResponse,
    ErrorResponse,
    MergeRequestCreate,
    MergeRequestResponse,
    MergeRequestUpdate,
    MoveStoryRequest,
    ReorderStoryRequest,
    StateSnapshot,
    StatusPatch,
    StoryCreate,
    StoryResponse,
    StoryTreeResponse,
    StoryUpdate,
    ValidationResult,
)
from .validators import validate_acceptance_tests, validate_story

setup_logging()
logger = get_logger(__name__)

app = FastAPI(
    title="AI PM Mindmap API",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or f"req-{datetime.utcnow().timestamp()}"
    request.state.request_id = request_id
    structlog_context = {"request_id": request_id, "path": request.url.path}
    logger.info("request.start", **structlog_context)
    try:
        response: Response = await call_next(request)
    except HTTPException as exc:
        logger.error("request.error", status=exc.status_code, **structlog_context)
        raise
    logger.info("request.end", status=response.status_code, **structlog_context)
    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    if isinstance(exc.detail, dict):
        detail = exc.detail
    elif hasattr(exc.detail, "dict"):
        detail = exc.detail.dict()
    else:
        detail = {"code": ErrorCodes.VALIDATION, "message": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content=detail)


@app.on_event("startup")
async def load_seed() -> None:
    seed_path = Path(__file__).parent / "data" / "seed.json"
    if seed_path.exists():
        payload = json.loads(seed_path.read_text())
        mrs = [MergeRequest.parse_obj(item) for item in payload.get("mergeRequests", [])]
        stories = [Story.parse_obj(item) for item in payload.get("stories", [])]
        tests = [AcceptanceTest.parse_obj(item) for item in payload.get("tests", [])]
        store = get_datastore()
        store.reset(mrs=mrs, stories=stories, tests=tests)
        logger.info("seed.loaded", merge_requests=len(mrs), stories=len(stories), tests=len(tests))


@app.get("/api/state", response_model=StateSnapshot)
async def get_state(store: DataStore = Depends(get_datastore)) -> StateSnapshot:
    return StateSnapshot(
        mergeRequests=store.merge_requests.list(),
        stories=store.stories.list(),
        tests=store.tests.list(),
    )


@app.post("/api/reset", response_model=StateSnapshot)
async def reset_state(store: DataStore = Depends(get_datastore)) -> StateSnapshot:
    await load_seed()
    return await get_state(store)


@app.get("/api/merge-requests", response_model=list[MergeRequest])
async def list_merge_requests(store: DataStore = Depends(get_datastore)) -> list[MergeRequest]:
    return store.merge_requests.list()


@app.post("/api/merge-requests", response_model=MergeRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_merge_request(payload: MergeRequestCreate, store: DataStore = Depends(get_datastore)) -> MergeRequestResponse:
    mr = MergeRequest.parse_obj(payload.dict())
    store.merge_requests.upsert(mr)
    return MergeRequestResponse(data=mr)


@app.get("/api/merge-requests/{mr_id}", response_model=MergeRequestResponse)
async def get_merge_request(mr_id: str, store: DataStore = Depends(get_datastore)) -> MergeRequestResponse:
    mr = store.merge_requests.get(mr_id)
    if not mr:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Merge request not found"))
    return MergeRequestResponse(data=mr)


@app.put("/api/merge-requests/{mr_id}", response_model=MergeRequestResponse)
async def update_merge_request(mr_id: str, payload: MergeRequestUpdate, store: DataStore = Depends(get_datastore)) -> MergeRequestResponse:
    mr = store.merge_requests.get(mr_id)
    if not mr:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Merge request not found"))
    updated = mr.copy(update={k: v for k, v in payload.dict(exclude_unset=True).items()})
    store.merge_requests.upsert(updated)
    return MergeRequestResponse(data=updated)


@app.delete("/api/merge-requests/{mr_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_merge_request(mr_id: str, store: DataStore = Depends(get_datastore)) -> Response:
    mr = store.merge_requests.get(mr_id)
    if not mr:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Merge request not found"))
    store.merge_requests.delete(mr_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.patch("/api/merge-requests/{mr_id}/status", response_model=MergeRequestResponse)
async def patch_merge_request_status(mr_id: str, payload: StatusPatch, store: DataStore = Depends(get_datastore)) -> MergeRequestResponse:
    mr = store.merge_requests.update_status(mr_id, payload.status)
    if not mr:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Merge request not found"))
    return MergeRequestResponse(data=mr)


@app.post("/api/merge-requests/{mr_id}/update-branch", response_model=BranchUpdateResponse)
async def simulate_branch_update(mr_id: str, store: DataStore = Depends(get_datastore)) -> BranchUpdateResponse:
    mr = store.merge_requests.update_branch(mr_id)
    if not mr:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Merge request not found"))
    return BranchUpdateResponse(data=mr, message="Branch synchronised")


@app.get("/api/stories", response_model=list[Story])
async def list_stories(store: DataStore = Depends(get_datastore)) -> list[Story]:
    return store.stories.list()


def _build_story_response(story: Story, policy: str, store: DataStore) -> StoryResponse:
    validation = validate_story(story, policy=policy).validation
    tests = store.tests.list_by_story(story.id)
    test_validation = validate_acceptance_tests(tests, policy=policy).validation
    combined = ValidationResult(
        warnings=validation.warnings + test_validation.warnings,
        errors=validation.errors + test_validation.errors,
    )
    return StoryResponse(data=story, validation=combined)


@app.post("/api/stories", response_model=StoryResponse, status_code=status.HTTP_201_CREATED)
async def create_story(
    payload: StoryCreate,
    store: DataStore = Depends(get_datastore),
    policy: str = Depends(get_validation_policy),
) -> StoryResponse:
    if store.stories.get(payload.id):
        raise HTTPException(status_code=409, detail=ErrorResponse(code=ErrorCodes.CONFLICT, message="Story already exists"))
    story = Story.parse_obj(payload.dict())
    if payload.parentId and store.stories.has_cycle(payload.id, payload.parentId):
        raise HTTPException(status_code=400, detail=ErrorResponse(code=ErrorCodes.CONFLICT, message="Cycle detected"))
    if payload.parentId:
        depth = store.stories.depth(payload.parentId) + 1
        if depth > settings.depth_limit:
            raise HTTPException(status_code=400, detail=ErrorResponse(code=ErrorCodes.DEPTH_LIMIT, message="Depth limit exceeded"))
    validation_result = validate_story(story, policy=policy)
    if validation_result.blocked:
        raise HTTPException(status_code=400, detail=ErrorResponse(code=ErrorCodes.VALIDATION, message="Validation blocked", details=[msg.dict() for msg in validation_result.validation.errors]))
    store.stories.upsert(story)
    return _build_story_response(story, policy, store)


@app.get("/api/stories/{story_id}", response_model=StoryResponse)
async def get_story(
    story_id: str,
    store: DataStore = Depends(get_datastore),
    policy: str = Depends(get_validation_policy),
) -> StoryResponse:
    story = store.stories.get(story_id)
    if not story:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Story not found"))
    return _build_story_response(story, policy, store)


@app.put("/api/stories/{story_id}", response_model=StoryResponse)
async def update_story(
    story_id: str,
    payload: StoryUpdate,
    store: DataStore = Depends(get_datastore),
    policy: str = Depends(get_validation_policy),
) -> StoryResponse:
    story = store.stories.get(story_id)
    if not story:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Story not found"))
    updates = payload.dict(exclude_unset=True)
    if "parentId" in updates:
        new_parent = updates["parentId"]
        if store.stories.has_cycle(story_id, new_parent):
            raise HTTPException(status_code=400, detail=ErrorResponse(code=ErrorCodes.CONFLICT, message="Cycle detected"))
        if new_parent:
            depth = store.stories.depth(new_parent) + 1
            if depth > settings.depth_limit:
                raise HTTPException(status_code=400, detail=ErrorResponse(code=ErrorCodes.DEPTH_LIMIT, message="Depth limit exceeded"))
    updated = story.copy(update=updates)
    validation_result = validate_story(updated, policy=policy)
    if validation_result.blocked:
        raise HTTPException(status_code=400, detail=ErrorResponse(code=ErrorCodes.VALIDATION, message="Validation blocked", details=[msg.dict() for msg in validation_result.validation.errors]))
    store.stories.upsert(updated)
    return _build_story_response(updated, policy, store)


@app.delete("/api/stories/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_story(story_id: str, store: DataStore = Depends(get_datastore)) -> Response:
    story = store.stories.get(story_id)
    if not story:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Story not found"))
    store.stories.delete(story_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.patch("/api/stories/{story_id}/status", response_model=StoryResponse)
async def patch_story_status(
    story_id: str,
    payload: StatusPatch,
    store: DataStore = Depends(get_datastore),
    policy: str = Depends(get_validation_policy),
) -> StoryResponse:
    story = store.stories.get(story_id)
    if not story:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Story not found"))
    updated = story.copy(update={"status": payload.status})
    store.stories.upsert(updated)
    return _build_story_response(updated, policy, store)


@app.patch("/api/stories/{story_id}/move", response_model=StoryResponse)
async def move_story(
    story_id: str,
    payload: MoveStoryRequest,
    store: DataStore = Depends(get_datastore),
    policy: str = Depends(get_validation_policy),
) -> StoryResponse:
    if payload.parentId and store.stories.has_cycle(story_id, payload.parentId):
        raise HTTPException(status_code=400, detail=ErrorResponse(code=ErrorCodes.CONFLICT, message="Cycle detected"))
    if payload.parentId:
        depth = store.stories.depth(payload.parentId) + 1
        if depth > settings.depth_limit:
            raise HTTPException(status_code=400, detail=ErrorResponse(code=ErrorCodes.DEPTH_LIMIT, message="Depth limit exceeded"))
    story = store.stories.get(story_id)
    if not story:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Story not found"))
    moved = store.stories.move(story_id, payload.parentId, payload.index)
    return _build_story_response(moved, policy, store)


@app.patch("/api/stories/{story_id}/reorder", response_model=list[Story])
async def reorder_story(
    story_id: str,
    payload: ReorderStoryRequest,
    store: DataStore = Depends(get_datastore),
) -> list[Story]:
    story = store.stories.get(story_id)
    if not story:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Story not found"))
    store.stories.reorder(story.parent_id, payload.order)
    return store.stories.children(story.parent_id)


@app.get("/api/stories/tree", response_model=StoryTreeResponse)
async def story_tree(
    mrId: str,
    depth: int | None = None,
    store: DataStore = Depends(get_datastore),
) -> StoryTreeResponse:
    nodes = store.stories.tree(mrId, depth)
    result: list[dict[str, Any]] = []
    for node in nodes:
        result.append(_serialise_tree(node, store))
    return StoryTreeResponse(data=result)


def _serialise_tree(node, store: DataStore) -> dict[str, Any]:
    tests = store.tests.list_by_story(node.story.id)
    return {
        "story": node.story,
        "children": [_serialise_tree(child, store) for child in node.children],
        "acceptanceTests": tests,
        "rollup": node.rollup,
    }


@app.get("/api/stories/{story_id}/path", response_model=list[Story])
async def story_path(story_id: str, store: DataStore = Depends(get_datastore)) -> list[Story]:
    story = store.stories.get(story_id)
    if not story:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Story not found"))
    return store.stories.ancestors(story_id)


@app.get("/api/stories/{story_id}/children", response_model=list[Story])
async def story_children(story_id: str, store: DataStore = Depends(get_datastore)) -> list[Story]:
    story = store.stories.get(story_id)
    if not story:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Story not found"))
    return store.stories.children(story_id)


@app.get("/api/tests", response_model=list[AcceptanceTest])
async def list_tests(store: DataStore = Depends(get_datastore)) -> list[AcceptanceTest]:
    return store.tests.list()


@app.post("/api/tests", response_model=AcceptanceTestResponse, status_code=status.HTTP_201_CREATED)
async def create_test(
    payload: AcceptanceTestCreate,
    store: DataStore = Depends(get_datastore),
    policy: str = Depends(get_validation_policy),
) -> AcceptanceTestResponse:
    if store.tests.get(payload.id):
        raise HTTPException(status_code=409, detail=ErrorResponse(code=ErrorCodes.CONFLICT, message="Test already exists"))
    test = AcceptanceTest.parse_obj(payload.dict())
    validation = validate_acceptance_tests([test], policy=policy)
    if validation.blocked:
        raise HTTPException(status_code=400, detail=ErrorResponse(code=ErrorCodes.VALIDATION, message="Validation blocked", details=[msg.dict() for msg in validation.validation.errors]))
    store.tests.upsert(test)
    return AcceptanceTestResponse(data=test, validation=validation.validation)


@app.get("/api/tests/{test_id}", response_model=AcceptanceTestResponse)
async def get_test(
    test_id: str,
    store: DataStore = Depends(get_datastore),
    policy: str = Depends(get_validation_policy),
) -> AcceptanceTestResponse:
    test = store.tests.get(test_id)
    if not test:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Test not found"))
    validation = validate_acceptance_tests([test], policy=policy)
    return AcceptanceTestResponse(data=test, validation=validation.validation)


@app.put("/api/tests/{test_id}", response_model=AcceptanceTestResponse)
async def update_test(
    test_id: str,
    payload: AcceptanceTestUpdate,
    store: DataStore = Depends(get_datastore),
    policy: str = Depends(get_validation_policy),
) -> AcceptanceTestResponse:
    test = store.tests.get(test_id)
    if not test:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Test not found"))
    updated = test.copy(update=payload.dict(exclude_unset=True))
    validation = validate_acceptance_tests([updated], policy=policy)
    if validation.blocked:
        raise HTTPException(status_code=400, detail=ErrorResponse(code=ErrorCodes.VALIDATION, message="Validation blocked", details=[msg.dict() for msg in validation.validation.errors]))
    store.tests.upsert(updated)
    return AcceptanceTestResponse(data=updated, validation=validation.validation)


@app.delete("/api/tests/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_test(test_id: str, store: DataStore = Depends(get_datastore)) -> Response:
    test = store.tests.get(test_id)
    if not test:
        raise HTTPException(status_code=404, detail=ErrorResponse(code=ErrorCodes.NOT_FOUND, message="Test not found"))
    store.tests.delete(test_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def export_openapi(destination: Path | None = None) -> dict[str, Any]:
    schema = app.openapi()
    if destination:
        destination.write_text(json.dumps(schema, indent=2))
    return schema


if __name__ == "__main__":
    export_openapi(Path(__file__).parent.parent / "docs" / "openapi.json")
