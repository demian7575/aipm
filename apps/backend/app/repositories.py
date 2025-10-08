from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Dict, Iterable, List, Optional

from .config import get_settings
from .models import AcceptanceTest, MergeRequest, Status, Story, StoryTreeNode, NodeRollup


class ErrorCodes:
    NOT_FOUND = "not_found"
    CONFLICT = "conflict"
    VALIDATION = "validation"
    DEPTH_LIMIT = "depth_limit"


class MergeRequestRepository:
    def __init__(self) -> None:
        self._items: Dict[str, MergeRequest] = {}

    def list(self) -> list[MergeRequest]:
        return list(self._items.values())

    def get(self, item_id: str) -> MergeRequest | None:
        return self._items.get(item_id)

    def upsert(self, item: MergeRequest) -> MergeRequest:
        self._items[item.id] = item
        return item

    def delete(self, item_id: str) -> None:
        if item_id in self._items:
            del self._items[item_id]

    def update_status(self, item_id: str, status: Status) -> MergeRequest | None:
        mr = self._items.get(item_id)
        if mr:
            mr.status = status
            self._items[item_id] = mr
        return mr

    def update_branch(self, item_id: str) -> MergeRequest | None:
        mr = self._items.get(item_id)
        if mr:
            mr.drift = not mr.drift
            mr.last_sync_at = datetime.utcnow()
            self._items[item_id] = mr
        return mr

    def reset(self, items: Iterable[MergeRequest]) -> None:
        self._items = {item.id: item for item in items}


class StoryRepository:
    def __init__(self) -> None:
        self._items: Dict[str, Story] = {}

    def list(self) -> list[Story]:
        return list(self._items.values())

    def list_by_mr(self, merge_request_id: str) -> list[Story]:
        return [story for story in self._items.values() if story.merge_request_id == merge_request_id]

    def get(self, item_id: str) -> Story | None:
        return self._items.get(item_id)

    def upsert(self, story: Story) -> Story:
        self._items[story.id] = story
        return story

    def delete(self, item_id: str) -> None:
        if item_id in self._items:
            del self._items[item_id]

    def reset(self, items: Iterable[Story]) -> None:
        self._items = {item.id: item for item in items}

    def move(self, story_id: str, parent_id: Optional[str], index: int) -> Story:
        story = self._items[story_id]
        previous_parent = story.parent_id
        story.parent_id = parent_id
        story.order = index
        self._items[story_id] = story
        self._rebalance(previous_parent)
        self._rebalance(parent_id)
        return story

    def reorder(self, parent_id: Optional[str], order: List[str]) -> None:
        for idx, story_id in enumerate(order):
            if story_id in self._items:
                story = self._items[story_id]
                story.order = idx
                story.parent_id = parent_id if parent_id is not None else story.parent_id
                self._items[story_id] = story
        self._rebalance(parent_id)

    def children(self, parent_id: Optional[str]) -> list[Story]:
        return sorted(
            [story for story in self._items.values() if story.parent_id == parent_id],
            key=lambda s: s.order,
        )

    def ancestors(self, story_id: str) -> list[Story]:
        result: list[Story] = []
        current = self._items.get(story_id)
        visited: set[str] = set()
        while current and current.parent_id:
            parent = self._items.get(current.parent_id)
            if not parent or parent.id in visited:
                break
            result.append(parent)
            visited.add(parent.id)
            current = parent
        return list(reversed(result))

    def tree(self, merge_request_id: str, depth: Optional[int] = None) -> list[StoryTreeNode]:
        stories = [s for s in self._items.values() if s.merge_request_id == merge_request_id]
        story_map = {s.id: s for s in stories}
        children_map: Dict[Optional[str], list[Story]] = defaultdict(list)
        for story in stories:
            children_map[story.parent_id].append(story)
        for child_list in children_map.values():
            child_list.sort(key=lambda s: s.order)

        def build_node(story: Story, current_depth: int) -> StoryTreeNode:
            child_nodes: list[StoryTreeNode] = []
            if depth is None or current_depth < depth:
                for child in children_map.get(story.id, []):
                    child_nodes.append(build_node(child, current_depth + 1))
            rollup = self._compute_rollup(story, child_nodes)
            return StoryTreeNode(story=story, children=child_nodes, acceptance_tests=[], rollup=rollup)

        roots = [story for story in stories if story.parent_id is None]
        roots.sort(key=lambda s: s.order)
        return [build_node(root, 1) for root in roots]

    def _compute_rollup(self, story: Story, children: list[StoryTreeNode]) -> NodeRollup:
        total = 1
        done = 1 if story.status == Status.done else 0
        blocked = 1 if story.status == Status.blocked else 0
        for child in children:
            total += child.rollup.total
            done += child.rollup.done
            blocked += child.rollup.blocked
        return NodeRollup(total=total, done=done, blocked=blocked)

    def depth(self, story_id: str) -> int:
        depth = 1
        current = self._items.get(story_id)
        visited: set[str] = set()
        while current and current.parent_id:
            if current.parent_id in visited:
                break
            visited.add(current.parent_id)
            depth += 1
            current = self._items.get(current.parent_id)
        return depth

    def has_cycle(self, story_id: str, parent_id: Optional[str]) -> bool:
        if not parent_id:
            return False
        current = self._items.get(parent_id)
        visited: set[str] = set()
        while current:
            if current.id == story_id:
                return True
            if current.parent_id in visited:
                break
            visited.add(current.id)
            current = self._items.get(current.parent_id)
        return False

    def _rebalance(self, parent_id: Optional[str]) -> None:
        siblings = self.children(parent_id)
        for idx, story in enumerate(siblings):
            story.order = idx
            self._items[story.id] = story


class AcceptanceTestRepository:
    def __init__(self) -> None:
        self._items: Dict[str, AcceptanceTest] = {}

    def list(self) -> list[AcceptanceTest]:
        return list(self._items.values())

    def list_by_story(self, story_id: str) -> list[AcceptanceTest]:
        return [item for item in self._items.values() if item.story_id == story_id]

    def get(self, item_id: str) -> AcceptanceTest | None:
        return self._items.get(item_id)

    def upsert(self, item: AcceptanceTest) -> AcceptanceTest:
        self._items[item.id] = item
        return item

    def delete(self, item_id: str) -> None:
        if item_id in self._items:
            del self._items[item_id]

    def reset(self, items: Iterable[AcceptanceTest]) -> None:
        self._items = {item.id: item for item in items}


class DataStore:
    def __init__(self) -> None:
        self.merge_requests = MergeRequestRepository()
        self.stories = StoryRepository()
        self.tests = AcceptanceTestRepository()

    def reset(self, *, mrs: Iterable[MergeRequest], stories: Iterable[Story], tests: Iterable[AcceptanceTest]) -> None:
        self.merge_requests.reset(mrs)
        self.stories.reset(stories)
        self.tests.reset(tests)


data_store = DataStore()
