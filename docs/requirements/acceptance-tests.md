# Acceptance Test Scenarios

## Story Save Validation
- **Given** a new Story form
- **When** As a / I want / So that are filled and INVEST passes
- **Then** Save enables and Story status becomes `Ready`

## Ambiguity Blocking
- **Given** Then says "빠르게 처리한다" with policy=block
- **When** saving
- **Then** an error "Unmeasurable statement" prevents save

## Recursive Collapse
- **Given** US1 has children/grandchildren
- **When** Shift+Click on US1 caret
- **Then** all descendants collapse/expand together

## Expand to Depth
- **Given** the tree is collapsed
- **When** Expand to depth 2
- **Then** root children and their children expand; AT lists remain collapsed

## Move with Guards
- **Given** US1-1 is dragged onto US2
- **When** dropping
- **Then** move succeeds if no cycle and depth ≤ max; numbering re-renders; IDs unchanged

## Roll-up Approval
- **Given** a parent Story with two children
- **When** all their ATs are `Pass`
- **Then** parent becomes `Approved`, MR roll-up updates

## Branch Update Simulation
- **Given** MR drift=true
- **When** Update Branch is triggered
- **Then** drift=false and lastSyncAt is now
