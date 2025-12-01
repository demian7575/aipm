# User Story Fields - Textarea Implementation

## Status: ✅ Already Implemented

The "As a/I want/So that" fields are already implemented as multi-line textareas, not single-line text inputs.

## Implementation Details

### Edit Story Form (app.js lines 3831-3841)
```javascript
<tr>
  <th scope="row">As a</th>
  <td><textarea name="asA">${escapeHtml(story.asA || '')}</textarea></td>
</tr>
<tr>
  <th scope="row">I want</th>
  <td><textarea name="iWant">${escapeHtml(story.iWant || '')}</textarea></td>
</tr>
<tr>
  <th scope="row">So that</th>
  <td><textarea name="soThat">${escapeHtml(story.soThat || '')}</textarea></td>
</tr>
```

### Create Child Story Form (app.js lines 5833-5843)
```javascript
<tr>
  <th scope="row">As a</th>
  <td><textarea id="child-asa"></textarea></td>
</tr>
<tr>
  <th scope="row">I want</th>
  <td><textarea id="child-iwant"></textarea></td>
</tr>
<tr>
  <th scope="row">So that</th>
  <td><textarea id="child-sothat"></textarea></td>
</tr>
```

### Styling (styles.css line 901-903)
```css
.story-brief textarea {
  min-height: 3.25rem;
}
```

## Acceptance Criteria: ✅ Met

All "As a/I want/So that" fields use textarea elements allowing multi-line text input.
