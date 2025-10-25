// Elements
const routeSelect   = document.getElementById("routeSelect");
const baseMatSelect = document.getElementById("baseMatSelect");
const altMatSelect  = document.getElementById("altMatSelect");
const baseSearch    = document.getElementById("baseSearch");
const altSearch     = document.getElementById("altSearch");
const addBtn        = document.getElementById("addBtn");
const changesList   = document.getElementById("changesList");
const qtyInput      = document.getElementById("qty");
const qtyDec        = document.getElementById("qtyDec");
const qtyInc        = document.getElementById("qtyInc");

// --- MODALE --- (Wszystkie elementy modali są pobierane na początku)
const editModal    = document.getElementById("editModal");
const editQtyInput = document.getElementById("editQtyInput");
const editCancel   = document.getElementById("editCancel");
const editSave     = document.getElementById("editSave");
let editIndex = null;

const deleteModal     = document.getElementById("deleteModal");
const deleteModalText = document.getElementById("deleteModalText");
const deleteCancel    = document.getElementById("deleteCancel");
const deleteConfirm   = document.getElementById("deleteConfirm");
let itemToDelete = { index: null, element: null };

// NOWY MODAL DLA USUWANIA GRUPY
const deleteGroupModal     = document.getElementById("deleteGroupModal");
const deleteGroupModalText = document.getElementById("deleteGroupModalText");
const deleteGroupCancel    = document.getElementById("deleteGroupCancel");
const deleteGroupConfirm   = document.getElementById("deleteGroupConfirm");
let routeGroupToDelete = { route: null, element: null };
// --- KONIEC MODALI ---


// Toast notification
function showToast(message, color = "var(--accent)") {
  const toast = document.getElementById("toast");
  if (!toast) {
    console.error("Element #toast nie znaleziony!");
    return;
  }
  toast.textContent = message;
  toast.style.background = color;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Data
const routesByDay = {
  "Poniedziałek": Array.from({length:22}, (_,i)=>1101+i),
  "Wtorek":       Array.from({length:22}, (_,i)=>1201+i),
  "Środa":        Array.from({length:22}, (_,i)=>1301+i),
  "Czwartek":     Array.from({length:22}, (_,i)=>1401+i),
  "Piątek":       Array.from({length:22}, (_,i)=>1501+i)
};
const mats = [
  "klasyczna szara 150x85","klasyczna szara 200x115","klasyczna szara 300x85",
  "klasyczna szara 250x115","klasyczna szara 250x150","klasyczna szara 400x150",
  "klasyczna brązowa 250x115","bawełna extra 150x85","bawełna extra 200x115",
  "bawełna extra 250x150","bawełna extra 300x115","microtech 150x85",
  "microtech 200x115","microtech 250x150","klasyczna brązowa 150x85",
  "klasyczna brązowa 200x115","bordo 150x85","bordo 200x115",
  "bawełna plus 150x85","bawełna plus 200x115","bawełna plus 250x150",
  "scraper 150x85","scraper 200x115","scraper 300x115","scraper 240x150",
  "micromix 150x85","micromix 200x115","micromix 300x150"
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

// renderChanges - Zapis/Przywracanie stanu oraz formatowanie badge
function renderChanges() {
  // 1. ZAPISZ STAN: Zbierz trasy, które są aktualnie otwarte
  const openRoutes = Array.from(changesList.querySelectorAll(".route-group.open"))
    .map(group => group.getAttribute("data-route")); 

  changesList.innerHTML = "";

  if (changes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "list-card empty-state"; 
    empty.textContent = "Brak zmian";          
    changesList.appendChild(empty);
    return;
  }

  // 1. Grupowanie zmian według trasy
  const grouped = {};
  changes.forEach((c, i) => {
    if (!grouped[c.route]) grouped[c.route] = [];
    grouped[c.route].push({ ...c, originalIndex: i }); 
  });

  // 2. Sortowanie tras rosnąco
  const sortedRoutes = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));

  // 3. Kontener jest teraz bezpośrednio changesList
  const grid = changesList;

  // 4. Renderowanie każdej grupy
  sortedRoutes.forEach(route => {
    const wrapper = document.createElement("div");
    wrapper.className = "route-group";
    wrapper.setAttribute("data-route", route); 

    // Przywracanie stanu
    if (openRoutes.includes(route)) {
        wrapper.classList.add("open");
    }

    // Odznaka z liczbą zmian
    const badgeHtml = `<span class="badge">${grouped[route].length}</span>`;
    
    // Strzałka SVG
    const arrowSvg = `<svg class="arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18 6-6-6-6"/></svg>`;

    wrapper.innerHTML = `
      <div class="route-header">
        <span class="route-title">Trasa ${route}</span>
        <div class="route-meta">
          ${badgeHtml}
          ${arrowSvg}
        </div>
      </div>
      <div class="route-body">
        <div class="route-changes-container"></div>
        <button class="btn-delete-group" data-route="${route}">
            <span style="font-size: 16px;">❌ Usuń całą trasę ${route}</span>
        </button>
      </div>
    `;

    const changesContainer = wrapper.querySelector(".route-changes-container");

    // 5. Renderowanie pojedynczych zmian WEWNĄTRZ grupy
    grouped[route].forEach(c => {
      const item = document.createElement("div");
      item.className = "route-change";
      
      // Układ Zamiennik + Ilość INLINE
      item.innerHTML = `
        <div class="change-details">
          <div class="change-meta-row">
            <span class="change-meta-label">Mata:</span>
            <span class="change-meta-value">${c.base}</span>
          </div>
          <div class="change-meta-row">
            <span class="change-meta-label">Zamiennik:</span>
            <span class="change-meta-value">
                ${c.alt} 
                <span class="badge inline-qty">×${c.qty}</span>
            </span>
          </div>
        </div>
        <div class="change-actions">
          <button class="btn-danger" data-index="${c.originalIndex}">🗑️ Usuń</button>
          <button class="btn-outline" data-index="${c.originalIndex}">✏️ Edytuj ilość</button>
        </div>
      `;
      
      // 6. Podpięcie listenerów dla przycisków
      item.querySelector(".btn-danger").addEventListener("click", e => {
        e.stopPropagation(); 
        const index = Number(e.target.getAttribute("data-index"));
        // Przekazujemy element DO animacji usuwania
        openDeleteModal(index, item.closest(".route-change")); 
      });

      item.querySelector(".btn-outline").addEventListener("click", e => {
        e.stopPropagation();
        const index = Number(e.target.getAttribute("data-index"));
        openEditModal(index);
      });

      changesContainer.appendChild(item);
    });
    
    // 7. Listener przycisku USUŃ CAŁĄ TRASĘ
    wrapper.querySelector(".btn-delete-group").addEventListener("click", e => {
        e.stopPropagation();
        const routeToDelete = e.target.closest(".btn-delete-group").getAttribute("data-route");
        // Używamy .closest() aby upewnić się, że pobieramy atrybut z poprawnego elementu
        openDeleteGroupModal(routeToDelete, wrapper);
    });

    // 8. Listener rozwijania/zwijania
    wrapper.querySelector(".route-header").addEventListener("click", () => {
      wrapper.classList.toggle("open");
    });

    grid.appendChild(wrapper);
  });
}

