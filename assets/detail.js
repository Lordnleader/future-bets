import {
  badgeClass,
  createMetaBadge,
  formatType,
  renderList,
  renderSignalList,
  renderSourceList,
  slugToBet,
} from "./site.js";

const detailRoot = document.querySelector("#detail-root");
const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");
const bet = slugToBet(slug);
const backHref = buildBackHref(params);

if (!bet) {
  document.title = "Future Bets";
  detailRoot.innerHTML = `
    <nav class="detail-nav">
      <a href="${backHref}">Back to feed</a>
    </nav>
    <div class="empty-state">
      <p>The requested brief could not be found.</p>
    </div>
  `;
} else {
  document.title = `${bet.title} | Future Bets`;
  detailRoot.innerHTML = `
    <nav class="detail-nav">
      <a href="${backHref}">Back to feed</a>
      <div class="meta-strip">Pattern match / ${bet.paired_signals.length} signals</div>
    </nav>

    <header class="detail-header">
      <div class="detail-header__meta">
        <span class="${badgeClass(bet.type)}">${formatType(bet.type)}</span>
        ${createMetaBadge("Category", bet.category)}
        ${createMetaBadge("Geography", bet.geography)}
        ${createMetaBadge("Horizon", bet.time_horizon)}
        ${createMetaBadge("Confidence", bet.confidence)}
      </div>
      <h1>${bet.title}</h1>
      <p class="detail-summary">${bet.summary}</p>
    </header>

    <section class="detail-layout">
      <div class="detail-content">
        <article class="detail-block">
          <h2>Why this is becoming more likely</h2>
          <p>${bet.why_now}</p>
        </article>

        <article class="detail-block">
          <h2>Why it matters</h2>
          <p>${bet.why_it_matters}</p>
        </article>

        <article class="detail-block">
          <h2>Practical implications</h2>
          <ul class="detail-list">${renderList(bet.practical_implications)}</ul>
        </article>

        <article class="detail-block">
          <h2>Second-order effects</h2>
          <ul class="detail-list">${renderList(bet.second_order_effects)}</ul>
        </article>

        <article class="detail-block">
          <h2>Signal pairing</h2>
          <ul class="signal-list">${renderSignalList(bet.paired_signals)}</ul>
        </article>
      </div>

      <aside class="detail-side">
        <article class="detail-block">
          <h3>Watch next</h3>
          <ul class="detail-list">${renderList(bet.what_to_watch)}</ul>
        </article>

        <article class="detail-block">
          <h3>What could change this view</h3>
          <ul class="detail-list">${renderList(bet.what_could_change_this)}</ul>
        </article>

        <article class="detail-block">
          <h3>Source links</h3>
          <ul class="source-list">${renderSourceList(bet.sources)}</ul>
        </article>
      </aside>
    </section>
  `;
}

function buildBackHref(searchParams) {
  const nextParams = new URLSearchParams(searchParams);
  nextParams.delete("slug");

  const query = nextParams.toString();
  return query ? `./index.html?${query}` : "./index.html";
}
