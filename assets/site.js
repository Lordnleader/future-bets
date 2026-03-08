import { futureBets } from "../data/future-bets.js";

export const filters = {
  categories: [...new Set(futureBets.map((item) => item.category))].sort(),
  geographies: [...new Set(futureBets.map((item) => item.geography))].sort(),
  horizons: [
    "Near term: 0-12 months",
    "Mid term: 1-3 years",
    "Long term: 3-10 years",
  ],
};

export function getAllBets() {
  return futureBets.slice().sort((a, b) => a.sort_order - b.sort_order);
}

export function formatType(type) {
  return type === "good" ? "Good Bet" : "Bad Bet";
}

export function badgeClass(type) {
  return type === "good" ? "pill pill--good" : "pill pill--bad";
}

export function slugToBet(slug) {
  return futureBets.find((item) => item.slug === slug);
}

export function createFilterQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "all") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return queryString ? `&${queryString}` : "";
}

export function createMetaBadge(label, value) {
  return `<span class="badge"><span class="detail-meta__label">${label}</span>${value}</span>`;
}

export function renderCard(item, index = 0, filterQuery = "") {
  return `
    <article class="card">
      <div class="card__top">
        <span class="${badgeClass(item.type)}">${formatType(item.type)}</span>
        <span class="pill">${item.confidence} confidence</span>
      </div>
      <div>
        <p class="section-label">${item.category} / ${item.geography}</p>
        <h3>${item.title}</h3>
      </div>
      <p class="card__summary">${item.summary}</p>
      <div class="card__implication">
        <strong>Practical implication</strong>
        <p>${item.implication}</p>
      </div>
      <div class="card__meta">
        <span class="badge">${item.time_horizon}</span>
        <span class="badge">${item.paired_signals.length} signals</span>
        <a class="badge" href="./detail.html?slug=${encodeURIComponent(item.slug)}${filterQuery}">Open brief</a>
      </div>
    </article>
  `;
}

export function renderSourceList(sources) {
  return sources
    .map(
      (source) => `
        <li>
          <strong>${source.title}</strong>
          <p>${source.note}</p>
          <a href="${source.url}" target="_blank" rel="noopener noreferrer">Source link</a>
        </li>
      `,
    )
    .join("");
}

export function renderSignalList(signals) {
  return signals
    .map(
      (signal) => `
        <li class="signal">
          <div class="card__top">
            <h3>${signal.title}</h3>
            <span class="badge">${signal.source_type}</span>
          </div>
          <p><strong>Why it matters</strong><br />${signal.why_it_matters}</p>
          <p><strong>Connection</strong><br />${signal.connection}</p>
        </li>
      `,
    )
    .join("");
}

export function renderList(items) {
  return items.map((item) => `<li>${item}</li>`).join("");
}
