import {
  getAllBets,
  renderReport,
  renderReportPlaceholder,
  renderSelectionCard,
  slugToBet,
} from "./site.js";

const homeShell = document.querySelector("#home-shell");
const landingScreen = document.querySelector("#landing-screen");
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

const featuredBets = getAllBets().slice(0, 5);

const state = {
  entered: false,
  selectedSlug: null,
  hoveredSlug: null,
};

const supportNodes = [
  { id: "s-01", x: 112, y: 140 },
  { id: "s-02", x: 188, y: 302 },
  { id: "s-03", x: 214, y: 504 },
  { id: "s-04", x: 252, y: 214 },
  { id: "s-05", x: 296, y: 612 },
  { id: "s-06", x: 326, y: 418 },
  { id: "s-07", x: 366, y: 178 },
  { id: "s-08", x: 396, y: 328 },
  { id: "s-09", x: 432, y: 542 },
  { id: "s-10", x: 474, y: 232 },
  { id: "s-11", x: 504, y: 468 },
  { id: "s-12", x: 544, y: 120 },
  { id: "s-13", x: 582, y: 318 },
  { id: "s-14", x: 612, y: 566 },
  { id: "s-15", x: 648, y: 202 },
  { id: "s-16", x: 682, y: 420 },
  { id: "s-17", x: 716, y: 126 },
  { id: "s-18", x: 752, y: 276 },
  { id: "s-19", x: 784, y: 516 },
  { id: "s-20", x: 826, y: 188 },
  { id: "s-21", x: 848, y: 390 },
  { id: "s-22", x: 878, y: 612 },
  { id: "s-23", x: 926, y: 304 },
];

const betLayouts = [
  { x: 280, y: 248, labelX: 96, labelY: 206, related: ["s-01", "s-02", "s-04", "s-06", "s-08"] },
  { x: 462, y: 118, labelX: 534, labelY: 118, related: ["s-07", "s-10", "s-12", "s-13", "s-15"] },
  { x: 788, y: 214, labelX: 790, labelY: 164, related: ["s-15", "s-18", "s-20", "s-21", "s-23"] },
  { x: 666, y: 516, labelX: 640, labelY: 560, related: ["s-14", "s-16", "s-18", "s-19", "s-22"] },
  { x: 404, y: 642, labelX: 514, labelY: 640, related: ["s-09", "s-11", "s-14", "s-16", "s-22"] },
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

const allNodes = [...supportNodes, ...betNodes];
const edges = buildEdges();
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

render();

function handleEnter() {
  state.entered = true;
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
  state.selectedSlug = null;
  state.hoveredSlug = null;
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
      : "Signal layer active"
    : "Signal layer dormant";
  resetButton.disabled = !state.selectedSlug;

  selectionEmpty.hidden = Boolean(selectedBet);
  selectionCard.innerHTML = selectedBet ? renderSelectionCard(selectedBet) : "";
  reportContent.innerHTML = reportBet ? renderReport(reportBet) : renderReportPlaceholder();

  renderNetwork(activeSlug);
}

function renderNetwork(activeSlug) {
  const focusIds = getFocusIds(activeSlug);

  networkSvg.innerHTML = `
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

function buildEdges() {
  const nearestEdges = [];

  allNodes.forEach((node) => {
    const nearest = allNodes
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
    const from = allNodes.find((node) => node.id === edge.from);
    const to = allNodes.find((node) => node.id === edge.to);

    return {
      ...edge,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
    };
  });
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
