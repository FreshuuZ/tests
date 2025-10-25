// Elements
const routeSelect = document.getElementById("routeSelect");
const baseMatSelect = document.getElementById("baseMatSelect");
const altMatSelect = document.getElementById("altMatSelect");
const baseSearch = document.getElementById("baseSearch");
const altSearch = document.getElementById("altSearch");
const addBtn = document.getElementById("addBtn");
const changesList = document.getElementById("changesList");

const qtyInput = document.getElementById("qty");
const qtyDec = document.getElementById("qtyDec");
const qtyInc = document.getElementById("qtyInc");
const advancedQtyToggle = document.getElementById("advancedQtyToggle");
const qtyRowSimple = document.getElementById("qtyRowSimple");
const qtyRowAdvanced = document.getElementById("qtyRowAdvanced");
const qtyBaseInput = document.getElementById("qtyBase");
const qtyAltInput = document.getElementById("qtyAlt");

// --- MODALE ---
let editIndex = null;

const editSimpleModal = document.getElementById("editSimpleModal");
const editSimpleQtyInput = document.getElementById("editSimpleQtyInput");
const editSimpleCancel = document.getElementById("editSimpleCancel");
const editSimpleSave = document.getElementById("editSimpleSave");

const editAdvancedModal = document.getElementById("editAdvancedModal");
const editAdvancedQtyBase = document.getElementById("editAdvancedQtyBase");
const editAdvancedQtyAlt = document.getElementById("editAdvancedQtyAlt");
const editAdvancedCancel = document.getElementById("editAdvancedCancel");
const editAdvancedSave = document.getElementById("editAdvancedSave");

const deleteModal = document.getElementById("deleteModal");
const deleteModalText = document.getElementById("deleteModalText");
const deleteCancel = document.getElementById("deleteCancel");
const deleteConfirm = document.getElementById("deleteConfirm");
let itemToDelete = { index: null, element: null };

const deleteGroupModal = document.getElementById("deleteGroupModal");
const deleteGroupModalText = document.getElementById("deleteGroupModalText");
const deleteGroupCancel = document.getElementById("deleteGroupCancel");
const deleteGroupConfirm = document.getElementById("deleteGroupConfirm");
let routeGroupToDelete = { route: null, element: null };


// Toast notification
function showToast(message, color = "var(--primary)") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.style.background = color;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Data
const routesByDay = {
  "Poniedziałek": Array.from({ length: 22 }, (_, i) => 1101 + i),
  "Wtorek": Array.from({ length: 22 }, (_, i) => 1201 + i),
  "Środa": Array.from({ length: 22 }, (_, i) => 1301 + i),
  "Czwartek": Array.from({ length: 22 }, (_, i) => 1401 + i),
  "Piątek": Array.from({ length: 22 }, (_, i) => 1501 + i)
};
const mats = [
  "klasyczna szara 150x85", "klasyczna szara 200x115", "klasyczna szara 300x85",
  "klasyczna szara 250x115", "klasyczna szara 250x150", "klasyczna szara 400x150",
  "klasyczna brązowa 250x115", "bawełna extra 150x85", "bawełna extra 200x115",
  "bawełna extra 250x150", "bawełna extra 300x115", "microtech 150x85",
  "microtech 200x115", "microtech 250x150", "klasyczna brązowa 150x85",
  "klasyczna brązowa 200x115", "bordo 150x85", "bordo 200x115",
  "bawełna plus 150x85", "bawełna plus 200x115", "bawełna plus 250x150",
  "scraper 150x85", "scraper 200x115", "scraper 300x115", "scraper 240x150",
  "micromix 150x85", "micromix 200x115", "micromix 300x150"
];

// Funkcje pomocnicze
function fillRoutes() {
  routeSelect.innerHTML = `<option value="">— wybierz trasę —</option>`;
  for (const [day, routes] of Object.entries(routesByDay)) {
    const group = document.createElement("optgroup");
    group.label = day;
    routes.forEach(r => {
      const opt = document.createElement("option");
      opt.value = String(r);
      opt.textContent = String(r);
      group.appendChild(opt);
    });
    routeSelect.appendChild(group);
  }
}

