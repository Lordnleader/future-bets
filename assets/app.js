import { filters, getAllBets, renderCard } from "./site.js";

const cardsGrid = document.querySelector("#cards-grid");
const resultsMeta = document.querySelector("#results-meta");
const heroTotal = document.querySelector("#hero-total");
const heroBalance = document.querySelector("#hero-balance");

const filterEls = {
  category: document.querySelector("#category-filter"),
  geography: document.querySelector("#geography-filter"),
  timeHorizon: document.querySelector("#horizon-filter"),
  type: document.querySelector("#type-filter"),
};

const allBets = getAllBets();

populateSelect(filterEls.category, filters.categories);
populateSelect(filterEls.geography, filters.geographies);
populateSelect(filterEls.timeHorizon, filters.horizons);

heroTotal.textContent = `${allBets.length} active signals`;
heroBalance.textContent = `${filters.categories.length} categories / ${filters.geographies.length} geographies`;

Object.values(filterEls).forEach((el) => el.addEventListener("change", renderFeed));

renderFeed();

function populateSelect(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function renderFeed() {
  const filtered = allBets.filter((item) => {
    const categoryMatch =
      filterEls.category.value === "all" || item.category === filterEls.category.value;
    const geographyMatch =
      filterEls.geography.value === "all" || item.geography === filterEls.geography.value;
    const horizonMatch =
      filterEls.timeHorizon.value === "all" || item.time_horizon === filterEls.timeHorizon.value;
    const typeMatch = filterEls.type.value === "all" || item.type === filterEls.type.value;
    return categoryMatch && geographyMatch && horizonMatch && typeMatch;
  });

  resultsMeta.textContent = `${filtered.length} brief${filtered.length === 1 ? "" : "s"} visible`;

  if (!filtered.length) {
    cardsGrid.innerHTML = `
      <div class="empty-state">
        <p>No items match this filter combination. Reset one of the controls to widen the scan.</p>
      </div>
    `;
    return;
  }

  cardsGrid.innerHTML = filtered.map(renderCard).join("");
}
