import pytest
from httpx import AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_list_merge_requests_returns_seed():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/merge-requests")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


@pytest.mark.asyncio
async def test_story_validation_warn_policy():
    payload = {
        "id": "TEST-STORY",
        "mergeRequestId": "MR-9000",
        "title": "Sample",
        "role": "As a curious tester",
        "goal": "I want to inspect",
        "benefit": "So that insight happens",
        "status": "draft"
    }
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/stories", json=payload)
        assert response.status_code == 201
        body = response.json()
        assert "validation" in body


@pytest.mark.asyncio
async def test_story_validation_block_policy():
    payload = {
        "id": "BLOCK-STORY",
        "mergeRequestId": "MR-9000",
        "title": "Sample",
        "role": "Tester",
        "goal": "Verify",
        "benefit": "Value",
        "status": "draft"
    }
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/stories?policy=block", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert data["code"] == "validation"
