# Story Status Guide

## Valid Status Values
**Status**: Draft | Ready | In Progress | Blocked | Approved | Done

## Status Definitions

### Draft
- **Description**: Story is being authored or refined
- **Requirements**: None (default status)
- **Next States**: Ready, Blocked
- **Use Case**: Initial story creation, requirements gathering

### Ready
- **Description**: Story satisfies INVEST checks with verifiable acceptance tests
- **Requirements**: INVEST compliant, acceptance tests defined
- **Next States**: In Progress, Approved, Blocked
- **Use Case**: Planning-ready stories in backlog

### In Progress
- **Description**: Story is actively being implemented and validated
- **Requirements**: Assigned to developer
- **Next States**: Done, Blocked, Ready
- **Use Case**: Active development work

### Blocked
- **Description**: Progress is impeded by external dependencies or issues
- **Requirements**: None (can transition from any state)
- **Next States**: Any previous state
- **Use Case**: Waiting for dependencies, external blockers

### Approved
- **Description**: Story has been reviewed and accepted for execution
- **Requirements**: Stakeholder review completed
- **Next States**: In Progress, Done, Blocked
- **Use Case**: Formal approval process

### Done
- **Description**: Story delivered; all children Done, all tests Pass
- **Requirements**: All child stories Done, all acceptance tests Pass
- **Next States**: None (terminal state)
- **Use Case**: Completed and verified stories

## Validation Rules
- System enforces Done status guard automatically
- Cannot mark Done if children are not Done
- Cannot mark Done if acceptance tests are not Pass
- API rejects invalid transitions with feedback

## AIPM System Impact
- Status drives workflow and reporting
- Used in progress tracking and dashboards
- Affects story hierarchy validation
- Integrated with acceptance test results
