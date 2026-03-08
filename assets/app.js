import { createFilterQuery, filters, getAllBets, renderCard } from "./site.js";

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

applyInitialFilterState();

heroTotal.textContent = `${allBets.length} active signals`;
heroBalance.textContent = `${filters.categories.length} categories / ${filters.geographies.length} geographies`;

Object.values(filterEls).forEach((el) => el.addEventListener("change", renderFeed));
cardsGrid.addEventListener("click", handleGridClick);

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
  syncFilterStateToUrl();

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
        <div class="empty-state__actions">
          <button class="empty-state__button" type="button" data-reset-filters>Reset filters</button>
        </div>
      </div>
    `;
    return;
  }

  const filterQuery = createFilterQuery(getFilterValues());
  cardsGrid.innerHTML = filtered.map((item, index) => renderCard(item, index, filterQuery)).join("");
}

function applyInitialFilterState() {
  const params = new URLSearchParams(window.location.search);

  Object.entries(filterEls).forEach(([key, el]) => {
    const nextValue = params.get(key);
    if (nextValue) {
      el.value = nextValue;
    }
  });
}

function getFilterValues() {
  return {
    category: filterEls.category.value,
    geography: filterEls.geography.value,
    timeHorizon: filterEls.timeHorizon.value,
    type: filterEls.type.value,
  };
}

function syncFilterStateToUrl() {
  const params = new URLSearchParams(window.location.search);

  Object.entries(getFilterValues()).forEach(([key, value]) => {
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });

  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
}

function resetFilters() {
  Object.values(filterEls).forEach((el) => {
    el.value = "all";
  });

  renderFeed();
}

function handleGridClick(event) {
  if (!event.target.closest("[data-reset-filters]")) {
    return;
  }

  resetFilters();
}