function persist() {
  localStorage.setItem("changes", JSON.stringify(changes));
}

// Funkcja usuwająca pojedynczą zmianę
function removeChange(index) {
  changes.splice(index, 1);
  persist();
  renderChanges(); 
}

// FUNKCJA - usuwa wszystkie zmiany dla danej trasy
function removeRouteGroup(route) {
    // Filtrujemy tablicę, zostawiając tylko te zmiany, których trasa NIE jest równa 'route'
    changes = changes.filter(c => c.route !== route);
    persist();
    renderChanges();
}


// Funkcje modala edycji
function openEditModal(index) {
  editIndex = index;
  if (!changes[index]) {
    console.error(`Nie znaleziono zmiany o indeksie ${index}`);
    return;
  }
  editQtyInput.value = changes[index].qty;
  editModal.style.display = "flex";
  editQtyInput.focus();
}

function closeEditModal() {
  editModal.style.display = "none";
  editIndex = null;
}

// Funkcje modala usuwania POJEDYNCZEJ ZMIANY
function openDeleteModal(index, element) {
  itemToDelete = { index, element };
  const change = changes[index];
  if (change) {
    // Używamy innerHTML i <b> do formatowania, ale dane są bezpieczne (pochodzą z naszego obiektu)
    deleteModalText.innerHTML = `Na pewno usunąć: <br><b>${change.base} (×${change.qty})</b>?`;
  } else {
    deleteModalText.innerHTML = `Na pewno chcesz usunąć tę zmianę?`;
  }
  deleteModal.style.display = "flex";
}

function closeDeleteModal() {
  deleteModal.style.display = "none";
  itemToDelete = { index: null, element: null };
}

