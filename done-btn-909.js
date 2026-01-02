/**
 * Fix Done button functionality for PR 909
 */
function fixDoneButton909() {
  const doneBtn = document.querySelector('.done-btn');
  if (doneBtn) {
    doneBtn.onclick = () => {
      doneBtn.disabled = false;
      return true;
    };
  }
}

fixDoneButton909();
