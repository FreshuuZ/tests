document.addEventListener("DOMContentLoaded", () => {
  
  // ==================== ROUTING SYSTEM ====================
  const views = {
    home: document.getElementById('homeView'),
    panel: document.getElementById('panelView'),
    mats: document.getElementById('matsView')
  };
  
  const headerTitle = document.getElementById('headerTitle');
  const backBtn = document.getElementById('backBtn');
  let currentView = 'home';
  
  function navigateTo(viewName) {
    Object.values(views).forEach(v => v?.classList.remove('active'));
    views[viewName]?.classList.add('active');
    currentView = viewName;
    
    if (viewName === 'home') {
      headerTitle.textContent = 'Centrum Główne';
      backBtn.style.display = 'none';
    } else if (viewName === 'panel') {
      headerTitle.textContent = 'Panel Tras i Zmian';
      backBtn.style.display = 'flex';
    } else if (viewName === 'mats') {
      headerTitle.textContent = 'Lista Mat Logo';
      backBtn.style.display = 'flex';
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  backBtn.addEventListener('click', () => navigateTo('home'));
  
  document.querySelectorAll('[data-navigate]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget.dataset.navigate;
      navigateTo(target);
    });
  });
  
  // ==================== THEME TOGGLE ====================
  const themeToggle = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("theme") || 'light';
  document.body.className = savedTheme;

  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    document.body.classList.toggle("light", !isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
  
  // ==================== TOAST ====================
  function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }
  
  // ==================== PORTAL SELECT SYSTEM ====================
  const selectPortal = document.getElementById('select-portal');
  let activeSelect = null;
  
  function createCustomSelect(wrapper, options, placeholder, stateKey, hasGroups = false) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
    wrapper.innerHTML = `
      <button type="button" class="custom-select-trigger placeholder" aria-haspopup="listbox" aria-expanded="false">${placeholder}</button>
      <div class="custom-select-panel" role="listbox">
        <input type="search" class="custom-select-search" placeholder="🔍 Szukaj...">
        <ul class="custom-select-options"></ul>
      </div>`;
    
    const trigger = wrapper.querySelector(".custom-select-trigger");
    const panel = wrapper.querySelector(".custom-select-panel");
    const searchInput = wrapper.querySelector(".custom-select-search");
    const optionsList = wrapper.querySelector(".custom-select-options");

    const selectInstance = {
        open: () => {
            if (activeSelect && activeSelect !== selectInstance) activeSelect.close();
            wrapper.classList.add("open");
            trigger.setAttribute("aria-expanded", "true");
            
            const rect = trigger.getBoundingClientRect();
            selectPortal.appendChild(panel);
            panel.style.position = 'fixed';
            panel.style.top = `${rect.bottom + 4}px`;
            panel.style.left = `${rect.left}px`;
            panel.style.width = `${rect.width}px`;
            panel.classList.add("open");
            
            populateOptions();
            searchInput.value = "";
            
            if (!isMobile) {
                searchInput.focus();
            }
            
            activeSelect = selectInstance;
        },
        close: () => {
            wrapper.classList.remove("open");
            trigger.setAttribute("aria-expanded", "false");
            panel.classList.remove("open");
            
            setTimeout(() => {
                if (!wrapper.classList.contains('open')) {
                    wrapper.appendChild(panel);
                    panel.style.cssText = '';
                }
            }, 300);

            if (activeSelect === selectInstance) activeSelect = null;
        },
        toggle: () => {
            if (wrapper.classList.contains("open")) selectInstance.close();
            else selectInstance.open();
        },
        reset: (newPlaceholder = placeholder) => {
            appState[stateKey] = '';
            trigger.textContent = newPlaceholder;
            trigger.classList.add('placeholder');
            selectInstance.close();
        }
    };
    
    function populateOptions(filter = "") {
      optionsList.innerHTML = "";
      let found = false;
      const processOption = (opt) => {
          const li = document.createElement("li");
          li.textContent = opt; li.dataset.value = opt; li.setAttribute('role', 'option');
          if (opt === appState[stateKey]) { li.classList.add("selected"); li.setAttribute('aria-selected', 'true'); }
          optionsList.appendChild(li);
      };

      if (hasGroups) {
          Object.entries(options).forEach(([groupName, groupOptions]) => {
              const filtered = groupOptions.filter(opt => String(opt).toLowerCase().includes(filter.toLowerCase()));
              if (filtered.length > 0) {
                  optionsList.insertAdjacentHTML('beforeend', `<li class="group-label">${groupName}</li>`);
                  filtered.forEach(processOption);
                  found = true;
              }
          });
      } else {
          const filteredOptions = options.filter(opt => opt.toLowerCase().includes(filter.toLowerCase()));
          if(filteredOptions.length > 0) {
              found = true;
              filteredOptions.forEach(processOption);
          }
      }
      if (!found) optionsList.innerHTML = `<li class="no-results">Brak wyników</li>`;
    }

    trigger.addEventListener("click", (e) => { e.stopPropagation(); selectInstance.toggle(); });
    searchInput.addEventListener("input", () => populateOptions(searchInput.value));
    panel.addEventListener("click", (e) => e.stopPropagation());

    optionsList.addEventListener("click", (e) => {
      if (e.target.tagName === "LI" && e.target.dataset.value) {
        if (document.activeElement === searchInput) {
          searchInput.blur();
        }
        
        appState[stateKey] = e.target.dataset.value;
        trigger.textContent = appState[stateKey];
        trigger.classList.remove("placeholder");
        
        setTimeout(() => {
          selectInstance.close();
          wrapper.dispatchEvent(new Event("change", { bubbles: true }));
        }, 50);
      }
    });

    wrapper.reset = selectInstance.reset;
    wrapper.close = selectInstance.close;
    return wrapper;
  }
  
  document.addEventListener("click", () => activeSelect?.close());
  
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const searchHasFocus = document.activeElement?.classList.contains('custom-select-search');
      if (!searchHasFocus) {
        activeSelect?.close();
      }
    }, 150);
  }, true);
  
  // ==================== PANEL TRAS - ELEMENTY DOM ====================
  const routeCard = document.getElementById("routeCard");
  const actionCard = document.getElementById("actionCard");
  const actionReplacement = document.getElementById("actionReplacement");
  const actionAddition = document.getElementById("actionAddition");
  const baseCard = document.getElementById("baseCard");
  const altCard = document.getElementById("altCard");
  const additionCard = document.getElementById("additionCard");
  const addBtn = document.getElementById("addBtn");
  const changesList = document.getElementById("changesList");
  const printOutput = document.getElementById("print-output");

  const routeSelectWrapper = document.getElementById("routeSelectWrapper");
  const baseMatSelectWrapper = document.getElementById("baseMatSelectWrapper");
  const altMatSelectWrapper = document.getElementById("altMatSelectWrapper");
  const multiAltSelectWrapper = document.getElementById("multiAltSelectWrapper");
  const additionMatSelectWrapper = document.getElementById("additionMatSelectWrapper");

  const simpleModeContainer = document.getElementById("simpleModeContainer");
  const simpleClientInput = document.getElementById("simpleClientInput");
  const qtyInput = document.getElementById("qty");
  const qtyDec = document.getElementById("qtyDec");
  const qtyInc = document.getElementById("qtyInc");

  const advancedModeToggle = document.getElementById("advancedModeToggle");
  const advancedModeContainer = document.getElementById("advancedModeContainer");
  const advQtyBaseInput = document.getElementById("advQtyBase");
  const advQtyBaseDec = document.getElementById("advQtyBaseDec");
  const advQtyBaseInc = document.getElementById("advQtyBaseInc");
  const multiAltClientInput = document.getElementById("multiAltClientInput");
  const multiAltQtyInput = document.getElementById("multiAltQtyInput");
  const addTempAltBtn = document.getElementById("addTempAltBtn");
  const tempMultiAltList = document.getElementById("tempMultiAltList");

  const additionQty = document.getElementById("additionQty");
  const additionQtyDec = document.getElementById("additionQtyDec");
  const additionQtyInc = document.getElementById("additionQtyInc");
  const addAdditionBtn = document.getElementById("addAdditionBtn");

  let editIndex = null;
  const editSimpleModal = document.getElementById("editSimpleModal");
  const editSimpleQtyInput = document.getElementById("editSimpleQtyInput");
  const editSimpleClientInput = document.getElementById("editSimpleClientInput");
  const editSimpleCancel = document.getElementById("editSimpleCancel");
  const editSimpleSave = document.getElementById("editSimpleSave");

  const editAdvancedModal = document.getElementById("editAdvancedModal");
  const editAdvChangeDetails = document.getElementById("editAdvChangeDetails");
  const editAdvQtyBaseInput = document.getElementById("editAdvQtyBaseInput");
  const editAdvQtyBaseDec = document.getElementById("editAdvQtyBaseDec");
  const editAdvQtyBaseInc = document.getElementById("editAdvQtyBaseInc");
  const editMultiAltSelectWrapper = document.getElementById("editMultiAltSelectWrapper");
  const editMultiAltClientInput = document.getElementById("editMultiAltClientInput");
  const editMultiAltQtyInput = document.getElementById("editMultiAltQtyInput");
  const editAddTempAltBtn = document.getElementById("editAddTempAltBtn");
  const editTempMultiAltList = document.getElementById("editTempMultiAltList");
  const editAdvancedCancel = document.getElementById("editAdvancedCancel");
  const editAdvancedSave = document.getElementById("editAdvancedSave");
  let editTempAlternatives = [];

  // Modal edycji dołożenia
  const editAdditionModal = document.getElementById("editAdditionModal");
  const editAdditionName = document.getElementById("editAdditionName");
  const editAdditionQtyInput = document.getElementById("editAdditionQtyInput");
  const editAdditionQtyDec = document.getElementById("editAdditionQtyDec");
  const editAdditionQtyInc = document.getElementById("editAdditionQtyInc");
  const editAdditionCancel = document.getElementById("editAdditionCancel");
  const editAdditionSave = document.getElementById("editAdditionSave");

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

  // ==================== PANEL TRAS - DANE ====================
  let changes = JSON.parse(localStorage.getItem("changes") || "[]");
  let tempAlternatives = [];
  let selectedAction = null;
  let appState = {
      route: '', baseMat: '', altMat: '',
      multiAltMat: '', editMultiAltMat: '', additionMat: ''
  };

  const routesByDay = {
    "Poniedziałek": Array.from({ length: 22 }, (_, i) => 1101 + i).concat([
      3152, 3153, 4161, 4162, 4163, 4164, 5171, 5172
    ]).sort((a, b) => a - b),
    "Wtorek": Array.from({ length: 22 }, (_, i) => 1201 + i).concat([
      3252, 3253, 4261, 4262, 4263, 4264, 5271, 5272
    ]).sort((a, b) => a - b),
    "Środa": Array.from({ length: 22 }, (_, i) => 1301 + i).concat([
      3352, 3353, 4361, 4362, 4363, 4364, 5371, 5372
    ]).sort((a, b) => a - b),
    "Czwartek": Array.from({ length: 22 }, (_, i) => 1401 + i).concat([
      3452, 3453, 4461, 4462, 4463, 4464, 5471, 5472
    ]).sort((a, b) => a - b),
    "Piątek": Array.from({ length: 22 }, (_, i) => 1501 + i).concat([
      3552, 3553, 4561, 4562, 4563, 4564, 4565, 5571, 5572
    ]).sort((a, b) => a - b),
    "Sobota": [1622]
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
  ].sort();

  // ==================== PANEL TRAS - FUNKCJE ====================
  function updateFormState() {
    const routeSelected = !!appState.route;
    const actionSelected = !!selectedAction;
    const baseMatSelected = !!appState.baseMat;
    const altMatSelected = !!appState.altMat;
    const additionMatSelected = !!appState.additionMat;
    const isAdvanced = advancedModeToggle.checked;
    const advancedListHasItems = tempAlternatives.length > 0;
    
    actionCard.classList.toggle('form-section-disabled', !routeSelected);
    
    if (selectedAction === 'replacement') {
      baseCard.style.display = 'block';
      altCard.style.display = 'block';
      additionCard.style.display = 'none';
      baseCard.classList.toggle('form-section-disabled', !actionSelected);
      altCard.classList.toggle('form-section-disabled', !baseMatSelected);
      advancedModeToggle.disabled = !baseMatSelected;
      addBtn.disabled = !baseMatSelected || (isAdvanced ? !advancedListHasItems : !altMatSelected);
    } else if (selectedAction === 'addition') {
      baseCard.style.display = 'none';
      altCard.style.display = 'none';
      additionCard.style.display = 'block';
      additionCard.classList.remove('form-section-disabled');
      addAdditionBtn.disabled = !additionMatSelected;
    } else {
      baseCard.style.display = 'none';
      altCard.style.display = 'none';
      additionCard.style.display = 'none';
    }
  }

  function renderTempAltList() {
    tempMultiAltList.innerHTML = tempAlternatives.length === 0 
      ? `<p style="text-align: center; color: var(--muted); font-size: 14px; margin: 12px 0 0 0;">Brak dodanych zamienników.</p>`
      : tempAlternatives.map((alt, index) => 
        `<div class="temp-alt-item">
          <div class="temp-alt-item-details">
            <div class="temp-alt-item-mat">${alt.alt}<span class="badge">×${alt.qty}</span></div>
            ${alt.client ? `<div class="temp-alt-item-client">${alt.client}</div>` : ''}
          </div>
          <button class="btn-danger" data-index="${index}" aria-label="Usuń ten zamiennik">🗑️</button>
        </div>`).join('');
  }

  function renderEditTempAltList() {
    editTempMultiAltList.innerHTML = editTempAlternatives.length === 0
      ? `<p style="text-align: center; color: var(--muted); font-size: 14px; margin: 12px 0 0 0;">Brak dodanych zamienników.</p>`
      : editTempAlternatives.map((alt, index) =>
        `<div class="temp-alt-item">
          <div class="temp-alt-item-details">
            <div class="temp-alt-item-mat">${alt.alt}<span class="badge">×${alt.qty}</span></div>
            ${alt.client ? `<div class="temp-alt-item-client">${alt.client}</div>` : ''}
          </div>
          <button class="btn-danger" data-index="${index}" aria-label="Usuń">🗑️</button>
        </div>`).join('');
  }

  function renderChanges() {
    const openRoutes = Array.from(changesList.querySelectorAll(".route-group.open")).map(g => g.dataset.route);
    changesList.innerHTML = "";

    if (changes.length === 0) {
      changesList.innerHTML = `<div class="empty-state"><svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg><div class="empty-state-text">Lista zmian jest pusta.<br>Wybierz trasę i dodaj pierwszą zmianę.</div></div>`;
      return;
    }

    const grouped = changes.reduce((acc, change, index) => {
      (acc[change.route] = acc[change.route] || []).push({ ...change, originalIndex: index });
      return acc;
    }, {});

    Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).forEach(route => {
      const wrapper = document.createElement("div");
      wrapper.className = "route-group";
      wrapper.dataset.route = route;
      if (openRoutes.includes(route)) wrapper.classList.add("open");

      wrapper.innerHTML = `<div class="route-header" data-action="toggle-group"><span class="route-title">Trasa ${route}</span><div class="route-meta"><button class="copy-route-btn" data-action="copy-group" aria-label="Kopiuj trasę"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button><button class="print-route-btn" data-action="print-group" aria-label="Drukuj trasę"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></button><span class="badge">${grouped[route].length}</span><svg class="arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18 6-6-6-6"/></svg></div></div><div class="route-body"><div><div class="route-changes-container"></div><button class="btn-delete-group" data-action="delete-group">❌ Usuń całą trasę ${route}</button></div></div>`;
      const changesContainer = wrapper.querySelector(".route-changes-container");

      grouped[route].forEach(c => {
        const item = document.createElement("div");
        item.className = "route-change";
        item.dataset.index = c.originalIndex;
        
        if (c.type === 'addition') {
          item.classList.add('change-addition');
        }
        
        let detailsHtml;

        if (c.type === 'addition') {
          detailsHtml = `
            <div class="change-addition-badge">DOŁOŻENIE</div>
            <div class="change-meta-row">
              <span class="change-meta-label">Mata:</span>
              <span class="change-meta-value">${c.mat} <span class="badge">×${c.qty}</span></span>
            </div>`;
        } else if (c.type === 'multi') {
            const altsHtml = c.alternatives.map(alt => `<li><span>${alt.alt}</span> <span class="badge">×${alt.qty}</span> ${alt.client ? `<span class="client-name">— ${alt.client}</span>` : ''}</li>`).join('');
            detailsHtml = `
              <div class="change-meta-row">
                <span class="change-meta-label">Baza:</span>
                <span class="change-meta-value">${c.base} <span class="badge">×${c.qtyBase}</span></span>
              </div>
              <div class="change-meta-row">
                <span class="change-meta-label">Zamienniki:</span>
                <span class="change-meta-value"><ul class="multi-alternatives-list">${altsHtml}</ul></span>
              </div>`;
        } else {
            const singleAltHtml = `
              <li>
                <span>${c.alt}</span> 
                <span class="badge">×${c.qty}</span> 
                ${c.client ? `<span class="client-name">— ${c.client}</span>` : ''}
              </li>
            `;
            detailsHtml = `
                <div class="change-meta-row">
                    <span class="change-meta-label">Baza:</span>
                    <span class="change-meta-value">${c.base} <span class="badge">×${c.qty}</span></span>
                </div>
                <div class="change-meta-row">
                    <span class="change-meta-label">Zamiennik:</span>
                    <span class="change-meta-value">
                        <ul class="multi-alternatives-list">${singleAltHtml}</ul>
                    </span>
                </div>
            `;
        }
        item.innerHTML = `<div class="change-details">${detailsHtml}</div><div class="change-actions"><button class="btn-danger" data-action="delete-item">🗑️ Usuń</button><button class="btn-secondary" data-action="edit-item">✏️ Edytuj</button></div>`;
        changesContainer.appendChild(item);
      });
      changesList.appendChild(wrapper);
    });
  }

  const persist = () => localStorage.setItem("changes", JSON.stringify(changes));
  const removeChange = (index) => { changes.splice(index, 1); persist(); };
  const removeRouteGroup = (route) => { changes = changes.filter(c => c.route !== route); persist(); };

  const openModal = (modal) => modal.style.display = "flex";
  const closeModal = (modal) => modal.style.display = "none";

  function openSimpleEditModal(index) {
    editIndex = index;
    const change = changes[index];
    if (!change) return;
    editSimpleQtyInput.value = change.qty;
    editSimpleClientInput.value = change.client || '';
    openModal(editSimpleModal);
    editSimpleQtyInput.focus();
  }

  function openAdvancedEditModal(index) {
    editIndex = index;
    const change = changes[index];
    if (!change) return;
    editAdvChangeDetails.innerHTML = `Edytujesz zmianę dla: <strong>${change.base}</strong> (Trasa ${change.route})`;
    editAdvQtyBaseInput.value = change.qtyBase;
    editTempAlternatives = JSON.parse(JSON.stringify(change.alternatives));
    renderEditTempAltList();
    openModal(editAdvancedModal);
  }
  
  function openAdditionEditModal(index) {
    editIndex = index;
    const change = changes[index];
    if (!change || change.type !== 'addition') return;
    editAdditionName.textContent = change.mat;
    editAdditionQtyInput.value = change.qty;
    openModal(editAdditionModal);
    editAdditionQtyInput.focus();
  }

  function openDeleteModal(index, element) { 
    itemToDelete = { index, element }; 
    const change = changes[index];
    const changeType = change.type === 'addition' ? 'dołożenie' : 'zmianę';
    const changeName = change.type === 'addition' ? change.mat : change.base;
    deleteModalText.innerHTML = `Na pewno usunąć ${changeType} dla maty:<br><b>${changeName}</b>?`; 
    openModal(deleteModal); 
  }
  
  function openDeleteGroupModal(route, element) {
    // Zapisujemy referencję do nadrzędnego kontenera `.route-group`
    routeGroupToDelete = { route, element: element.closest('.route-group') }; 
    const changeCount = changes.filter(c => c.route === route).length;
    deleteGroupModalText.innerHTML = `Na pewno usunąć trasę <b>${route}</b> i wszystkie <b>${changeCount}</b> powiązane z nią zmiany?`;
    openModal(deleteGroupModal);
  }

  editSimpleSave.addEventListener("click", () => {
    if (editIndex === null) return;
    const newQty = Number(editSimpleQtyInput.value);
    if (isNaN(newQty) || newQty < 1 || newQty > 100) { showToast("Ilość musi być od 1 do 100!", "error"); return; }
    changes[editIndex].qty = newQty;
    changes[editIndex].client = editSimpleClientInput.value.trim();
    persist();
    renderChanges();
    showToast("✅ Zmiana zaktualizowana");
    closeModal(editSimpleModal);
  });

  editAdvancedSave.addEventListener("click", () => {
    if (editIndex === null) return;
    const newQtyBase = Number(editAdvQtyBaseInput.value);
    if (isNaN(newQtyBase) || newQtyBase < 1 || newQtyBase > 100) { showToast("Ilość bazowa musi być od 1 do 100!", "error"); return; }
    if (editTempAlternatives.length === 0) { showToast("Musisz mieć przynajmniej jeden zamiennik!", "error"); return; }
    changes[editIndex].qtyBase = newQtyBase;
    changes[editIndex].alternatives = JSON.parse(JSON.stringify(editTempAlternatives));
    persist();
    renderChanges();
    showToast("✅ Zmiana zaktualizowana");
    closeModal(editAdvancedModal);
  });

  editAdditionSave.addEventListener("click", () => {
    if (editIndex === null) return;
    const newQty = Number(editAdditionQtyInput.value);
    if (isNaN(newQty) || newQty < 1 || newQty > 100) { 
      showToast("Ilość musi być od 1 do 100!", "error"); 
      return; 
    }
    changes[editIndex].qty = newQty;
    persist();
    renderChanges();
    showToast("✅ Dołożenie zaktualizowane");
    closeModal(editAdditionModal);
  });

  deleteConfirm.addEventListener("click", () => { 
    if (itemToDelete.index === null) return; 
    const { index, element } = itemToDelete; 
    element.classList.add("is-hiding"); 
    setTimeout(() => { removeChange(index); renderChanges(); showToast("🗑️ Usunięto", "error"); }, 300); 
    closeModal(deleteModal); 
  });
  

  deleteGroupConfirm.addEventListener("click", () => {
      if (routeGroupToDelete.route === null || !routeGroupToDelete.element) return;
      const { route, element } = routeGroupToDelete;
      
      closeModal(deleteGroupModal);
      element.classList.add("is-hiding");

      setTimeout(() => {
        // Usuń z danych
        removeRouteGroup(route);
        
        // Usuń tylko ten element DOM (nie przebudowuj wszystkiego!)
        element.remove();
        
        // Jeśli lista pusta, pokaż empty state
        if (changes.length === 0) {
          changesList.innerHTML = `
            <div class="empty-state">
              <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
              <div class="empty-state-text">Lista zmian jest pusta.<br>Wybierz trasę i dodaj pierwszą zmianę.</div>
            </div>
          `;
        }
        
        showToast("🗑️ Usunięto trasę", "error");
        routeGroupToDelete = { route: null, element: null }; 
      }, 400); // 400ms - dopasowane do transition w CSS (0.4s)
  });

  [editSimpleCancel, editAdvancedCancel, editAdditionCancel, deleteCancel, deleteGroupCancel].forEach(btn => 
    btn.addEventListener("click", () => closeModal(btn.closest('.modal')))
  );
    changesList.addEventListener("click", (e) => {
    const actionElement = e.target.closest("[data-action]");
    if (!actionElement) return;
    const action = actionElement.dataset.action;
    const itemElement = e.target.closest(".route-change");
    const groupElement = e.target.closest(".route-group");
  
    switch (action) {
      case "delete-item": openDeleteModal(Number(itemElement.dataset.index), itemElement); break;
      case "edit-item": 
        const index = Number(itemElement.dataset.index); 
        const change = changes[index]; 
        if (change.type === 'multi') { openAdvancedEditModal(index); } 
        else if (change.type === 'simple') { openSimpleEditModal(index); }
        else if (change.type === 'addition') { openAdditionEditModal(index); }
        break;
      case "print-group":
        const route = groupElement.dataset.route;
        const routeChanges = changes.filter(c => c.route === route);
        if (routeChanges.length === 0) return;
        const printDate = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        const replacements = routeChanges.filter(c => c.type !== 'addition');
        const additions = routeChanges.filter(c => c.type === 'addition');
        
        let printHTML = `<div class="print-header"><img src="icons/icon-192.png" alt="Elis Logo"><div class="title-block"><h1>Raport Zmian Mat</h1><p>Trasa ${route} &nbsp;|&nbsp; Data: ${printDate}</p></div></div>`;
        
        if (replacements.length > 0) {
          printHTML += `<h2>Zamienniki (${replacements.length})</h2>`;
          printHTML += replacements.map(c => {
            if (c.type === 'multi') {
              const alts = c.alternatives.map(alt => `<li>${alt.alt} (×${alt.qty})${alt.client ? ` <span class="client">— ${alt.client}</span>` : ''}</li>`).join('');
              return `<div class="print-change-item"><div class="base">${c.base} (ilość bazowa: ×${c.qtyBase})</div><ul class="multi-alt-list">${alts}</ul></div>`;
            }
            return `<div class="print-change-item"><div class="base">${c.base} (×${c.qty})</div><div class="simple-alt">${c.alt} (×${c.qty})${c.client ? ` <span class="client">— ${c.client}</span>` : ''}</div></div>`;
          }).join('');
        }
        
        if (additions.length > 0) {
          printHTML += `<h2>Dołożenia (${additions.length})</h2>`;
          printHTML += additions.map(c => {
            return `<div class="print-change-item print-addition"><div class="base">${c.mat} (×${c.qty})</div></div>`;
          }).join('');
        }
        
        printOutput.innerHTML = printHTML;
        setTimeout(() => { try { window.print(); } catch (error) { console.error("Błąd drukowania:", error); showToast("Błąd podczas otwierania okna drukowania.", "error"); } }, 100);
        break;
      case "copy-group":
        const routeToCopy = groupElement.dataset.route;
        const changesToCopy = changes.filter(c => c.route === routeToCopy);
        let textToCopy = `Trasa ${routeToCopy}:\n\n`;
        
        const repls = changesToCopy.filter(c => c.type !== 'addition');
        const adds = changesToCopy.filter(c => c.type === 'addition');
        
        if (repls.length > 0) {
          textToCopy += `ZAMIENNIKI:\n`;
          textToCopy += repls.map(c => {
            if (c.type === 'multi') {
              let multiText = `- ${c.base} (×${c.qtyBase}):\n`;
              multiText += c.alternatives.map(alt => `    ↪ ${alt.alt} (×${alt.qty})${alt.client ? ` [${alt.client}]` : ''}`).join('\n');
              return multiText;
            }
            return `- ${c.base} (×${c.qty}) -> ${c.alt} (×${c.qty})${c.client ? ` [${c.client}]` : ''}`;
          }).join("\n");
        }
        
        if (adds.length > 0) {
          textToCopy += `\n\nDOŁOŻENIA:\n`;
          textToCopy += adds.map(c => `+ ${c.mat} (×${c.qty})`).join("\n");
        }
        
        navigator.clipboard.writeText(textToCopy).then(() => showToast("✅ Skopiowano do schowka!")).catch(() => showToast("❌ Błąd kopiowania", "error"));
        break;
      case "delete-group": openDeleteGroupModal(groupElement.dataset.route, groupElement); break;
      case "toggle-group": groupElement.classList.toggle("open"); break;
    }
  });

  // Wybór akcji
  actionReplacement.addEventListener('click', () => {
    selectedAction = 'replacement';
    actionReplacement.classList.add('selected');
    actionAddition.classList.remove('selected');
    updateFormState();
  });
  
  actionAddition.addEventListener('click', () => {
    selectedAction = 'addition';
    actionAddition.classList.add('selected');
    actionReplacement.classList.remove('selected');
    updateFormState();
  });

  routeSelectWrapper.addEventListener("change", () => { 
    selectedAction = null;
    actionReplacement.classList.remove('selected');
    actionAddition.classList.remove('selected');
    advancedModeToggle.checked = false; 
    advancedModeToggle.dispatchEvent(new Event('change')); 
    baseMatSelectWrapper.reset('— wybierz matę —'); 
    altMatSelectWrapper.reset('— wybierz zamiennik —');
    additionMatSelectWrapper.reset('— wybierz matę —');
    updateFormState(); 
  });
  
  baseMatSelectWrapper.addEventListener("change", () => { 
    altMatSelectWrapper.reset('— wybierz zamiennik —'); 
    multiAltSelectWrapper.reset('— wybierz zamiennik —'); 
    updateFormState(); 
  });
  
  altMatSelectWrapper.addEventListener("change", updateFormState);
  additionMatSelectWrapper.addEventListener("change", updateFormState);
  
  advancedModeToggle.addEventListener("change", (e) => { 
    const isAdvanced = e.target.checked; 
    simpleModeContainer.style.display = isAdvanced ? "none" : "block"; 
    advancedModeContainer.style.display = isAdvanced ? "block" : "none"; 
    if (isAdvanced) { tempAlternatives = []; renderTempAltList(); } 
    updateFormState(); 
  });
  
  addTempAltBtn.addEventListener("click", () => { 
    const qty = Number(multiAltQtyInput.value); 
    const client = multiAltClientInput.value.trim(); 
    if (!appState.multiAltMat || qty < 1) { showToast("Wybierz zamiennik i poprawną ilość.", "error"); return; } 
    tempAlternatives.push({ alt: appState.multiAltMat, qty, client }); 
    renderTempAltList(); 
    multiAltSelectWrapper.reset("— wybierz zamiennik —"); 
    multiAltQtyInput.value = 1; 
    multiAltClientInput.value = ""; 
    updateFormState(); 
  });
  
  tempMultiAltList.addEventListener("click", (e) => { 
    const btn = e.target.closest('.btn-danger[data-index]'); 
    if (btn) { tempAlternatives.splice(Number(btn.dataset.index), 1); renderTempAltList(); updateFormState(); } 
  });
  
  editAddTempAltBtn.addEventListener("click", () => { 
    const qty = Number(editMultiAltQtyInput.value); 
    const client = editMultiAltClientInput.value.trim(); 
    if (!appState.editMultiAltMat || qty < 1) { showToast("Wybierz zamiennik i poprawną ilość.", "error"); return; } 
    editTempAlternatives.push({ alt: appState.editMultiAltMat, qty, client }); 
    renderEditTempAltList(); 
    editMultiAltSelectWrapper.reset("— wybierz zamiennik —"); 
    editMultiAltQtyInput.value = 1; 
    editMultiAltClientInput.value = ""; 
  });
  
  editTempMultiAltList.addEventListener("click", (e) => { 
    const btn = e.target.closest('.btn-danger[data-index]'); 
    if (btn) { editTempAlternatives.splice(Number(btn.dataset.index), 1); renderEditTempAltList(); } 
  });
  
  [editAdvQtyBaseDec, editAdvQtyBaseInc].forEach(btn => btn.addEventListener("click", (e) => { 
    const change = e.target.id.includes('Dec') ? -1 : 1; 
    editAdvQtyBaseInput.value = Math.max(1, Math.min(100, Number(editAdvQtyBaseInput.value) + change)); 
  }));
  
  // Przyciski +/- dla edycji dołożenia
  editAdditionQtyDec.addEventListener("click", () => {
    editAdditionQtyInput.value = Math.max(1, Math.min(100, Number(editAdditionQtyInput.value) - 1));
  });
  editAdditionQtyInc.addEventListener("click", () => {
    editAdditionQtyInput.value = Math.max(1, Math.min(100, Number(editAdditionQtyInput.value) + 1));
  });
  
  addBtn.addEventListener("click", () => {
    if (!appState.route || !appState.baseMat) { showToast("Wybierz trasę i matę bazową!", "error"); return; }
    let newChange;
    if (advancedModeToggle.checked) {
      if (tempAlternatives.length === 0) { showToast("Dodaj przynajmniej jeden zamiennik!", "error"); return; }
      newChange = { type: 'multi', route: appState.route, base: appState.baseMat, qtyBase: Number(advQtyBaseInput.value), alternatives: [...tempAlternatives] };
    } else {
      if (!appState.altMat) { showToast("Wybierz zamiennik!", "error"); return; }
      newChange = { type: 'simple', route: appState.route, base: appState.baseMat, alt: appState.altMat, qty: Number(qtyInput.value), client: simpleClientInput.value.trim() };
    }
    changes.unshift(newChange);
    persist();
    renderChanges();
    showToast("✅ Dodano zmianę!");

    if (advancedModeToggle.checked) { advancedModeToggle.checked = false; advancedModeToggle.dispatchEvent(new Event('change')); }
    altMatSelectWrapper.reset('— wybierz zamiennik —');
    simpleClientInput.value = '';
    qtyInput.value = 1;
    advQtyBaseInput.value = 1;
    updateFormState();
    altCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  addAdditionBtn.addEventListener("click", () => {
    if (!appState.route || !appState.additionMat) {
      showToast("Wybierz trasę i matę!", "error");
      return;
    }
    
    const newAddition = {
      type: 'addition',
      route: appState.route,
      mat: appState.additionMat,
      qty: Number(additionQty.value)
    };
    
    changes.unshift(newAddition);
    persist();
    renderChanges();
    showToast("✅ Dodano dołożenie!");
    
    additionMatSelectWrapper.reset('— wybierz matę —');
    additionQty.value = 1;
    updateFormState();
    additionCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  [qtyDec, qtyInc, advQtyBaseDec, advQtyBaseInc].forEach(btn => btn.addEventListener("click", (e) => { 
    const isAdv = e.target.id.includes('adv'); 
    const input = isAdv ? advQtyBaseInput : qtyInput; 
    const change = e.target.id.includes('Dec') ? -1 : 1; 
    input.value = Math.max(1, Math.min(100, Number(input.value) + change)); 
  }));

  additionQtyDec.addEventListener('click', () => {
    additionQty.value = Math.max(1, Math.min(100, Number(additionQty.value) - 1));
  });
  additionQtyInc.addEventListener('click', () => {
    additionQty.value = Math.max(1, Math.min(100, Number(additionQty.value) + 1));
  });

  // ==================== LISTA MAT LOGO ====================
  const matsSearch = document.getElementById('matsSearch');
  const matsList = document.getElementById('matsList');
  const matsCount = document.getElementById('matsCount');
  const matsFiltered = document.getElementById('matsFiltered');
  const printMatsBtn = document.getElementById('printMatsBtn');

  function renderMats(filter = '') {
    const filtered = logoData.filter(mat => {
      const search = filter.toLowerCase();
      return mat.name.toLowerCase().includes(search) ||
             mat.location.toLowerCase().includes(search) ||
             mat.size.toLowerCase().includes(search);
    });

    const totalQuantity = logoData.reduce((sum, mat) => sum + mat.quantity, 0);
    matsCount.textContent = `Załadowano: ${logoData.length} mat (łącznie: ${totalQuantity} szt.)`;
    
    if (filter) {
      matsFiltered.style.display = 'inline';
      const filteredQuantity = filtered.reduce((sum, mat) => sum + mat.quantity, 0);
      matsFiltered.textContent = `Znaleziono: ${filtered.length} (${filteredQuantity} szt.)`;
    } else {
      matsFiltered.style.display = 'none';
    }

    if (filtered.length === 0) {
      matsList.innerHTML = `<div class="empty-state">
        <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <div class="empty-state-text">Nie znaleziono mat spełniających kryteria.</div>
      </div>`;
      return;
    }

    matsList.innerHTML = filtered.map((mat) => {
      return `
        <div class="mat-item">
          <div class="mat-info">
            <div class="mat-name">${mat.name}</div>
            <div class="mat-details">
              ${mat.location ? `<div class="mat-detail-item">📍 <strong>${mat.location}</strong></div>` : ''}
              ${mat.size ? `<div class="mat-detail-item">📏 ${mat.size}</div>` : ''}
            </div>
          </div>
          <div class="mat-actions">
            <div class="mat-qty-badge">${mat.quantity}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  matsSearch.addEventListener('input', (e) => {
    renderMats(e.target.value);
  });

  // Eksport do Excel - wersja profesjonalna
  const exportExcelBtn = document.getElementById('exportExcelBtn');
  
  exportExcelBtn.addEventListener('click', async () => {
    if (typeof ExcelJS === 'undefined') {
      showToast("Biblioteka Excel nie jest załadowana", "error");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inwentaryzacja Mat', {
        pageSetup: { 
          paperSize: 9, 
          orientation: 'portrait',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0
        }
      });

      // Metadane dokumentu
      workbook.creator = 'Elis System';
      workbook.created = new Date();
      workbook.company = 'Elis';
      
      const currentDate = new Date().toLocaleDateString('pl-PL', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const totalQuantity = logoData.reduce((sum, mat) => sum + mat.quantity, 0);
      const sortedMats = [...logoData].sort((a, b) => a.name.localeCompare(b.name, 'pl'));

      // === NAGŁÓWEK DOKUMENTU ===
      worksheet.mergeCells('A1:D1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'ELIS - INWENTARYZACJA MAT LOGO';
      titleCell.font = { 
        name: 'Calibri', 
        size: 18, 
        bold: true, 
        color: { argb: 'FFFFFFFF' } 
      };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00A9BE' } // Kolor Elis
      };
      titleCell.alignment = { 
        vertical: 'middle', 
        horizontal: 'center' 
      };
      worksheet.getRow(1).height = 35;

      // === INFORMACJE O DOKUMENCIE ===
      worksheet.mergeCells('A2:D2');
      const dateCell = worksheet.getCell('A2');
      dateCell.value = `Data wygenerowania: ${currentDate}`;
      dateCell.font = { name: 'Calibri', size: 10, italic: true };
      dateCell.alignment = { horizontal: 'center' };
      dateCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' }
      };

      // Pusta linia
      worksheet.addRow([]);

      // === PODSUMOWANIE ===
      const summaryRow1 = worksheet.addRow(['PODSUMOWANIE', '', '', '']);
      worksheet.mergeCells(`A${summaryRow1.number}:D${summaryRow1.number}`);
      summaryRow1.getCell(1).font = { 
        name: 'Calibri', 
        size: 12, 
        bold: true 
      };
      summaryRow1.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE3E9F0' }
      };
      summaryRow1.height = 25;

      const statsRow1 = worksheet.addRow(['Liczba pozycji:', logoData.length, '', '']);
      const statsRow2 = worksheet.addRow(['Suma mat (szt.):', totalQuantity, '', '']);
      
      [statsRow1, statsRow2].forEach(row => {
        row.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
        row.getCell(2).font = { name: 'Calibri', size: 11 };
        row.getCell(2).alignment = { horizontal: 'left' };
      });

      // Pusta linia
      worksheet.addRow([]);

      // === NAGŁÓWEK TABELI ===
      const headerRow = worksheet.addRow(['Nazwa maty', 'Lokalizacja', 'Rozmiar', 'Ilość (szt.)']);
      headerRow.height = 30;
      headerRow.font = { 
        name: 'Calibri', 
        size: 11, 
        bold: true, 
        color: { argb: 'FFFFFFFF' } 
      };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0D1117' } // Ciemny kolor
      };
      headerRow.alignment = { 
        vertical: 'middle', 
        horizontal: 'center' 
      };
      
      // Obramowanie nagłówka
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'medium', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // === DANE MAT ===
      sortedMats.forEach((mat, index) => {
        const row = worksheet.addRow([
          mat.name,
          mat.location || 'Nie określono',
          mat.size || 'Nie określono',
          mat.quantity
        ]);
        
        row.height = 22;
        row.font = { name: 'Calibri', size: 10 };
        
        // Zebra striping (co drugi wiersz)
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' }
          };
        }
        
        // Wyrównanie
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
        
        // Pogrubienie ilości
        row.getCell(4).font = { name: 'Calibri', size: 10, bold: true };
        
        // Obramowanie
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };
        });
      });

      // === SUMA NA DOLE ===
      worksheet.addRow([]); // Pusta linia
      const totalRow = worksheet.addRow(['', '', 'SUMA CAŁKOWITA:', totalQuantity]);
      totalRow.height = 28;
      totalRow.getCell(3).font = { 
        name: 'Calibri', 
        size: 11, 
        bold: true 
      };
      totalRow.getCell(4).font = { 
        name: 'Calibri', 
        size: 12, 
        bold: true,
        color: { argb: 'FF00A9BE' }
      };
      totalRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
      totalRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      totalRow.getCell(4).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0F7FA' }
      };

      // === STOPKA ===
      worksheet.addRow([]);
      const footerRow = worksheet.addRow(['Dokument wygenerowany automatycznie przez system Elis', '', '', '']);
      worksheet.mergeCells(`A${footerRow.number}:D${footerRow.number}`);
      footerRow.getCell(1).font = { 
        name: 'Calibri', 
        size: 9, 
        italic: true, 
        color: { argb: 'FF6B7280' } 
      };
      footerRow.getCell(1).alignment = { horizontal: 'center' };

      // === SZEROKOŚCI KOLUMN ===
      worksheet.columns = [
        { width: 40 },  // Nazwa
        { width: 25 },  // Lokalizacja
        { width: 18 },  // Rozmiar
        { width: 15 }   // Ilość
      ];

      // === GENEROWANIE PLIKU ===
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const fileName = `Elis_Inwentaryzacja_Mat_${new Date().toISOString().split('T')[0]}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      
      showToast("Wyeksportowano do Excel!");
      
    } catch (error) {
      console.error('Błąd eksportu:', error);
      showToast("Błąd podczas eksportu do Excel", "error");
    }
  });

  // Drukowanie listy mat
  printMatsBtn.addEventListener('click', () => {
    const printDate = new Date().toLocaleDateString('pl-PL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const totalQuantity = logoData.reduce((sum, mat) => sum + mat.quantity, 0);
    const sortedMats = [...logoData].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    
    let printHTML = `
      <div class="print-mats-header">
        <img src="icons/icon-192.png" alt="Elis Logo">
        <div class="title-block">
          <h1>Lista Mat Logo - Inwentaryzacja</h1>
          <p>Data wydruku: ${printDate}</p>
        </div>
      </div>
      
      <div class="print-mats-summary">
        <p><strong>Łączna liczba pozycji:</strong> ${logoData.length}</p>
        <p><strong>Suma wszystkich mat:</strong> ${totalQuantity} szt.</p>
      </div>
      
      <table class="print-mats-table">
        <thead>
          <tr>
            <th>Nazwa</th>
            <th>Lokalizacja</th>
            <th>Rozmiar</th>
            <th>Ilość</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    sortedMats.forEach(mat => {
      printHTML += `
        <tr>
          <td>${mat.name}</td>
          <td>${mat.location || '—'}</td>
          <td>${mat.size || '—'}</td>
          <td>${mat.quantity}</td>
        </tr>
      `;
    });
    
    printHTML += `
        </tbody>
      </table>
      
      <div class="print-mats-footer">
        <p>Elis - System Zarządzania Matami | Wygenerowano automatycznie</p>
      </div>
    `;
    
    printOutput.innerHTML = printHTML;
    
    setTimeout(() => {
      try {
        window.print();
      } catch (error) {
        console.error("Błąd drukowania:", error);
        showToast("Błąd podczas otwierania okna drukowania.", "error");
      }
    }, 100);
  });
  
  // ==================== INICJALIZACJA ====================
  function init() {
    createCustomSelect(routeSelectWrapper, routesByDay, "— wybierz trasę —", "route", true);
    createCustomSelect(baseMatSelectWrapper, mats, "— wybierz matę —", "baseMat");
    createCustomSelect(altMatSelectWrapper, mats, "— wybierz zamiennik —", "altMat");
    createCustomSelect(multiAltSelectWrapper, mats, "— wybierz zamiennik —", "multiAltMat");
    createCustomSelect(editMultiAltSelectWrapper, mats, "— wybierz zamiennik —", "editMultiAltMat");
    createCustomSelect(additionMatSelectWrapper, mats, "— wybierz matę —", "additionMat");
    
    renderChanges();
    updateFormState();
    renderMats();
  }

  init();
  navigateTo('home');
});
