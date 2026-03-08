# Future Bets Product Roadmap

## Product Definition

Future Bets is a disciplined editorial intelligence system for directional change. It scans a broad but controlled set of domains, detects meaningful signal convergence, and publishes a constrained daily set of source-backed predictions about what is becoming more viable, fragile, risky, attractive, or strategically important.

It is not trying to predict everything. It is trying to surface the most decision-relevant directional shifts from verified evidence.

## Core Principles

- Predictions come from converging signals, not isolated headlines.
- Recent evidence carries more weight than stale evidence.
- Verified, source-backed inputs are preferred over inferred or manually shaped ones.
- Daily output is constrained to avoid overload.
- Coverage should be broad, but controlled and coherent.
- The system should improve through better rules, ranking, memory, and evaluation.
- The product must remain honest about uncertainty and limits.

## System Architecture

The system should be understood as:

`sources -> signals -> clustered patterns -> ranked predictions -> published output -> later evaluation`

### 1. Source Ingestion

Purpose:
Collect raw inputs from free, open, or clearly limited sources across selected domains.

Examples:

- current-event/news discovery
- structural datasets
- official event feeds
- geospatial context
- later: platform/research activity, surveys, topic-specific institutional sources

Output:
Normalized raw records with source, timestamp, geography, topic metadata, and extractable evidence.

### 2. Signal Detection

Purpose:
Convert raw source inputs into usable signals.

A signal is a structured observation that something relevant may be changing.

Examples:

- burst in shipping disruption coverage
- youth unemployment increase
- recent seismic activity near a dense urban system
- heat stress signal in a water-vulnerable metro area

Output:
A scored signal object with freshness, source quality, geography, topic tags, and summary.

### 3. Clustering / Pattern Formation

Purpose:
Group related signals into candidate patterns.

Signals should be clustered by:

- geography
- domain/topic
- time window
- shared entities or operating context
- directional alignment

Goal:
Move from isolated evidence to pattern candidates.

### 4. Ranking

Purpose:
Decide which clustered patterns deserve to become predictions.

Predictions should be ranked by a weighted mix of:

- convergence strength
- source quality
- freshness
- cross-domain reinforcement
- decision relevance
- novelty
- noise / duplication penalty

This is not "most articles wins."
It is "strongest, freshest, most decision-relevant convergences win."

### 5. Prediction Generation

Purpose:
Turn the highest-ranked patterns into clear directional predictions.

A prediction should be explicit, bounded, and useful.
It should avoid vague "future of x" phrasing.

### 6. Publishing

Purpose:
Publish a constrained daily set of predictions.

Publishing rules:

- target around 20 per day long-term
- fewer is acceptable if quality is not there
- do not fill slots with weak predictions
- enforce topic diversity so one domain does not dominate

### 7. Later Evaluation

Purpose:
Revisit published predictions as new evidence arrives.

This is where memory begins to turn the system into a learning process.

## Prediction Object

Each published prediction should have a strict structure.

Required fields:

- `claim`
- `time_horizon`
- `direction`
- `confidence`
- `supporting_signals`
- `domain_tag`
- `why_this_matters`

Recommended additional fields:

- `geography`
- `freshness_status`
- `prediction_state`
- `counter_signals`
- `what_to_watch`
- `what_could_change_this`
- `published_at`
- `source_links`

### Prediction Object Definition

- `claim`: a clear directional statement
- `time_horizon`: near / mid / long term
- `direction`: what is becoming more or less viable / resilient / risky / attractive / strategic
- `confidence`: low / medium / high
- `supporting_signals`: 2 to 5 linked signal objects
- `domain_tag`: primary domain classification
- `why_this_matters`: why a curious or decision-making reader should care

## Broad but Coherent Coverage

The system should not attempt equal coverage of everything at all times.

Instead it should use:

- core domains always watched
- adjacent domains watched opportunistically
- diversity rules at ranking/publishing time

### Core Domains

These should be continuously monitored:

- technology and automation
- labour and opportunity
- demographics
- climate and resilience
- infrastructure and logistics
- governance and political stability
- health and wellbeing
- social mood / trust

### Adjacent Domains

These can be added when evidence quality is strong:

- food systems
- housing/liveability
- energy
- robotics
- research/platform momentum
- cultural/value shifts

### Diversity Rules

Daily output should prevent domination by one topic family.

Example rules:

- no more than 3 predictions from one domain in the daily 20
- no more than 2 very similar geography/type combinations unless unusually strong
- prefer cross-domain spread when scores are close

## Ranking Philosophy

Ranking should reward:

- multiple independent signals pointing the same way
- stronger source types
- fresher evidence
- cross-domain reinforcement
- practical decision relevance
- unusual but well-supported developments

Ranking should penalize:

- duplicate headlines
- single-source narratives
- stale patterns
- weak geographic fit
- vague claims
- crowded prediction sets with low marginal value

