from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable, Tuple

from .models import AcceptanceTest, Story
from .schemas import ValidationMessage, ValidationResult

AMBIGUOUS_TERMS = {
    "en": ["optimize", "quickly", "soon", "some", "about", "approximately"],
    "ko": ["빠르게", "적절히", "대략", "어느정도", "최대한"],
}

UNIT_PATTERN = re.compile(r"\\b\\d+(?:\\.\\d+)?\\s?(ms|s|sec|seconds|minutes|px|%|percent|kb|mb)\\b", re.IGNORECASE)
NUMBER_PATTERN = re.compile(r"\\d")
ROLE_PATTERN = re.compile(r"^As a .+", re.IGNORECASE)
GOAL_PATTERN = re.compile(r"^I want .+", re.IGNORECASE)
BENEFIT_PATTERN = re.compile(r"^So that .+", re.IGNORECASE)
GWT_PATTERN = re.compile(r"^Given .+ When .+ Then .+", re.IGNORECASE | re.DOTALL)


@dataclass
class PolicyResult:
    validation: ValidationResult
    blocked: bool


def _collect_ambiguity(text: str, field: str) -> Iterable[ValidationMessage]:
    lowered = text.lower()
    for locale, terms in AMBIGUOUS_TERMS.items():
        for term in terms:
            if term.lower() in lowered:
                yield ValidationMessage(
                    type="ambiguity",
                    message=f"Ambiguous term '{term}' detected",
                    field=field,
                )


def _check_numeric_units(text: str, field: str) -> Iterable[ValidationMessage]:
    if NUMBER_PATTERN.search(text) and not UNIT_PATTERN.search(text):
        yield ValidationMessage(
            type="unit",
            message="Numeric values should include explicit units",
            field=field,
        )


def validate_story(story: Story, *, policy: str = "warn") -> PolicyResult:
    result = ValidationResult()

    if not ROLE_PATTERN.match(story.role.strip()):
        result.errors.append(
            ValidationMessage(type="invest", message="Role must start with 'As a'", field="role")
        )
    if not GOAL_PATTERN.match(story.goal.strip()):
        result.errors.append(
            ValidationMessage(type="invest", message="Goal must start with 'I want'", field="goal")
        )
    if not BENEFIT_PATTERN.match(story.benefit.strip()):
        result.errors.append(
            ValidationMessage(type="invest", message="Benefit must start with 'So that'", field="benefit")
        )

    for field_name in ("title", "role", "goal", "benefit"):
        text = getattr(story, field_name)
        result.warnings.extend(list(_collect_ambiguity(text, field_name)))
        result.warnings.extend(list(_check_numeric_units(text, field_name)))

    blocked = policy == "block" and bool(result.errors)
    return PolicyResult(validation=result, blocked=blocked)


def validate_acceptance_tests(tests: Iterable[AcceptanceTest], *, policy: str = "warn") -> PolicyResult:
    result = ValidationResult()
    for test in tests:
        combined = f"Given {test.given} When {test.when} Then {test.then}"
        if not GWT_PATTERN.match(combined.replace("\n", " ")):
            result.errors.append(
                ValidationMessage(
                    type="gwt",
                    message="Acceptance tests must follow Given/When/Then format",
                    field=test.id,
                )
            )
        for field_name in ("given", "when", "then"):
            text = getattr(test, field_name)
            result.warnings.extend(list(_collect_ambiguity(text, field_name)))
            result.warnings.extend(list(_check_numeric_units(text, field_name)))
    blocked = policy == "block" and bool(result.errors)
    return PolicyResult(validation=result, blocked=blocked)


__all__ = ["validate_story", "validate_acceptance_tests", "AMBIGUOUS_TERMS"]
