from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from .models import AcceptanceTest, MergeRequest, Status, Story


class ValidationMessage(BaseModel):
    type: str
    message: str
    field: str | None = None


class ValidationResult(BaseModel):
    warnings: list[ValidationMessage] = Field(default_factory=list)
    errors: list[ValidationMessage] = Field(default_factory=list)


class MergeRequestCreate(BaseModel):
    id: str
    title: str
    description: str = ""
    repo: str
    branch: str


class MergeRequestUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    repo: str | None = None
    branch: str | None = None
    status: Status | None = None


class MergeRequestResponse(BaseModel):
    data: MergeRequest


class StoryCreate(BaseModel):
    id: str
    mergeRequestId: str
    parentId: str | None = None
    title: str
    role: str
    goal: str
    benefit: str
    status: Status = Status.draft
    order: int = 0


class StoryUpdate(BaseModel):
    title: str | None = None
    role: str | None = None
    goal: str | None = None
    benefit: str | None = None
    status: Status | None = None
    parentId: str | None = None
    order: int | None = None


class StoryResponse(BaseModel):
    data: Story
    validation: ValidationResult


class StoryTreeResponse(BaseModel):
    data: list[dict[str, Any]]


class AcceptanceTestCreate(BaseModel):
    id: str
    storyId: str
    given: str
    when: str
    then: str
    status: Status = Status.draft


class AcceptanceTestUpdate(BaseModel):
    given: str | None = None
    when: str | None = None
    then: str | None = None
    status: Status | None = None


class AcceptanceTestResponse(BaseModel):
    data: AcceptanceTest
    validation: ValidationResult


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Any | None = None


class MoveStoryRequest(BaseModel):
    parentId: str | None = None
    index: int = 0


class ReorderStoryRequest(BaseModel):
    order: list[str]


class BranchUpdateResponse(BaseModel):
    data: MergeRequest
    message: str


class StateSnapshot(BaseModel):
    mergeRequests: list[MergeRequest]
    stories: list[Story]
    tests: list[AcceptanceTest]


class StatusPatch(BaseModel):
    status: Status


class Policy(BaseModel):
    policy: str = Field("warn", regex="^(warn|block)$")
