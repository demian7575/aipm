# Context Update Template

Use this template when updating Lessons Learned section after completing work.

## Template

```markdown
### YYYY-MM-DD: [Brief Title of Work]

#### What We Did
- [Main feature/fix implemented]
- [Secondary changes]
- [Related improvements]

#### What Worked ✅
- **[Approach/technique]**: [Why it worked well]
- **[Tool/method]**: [Benefit gained]
- **[Decision made]**: [Positive outcome]

#### What Didn't Work ❌
- **[Approach tried]**: [Why it failed]
- **[Tool/method]**: [Problem encountered]
- **[Initial attempt]**: [What went wrong]

#### Key Decisions
1. **[Decision 1]** - [Rationale]
2. **[Decision 2]** - [Rationale]
3. **[Decision 3]** - [Rationale]

#### Prevention Measures Added
- ✅ [Gating test added]
- ✅ [Script automated]
- ✅ [Documentation updated]
- ✅ [Checklist created]

#### [Errors/Issues] Encountered
1. **[Error name]** → Fixed: [How fixed], [Prevention added]
2. **[Error name]** → Skipped: TODO - [Why skipped, plan to fix]

#### Technical Insights
- **[Insight 1]**: [Learning]
- **[Insight 2]**: [Learning]
- **[Insight 3]**: [Learning]

#### Architecture Changes (if applicable)
```
Before: [Old architecture]
After:  [New architecture]

Benefits:
- [Benefit 1]
- [Benefit 2]
```

#### Metrics (if applicable)
- **[Metric name]**: [Value]
- **[Test results]**: [Pass/fail counts]
- **[Performance]**: [Numbers]

#### Next Steps
- [ ] [Immediate action needed]
- [ ] [Short-term improvement]
- [ ] [Long-term consideration]

#### Documentation Created/Updated
- `[filename]` - [Purpose]
- `[filename]` - [Purpose]

---
```

## Example Usage

See the 2025-12-05 entry in DevelopmentBackground.md for a complete example.

## When to Update

### Immediate (same session)
- ✅ Major feature completed
- ✅ Critical bug fixed
- ✅ Deployment completed
- ✅ Architecture changed

### Daily
- ✅ End of work day
- ✅ Before switching to different task
- ✅ After significant progress

### Weekly
- ✅ Review and consolidate entries
- ✅ Update metrics
- ✅ Clean up outdated info

## Where to Update

1. **DevelopmentBackground.md** - Lessons Learned section (add new entry at top)
2. **README.md** - If quick start or overview changed
3. **DEPLOYMENT_*.md** - If deployment status changed
4. **API docs** - If endpoints changed
5. **Architecture diagrams** - If system changed

## Checklist

Before committing context updates:
- [ ] Lessons Learned entry added to DevelopmentBackground.md
- [ ] Entry includes: What worked, what didn't, key decisions
- [ ] Prevention measures documented
- [ ] Next steps listed
- [ ] Related docs updated (README, deployment, etc.)
- [ ] Commit message references context update

## Tips

**Be specific:**
- ❌ "Fixed bug" 
- ✅ "Fixed Development Task not appearing by adding taskId to backend response"

**Include rationale:**
- ❌ "Used git operations"
- ✅ "Used git operations as primary signal because they're most reliable (95%+)"

**Document prevention:**
- ❌ "Fixed port issue"
- ✅ "Fixed port issue, added pre-deployment check, automated in safe script"

**Capture decisions:**
- ❌ "Changed timeout"
- ✅ "Changed timeout to 60s because 20s was too short for complex tasks"

**Link to docs:**
- Always list new/updated documentation files
- Makes it easy to find related information

## Benefits

✅ Future work starts with current context  
✅ Decisions and rationale preserved  
✅ Errors don't repeat - lessons captured  
✅ Team members get accurate information  
✅ AI assistants work with latest knowledge  
✅ Onboarding is faster and easier  

## Remember

```
Stale context = Wasted time
Fresh context = Fast progress

Update context = Help future you
```
