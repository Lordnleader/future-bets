# Future Bets Data Sourcing And Signal Logic

Future Bets should reason in layers:

1. Detect raw signals from trusted free/public sources.
2. Cluster related signals inside the same place, theme, and time window.
3. Pair or converge 2-3 signals from different source layers.
4. Infer what is becoming more likely.
5. Write the implication in plain English.

This is pattern synthesis, not single-headline summarization.

## Topic universe

Future Bets should cover a broad but coherent worldview rather than a narrow niche. The data model now needs to be able to represent at least these topic areas even before every source integration is live:

- `AI & Automation`
- `Robotics & Physical Automation`
- `Political Stability & State Capacity`
- `Polarization, Trust & Social Tension`
- `Labour & Economic Opportunity`
- `Health & Human Wellbeing`
- `Birth Rates & Demographic Resilience`
- `Climate, Hazard & Resilience`
- `Food Systems & Resource Pressure`
- `Energy, Infrastructure & Logistics`
- `Cities, Housing & Liveability`
- `Values, Culture & Human Mood`

The same bet may span multiple topic areas. Example: a city-level labour shortage story can sit inside `Labour & Economic Opportunity`, `Robotics & Physical Automation`, and `Cities, Housing & Liveability` at once.

## Worldview dimensions

To avoid repetitive cards that only reshuffle categories, each signal and final bet should be able to express one or more worldview dimensions:

- `power`
- `technology`
- `labour`
- `health`
- `demographics`
- `climate`
- `social_mood`
- `governance`
- `infrastructure`
- `resources`

These dimensions are not a replacement for categories. They are cross-cutting framing metadata for clustering, filtering, and editorial balance.

## Viability framing

Future Bets is about directional change, not static description. The model should support explicit viability axes such as:

- `more_viable`
- `more_fragile`
- `more_risky`
- `more_attractive`
- `more_strategic`
- `more_automatable`
- `less_automatable`
- `more_cohesive`
- `less_cohesive`
- `more_resilient`
- `less_resilient`

This lets the same topic universe express both good bets and bad bets without becoming philosophically vague.

## Priority source stack

### 1. News and current-event discovery

- `GDELT`
  - Role: global discovery, topic detection, burst detection, geography tagging, cluster seeds.
  - Why first: broad coverage, frequent updates, free/open access, useful for event and media attention changes.
  - Constraint: noisy; should not be used alone for final bets.

### 2. Structural long-term context

- `World Bank Indicators`
  - Role: country and regional structural baselines, slow-moving context, historical comparison.
- `ILOSTAT`
  - Role: labour-market structure, participation, unemployment, sector composition, informality.
  - Implementation note: use the official bulk indicator CSV downloads rather than guessed query endpoints.
- `EIA`
  - Role: energy demand, prices, outages, electricity system context, supply pressure.
- `V-Dem`
  - Role: democracy, liberalism, civil liberties, corruption, polarization, institutional strength.
- `WHO Global Health Observatory`
  - Role: health burden, mortality, maternal and child health, disease patterns.
- `UN Population / Population Portal`
  - Role: fertility, ageing, migration, urbanization, workforce shrinkage or growth.
- `OECD.AI`
  - Role: AI policy, capability, and adoption context where coverage is strong.

### 3. Official event and hazard feeds

- `USGS earthquake feeds`
  - Role: concrete disruption events with timestamps, magnitude, and location.

### 4. Geographic and infrastructure context

- `OpenStreetMap / Overpass`
  - Role: infrastructure adjacency, asset density, port/rail/hospital/power features, local context.

### 5. Platform and research activity

- `GitHub API`
  - Role: open-source momentum, repo activity, contributor energy, ecosystem traction.
- `Hugging Face Hub API`
  - Role: model publication velocity, benchmark churn, open-model momentum.
- `arXiv API`
  - Role: research activity, topical acceleration, capability-adjacent paper bursts.

## Later additions

- `ACLED` for conflict, protests, and instability
- `FAOSTAT` for food and agriculture structure
- `UNESCO UIS` for education system context
- `Eurostat`, `OECD`, `IMF`, `UNdata` for higher-resolution regional macro context
- `NASA FIRMS` and `Copernicus` for fire and climate-environment layers

## Recommended first implementation stack for broad coverage

Use this order to avoid overloading V2:

1. `GDELT`
2. `World Bank Indicators`
3. `ILOSTAT`
4. `V-Dem`
5. `WHO GHO`
6. `UN Population`
7. `OpenStreetMap / Overpass`
8. `OECD.AI`
9. `GitHub API`
10. `arXiv API`
11. `Hugging Face Hub API`

This is sequencing guidance, not a requirement to integrate everything at once.

## Recommended source roles

### GDELT

Use for:

- burst detection
- article clustering
- topic/keyword discovery
- location-linked media attention
- early warning candidates

Do not use alone for:

- final directional judgment
- confidence assignment
- claims about structural change

### World Bank / ILOSTAT / EIA

Use for:

- base rates
- structural direction
- denominators and context
- country comparisons
- long-term constraint identification

### USGS / official hazard feeds

Use for:

- event confirmation
- precise timestamps
- concrete disruption severity

### Overpass / OSM

Use for:

- asset proximity
- local infrastructure density
- route context
- place-level operational relevance

## Pipeline design

### Stage 1. Ingest

Normalize all sources into `raw_signal` objects with:

- source metadata
- watchlist lineage
- topic areas
- topic tags
- worldview dimensions
- geography object
- category
- timestamp
- summary text
- viability framing
- freshness metadata
- optional structured metrics

### Stage 2. Filter

Discard weak or noisy signals:

- duplicate news rewrites
- signals with low geographic clarity
- source-poor outliers
- low-quality topic matches

