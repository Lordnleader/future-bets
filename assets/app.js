import {
  getAllBets,
  renderReport,
  renderReportPlaceholder,
  renderSelectionCard,
  slugToBet,
} from "./site.js";

const homeShell = document.querySelector("#home-shell");
const landingScreen = document.querySelector("#landing-screen");
const landingScene = document.querySelector("#landing-scene");
const enterButton = document.querySelector("#enter-button");
const resetButton = document.querySelector("#reset-button");
const selectionCard = document.querySelector("#selection-card");
const reportSection = document.querySelector("#report-section");
const reportContent = document.querySelector("#report-content");
const networkStage = document.querySelector("#network-stage");
const networkSvg = document.querySelector("#network-svg");
const networkLabels = document.querySelector("#network-labels");

const state = {
  entered: false,
  selectedSlug: null,
  hoveredSlug: null,
};

let landingSceneController = null;

const supportNodes = [
  { id: "s-01", x: 144, y: 414 },
  { id: "s-02", x: 206, y: 302 },
  { id: "s-03", x: 238, y: 520 },
  { id: "s-04", x: 284, y: 214 },
  { id: "s-05", x: 326, y: 146 },
  { id: "s-06", x: 338, y: 402 },
  { id: "s-07", x: 372, y: 282 },
  { id: "s-08", x: 404, y: 214 },
  { id: "s-09", x: 434, y: 108 },
  { id: "s-10", x: 454, y: 358 },
  { id: "s-11", x: 486, y: 178 },
  { id: "s-12", x: 502, y: 468 },
  { id: "s-13", x: 532, y: 132 },
  { id: "s-14", x: 560, y: 286 },
  { id: "s-15", x: 586, y: 418 },
  { id: "s-16", x: 628, y: 204 },
  { id: "s-17", x: 654, y: 524 },
  { id: "s-18", x: 682, y: 142 },
  { id: "s-19", x: 712, y: 326 },
  { id: "s-20", x: 752, y: 214 },
  { id: "s-21", x: 784, y: 434 },
  { id: "s-22", x: 822, y: 184 },
  { id: "s-23", x: 852, y: 308 },
  { id: "s-24", x: 892, y: 542 },
  { id: "s-25", x: 514, y: 618 },
  { id: "s-26", x: 338, y: 606 },
  { id: "s-27", x: 674, y: 610 },
  { id: "s-28", x: 934, y: 598 },
  { id: "s-29", x: 522, y: 238 },
  { id: "s-30", x: 574, y: 206 },
  { id: "s-31", x: 614, y: 274 },
  { id: "s-32", x: 548, y: 346 },
  { id: "s-33", x: 456, y: 256 },
  { id: "s-34", x: 690, y: 236 },
  { id: "s-35", x: 734, y: 308 },
  { id: "s-36", x: 604, y: 402 },
  { id: "s-37", x: 388, y: 186 },
  { id: "s-38", x: 424, y: 244 },
  { id: "s-39", x: 564, y: 186 },
  { id: "s-40", x: 644, y: 214 },
  { id: "s-41", x: 722, y: 266 },
  { id: "s-42", x: 780, y: 366 },
  { id: "s-43", x: 724, y: 468 },
  { id: "s-44", x: 590, y: 558 },
  { id: "s-45", x: 404, y: 556 },
  { id: "s-46", x: 292, y: 470 },
];

const betLayouts = [
  {
    x: 284,
    y: 288,
    labelX: 168,
    labelY: 250,
    related: ["s-02", "s-04", "s-06", "s-07", "s-08", "s-10", "s-33", "s-37", "s-38", "s-46"],
  },
  {
    x: 548,
    y: 160,
    labelX: 590,
    labelY: 128,
    related: ["s-09", "s-11", "s-13", "s-14", "s-16", "s-18", "s-29", "s-30", "s-39", "s-40"],
  },
  {
    x: 780,
    y: 252,
    labelX: 824,
    labelY: 214,
    related: ["s-16", "s-18", "s-19", "s-20", "s-22", "s-23", "s-34", "s-35", "s-40", "s-41", "s-42"],
  },
  {
    x: 216,
    y: 486,
    labelX: 126,
    labelY: 512,
    related: ["s-01", "s-03", "s-06", "s-10", "s-12", "s-26", "s-45", "s-46"],
  },
  {
    x: 682,
    y: 522,
    labelX: 758,
    labelY: 548,
    related: ["s-15", "s-17", "s-21", "s-23", "s-24", "s-27", "s-36", "s-42", "s-43", "s-44"],
  },
  {
    x: 446,
    y: 620,
    labelX: 520,
    labelY: 658,
    related: ["s-12", "s-17", "s-25", "s-26", "s-27", "s-36", "s-44", "s-45"],
  },
  {
    x: 852,
    y: 388,
    labelX: 820,
    labelY: 414,
    related: ["s-20", "s-21", "s-22", "s-23", "s-24", "s-28", "s-35", "s-41", "s-42", "s-43"],
  },
];

