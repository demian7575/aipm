from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, validator


class Status(str, Enum):
    draft = "draft"
    in_progress = "in_progress"
    review = "review"
    done = "done"
    blocked = "blocked"


class MergeRequest(BaseModel):
    id: str
    title: str
    description: str = ""
    status: Status = Status.draft
    repository: str = Field(..., alias="repo")
    branch: str
    drift: bool = False
    last_sync_at: Optional[datetime] = Field(None, alias="lastSyncAt")

    class Config:
        allow_population_by_field_name = True


class Story(BaseModel):
    id: str
    merge_request_id: str = Field(..., alias="mergeRequestId")
    parent_id: Optional[str] = Field(None, alias="parentId")
    title: str
    role: str
    goal: str
    benefit: str
    status: Status = Status.draft
    order: int = 0

    class Config:
        allow_population_by_field_name = True

    @validator("title")
    def strip_title(cls, value: str) -> str:
        return value.strip()


class AcceptanceTest(BaseModel):
    id: str
    story_id: str = Field(..., alias="storyId")
    given: str
    when: str
    then: str
    status: Status = Status.draft

    class Config:
        allow_population_by_field_name = True


class NodeRollup(BaseModel):
    total: int
    done: int
    blocked: int


class StoryTreeNode(BaseModel):
    story: Story
    children: list["StoryTreeNode"] = []
    acceptance_tests: list[AcceptanceTest] = []
    rollup: NodeRollup

    class Config:
        arbitrary_types_allowed = True


StoryTreeNode.update_forward_refs()
