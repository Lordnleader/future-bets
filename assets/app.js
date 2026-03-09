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
const topbarStatus = document.querySelector("#topbar-status");
const resetButton = document.querySelector("#reset-button");
const selectionCard = document.querySelector("#selection-card");
const selectionEmpty = document.querySelector("#selection-empty");
const reportSection = document.querySelector("#report-section");
const reportContent = document.querySelector("#report-content");
const networkStage = document.querySelector("#network-stage");
const networkSvg = document.querySelector("#network-svg");
const networkLabels = document.querySelector("#network-labels");

// The browse stage currently has a hand-tuned label map, so keep the visible
// set constrained to the number of available layout slots.
const featuredBets = getAllBets().slice(0, betLayouts.length);

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
];

const betLayouts = [
  { x: 284, y: 288, labelX: 166, labelY: 250, related: ["s-02", "s-04", "s-06", "s-07", "s-08", "s-10"] },
  { x: 548, y: 160, labelX: 580, labelY: 128, related: ["s-09", "s-11", "s-13", "s-14", "s-16", "s-18"] },
  { x: 780, y: 252, labelX: 828, labelY: 218, related: ["s-16", "s-18", "s-19", "s-20", "s-22", "s-23"] },
  { x: 216, y: 486, labelX: 120, labelY: 512, related: ["s-01", "s-03", "s-06", "s-10", "s-12", "s-26"] },
  { x: 682, y: 522, labelX: 758, labelY: 548, related: ["s-15", "s-17", "s-21", "s-23", "s-24", "s-27"] },
  { x: 446, y: 620, labelX: 520, labelY: 660, related: ["s-12", "s-17", "s-25", "s-26", "s-27"] },
  { x: 852, y: 388, labelX: 820, labelY: 416, related: ["s-20", "s-21", "s-22", "s-23", "s-24", "s-28"] },
];

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

  state.selectedSlug = label.dataset.slug;
  state.entered = true;
  render();
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
  topbarStatus.textContent = state.entered
    ? selectedBet
      ? `Selected / ${selectedBet.paired_signals.length} signals`
      : `Prediction field active / ${betNodes.length} bets`
    : "Signal layer dormant";
  resetButton.disabled = !state.entered;

  selectionEmpty.hidden = Boolean(selectedBet);
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
              class="network-trace${isActive ? " is-active" : ""}"
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
              class="network-line${isActive ? " is-active" : ""}"
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
                isActive ? " is-active" : ""
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
              class="network-node${isActive ? " is-active" : ""}"
              cx="${node.x}"
              cy="${node.y}"
              r="${isActive ? 4.5 : 2.8}"
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
                isSelected ? " is-selected" : ""
              }"
              cx="${node.x}"
              cy="${node.y}"
              r="${isSelected ? 9 : 7}"
            ></circle>
          `;
        })
        .join("")}
    </g>
  `;

  networkLabels.innerHTML = betNodes
    .map((node) => {
      const isSelected = state.selectedSlug === node.slug;
      const isHovered = state.hoveredSlug === node.slug;
      return `
        <button
          class="node-label node-label--${node.type}${isSelected ? " is-selected" : ""}${
            isHovered ? " is-hovered" : ""
          }"
          type="button"
          data-slug="${node.slug}"
          style="left: ${(node.labelX / 1000) * 100}%; top: ${(node.labelY / 760) * 100}%;"
          aria-pressed="${isSelected ? "true" : "false"}"
        >
          <span class="node-label__title">${node.title}</span>
          <span class="node-label__status node-label__status--${node.type}">${node.type} bet</span>
        </button>
      `;
    })
    .join("");
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

function buildEdges(nodes) {
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
      .slice(0, node.id.startsWith("bet-") ? 6 : 3);

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

  return nearestEdges.slice(0, 72).map((edge) => {
    const from = nodes.find((node) => node.id === edge.from);
    const to = nodes.find((node) => node.id === edge.to);

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
  return Array.from({ length: 170 }, (_, index) => {
    const angle = index * 2.399963229728653;
    const radiusX = 310 + (index % 13) * 24;
    const radiusY = 228 + (index % 9) * 20;

    return {
      x: clamp(500 + Math.cos(angle) * radiusX + Math.sin(index * 0.62) * 48, 18, 982),
      y: clamp(380 + Math.sin(angle) * radiusY + Math.cos(index * 0.47) * 34, 18, 742),
      r: index % 11 === 0 ? 3.8 : index % 4 === 0 ? 2.4 : 1.45,
      opacity: index % 7 === 0 ? 0.2 : index % 3 === 0 ? 0.12 : 0.08,
    };
  });
}

function buildGlowOrbs() {
  return [
    { x: 508, y: 174, r: 92, opacity: 0.09 },
    { x: 622, y: 242, r: 118, opacity: 0.08 },
    { x: 708, y: 430, r: 94, opacity: 0.07 },
    { x: 328, y: 330, r: 88, opacity: 0.055 },
    { x: 512, y: 508, r: 128, opacity: 0.05 },
  ];
}

function buildMeshNodes() {
  const clusters = [
    { cx: 492, cy: 206, rx: 152, ry: 78, count: 28 },
    { cx: 622, cy: 282, rx: 168, ry: 88, count: 30 },
    { cx: 468, cy: 382, rx: 190, ry: 106, count: 34 },
    { cx: 688, cy: 458, rx: 132, ry: 88, count: 22 },
    { cx: 314, cy: 474, rx: 152, ry: 94, count: 18 },
  ];

  return clusters.flatMap((cluster, clusterIndex) =>
    Array.from({ length: cluster.count }, (_, index) => {
      const angle = index * 2.399963229728653 + clusterIndex * 0.62;
      const radius = Math.sqrt((index + 0.45) / cluster.count);
      const radialStrength = 1 - radius;

      return {
        id: `m-${clusterIndex + 1}-${index + 1}`,
        x: clamp(
          cluster.cx + Math.cos(angle) * cluster.rx * radius + Math.sin(index * 0.58 + clusterIndex) * 10,
          24,
          976,
        ),
        y: clamp(
          cluster.cy + Math.sin(angle) * cluster.ry * radius + Math.cos(index * 0.44 + clusterIndex) * 9,
          24,
          736,
        ),
        r: radialStrength > 0.74 ? 2.9 : radialStrength > 0.46 ? 2.1 : 1.2,
        opacity: radialStrength > 0.7 ? 0.36 : radialStrength > 0.4 ? 0.24 : 0.14,
        bright: radialStrength > 0.78 || (index + clusterIndex) % 17 === 0,
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
      .filter((edge) => edge.distance < 166)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    localEdges.forEach((edge) => {
      const key = [edge.from, edge.to].sort().join(":");
      if (!uniqueEdges.has(key)) {
        uniqueEdges.set(key, edge);
      }
    });

    const structuralEdge = nodes
      .filter((candidate) => candidate.id !== node.id)
      .map((candidate) => ({
        from: node.id,
        to: candidate.id,
        distance: Math.hypot(candidate.x - node.x, candidate.y - node.y),
      }))
      .filter((edge) => edge.distance >= 166 && edge.distance < 284)
      .sort((a, b) => a.distance - b.distance)[0];

    if (structuralEdge) {
      const key = [structuralEdge.from, structuralEdge.to].sort().join(":");
      if (!uniqueEdges.has(key)) {
        uniqueEdges.set(key, structuralEdge);
      }
    }
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return Array.from(uniqueEdges.values())
    .slice(0, 220)
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
