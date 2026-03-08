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

export function renderSelectionCard(item) {
  return `
    <article class="selection-card">
      <div class="selection-card__top">
        <span class="${badgeClass(item.type)}">${formatType(item.type)}</span>
        <span class="pill">${item.confidence} confidence</span>
      </div>
      <p class="selection-card__context">${item.category} / ${item.geography}</p>
      <h2>${item.title}</h2>
      <p class="selection-card__summary">${item.summary}</p>
      <div class="selection-card__divider"></div>
      <div class="selection-card__block">
        <strong>Practical implication</strong>
        <p>${item.implication}</p>
      </div>
      <div class="selection-card__meta">
        <span class="badge">${item.time_horizon}</span>
        <span class="badge">${item.paired_signals.length} signals</span>
      </div>
      <div class="selection-card__actions">
        <button class="selection-card__action" type="button" data-scroll-report>Open brief</button>
        <button class="selection-card__action" type="button" data-scroll-sources>Sources</button>
      </div>
      <a class="selection-card__fallback" href="./detail.html?slug=${encodeURIComponent(item.slug)}">Open standalone page</a>
    </article>
  `;
}

export function renderReport(item) {
  return `
    <article class="report-article">
      <header class="report-article__header">
        <div class="report-article__meta">
          <span class="${badgeClass(item.type)}">${formatType(item.type)}</span>
          ${createMetaBadge("Category", item.category)}
          ${createMetaBadge("Geography", item.geography)}
          ${createMetaBadge("Horizon", item.time_horizon)}
        </div>
        <h3>${item.title}</h3>
        <p class="report-article__summary">${item.summary}</p>
      </header>

      <div class="report-article__grid">
        <article class="report-block">
          <h4>Why this is becoming more likely</h4>
          <p>${item.why_now}</p>
        </article>

        <article class="report-block">
          <h4>Why this matters</h4>
          <p>${item.why_it_matters}</p>
        </article>

        <article class="report-block">
          <h4>Signal breakdown</h4>
          <ul class="signal-list">${renderSignalList(item.paired_signals)}</ul>
        </article>

        <article class="report-block" id="report-sources">
          <h4>Sources</h4>
          <ul class="source-list">${renderSourceList(item.sources)}</ul>
        </article>

        <article class="report-block">
          <h4>Methodology note</h4>
          <p>
            This brief is built from converging signals rather than a single headline. The goal is
            a directional read on what looks more viable or more fragile, while staying explicit
            about uncertainty.
          </p>
        </article>
      </div>
    </article>
  `;
}

export function renderReportPlaceholder() {
  return `
    <article class="report-placeholder">
      <p class="report-placeholder__label">Awaiting selection</p>
      <p class="report-placeholder__title">Select a bet above to inspect the full brief.</p>
      <p class="report-placeholder__copy">
        The report area will expand with rationale, paired signals, and linked sources once a bet
        is pulled out of the network.
      </p>
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
          <div class="signal__header">
            <h5>${signal.title}</h5>
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