// The browse stage currently has a hand-tuned label map, so keep the visible
// set constrained to the number of available layout slots.
const featuredBets = getAllBets().slice(0, betLayouts.length);

const betNodes = featuredBets.map((bet, index) => ({
  id: `bet-${index + 1}`,
  slug: bet.slug,
  title: bet.title,
  type: bet.type,
  x: betLayouts[index].x,
  y: betLayouts[index].y,
  labelX: betLayouts[index].labelX,
  labelY: betLayouts[index].labelY,
  related: betLayouts[index].related,
}));

const anchorNodes = [...supportNodes, ...betNodes];
const edges = buildEdges(anchorNodes);
const atmosphereNodes = buildAtmosphereNodes();
const meshNodes = buildMeshNodes();
const meshEdges = buildMeshEdges(meshNodes);
const glowOrbs = buildGlowOrbs();
const betNodeBySlug = new Map(betNodes.map((node) => [node.slug, node]));

enterButton.addEventListener("click", handleEnter);
resetButton.addEventListener("click", resetSelection);
networkLabels.addEventListener("mouseover", handleLabelHover);
networkLabels.addEventListener("mouseout", handleLabelLeave);
networkLabels.addEventListener("focusin", handleLabelHover);
networkLabels.addEventListener("focusout", handleLabelLeave);
networkLabels.addEventListener("click", handleLabelClick);
networkSvg.addEventListener("click", handleSvgClick);
selectionCard.addEventListener("click", handleSelectionAction);
document.addEventListener("keydown", handleKeyDown);
window.addEventListener("resize", render);

networkStage.addEventListener("pointermove", handleParallax);
networkStage.addEventListener("pointerleave", resetParallax);

bootLandingScene();
render();

async function bootLandingScene() {
  if (!landingScene) {
    return;
  }

  try {
    const { createLandingScene } = await import("./landing-scene.js?v=waves-9");
    landingSceneController = createLandingScene(landingScene, {
      triggerElement: enterButton,
    });
  } catch (error) {
    console.error("Landing scene failed to load.", error);
    landingScreen.classList.add("landing-screen--fallback");
  }
}

function handleEnter() {
  state.entered = true;
  state.hoveredSlug = null;
  render();
}

function handleLabelHover(event) {
  const label = event.target.closest("[data-slug]");
  if (!label) {
    return;
  }

  state.hoveredSlug = label.dataset.slug;
  render();
}

function handleLabelLeave(event) {
  if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) {
    return;
  }

  state.hoveredSlug = null;
  render();
}

function handleLabelClick(event) {
  const label = event.target.closest("[data-slug]");
  if (!label) {
    return;
  }

  selectBet(label.dataset.slug);
}

function handleSvgClick(event) {
  const node = event.target.closest("[data-slug]");
  if (!node) {
    return;
  }

  selectBet(node.dataset.slug);
}

function handleSelectionAction(event) {
  const reportTrigger = event.target.closest("[data-scroll-report]");
  const sourceTrigger = event.target.closest("[data-scroll-sources]");

  if (reportTrigger) {
    scrollToReport(false);
  }

  if (sourceTrigger) {
    scrollToReport(true);
  }
}

function handleKeyDown(event) {
  if (event.key === "Escape" && state.selectedSlug) {
    resetSelection();
  }
}

function handleParallax(event) {
  if (!state.entered) {
    return;
  }

  const rect = networkStage.getBoundingClientRect();
  const offsetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
  const offsetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

  networkStage.style.setProperty("--parallax-x", `${(offsetX * 14).toFixed(2)}px`);
  networkStage.style.setProperty("--parallax-y", `${(offsetY * 10).toFixed(2)}px`);
}

function resetParallax() {
  networkStage.style.setProperty("--parallax-x", "0px");
  networkStage.style.setProperty("--parallax-y", "0px");
}

function resetSelection() {
  if (!state.selectedSlug) {
    state.entered = false;
  }

  state.selectedSlug = null;
  state.hoveredSlug = null;
  resetParallax();
  render();
}

