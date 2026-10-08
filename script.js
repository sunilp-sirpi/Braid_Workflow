// Braid User Flow Wireframe
// The data (personas -> workflows -> cards) is in data.js. This file only draws it.

// ---------- 1. Page elements ----------
const canvas = document.getElementById("canvas");
const viewport = document.getElementById("viewport");
const personaNav = document.getElementById("personaNav");

const viewer = document.getElementById("viewer");
const viewerImage = document.getElementById("viewerImage");
const viewerCrumb = document.getElementById("viewerCrumb");
const viewerTitle = document.getElementById("viewerTitle");
const viewerDesc = document.getElementById("viewerDesc");

// Every card in journey order. The viewer's Previous / Next buttons walk through this list.
const allCards = [];


// ---------- 2. Small helpers ----------

// Makes text safe to put inside HTML
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// "Screen 2 - Register"  ->  { kind: "Screen 2", title: "Register", isNotification: false }
function splitLabel(label) {
  const parts = label.match(/^(Screen|Notification)\s+(\d+)\s*-\s*(.*)$/);
  return {
    kind: parts[1] + " " + parts[2],
    title: parts[3],
    isNotification: parts[1] === "Notification",
  };
}

// How many cards in this workflow are screens / notifications
function countCards(workflow, word) {
  return workflow.cards.filter((card) => card.label.startsWith(word)).length;
}

function countAll(word) {
  let total = 0;
  for (const persona of PERSONAS) {
    for (const workflow of persona.workflows) {
      total += countCards(workflow, word);
    }
  }
  return total;
}

function pluralize(number, word) {
  return number + " " + word + (number === 1 ? "" : "s");
}


// ---------- 3. Build the tree: Braid -> personas -> workflows -> cards ----------

function buildCard(card, stepNumber, cardIndex) {
  const { kind, title, isNotification } = splitLabel(card.label);
  const colourClass = isNotification ? "notice" : "screen";

  let shot;
  if (card.img) {
    shot = `<img src="${card.img}" alt="${escapeHtml(card.label)}" loading="lazy">`;
  } else {
    shot = `<div>Screenshot not available<small>No matching screenshot yet</small></div>`;
  }

  return `
    <div class="card" data-index="${cardIndex}" tabindex="0" role="button">
      <div class="shot ${card.img ? "" : "missing"}">
        ${shot}
        <span class="step ${colourClass}">${stepNumber}</span>
      </div>
      <div class="label ${colourClass}"><span>${kind.toUpperCase()}</span>${escapeHtml(title)}</div>
      <div class="desc">${escapeHtml(card.desc)}</div>
    </div>`;
}

function buildWorkflow(persona, workflow) {
  let cardsHtml = "";
  workflow.cards.forEach((card, position) => {
    allCards.push({ card, persona, workflow, stepNumber: position + 1 });
    cardsHtml += buildCard(card, position + 1, allCards.length - 1);
  });

  const screens = pluralize(countCards(workflow, "Screen"), "screen");
  const notifications = pluralize(countCards(workflow, "Notification"), "notification");

  return `
    <div class="item workflow-row">
      <div class="box workflow">
        <small>${workflow.code}</small>
        <b>${escapeHtml(workflow.title)}</b>
        <small>${screens} · ${notifications}</small>
      </div>
      <div class="cards">${cardsHtml}</div>
    </div>`;
}

function buildPersona(persona) {
  const workflowsHtml = persona.workflows
    .map((workflow) => buildWorkflow(persona, workflow))
    .join("");

  return `
    <div class="item persona-group" id="persona-${persona.num}">
      <div class="box persona">
        <small>USER PERSONA ${persona.num}</small>
        <b>${escapeHtml(persona.role)}</b>
      </div>
      <div class="branch">${workflowsHtml}</div>
    </div>`;
}

function buildTree() {
  const totalWorkflows = PERSONAS.reduce((sum, persona) => sum + persona.workflows.length, 0);
  const totalScreens = countAll("Screen");
  const totalNotifications = countAll("Notification");

  canvas.innerHTML = `
    <div class="box root">
      <b>Braid</b>
      <small>
        ${PERSONAS.length} personas<br>
        ${totalWorkflows} workflows<br>
        ${totalScreens} screens<br>
        ${totalNotifications} notifications
      </small>
    </div>
    <div class="branch">${PERSONAS.map(buildPersona).join("")}</div>`;

  document.getElementById("meta").textContent =
    `${PERSONAS.length} personas · ${totalWorkflows} workflows · ` +
    `${totalScreens} screens · ${totalNotifications} notifications`;
}


// ---------- 4. Zoom ----------
let zoom = 1;

function setZoom(value) {
  zoom = Math.min(3, Math.max(0.08, value));   // keep between 8% and 300%
  canvas.style.zoom = zoom;
  document.getElementById("zoomLabel").textContent = Math.round(zoom * 100) + "%";
}

