# Future Bets

Future Bets is a static editorial micro-site for reading directional forecasts about what the world is making more viable, more fragile, more expensive, or more strategically important.

## V1 architecture

- Static HTML, CSS, and JavaScript
- Mock editorial data in [`data/future-bets.js`](/Users/robbietighe/Documents/Future Bets/data/future-bets.js)
- JSON schema in [`data/future-bets.schema.json`](/Users/robbietighe/Documents/Future Bets/data/future-bets.schema.json)
- Source registry in [`data/source-registry.json`](/Users/robbietighe/Documents/Future Bets/data/source-registry.json)
- Signal logic spec in [`docs/data-sourcing-and-signal-logic.md`](/Users/robbietighe/Documents/Future Bets/docs/data-sourcing-and-signal-logic.md)
- Homepage feed in [`index.html`](/Users/robbietighe/Documents/Future Bets/index.html)
- Detail template in [`detail.html`](/Users/robbietighe/Documents/Future Bets/detail.html)

## Folder structure

```text
.
├── assets/
│   ├── app.js
│   ├── detail.js
│   ├── signal-map.svg
│   ├── site.js
│   └── styles.css
├── data/
│   ├── future-bets.js
│   ├── future-bets.schema.json
│   └── source-registry.json
├── docs/
│   └── data-sourcing-and-signal-logic.md
├── detail.html
├── index.html
└── README.md
```

## Content model

The schema now supports the full pipeline:

- `sources`
- `raw_signals`
- `signal_clusters`
- `signal_convergences`
- `future_bets`

Each final Future Bet includes:

- Core identity: `id`, `slug`, `sort_order`, `title`
- Classification: `type`, `category`, `geography`, `time_horizon`, `confidence`
- Editorial copy: `summary`, `implication`, `why_now`
- Decision layers: `second_order_effects`, `what_to_watch`, `what_could_change_this`
- Signal synthesis: `paired_signals[]`, `source_logic`
- References: `sources[]`

## Run locally

Because this is a static site with ES modules, run it behind a local server rather than opening files directly in the browser.

Examples:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Deploy

This V1 will deploy cleanly to any static host:

- GitHub Pages
- Netlify
- Vercel static deployment
- Cloudflare Pages

No database, auth, or paid API is required.


## Signal Pipeline

The first data pipeline lives in [`scripts/generate_signal_data.py`](/Users/robbietighe/Documents/Future Bets/scripts/generate_signal_data.py).

It currently:

- pulls current-event discovery from `GDELT`
- pulls structural context from `World Bank Indicators`
- pulls labour-market context from official `ILOSTAT` bulk indicator CSV downloads
- normalizes both into `raw_signal` objects
- groups related signals into simple clusters
- creates draft convergences and evidence-backed Future Bet candidates
- writes outputs to [`data/generated/`](/Users/robbietighe/Documents/Future Bets/data/generated)

The generated model now carries:

- `watchlist_id` traceability on raw signals
- `topic_tags[]` across signals, convergences, and bets
- `freshness` metadata so downstream consumers can tell `fresh`, `active`, and `reference` evidence apart

Run it with:

```bash
python3 scripts/generate_signal_data.py
```


Run all watchlists sequentially with a short pause to reduce rate-limit issues:

```bash
python3 scripts/run_watchlists.py
```

Run a specific watchlist:

```bash
python3 scripts/run_watchlists.py --watchlist japan-seismic-readiness
```

## Nightly refresh

A scheduled GitHub Actions workflow is prepared at [`.github/workflows/nightly-data-refresh.yml`](/Users/robbietighe/Documents/New project 2/.github/workflows/nightly-data-refresh.yml).

It is intended to:

- run the watchlists every night
- regenerate the merged JSON artifacts
- validate that the main generated files are still parseable JSON
- upload the refreshed dataset as a workflow artifact
