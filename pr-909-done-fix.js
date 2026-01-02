/**
 * Fix Done button functionality for PR #909
 */
function fixDoneButtonPR909() {
  const doneButton = document.querySelector('.done-button, [data-status="Done"]');
  if (doneButton) {
    doneButton.addEventListener('click', function(e) {
      e.preventDefault();
      this.disabled = false;
      this.classList.add('active');
    });
  }
}

document.addEventListener('DOMContentLoaded', fixDoneButtonPR909);

module.exports = { fixDoneButtonPR909 };
