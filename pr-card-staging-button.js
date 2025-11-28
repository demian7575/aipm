// Add 'Run In Staging' button to each PR card on the Development Tasks board

const prCards = document.querySelectorAll(".pr-card");

prCards.forEach((card) => {
  const btn = document.createElement("button");
  btn.textContent = "Run In Staging";
  btn.addEventListener("click", () => {
    // Add logic to deploy the PR to staging environment
    console.log("Deploying PR to staging...");
  });
  card.appendChild(btn);
});