function fillMatList(select, filter = "") {
  const list = mats.filter(m => m.toLowerCase().includes(filter.toLowerCase()));
  select.innerHTML = "";
  list.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    select.appendChild(opt);
  });
  if (list.length > 0) {
    select.value = list[0];
    select.dispatchEvent(new Event("change"));
  }
}

// State
let changes = JSON.parse(localStorage.getItem("changes") || "[]");

// renderChanges
function renderChanges() {
  const openRoutes = Array.from(changesList.querySelectorAll(".route-group.open"))
    .map(group => group.getAttribute("data-route"));

  changesList.innerHTML = "";

  if (changes.length === 0) {
    changesList.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
        <div class="empty-state-text">
          Lista zmian jest pusta.<br>Wybierz trasę i dodaj pierwszą zmianę.
        </div>
      </div>`;
    return;
  }

  const grouped = {};
  changes.forEach((c, i) => {
    if (!grouped[c.route]) grouped[c.route] = [];
    grouped[c.route].push({ ...c, originalIndex: i });
  });

  const sortedRoutes = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));

  sortedRoutes.forEach(route => {
    const wrapper = document.createElement("div");
    wrapper.className = "route-group";
    wrapper.setAttribute("data-route", route);
    if (openRoutes.includes(route)) {
      wrapper.classList.add("open");
    }

    const badgeHtml = `<span class="badge">${grouped[route].length}</span>`;
    const copyBtnHtml = `
      <button class="copy-route-btn" data-action="copy-group" aria-label="Kopiuj trasę">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>`;
    const arrowSvg = `<svg class="arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18 6-6-6-6"/></svg>`;

    wrapper.innerHTML = `
      <div class="route-header" data-action="toggle-group">
        <span class="route-title">Trasa ${route}</span>
        <div class="route-meta">${copyBtnHtml}${badgeHtml}${arrowSvg}</div>
      </div>
      <div class="route-body">
        <div class="route-changes-container"></div>
        <button class="btn-delete-group" data-action="delete-group">
            <span style="pointer-events: none;">❌ Usuń całą trasę ${route}</span>
        </button>
      </div>`;

    const changesContainer = wrapper.querySelector(".route-changes-container");

    grouped[route].forEach((c, index) => {
      const item = document.createElement("div");
      item.className = "route-change";
      item.setAttribute("data-index", c.originalIndex);
      item.style.setProperty('--i', index); // Dla animacji kaskadowej

      const baseQty = c.qtyBase || c.qty;
      const altQty = c.qtyAlt || c.qty;

      const baseDisplay = `${c.base} <span class="badge inline-qty">×${baseQty}</span>`;
      const altDisplay = `${c.alt} <span class="badge inline-qty">×${altQty}</span>`;

      item.innerHTML = `
        <div class="change-details">
          <div class="change-meta-row">
            <span class="change-meta-label">Mata:</span>
            <span class="change-meta-value">${baseDisplay}</span>
          </div>
          <div class="change-meta-row">
            <span class="change-meta-label">Zamiennik:</span>
            <span class="change-meta-value">${altDisplay}</span>
          </div>
        </div>
        <div class="change-actions">
          <button class="btn-danger" data-action="delete-item">🗑️ Usuń</button>
          <button class="btn-outline" data-action="edit-item">✏️ Edytuj</button>
        </div>
      `;
      changesContainer.appendChild(item);
    });
    changesList.appendChild(wrapper);
  });
}

function persist() {
  localStorage.setItem("changes", JSON.stringify(changes));
}

function removeChange(index) {
  changes.splice(index, 1);
  persist();
  renderChanges();
}

function removeRouteGroup(route) {
  changes = changes.filter(c => c.route !== route);
  persist();
  renderChanges();
}

// Funkcje modali
function openSimpleEditModal(index) {
  editIndex = index;
  const change = changes[index];
  if (!change) return;
  editSimpleQtyInput.value = change.qtyBase || change.qty;
  editSimpleModal.style.display = "flex";
  editSimpleQtyInput.focus();
}

function closeSimpleEditModal() {
  editSimpleModal.style.display = "none";
  editIndex = null;
}

function openAdvancedEditModal(index) {
  editIndex = index;
  const change = changes[index];
  if (!change) return;
  editAdvancedQtyBase.value = change.qtyBase || change.qty;
  editAdvancedQtyAlt.value = change.qtyAlt || change.qty;
  editAdvancedModal.style.display = "flex";
  editAdvancedQtyBase.focus();
}

function closeAdvancedEditModal() {
  editAdvancedModal.style.display = "none";
  editIndex = null;
}

function openDeleteModal(index, element) {
  itemToDelete = { index, element };
  const change = changes[index];
  deleteModalText.innerHTML = change ? `Na pewno usunąć: <br><b>${change.base}</b>?` : `Na pewno chcesz usunąć tę zmianę?`;
  deleteModal.style.display = "flex";
}

function closeDeleteModal() {
  deleteModal.style.display = "none";
  itemToDelete = { index: null, element: null };
}

function openDeleteGroupModal(route, element) {
  routeGroupToDelete = { route, element };
  const changeCount = element.querySelectorAll('.route-change').length;
  deleteGroupModalText.innerHTML = `Na pewno usunąć <b>wszystkie zmiany</b> (${changeCount}) dla trasy <b>${route}</b>?`;
  deleteGroupModal.style.display = "flex";
}

function closeDeleteGroupModal() {
  deleteGroupModal.style.display = "none";
  routeGroupToDelete = { route: null, element: null };
}

// Listenery Modali
editSimpleCancel.addEventListener("click", closeSimpleEditModal);
editSimpleSave.addEventListener("click", () => {
  if (editIndex === null) return;
  const newQty = Number(editSimpleQtyInput.value);
  if (isNaN(newQty) || newQty < 1 || newQty > 100) {
    showToast("❌ Ilość musi być od 1 do 100!", "var(--accent)");
    return;
  }
  changes[editIndex].qtyBase = newQty;
  changes[editIndex].qtyAlt = newQty;
  delete changes[editIndex].qty;
  persist();
  renderChanges();
  showToast("✅ Ilość zaktualizowana");
  closeSimpleEditModal();
});

editAdvancedCancel.addEventListener("click", closeAdvancedEditModal);
editAdvancedSave.addEventListener("click", () => {
  if (editIndex === null) return;
  const newQtyBase = Number(editAdvancedQtyBase.value);
  const newQtyAlt = Number(editAdvancedQtyAlt.value);

  if (isNaN(newQtyBase) || newQtyBase < 1 || newQtyBase > 100 || isNaN(newQtyAlt) || newQtyAlt < 1 || newQtyAlt > 100) {
    showToast("❌ Ilości muszą być od 1 do 100!", "var(--accent)");
    return;
  }

  changes[editIndex].qtyBase = newQtyBase;
  changes[editIndex].qtyAlt = newQtyAlt;
  delete changes[editIndex].qty;
  persist();
  renderChanges();
  showToast("✅ Ilość zaktualizowana");
  closeAdvancedEditModal();
});

deleteCancel.addEventListener("click", closeDeleteModal);
deleteConfirm.addEventListener("click", () => {
  if (itemToDelete.index === null) return;
  const { index, element } = itemToDelete;
  element.classList.add("is-hiding");
  setTimeout(() => {
    removeChange(index);
    showToast("🗑️ Zmiana usunięta", "var(--accent)");
  }, 300);
  closeDeleteModal();
});

deleteGroupCancel.addEventListener("click", closeDeleteGroupModal);
deleteGroupConfirm.addEventListener("click", () => {
  if (routeGroupToDelete.route === null) return;
  const { route, element } = routeGroupToDelete;
  
  element.classList.add("is-collapsing");
  const animationDuration = element.querySelectorAll('.route-change').length * 50 + 300;

  setTimeout(() => {
    removeRouteGroup(route);
    showToast(`🗑️ Usunięto całą trasę ${route}`, "var(--accent)");
  }, animationDuration);
  closeDeleteGroupModal();
});

// Delegacja Zdarzeń dla listy zmian
changesList.addEventListener("click", (e) => {
  const actionElement = e.target.closest("[data-action]");
  if (!actionElement) return;
  
  e.stopPropagation();
  const action = actionElement.dataset.action;
  const itemElement = e.target.closest(".route-change");
  const groupElement = e.target.closest(".route-group");

  switch (action) {
    case "delete-item":
      openDeleteModal(Number(itemElement.dataset.index), itemElement);
      break;
    case "edit-item": {
      const index = Number(itemElement.dataset.index);
      const change = changes[index];
      const isAdvanced = (change.qtyBase || change.qty) !== (change.qtyAlt || change.qty);
      if (isAdvanced) {
        openAdvancedEditModal(index);
      } else {
        openSimpleEditModal(index);
      }
      break;
    }
    case "copy-group": {
      const route = groupElement.dataset.route;
      const routeChanges = changes.filter(c => c.route === route);
      const textToCopy = `Trasa ${route}:\n` + routeChanges.map(c =>
        `- ${c.base} (×${c.qtyBase || c.qty}) -> ${c.alt} (×${c.qtyAlt || c.qty})`
      ).join("\n");

      navigator.clipboard.writeText(textToCopy)
        .then(() => showToast("✅ Skopiowano do schowka!"))
        .catch(() => showToast("❌ Błąd kopiowania", "var(--accent)"));
      break;
    }
    case "delete-group":
      openDeleteGroupModal(groupElement.dataset.route, groupElement);
      break;
    case "toggle-group":
      groupElement.classList.toggle("open");
      break;
  }
});

// Logika formularza
routeSelect.addEventListener("change", () => {
  const enabled = routeSelect.value !== "";
  baseMatSelect.disabled = !enabled;
  baseSearch.disabled = !enabled;
  if (enabled) fillMatList(baseMatSelect);
  altMatSelect.disabled = true;
  altSearch.disabled = true;
  addBtn.disabled = true;
  baseMatSelect.value = "";
  altMatSelect.value = "";
});

baseMatSelect.addEventListener("change", () => {
  const enabled = baseMatSelect.value !== "";
  altMatSelect.disabled = !enabled;
  altSearch.disabled = !enabled;
  if (enabled) fillMatList(altMatSelect);
  altMatSelect.value = "";
  addBtn.disabled = true;
});

altMatSelect.addEventListener("change", () => {
  addBtn.disabled = altMatSelect.value === "";
});

baseSearch.addEventListener("input", e => fillMatList(baseMatSelect, e.target.value));
altSearch.addEventListener("input", e => fillMatList(altMatSelect, e.target.value));

qtyDec.addEventListener("click", () => { qtyInput.value = Math.max(1, Number(qtyInput.value) - 1); });
qtyInc.addEventListener("click", () => { qtyInput.value = Math.min(100, Number(qtyInput.value) + 1); });

advancedQtyToggle.addEventListener("change", (e) => {
  qtyRowSimple.style.display = e.target.checked ? "none" : "grid";
  qtyRowAdvanced.style.display = e.target.checked ? "grid" : "none";
});

addBtn.addEventListener("click", () => {
  const route = routeSelect.value;
  const base = baseMatSelect.value;
  const alt = altMatSelect.value;

  if (!route || !base || !alt) {
    showToast("⚠️ Wybierz trasę, matę i zamiennik!", "var(--accent)");
    return;
  }

  const newChange = advancedQtyToggle.checked ?
    { route, base, alt, qtyBase: Number(qtyBaseInput.value), qtyAlt: Number(qtyAltInput.value) } :
    { route, base, alt, qtyBase: Number(qtyInput.value), qtyAlt: Number(qtyInput.value) };

  changes.unshift(newChange);
  persist();
  renderChanges();
  showToast("✅ Dodano zmianę!");

  // Reset
  altMatSelect.value = "";
  altMatSelect.disabled = true;
  altSearch.disabled = true;
  addBtn.disabled = true;
  baseMatSelect.value = "";
  if (advancedQtyToggle.checked) {
    advancedQtyToggle.checked = false;
    advancedQtyToggle.dispatchEvent(new Event('change'));
  }
  qtyInput.value = 1;
  qtyBaseInput.value = 1;
  qtyAltInput.value = 1;
  fillMatList(baseMatSelect);

  const newItemGroup = changesList.querySelector(`.route-group[data-route="${route}"]`);
  if (newItemGroup) {
    newItemGroup.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (!newItemGroup.classList.contains("open")) {
      newItemGroup.classList.add('open');
    }
  }
});

// Init
fillRoutes();
renderChanges();

// Motyw i Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
const themeToggle = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("theme");
document.body.classList.add(savedTheme === "dark" ? "dark" : "light");

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  document.body.classList.toggle("light", !isDark);
  localStorage.setItem("theme", isDark ? "dark" : "light");
});