### Stage 3. Cluster

Create `signal_cluster` objects by grouping raw signals on:

- geography overlap
- category overlap
- time-window overlap
- entity/theme overlap

### Stage 4. Converge

Create `signal_convergence` objects only when at least two source layers connect:

- news + structural
- news + official
- news + geo context
- structural + official

Preferred pattern:

- `1 current-event/news signal`
- `1 structural signal`
- `0-1 official or geo-context signal`

### Stage 5. Infer

Turn a convergence into a directional judgment:

- Good Bet: viability, resilience, attractiveness, or strategic relevance appears to be rising
- Bad Bet: fragility, exposure, cost, or dependence appears to be worsening

### Stage 6. Editorialize

Write a final `future_bet` only when the convergence passes:

- Curiosity test: a future-curious person would care
- Implication test: a person could build, avoid, move, study, or monitor differently because of it

When the question is philosophical, use measurable proxies rather than pretending the source can answer it directly.

Examples:

- “Are people getting nicer?” -> use tolerance, trust, antagonism, and civic-confidence proxies
- “Is democracy healthier?” -> use civil liberties, opposition space, corruption, and participation proxies
- “Is AI making a sector more automatable?” -> combine capability signals, labour pressure, and adoption or regulatory evidence

## Scoring logic

Use a simple weighted system first.

### Raw signal score

Suggested inputs:

- source quality
- recency
- geographic precision
- category relevance
- topic-tag alignment
- article or dataset prominence
- novelty versus recent local baseline

### Convergence score

Suggested inputs:

- number of source layers represented
- strength of geographic overlap
- strength of thematic overlap
- independence of sources
- persistence over time

### Confidence mapping

- `Low`
  - only two signals
  - weak geographic overlap or weak structural evidence
- `Medium`
  - two strong layers or three moderate layers
  - clear implication, but still reversible
- `High`
  - multiple independent sources
  - robust geography match
  - persistent pattern or official confirmation

## Minimal implementation plan

### V1.1

- ingest `GDELT`
- ingest `World Bank Indicators`
- define geography normalizer
- create `raw_signal`, `signal_cluster`, `signal_convergence`, `future_bets` JSON outputs

### V1.2

- add `Overpass`
- add `USGS`
- add rule-based convergence templates

### V1.3

- add `EIA`
- add `ILOSTAT`
- improve confidence scoring

### V2 direction now in progress

- prefer 30-day fresh evidence windows
- allow 90-day active evidence only when reinforced by newer signals
- downrank weak single-headline news matches aggressively
- carry `topic_tags` through the model so broader topic expansion does not rely only on category labels
- carry `topic_areas`, `worldview_dimensions`, and `viability_axes` through the model so the product can cover a much larger intellectual surface area without collapsing into repetitive cards
- expose explicit freshness metadata so the site and nightly jobs can filter stale bets safely
- phase in new source families gradually instead of wiring every API at once

## Example convergence templates

### Policy plus labour structure

- News: new labour or visa policy change
- Structural: labour shortage or wage pressure data
- Output: region becoming more attractive or more difficult for a type of employer

### Instability plus logistics

- News: unrest or conflict escalation
- Structural: trade dependency or energy import exposure
- Geo context: port, rail, refinery, or shipping corridor proximity
- Output: bad bet on stable supply or good bet on diversification infrastructure

### Hazard plus infrastructure fragility

- Official feed: earthquake or wildfire event
- Structural: weak housing, low income, grid fragility, water stress
- Geo context: hospitals, roads, substations, evacuation bottlenecks
- Output: bad bet on unadjusted growth or good bet on resilience tooling

## How the current mock data should evolve

The current mock cards are directionally good, but many still read like editorial theses supported by only two prose bullets. They should evolve into explicit convergences with traceable signal lineage.

### Required change for every bet

Each bet should map to:

- `1 news/current signal`
- `1 structural signal`
- `0-1 official or geographic context signal`

And each paired signal should reference a real upstream signal id rather than freeform copy only.

### Specific upgrades by example

#### Secondary European cities becoming stronger startup bases

Add:

- GDELT cluster around startup support, relocation, or remote work policy in selected cities
- World Bank or Eurostat structural context for housing cost, business density, or digital infrastructure
- Overpass context for universities, rail access, airports, or coworking density if useful

This turns the item from an opinion about costs into a place-based convergence.

#### Assuming global shipping routes remain predictable

Add:

- GDELT shipping and disruption cluster
- World Bank trade or logistics performance context
- Overpass or official corridor context for ports, canals, or adjacent infrastructure

This should become one of the clearest multi-signal bets in the product.

#### Entry-level knowledge work as a stable ladder

Add:

- GDELT coverage on hiring pullbacks and AI workflow adoption
- ILOSTAT or OECD labour data for youth employment and occupational structure
- optional company-job-posting proxy later, if licensing allows

Right now this one is plausible but under-grounded.

#### Wildfire-blind suburban expansion

Add:

- GDELT local reporting on insurance retreat and fire risk
- official hazard data later from NASA FIRMS or state/federal wildfire layers
- Overpass or OSM context for road access, nearby settlements, or critical services

This would become much more operational.

#### Trust-layer tools for synthetic media

Add:

- GDELT cluster around synthetic media incidents, fraud, or election integrity
- structural context from institutional reports or policy developments
- optional later official standards context from provenance/adoption bodies

This needs a stronger current-event anchor to avoid becoming a generic AI thesis.

## Data product outputs

The system should produce four artifacts:

1. `sources.json`
2. `raw-signals.json`
3. `signal-clusters.json`
4. `future-bets.json`

Optionally add:

5. `signal-convergences.json`

This keeps the reasoning auditable and makes the editorial output defensible.
