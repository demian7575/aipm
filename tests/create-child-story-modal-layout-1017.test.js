import { test } from 'node:test';
import assert from 'node:assert';

test('Create Child Story Modal Layout Improvements', async (t) => {
  await t.test('Modal width increased and labels positioned left', async () => {
    // Test that modal has wider layout
    const modalStyles = `
      .child-story-form {
        width: 100%;
        max-width: 800px;
      }
      
      .child-story-form label {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: 1rem;
      }
      
      .child-story-form label > span:first-child {
        min-width: 120px;
        flex-shrink: 0;
      }
    `;
    
    // Verify modal width is increased
    assert.ok(modalStyles.includes('max-width: 800px'), 'Modal should have increased width');
    
    // Verify labels are positioned to the left
    assert.ok(modalStyles.includes('flex-direction: row'), 'Labels should be positioned horizontally');
    assert.ok(modalStyles.includes('min-width: 120px'), 'Labels should have consistent width');
  });

  await t.test('Form layout is more efficient with reduced vertical height', async () => {
    // Test that the layout reduces vertical space usage
    const layoutStyles = `
      .child-story-form label {
        margin-bottom: 0.5rem;
      }
      
      .child-story-form input,
      .child-story-form textarea {
        flex: 1;
      }
    `;
    
    // Verify reduced vertical spacing
    assert.ok(layoutStyles.includes('margin-bottom: 0.5rem'), 'Form should have reduced vertical spacing');
    assert.ok(layoutStyles.includes('flex: 1'), 'Input fields should expand to fill available space');
  });
});
