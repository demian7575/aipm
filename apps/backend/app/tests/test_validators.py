from app.validators import validate_story, validate_acceptance_tests
from app.models import Story, AcceptanceTest, Status


def make_story(**kwargs):
    base = dict(
        id="S-1",
        merge_request_id="MR-1",
        parent_id=None,
        title="Story title",
        role="As a tester",
        goal="I want to verify",
        benefit="So that quality stays high",
        status=Status.draft,
        order=0,
    )
    base.update(kwargs)
    return Story(**base)


def test_validate_story_requires_prefixes():
    story = make_story(role="Tester", goal="Verify", benefit="Benefits")
    result = validate_story(story, policy="warn")
    assert any(msg.field == "role" for msg in result.validation.errors)
    assert any(msg.field == "goal" for msg in result.validation.errors)
    assert any(msg.field == "benefit" for msg in result.validation.errors)


def test_validate_story_blocks_when_policy_block():
    story = make_story(role="Tester", goal="Verify", benefit="Benefits")
    result = validate_story(story, policy="block")
    assert result.blocked is True


def test_validate_acceptance_test_enforces_format():
    test = AcceptanceTest(id="AT-1", story_id="S-1", given="context", when="action", then="result")
    result = validate_acceptance_tests([test])
    assert any(msg.type == "gwt" for msg in result.validation.errors)