## Memory and Evaluation Model

Predictions should not just be stored. They should move through states over time.

Suggested states:

- `Emerging`
- `Strengthening`
- `Stable`
- `Contested`
- `Weakening`
- `Resolved`
- `Failed`

The evaluation system should later revisit predictions and ask:

- was newer evidence reinforcing?
- was it weakening?
- was it contradicted?
- did the pattern resolve into a clearer outcome?
- did the original claim fail?

This does not require heavy ML at first.
It requires:

- historical storage
- periodic review logic
- evidence comparison over time
- explicit status updates

That is the beginning of learning.

## Methodology / Trust Layer

Methodology should be visible product infrastructure, not hidden background documentation.

The product should clearly explain:

- what counts as a signal
- how convergence works
- how freshness is weighted
- how confidence is assigned
- what the system does not claim to do
- how predictions are revisited over time

The product should explicitly not claim:

- certainty
- magical forecasting
- complete coverage
- autonomous truth detection

It should present itself as a disciplined, source-backed system for directional inference.

## Roadmap by Capability

### MVP: Reliable Signal-to-Prediction Pipeline

Goal:
Prove the system can reliably transform signals into a small set of credible published predictions.

Capabilities:

- structured source ingestion
- normalized signal objects
- basic convergence logic
- simple ranking
- small daily prediction set
- visible methodology
- static publishing
- manual shaping where needed
- evidence verification baseline

What MVP proves:

- the system can produce credible directional predictions from converging evidence
- the publishing loop works
- the product is useful enough to expand

### V2: Broader Coverage, Stronger Ranking, Diversity Controls

Goal:
Expand topic breadth without losing coherence.

Capabilities:

- more source families
- stronger ranking model
- topic diversity constraints
- better duplication/noise penalties
- richer domain coverage
- stronger verification/review loops
- better multi-signal convergence

What V2 proves:

- the system can scale breadth while staying readable and trustworthy

### V3: Memory, Historical Evaluation, Feedback Loops

Goal:
Make the system aware of its own history.

Capabilities:

- prediction archive
- state transitions over time
- evaluation against later evidence
- source usefulness tracking
- pattern-template refinement
- confidence calibration improvements

What V3 proves:

- the system is not just generating predictions
- it is learning which patterns hold and which weaken

### Long-Term Vision: Disciplined Semi-Learning Directional Intelligence Engine

Goal:
Create a broader, smarter, historically grounded system for directional change detection.

Capabilities:

- richer multi-source graph
- stronger ranking and balancing
- historical feedback loops
- smarter source weighting
- better prediction revision behavior
- limited learning from prior performance
- more robust daily top-20 output

What this becomes:

A disciplined directional intelligence engine, not a magical AI oracle.

## One-Paragraph Product Summary

Future Bets is a source-backed pattern-recognition product that publishes a constrained daily set of directional predictions about what the world is making more viable, fragile, risky, attractive, or strategically important. It works by detecting signals across multiple domains, clustering them into meaningful patterns, ranking the strongest convergences, and turning them into clear predictions with visible evidence, explicit uncertainty, and later evaluation over time.

## One-Sentence Positioning Line

Future Bets is a disciplined daily intelligence product that turns converging real-world signals into clear, source-backed predictions about directional change.

## Draft Prediction Schema

```json
{
  "id": "pred-001",
  "claim": "Urban water resilience is becoming a more decisive constraint in major Indian metros.",
  "time_horizon": "Long term: 3-10 years",
  "direction": "more_fragile",
  "confidence": "Medium",
  "domain_tag": "Climate & Environment",
  "geography": {
    "label": "India",
    "scope": "country",
    "country_codes": ["IND"]
  },
  "why_this_matters": "Water stress is shifting from an environmental issue to an operating constraint for building, manufacturing, and urban growth.",
  "supporting_signals": [
    {
      "signal_id": "sig-001",
      "source": "news_aggregation",
      "title": "Groundwater overdraw signal",
      "detected_at": "2026-03-07T02:45:00Z"
    },
    {
      "signal_id": "sig-002",
      "source": "news_aggregation",
      "title": "Early urban heat signal",
      "detected_at": "2026-03-07T08:15:00Z"
    },
    {
      "signal_id": "sig-003",
      "source": "institutional_dataset",
      "title": "Urbanization structural pressure",
      "detected_at": "2024-01-01T00:00:00Z"
    }
  ],
  "freshness_status": "fresh",
  "prediction_state": "Emerging",
  "what_to_watch": [
    "Rationing events",
    "Urban heat persistence",
    "Water infrastructure investment"
  ],
  "what_could_change_this": [
    "Major infrastructure improvements",
    "A run of milder seasons"
  ],
  "counter_signals": [],
  "published_at": "2026-03-08T09:00:00Z",
  "source_links": [
    {
      "title": "Example source",
      "url": "https://example.com"
    }
  ]
}
```
