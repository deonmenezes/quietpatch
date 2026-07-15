const reviewButton = document.querySelector("#review-button");

reviewButton?.addEventListener("click", () => {
  document.querySelector("#results")?.removeAttribute("hidden");
  document.querySelector("#results-content").innerHTML = `
    <div class="notice">The comparison engine arrives in the next patch.</div>
  `;
});