function render() {
  const activeSlug = state.hoveredSlug || state.selectedSlug;
  const selectedBet = state.selectedSlug ? slugToBet(state.selectedSlug) : null;
  const reportBet = getReportBet(selectedBet);

  homeShell.classList.toggle("is-entered", state.entered);
  homeShell.classList.toggle("has-selection", Boolean(state.selectedSlug));
  landingScreen.setAttribute("aria-hidden", String(state.entered));
  resetButton.disabled = !state.entered;
  selectionCard.innerHTML = selectedBet ? renderSelectionCard(selectedBet) : "";
  reportContent.innerHTML = reportBet ? renderReport(reportBet) : renderReportPlaceholder();

  renderNetwork(activeSlug);
}

function renderNetwork(activeSlug) {
  const focusIds = getFocusIds(activeSlug);
  const activeNode = activeSlug ? betNodeBySlug.get(activeSlug) : null;

  networkSvg.innerHTML = `
    <g class="network-svg__atmosphere">
      ${atmosphereNodes
        .map(
          (node) => `
            <circle
              class="network-particle network-particle--atmosphere"
              cx="${node.x}"
              cy="${node.y}"
              r="${node.r}"
              style="opacity: ${node.opacity};"
            ></circle>
          `,
        )
        .join("")}
    </g>
    <g class="network-svg__glow">
      ${glowOrbs
        .map(
          (orb) => `
            <circle
              class="network-glow-orb"
              cx="${orb.x}"
              cy="${orb.y}"
              r="${orb.r}"
              style="opacity: ${orb.opacity};"
            ></circle>
          `,
        )
        .join("")}
    </g>
    <g class="network-svg__micro-mesh">
      ${meshEdges
        .map((edge) => {
          const isActive = activeNode ? isMeshEdgeNearActive(edge, activeNode) : false;
          return `
            <line
              class="network-trace${isActive ? " is-active" : activeSlug ? " is-muted" : ""}"
              x1="${edge.x1}"
              y1="${edge.y1}"
              x2="${edge.x2}"
              y2="${edge.y2}"
            ></line>
          `;
        })
        .join("")}
    </g>
    <g class="network-svg__mesh">
      ${edges
        .map((edge) => {
          const isActive = focusIds.has(edge.from) && focusIds.has(edge.to);
          return `
            <line
              class="network-line${isActive ? " is-active" : activeSlug ? " is-muted" : ""}"
              x1="${edge.x1}"
              y1="${edge.y1}"
              x2="${edge.x2}"
              y2="${edge.y2}"
            ></line>
          `;
        })
        .join("")}
    </g>
    <g class="network-svg__micro-nodes">
      ${meshNodes
        .map((node) => {
          const isActive = activeNode ? isMeshNodeNearActive(node, activeNode) : false;
          return `
            <circle
              class="network-particle network-particle--mesh${node.bright ? " is-bright" : ""}${
                isActive ? " is-active" : activeSlug ? " is-muted" : ""
              }"
              cx="${node.x}"
              cy="${node.y}"
              r="${node.r}"
              style="opacity: ${node.opacity};"
            ></circle>
          `;
        })
        .join("")}
    </g>
    <g class="network-svg__nodes">
      ${supportNodes
        .map((node) => {
          const isActive = focusIds.has(node.id);
          return `
            <circle
              class="network-node${isActive ? " is-active" : activeSlug ? " is-muted" : ""}"
              cx="${node.x}"
              cy="${node.y}"
              r="${isActive ? 3.8 : 2.15}"
            ></circle>
          `;
        })
        .join("")}
      ${betNodes
        .map((node) => {
          const isSelected = state.selectedSlug === node.slug;
          const isHovered = state.hoveredSlug === node.slug;
          const isActive = isSelected || isHovered;

          return `
            <circle
              class="network-node network-node--bet network-node--${node.type}${isActive ? " is-active" : ""}${
                isSelected ? " is-selected" : state.selectedSlug ? " is-muted" : ""
              }"
              data-slug="${node.slug}"
              cx="${node.x}"
              cy="${node.y}"
              r="${isSelected ? 6.8 : isActive ? 5.6 : 4.8}"
            ></circle>
          `;
        })
        .join("")}
    </g>
  `;

  renderNetworkLabels();
}

function getReportBet(selectedBet) {
  if (selectedBet) {
    return selectedBet;
  }

  if (state.entered && window.innerWidth <= 760) {
    return featuredBets[0];
  }

  return null;
}

function getFocusIds(activeSlug) {
  if (!activeSlug) {
    return new Set();
  }

  const activeNode = betNodeBySlug.get(activeSlug);
  if (!activeNode) {
    return new Set();
  }

  return new Set([activeNode.id, ...activeNode.related]);
}