// Shrinks the whole wireframe until it fits on the screen (it stays centred)
function fitAll() {
  setZoom(1);                                   // measure at 100%
  const fitWidth = viewport.clientWidth / canvas.offsetWidth;
  const fitHeight = viewport.clientHeight / canvas.offsetHeight;
  setZoom(Math.min(fitWidth, fitHeight));

  // At very small zoom the browser keeps text from shrinking, so the wireframe ends up a little
  // bigger than calculated. Check the real size and shrink a bit more until it fits.
  for (let tries = 0; tries < 5; tries++) {
    const real = canvas.getBoundingClientRect();
    if (real.width <= viewport.clientWidth && real.height <= viewport.clientHeight) break;
    setZoom(zoom * Math.min(viewport.clientWidth / real.width, viewport.clientHeight / real.height) * 0.98);
  }
}

document.getElementById("zoomIn").onclick = () => setZoom(zoom * 1.25);
document.getElementById("zoomOut").onclick = () => setZoom(zoom / 1.25);
document.getElementById("reset").onclick = () => setZoom(1);

// Ctrl + mouse wheel (or pinch) zooms. A plain wheel scrolls.
viewport.addEventListener("wheel", (event) => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  setZoom(zoom * Math.exp(-event.deltaY * 0.01));
}, { passive: false });


// ---------- 5. Persona buttons ----------

function buildPersonaButtons() {
  const buttons = [];

  // First button: show the whole wireframe
  const overviewButton = document.createElement("button");
  overviewButton.textContent = "Overview";
  overviewButton.onclick = () => {
    fitAll();
    markActive(overviewButton);
  };
  personaNav.appendChild(overviewButton);
  buttons.push(overviewButton);

  // One button per persona: User, Admin, User Manager ...
  for (const persona of PERSONAS) {
    const button = document.createElement("button");
    button.textContent = persona.navLabel;
    button.onclick = () => {
      goToPersona(persona.num);
      markActive(button);
    };
    personaNav.appendChild(button);
    buttons.push(button);
  }

  function markActive(activeButton) {
    buttons.forEach((button) => button.classList.toggle("active", button === activeButton));
  }

  markActive(overviewButton);
}

// Zoom in to a readable size (if needed) and scroll to that persona
function goToPersona(personaNumber) {
  if (zoom < 0.4) setZoom(0.5);
  document.getElementById("persona-" + personaNumber).scrollIntoView({
    behavior: "smooth",
    block: "start",
    inline: "start",
  });
}


// ---------- 6. Drag the background to move around ----------
let dragStart = null;

viewport.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || event.target.closest(".card")) return;
  dragStart = {
    mouseX: event.clientX,
    mouseY: event.clientY,
    scrollLeft: viewport.scrollLeft,
    scrollTop: viewport.scrollTop,
  };
  viewport.classList.add("dragging");
});

window.addEventListener("pointermove", (event) => {
  if (!dragStart) return;
  viewport.scrollLeft = dragStart.scrollLeft - (event.clientX - dragStart.mouseX);
  viewport.scrollTop = dragStart.scrollTop - (event.clientY - dragStart.mouseY);
});

window.addEventListener("pointerup", () => {
  dragStart = null;
  viewport.classList.remove("dragging");
});


// ---------- 7. Full-size viewer ----------
let currentIndex = 0;

function openViewer(index) {
  // wrap around at both ends
  currentIndex = (index + allCards.length) % allCards.length;
  const { card, persona, workflow, stepNumber } = allCards[currentIndex];
  const { kind, title } = splitLabel(card.label);

  viewerImage.innerHTML = card.img
    ? `<img src="${card.img}" alt="${escapeHtml(card.label)}">`
    : `<p style="color: white">Screenshot not available</p>`;

  viewerCrumb.textContent =
    `Persona ${persona.num} · ${persona.role}  ›  ${workflow.code}: ${workflow.title}  ›  ` +
    `Step ${stepNumber} of ${workflow.cards.length}`;
  viewerTitle.textContent = kind + " – " + title;
  viewerDesc.textContent = card.desc;

  viewer.hidden = false;
}

function closeViewer() {
  viewer.hidden = true;
}

canvas.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (card) openViewer(Number(card.dataset.index));
});

canvas.addEventListener("keydown", (event) => {
  const card = event.target.closest(".card");
  if (event.key === "Enter" && card) openViewer(Number(card.dataset.index));
});

document.getElementById("prev").onclick = () => openViewer(currentIndex - 1);
document.getElementById("next").onclick = () => openViewer(currentIndex + 1);
document.getElementById("close").onclick = closeViewer;

// click on the dark background closes the viewer
viewer.addEventListener("click", (event) => {
  if (event.target === viewer) closeViewer();
});

document.addEventListener("keydown", (event) => {
  if (viewer.hidden) return;
  if (event.key === "Escape") closeViewer();
  if (event.key === "ArrowRight") openViewer(currentIndex + 1);
  if (event.key === "ArrowLeft") openViewer(currentIndex - 1);
});


// ---------- 8. Start ----------
buildTree();
buildPersonaButtons();
fitAll();   // open with the whole wireframe visible and centred
