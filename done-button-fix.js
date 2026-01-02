/**
 * Fix Done button functionality
 */
function fixDoneButton() {
  const doneButton = document.querySelector('.done-button');
  if (doneButton) {
    doneButton.addEventListener('click', function() {
      this.disabled = false;
      this.textContent = 'Done';
    });
  }
}

// Initialize fix
document.addEventListener('DOMContentLoaded', fixDoneButton);

module.exports = { fixDoneButton };