function renderNetworkLabels() {
  if (networkLabels.children.length !== betNodes.length) {
    networkLabels.innerHTML = betNodes
      .map(
        (node) => `
          <button
            class="node-label node-label--${node.type}"
            type="button"
            data-slug="${node.slug}"
            style="left: ${(node.labelX / 1000) * 100}%; top: ${(node.labelY / 760) * 100}%;"
            aria-pressed="false"
          >
            <span class="node-label__title">${node.title}</span>
            <span class="node-label__status node-label__status--${node.type}">${node.type} bet</span>
          </button>
        `,
      )
      .join("");
  }

  Array.from(networkLabels.querySelectorAll("[data-slug]")).forEach((label) => {
    const slug = label.dataset.slug;
    const isSelected = state.selectedSlug === slug;
    const isHovered = state.hoveredSlug === slug;
    const isDormant = Boolean(state.selectedSlug) && !isSelected && !isHovered;
    label.classList.toggle("is-selected", isSelected);
    label.classList.toggle("is-hovered", isHovered);
    label.classList.toggle("is-dormant", isDormant);
    label.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });
}

function selectBet(slug) {
  if (!slugToBet(slug)) {
    return;
  }

  state.selectedSlug = slug;
  state.entered = true;
  render();
}

function buildEdges(nodes) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const nearestEdges = [];

  nodes.forEach((node) => {
    const nearest = nodes
      .filter((candidate) => candidate.id !== node.id)
      .map((candidate) => ({
        from: node.id,
        to: candidate.id,
        distance: Math.hypot(candidate.x - node.x, candidate.y - node.y),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, node.id.startsWith("bet-") ? 7 : 4);

    nearest.forEach((edge) => {
      const key = [edge.from, edge.to].sort().join(":");
      if (!nearestEdges.some((candidate) => candidate.key === key)) {
        nearestEdges.push({
          key,
          from: edge.from,
          to: edge.to,
        });
      }
    });
  });

  return nearestEdges.slice(0, 104).map((edge) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);

    return {
      ...edge,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
    };
  });
}

function buildAtmosphereNodes() {
  const farField = Array.from({ length: 286 }, (_, index) => {
    const angle = index * 2.399963229728653;
    const spread = 0.54 + (((index * 17) % 100) / 100) * 0.78;

    return {
      x: clamp(
        500 + Math.cos(angle) * (284 + spread * 320) + Math.sin(index * 0.37) * 28,
        14,
        986,
      ),
      y: clamp(
        378 + Math.sin(angle) * (198 + spread * 182) + Math.cos(index * 0.43) * 22,
        14,
        746,
      ),
      r: index % 21 === 0 ? 2.8 : index % 8 === 0 ? 1.8 : 0.82,
      opacity: index % 19 === 0 ? 0.13 : index % 5 === 0 ? 0.072 : 0.034,
    };
  });

  const coreMist = Array.from({ length: 162 }, (_, index) => {
    const angle = index * 2.399963229728653 + 0.4;
    const spread = Math.sqrt((index + 0.35) / 162);

    return {
      x: clamp(548 + Math.cos(angle) * 178 * spread + Math.sin(index * 0.73) * 18, 18, 982),
      y: clamp(292 + Math.sin(angle) * 116 * spread + Math.cos(index * 0.51) * 16, 18, 742),
      r: index % 14 === 0 ? 2.2 : index % 4 === 0 ? 1.35 : 0.72,
      opacity: index % 11 === 0 ? 0.17 : index % 3 === 0 ? 0.1 : 0.055,
    };
  });

  return [...farField, ...coreMist];
}

function buildGlowOrbs() {
  return [
    { x: 506, y: 174, r: 86, opacity: 0.078 },
    { x: 548, y: 212, r: 72, opacity: 0.064 },
    { x: 594, y: 228, r: 68, opacity: 0.06 },
    { x: 642, y: 262, r: 84, opacity: 0.058 },
    { x: 714, y: 418, r: 76, opacity: 0.046 },
    { x: 346, y: 338, r: 74, opacity: 0.038 },
    { x: 520, y: 516, r: 94, opacity: 0.038 },
    { x: 434, y: 230, r: 56, opacity: 0.042 },
    { x: 742, y: 318, r: 48, opacity: 0.034 },
  ];
}

