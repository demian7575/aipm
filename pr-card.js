// Add a 'Run in Staging' button to each PR card in the Development Tasks board
const runInStagingButton = document.createElement("button");
runInStagingButton.textContent = "Run in Staging";
runInStagingButton.addEventListener("click", () => {
  // Implement logic to deploy the PR to the staging environment
  console.log("Deploying PR to staging...");
});
const prCard = document.querySelector(".pr-card");
prCard.appendChild(runInStagingButton);