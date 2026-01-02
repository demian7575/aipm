# Assignee Field Guide

## Format
**Assignee**: [email@domain.com]

## Requirements
- **Format**: Valid email address
- **Validation**: Must match email pattern
- **Required**: Yes (all stories must have assignee)
- **Example**: "developer@example.com"

## Email Validation Rules
- Must contain @ symbol
- Valid domain format
- No spaces or special characters (except @ and .)
- Case insensitive

## Valid Examples
```
john.doe@company.com
developer@example.org
pm@startup.io
team.lead@enterprise.co.uk
```

## Invalid Examples
```
john.doe              # Missing domain
@company.com          # Missing username
john@                 # Missing domain
john doe@company.com  # Contains spaces
john@company          # Missing TLD
```

## AIPM System Integration

### Workload Tracking
- Used in Employee Heat Map calculations
- Enables per-assignee workload distribution
- Supports component effort analysis

### Email Integration
- Clickable mailto links in UI
- Notification system integration
- Team communication workflows

### Reporting
- Assignee-based filtering
- Individual progress tracking
- Resource allocation analysis

## Best Practices
- Use corporate email addresses
- Maintain consistent domain usage
- Assign to individual developers, not teams
- Update assignee when work is transferred