function buildMeshNodes() {
  const clusters = [
    { cx: 518, cy: 184, rx: 118, ry: 56, count: 82 },
    { cx: 428, cy: 236, rx: 158, ry: 74, count: 78 },
    { cx: 646, cy: 248, rx: 156, ry: 74, count: 80 },
    { cx: 540, cy: 338, rx: 194, ry: 106, count: 116 },
    { cx: 472, cy: 444, rx: 182, ry: 96, count: 74 },
    { cx: 706, cy: 446, rx: 146, ry: 82, count: 58 },
    { cx: 332, cy: 448, rx: 150, ry: 88, count: 56 },
    { cx: 588, cy: 528, rx: 158, ry: 80, count: 42 },
  ];

  return clusters.flatMap((cluster, clusterIndex) =>
    Array.from({ length: cluster.count }, (_, index) => {
      const angle = index * 2.399963229728653 + clusterIndex * 0.62;
      const radius = Math.sqrt((index + 0.45) / cluster.count);
      const radialStrength = 1 - radius;
      const driftX = Math.sin(index * 0.73 + clusterIndex * 1.4) * 12;
      const driftY = Math.cos(index * 0.49 + clusterIndex * 0.6) * 9;
      const contourX = Math.cos(angle * 2.2 + clusterIndex * 0.5) * cluster.rx * 0.04;
      const contourY = Math.sin(angle * 2.6 - clusterIndex * 0.4) * cluster.ry * 0.04;

      return {
        id: `m-${clusterIndex + 1}-${index + 1}`,
        x: clamp(
          cluster.cx + Math.cos(angle) * cluster.rx * radius + driftX + contourX,
          24,
          976,
        ),
        y: clamp(
          cluster.cy + Math.sin(angle) * cluster.ry * radius + driftY + contourY,
          24,
          736,
        ),
        r: radialStrength > 0.8 ? 1.9 : radialStrength > 0.5 ? 1.08 : 0.58,
        opacity: radialStrength > 0.72 ? 0.34 : radialStrength > 0.44 ? 0.2 : 0.082,
        bright: radialStrength > 0.84 || (index + clusterIndex * 3) % 23 === 0,
      };
    }),
  );
}

function buildMeshEdges(nodes) {
  const uniqueEdges = new Map();

  nodes.forEach((node) => {
    const localEdges = nodes
      .filter((candidate) => candidate.id !== node.id)
      .map((candidate) => ({
        from: node.id,
        to: candidate.id,
        distance: Math.hypot(candidate.x - node.x, candidate.y - node.y),
      }))
      .filter((edge) => edge.distance < 138)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, node.bright ? 6 : 5);

    localEdges.forEach((edge) => {
      const key = [edge.from, edge.to].sort().join(":");
      if (!uniqueEdges.has(key)) {
        uniqueEdges.set(key, edge);
      }
    });

    const regionalEdges = nodes
      .filter((candidate) => candidate.id !== node.id)
      .map((candidate) => ({
        from: node.id,
        to: candidate.id,
        distance: Math.hypot(candidate.x - node.x, candidate.y - node.y),
      }))
      .filter((edge) => edge.distance >= 138 && edge.distance < 248)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, node.bright ? 2 : 1);

    regionalEdges.forEach((edge) => {
      const key = [edge.from, edge.to].sort().join(":");
      if (!uniqueEdges.has(key)) {
        uniqueEdges.set(key, edge);
      }
    });

    if (node.bright) {
      const longLink = nodes
        .filter((candidate) => candidate.id !== node.id)
        .map((candidate) => ({
          from: node.id,
          to: candidate.id,
          distance: Math.hypot(candidate.x - node.x, candidate.y - node.y),
        }))
        .filter((edge) => edge.distance >= 248 && edge.distance < 322)
        .sort((a, b) => a.distance - b.distance)[0];

      if (longLink) {
        const key = [longLink.from, longLink.to].sort().join(":");
        if (!uniqueEdges.has(key)) {
          uniqueEdges.set(key, longLink);
        }
      }
    }
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return Array.from(uniqueEdges.values())
    .slice(0, 720)
    .map((edge) => {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);

      return {
        ...edge,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
      };
    });
}

function isMeshNodeNearActive(node, activeNode) {
  return Math.hypot(node.x - activeNode.x, node.y - activeNode.y) < 140;
}

function isMeshEdgeNearActive(edge, activeNode) {
  const distanceFromStart = Math.hypot(edge.x1 - activeNode.x, edge.y1 - activeNode.y);
  const distanceFromEnd = Math.hypot(edge.x2 - activeNode.x, edge.y2 - activeNode.y);
  return distanceFromStart < 170 || distanceFromEnd < 170;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function scrollToReport(toSources) {
  if (toSources) {
    const sourceBlock = document.querySelector("#report-sources");
    if (sourceBlock) {
      sourceBlock.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }

  reportSection.scrollIntoView({ behavior: "smooth", block: "start" });
}
