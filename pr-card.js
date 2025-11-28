// Add a "Run in Staging" button to each PR card on the Development Tasks board
const runInStagingButton = document.createElement("button");
runInStagingButton.textContent = "Run in Staging";
runInStagingButton.addEventListener("click", () => {
  // Add logic to deploy the PR to the staging environment
});
prCardElement.appendChild(runInStagingButton);