// FUNKCJA - otwieranie modala usuwania grupy
function openDeleteGroupModal(route, element) {
    routeGroupToDelete = { route, element };
    
    // Używamy elementu do policzenia ilości zmian
    const changeCount = element.querySelectorAll('.route-change').length;
    
    // Używamy innerHTML i <b> do formatowania, ale dane są bezpieczne (pochodzą z atrybutu data-route)
    deleteGroupModalText.innerHTML = `Na pewno usunąć <b>wszystkie zmiany</b> dla trasy <b>${route}</b>?<br>Tych zmian jest <b>${changeCount}</b>.`;

    deleteGroupModal.style.display = "flex";
}

function closeDeleteGroupModal() {
    deleteGroupModal.style.display = "none";
    routeGroupToDelete = { route: null, element: null };
}

// --- LISTENERY MODALI ---

// Listener modala edycji 
editCancel.addEventListener("click", closeEditModal);
editSave.addEventListener("click", () => {
  if (editIndex === null) return;
  const parsed = Number(editQtyInput.value);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 100) {
    showToast("❌ Ilość musi być od 1 do 100!");
    return;
  }
  changes[editIndex].qty = parsed;
  persist();
  renderChanges(); 
  showToast("✅ Ilość zaktualizowana", "var(--primary)");
  closeEditModal();
});

// Listenery modala usuwania POJEDYNCZEJ ZMIANY
deleteCancel.addEventListener("click", closeDeleteModal);
deleteConfirm.addEventListener("click", () => {
  if (itemToDelete.index === null) return;

  const { index, element } = itemToDelete;

  // Animacja usuwania
  element.style.opacity = "0";
  element.style.transform = "scale(0.95)";
  element.style.maxHeight = "0px";
  element.style.paddingTop = "0";
  element.style.paddingBottom = "0";
  element.style.borderTopWidth = "0";
  element.style.marginTop = "0";
  element.style.marginBottom = "0";
  element.style.overflow = "hidden";

  // Po animacji usuń dane i przerenderuj
  setTimeout(() => {
    removeChange(index); 
    showToast("🗑️ Zmiana usunięta", "var(--accent)");
  }, 260); 

  closeDeleteModal();
});

// Listenery modala usuwania GRUPY ZMIAN
deleteGroupCancel.addEventListener("click", closeDeleteGroupModal);
deleteGroupConfirm.addEventListener("click", () => {
    if (routeGroupToDelete.route === null) return;
    
    const { route, element } = routeGroupToDelete;

    // Animacja usuwania całej grupy
    element.style.opacity = "0";
    element.style.transform = "scale(0.98)";
    element.style.maxHeight = "0px";
    element.style.padding = "0";
    element.style.marginTop = "0";
    element.style.marginBottom = "0";
    element.style.overflow = "hidden";

    setTimeout(() => {
        removeRouteGroup(route); // Ta funkcja usuwa dane i wywołuje renderChanges()
        showToast(`🗑️ Usunięto całą trasę ${route}`, "var(--accent)");
    }, 300); 
    
    closeDeleteGroupModal();
});


// --- LOGIKA FORMULARZA ---
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

// Qty controls
qtyDec.addEventListener("click", () => {
  const v = Number(qtyInput.value);
  qtyInput.value = Math.max(1, v - 1);
});
qtyInc.addEventListener("click", () => {
  const v = Number(qtyInput.value);
  qtyInput.value = Math.min(100, v + 1);
});

// Add change
addBtn.addEventListener("click", () => {
  const route = routeSelect.value;
  const base  = baseMatSelect.value;
  const alt   = altMatSelect.value;
  const qty   = Number(qtyInput.value);

  if (!route || !base || !alt) {
    showToast("⚠️ Wybierz trasę, matę i zamiennik!");
    return;
  }
  // Dodajemy do początku listy (nowsze na górze)
  changes.unshift({ route, base, alt, qty });
  persist();
  renderChanges();
  showToast("✅ Dodano zmianę!", "var(--primary)");

  // Reset
  baseMatSelect.disabled = true;
  baseSearch.disabled = true;
  altMatSelect.disabled = true;
  altSearch.disabled = true;
  addBtn.disabled = true;
  qtyInput.value = 1;

  if (routeSelect.value !== "") {
    baseMatSelect.disabled = false;
    baseSearch.disabled = false;
    fillMatList(baseMatSelect);
  }
});

// Init
fillRoutes();
renderChanges();

// --- MOTYW I SERVICE WORKER ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

const themeToggle = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
  document.body.classList.add("dark");
} else {
  document.body.classList.add("light");
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
});