document.addEventListener("DOMContentLoaded", () => {
  
  // ==================== GLOBAL STATE & CACHE ====================
  let allLogoMats = [];
  // ==================== OPTYMALIZACJA LISTY MAT ====================
  const MATS_PER_PAGE = 30;           // Ile mat na stronę
  const SEARCH_DEBOUNCE_MS = 250;     // Opóźnienie wyszukiwania

  let currentMatsPage = 0;
  let filteredMatsCache = [];
  let searchDebounceTimer = null;
  let isLoadingMoreMats = false;
  let matsObserver = null;

  let allWashingItems = [];
  let allArchiveItems = [];
  let allReplacementsArchive = [];
// ==================== SYSTEM ADMINISTRATORA ====================
  let isAdmin = false;

  // Wyloguj przy zamknięciu strony
  window.addEventListener('beforeunload', () => {
    logoutAdmin(true); // silent logout
  });

  // Wyloguj przy zmianie widoczności (opcjonalne - dodatkowe bezpieczeństwo)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Opcjonalnie: wyloguj po pewnym czasie nieaktywności
      // setTimeout(() => { if (document.visibilityState === 'hidden') logoutAdmin(true); }, 300000);
    }
  });

  // ==================== ELEMENTY DOM ADMINA ====================
  const adminBtn = document.getElementById('adminBtn');
  const adminModal = document.getElementById('adminModal');
  const adminPinInput = document.getElementById('adminPinInput');
  const pinError = document.getElementById('pinError');
  const adminLoginSection = document.getElementById('adminLoginSection');
  const adminLoggedSection = document.getElementById('adminLoggedSection');
  const adminModalIcon = document.getElementById('adminModalIcon');
  const adminModalTitle = document.getElementById('adminModalTitle');
  const togglePinVisibility = document.getElementById('togglePinVisibility');

  // Przyciski admina
  const adminLoginCancel = document.getElementById('adminLoginCancel');
  const adminLoginSubmit = document.getElementById('adminLoginSubmit');
  const adminCloseBtn = document.getElementById('adminCloseBtn');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');

  // Sekcja dodawania maty
  const adminAddMatSection = document.getElementById('adminAddMatSection');
  const addNewMatBtn = document.getElementById('addNewMatBtn');

  // Modal dodawania maty
  const addMatModal = document.getElementById('addMatModal');
  const addMatName = document.getElementById('addMatName');
  const addMatNumber = document.getElementById('addMatNumber');
  const addMatRack = document.getElementById('addMatRack');
  const addMatRow = document.getElementById('addMatRow');
  const addMatPipe = document.getElementById('addMatPipe');
  const addMatPallet = document.getElementById('addMatPallet');
  const addMatSize = document.getElementById('addMatSize');
  const addMatQty = document.getElementById('addMatQty');
  const addRackFields = document.getElementById('addRackFields');
  const addPalletFields = document.getElementById('addPalletFields');
  const addMatCancel = document.getElementById('addMatCancel');
  const addMatSubmit = document.getElementById('addMatSubmit');

  // Modal edycji maty
  const editMatModal = document.getElementById('editMatModal');
  const editMatId = document.getElementById('editMatId');
  const editMatName = document.getElementById('editMatName');
  const editMatNumber = document.getElementById('editMatNumber');
  const editMatRack = document.getElementById('editMatRack');
  const editMatRow = document.getElementById('editMatRow');
  const editMatPipe = document.getElementById('editMatPipe');
  const editMatPallet = document.getElementById('editMatPallet');
  const editMatSize = document.getElementById('editMatSize');
  const editMatQty = document.getElementById('editMatQty');
  const editRackFields = document.getElementById('editRackFields');
  const editPalletFields = document.getElementById('editPalletFields');
  const editMatCancel = document.getElementById('editMatCancel');
  const editMatSubmit = document.getElementById('editMatSubmit');

  // Modal usuwania maty
  const deleteMatModal = document.getElementById('deleteMatModal');
  const deleteMatId = document.getElementById('deleteMatId');
  const deleteMatName = document.getElementById('deleteMatName');
  const deleteMatCancel = document.getElementById('deleteMatCancel');
  const deleteMatConfirm = document.getElementById('deleteMatConfirm');

  // ==================== FUNKCJE ADMINA ====================

  function openAdminModal() {
    if (isAdmin) {
      // Pokaż sekcję zalogowanego
      adminLoginSection.style.display = 'none';
      adminLoggedSection.style.display = 'block';
      adminModalIcon.textContent = '🔓';
      adminModalTitle.textContent = 'Panel Administratora';
    } else {
      // Pokaż sekcję logowania
      adminLoginSection.style.display = 'block';
      adminLoggedSection.style.display = 'none';
      adminModalIcon.textContent = '🔒';
      adminModalTitle.textContent = 'Logowanie Administratora';
      adminPinInput.value = '';
      pinError.style.display = 'none';
    }
    openModal(adminModal);
    if (!isAdmin) {
      setTimeout(() => adminPinInput.focus(), 100);
    }
  }

  async function verifyPin(pin) {
    try {
      const { data, error } = await window.supabase
        .from('archive_pins')
        .select('id')
        .eq('pin_code', pin)
        .limit(1);
      
      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error('Błąd weryfikacji PIN:', error);
      return false;
    }
  }

  async function loginAdmin() {
    const pin = adminPinInput.value.trim();
    
    if (!pin || pin.length < 3) {
      pinError.style.display = 'flex';
      pinError.querySelector('span').textContent = 'PIN musi mieć minimum 3 znaki';
      adminPinInput.classList.add('error');
      return;
    }
    
    adminLoginSubmit.disabled = true;
    adminLoginSubmit.innerHTML = '<span class="spinner"></span> Weryfikacja...';
    
    const isValid = await verifyPin(pin);
    
    if (isValid) {
      isAdmin = true;
      pinError.style.display = 'none';
      adminPinInput.classList.remove('error');
      closeModal(adminModal);
      updateAdminUI();
      showToast('✅ Zalogowano jako Administrator!', 'success');
      
      // Odśwież listę mat jeśli jesteśmy w widoku mat
      if (currentView === 'mats') {
        renderMats(allLogoMats, matsSearch.value);
      }
    } else {
      pinError.style.display = 'flex';
      pinError.querySelector('span').textContent = 'Nieprawidłowy PIN';
      adminPinInput.classList.add('error');
      adminPinInput.value = '';
      adminPinInput.focus();
    }
    
    adminLoginSubmit.disabled = false;
    adminLoginSubmit.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px;margin-right:6px;"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
      Zaloguj
    `;
  }

  function logoutAdmin(silent = false) {
    isAdmin = false;
    updateAdminUI();
    
    if (!silent) {
      closeModal(adminModal);
      showToast('🔒 Wylogowano z panelu administratora', 'error');
      
      // Odśwież listę mat jeśli jesteśmy w widoku mat
      if (currentView === 'mats') {
        renderMats(allLogoMats, matsSearch.value);
      }
    }
  }

  function updateAdminUI() {
    // Aktualizuj przycisk w headerze
    adminBtn.classList.toggle('admin-logged', isAdmin);
    
    // Pokaż/ukryj sekcję dodawania maty
    if (adminAddMatSection) {
      adminAddMatSection.style.display = isAdmin ? 'block' : 'none';
    }
    
    // Pokaż przycisk kopiowania zapasów u admina w Liście Mat Logo
    const adminImportFromInventoryBtn = document.getElementById('adminImportFromInventoryBtn');
    if (adminImportFromInventoryBtn) {
      adminImportFromInventoryBtn.style.display = isAdmin ? 'flex' : 'none';
    }
  }

  // ==================== EVENT LISTENERY ADMINA ====================

  const adminImportFromInventoryBtn = document.getElementById('adminImportFromInventoryBtn');
  const matsLoadFromInventoryModal = document.getElementById('matsLoadFromInventoryModal');
  const matsLoadFromInventoryCancel = document.getElementById('matsLoadFromInventoryCancel');
  const matsLoadFromInventoryConfirm = document.getElementById('matsLoadFromInventoryConfirm');

  // Funkcjonalność modala Importowania Inwentaryzacji (dla Admina)
  adminImportFromInventoryBtn?.addEventListener('click', () => {
    openModal(matsLoadFromInventoryModal);
  });
  
  matsLoadFromInventoryCancel?.addEventListener('click', () => {
    closeModal(matsLoadFromInventoryModal);
  });
  
  matsLoadFromInventoryConfirm?.addEventListener('click', async () => {
    matsLoadFromInventoryConfirm.disabled = true;
    const origText = matsLoadFromInventoryConfirm.innerText;
    matsLoadFromInventoryConfirm.innerText = 'Trwa nadpisywanie...';
    
    await executeLoadToLogoMatsFromInventory();
    
    matsLoadFromInventoryConfirm.innerText = origText;
    matsLoadFromInventoryConfirm.disabled = false;
    closeModal(matsLoadFromInventoryModal);
  });

  adminBtn.addEventListener('click', openAdminModal);

  adminLoginCancel.addEventListener('click', () => {
    closeModal(adminModal);
    adminPinInput.value = '';
    pinError.style.display = 'none';
    adminPinInput.classList.remove('error');
  });

  adminLoginSubmit.addEventListener('click', loginAdmin);

  adminPinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loginAdmin();
    }
  });

  adminPinInput.addEventListener('input', () => {
    pinError.style.display = 'none';
    adminPinInput.classList.remove('error');
  });

  togglePinVisibility.addEventListener('click', () => {
    const isPassword = adminPinInput.type === 'password';
    adminPinInput.type = isPassword ? 'text' : 'password';
    togglePinVisibility.classList.toggle('visible', isPassword);
  });

  adminCloseBtn.addEventListener('click', () => closeModal(adminModal));
  adminLogoutBtn.addEventListener('click', () => logoutAdmin(false));

  // ==================== OBSŁUGA TYPU LOKALIZACJI ====================

  // Toggle dla dodawania
  document.querySelectorAll('input[name="addLocationType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const isRack = e.target.value === 'rack';
      addRackFields.style.display = isRack ? 'grid' : 'none';
      addPalletFields.style.display = isRack ? 'none' : 'block';
    });
  });

  // Toggle dla edycji
  document.querySelectorAll('input[name="editLocationType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const isRack = e.target.value === 'rack';
      editRackFields.style.display = isRack ? 'grid' : 'none';
      editPalletFields.style.display = isRack ? 'none' : 'block';
    });
  });

  // ==================== BUDOWANIE LOKALIZACJI ====================

  function buildLocationString(rack, row, pipe) {
    if (!rack && !row && !pipe) return '';
    
    let parts = [];
    if (rack) parts.push(rack);
    if (row) parts.push(row);
    if (pipe) parts.push(pipe);
    
    return parts.join('-');
  }

  function parseLocationString(location) {
    if (!location) return { type: 'rack', rack: '', row: '', pipe: '', pallet: '' };
    
    // Sprawdź czy to paleta
    const isPallet = location.toUpperCase().includes('PALETA') || 
                    location.toUpperCase().includes('MAGAZYN') ||
                    location.toUpperCase().includes('POD-') ||
                    !location.includes('-') ||
                    !/^\d/.test(location.charAt(0)) && !/^[A-Z]-\d/.test(location);
    
    if (isPallet) {
      return { type: 'pallet', rack: '', row: '', pipe: '', pallet: location };
    }
    
    // Parsuj format regałowy: REGAŁ-RZĄD-RURY
    const parts = location.split('-');
    return {
      type: 'rack',
      rack: parts[0] || '',
      row: parts[1] || '',
      pipe: parts.slice(2).join('-') || '',
      pallet: ''
    };
  }

  // ==================== DODAWANIE MATY ====================

  addNewMatBtn?.addEventListener('click', () => {
    // Reset formularza
    addMatName.value = '';
    addMatNumber.value = '';  // 🆕 DODANE
    addMatRack.value = '';
    addMatRow.value = '';
    addMatPipe.value = '';
    addMatPallet.value = '';
    addMatSize.value = '';
    addMatQty.value = '1';
    
    // Reset typu lokalizacji
    document.querySelector('input[name="addLocationType"][value="rack"]').checked = true;
    addRackFields.style.display = 'grid';
    addPalletFields.style.display = 'none';
    
    openModal(addMatModal);
    setTimeout(() => addMatName.focus(), 100);
  });

  addMatCancel.addEventListener('click', () => closeModal(addMatModal));

  addMatSubmit.addEventListener('click', async () => {
    const name = addMatName.value.trim();
    const matNumber = addMatNumber.value.trim();  // 🆕 DODANE
    const qty = parseInt(addMatQty.value) || 0;
    const size = addMatSize.value.trim();
    
    if (!name) {
      showToast('Podaj nazwę maty!', 'error');
      addMatName.focus();
      return;
    }
    
    // Buduj lokalizację
    let location = '';
    const locationType = document.querySelector('input[name="addLocationType"]:checked').value;
    
    if (locationType === 'rack') {
      location = buildLocationString(
        addMatRack.value.trim(),
        addMatRow.value.trim(),
        addMatPipe.value.trim()
      );
    } else {
      location = addMatPallet.value.trim() || 'PALETA';
    }
    
    addMatSubmit.disabled = true;
    addMatSubmit.innerHTML = '<span class="spinner"></span> Dodawanie...';
    
    try {
      let finalName = name;
      let insertedData = null;
      let lastError = null;

      for (let i = 0; i < 10; i++) {
        const { data, error } = await window.supabase
          .from('logo_mats')
          .insert([{
            name: finalName,
            mat_number: matNumber || null,  // 🆕 DODANE
            location: location,
            size: size,
            quantity: qty
          }])
          .select();
        
        if (error) {
          if (error.code === '23505') {
            finalName += ' '; // Omijamy ograniczenie unikalności (błąd 23505) dodając niewidoczną w UI spację
            continue;
          }
          lastError = error;
          break;
        }
        
        insertedData = data;
        break;
      }
      
      if (!insertedData) {
        throw lastError || new Error("Przekroczono limit prób z duplikatami.");
      }
      
      showToast('✅ Mata dodana pomyślnie!', 'success');
      closeModal(addMatModal);
      
      // Odśwież cache i listę
      allLogoMats = [];
      const newMats = await fetchAndCacheLogoMats();
      renderMats(newMats, matsSearch.value);
      
    } catch (error) {
      console.error('Błąd dodawania maty:', error);
      let errMsg = error.message || 'Nieznany błąd';
      if (errMsg.includes('Failed to fetch')) {
        errMsg = 'Brak sieci. Sprawdź połączenie z internetem.';
      }
      showToast('Błąd dodawania maty: ' + errMsg, 'error');
    }
    
    addMatSubmit.disabled = false;
    addMatSubmit.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px;margin-right:6px;"><path d="M12 5v14m-7-7h14"/></svg>
      Dodaj matę
    `;
  });

  // ==================== EDYCJA MATY ====================

  function openEditMatModal(mat) {
    editMatId.value = mat.id;
    editMatName.value = mat.name || '';
    editMatNumber.value = mat.mat_number || '';  // 🆕 DODANE
    editMatSize.value = mat.size || '';
    editMatQty.value = mat.quantity || 0;
    
    const parsed = parseLocationString(mat.location);
    
    if (parsed.type === 'pallet') {
      document.querySelector('input[name="editLocationType"][value="pallet"]').checked = true;
      editRackFields.style.display = 'none';
      editPalletFields.style.display = 'block';
      editMatPallet.value = parsed.pallet;
      editMatRack.value = '';
      editMatRow.value = '';
      editMatPipe.value = '';
    } else {
      document.querySelector('input[name="editLocationType"][value="rack"]').checked = true;
      editRackFields.style.display = 'grid';
      editPalletFields.style.display = 'none';
      editMatRack.value = parsed.rack;
      editMatRow.value = parsed.row;
      editMatPipe.value = parsed.pipe;
      editMatPallet.value = '';
    }
    
    openModal(editMatModal);
  }

  editMatCancel.addEventListener('click', () => closeModal(editMatModal));

  editMatSubmit.addEventListener('click', async () => {
    const id = editMatId.value;
    const name = editMatName.value.trim();
    const matNumber = editMatNumber.value.trim();  // 🆕 DODANE
    const qty = parseInt(editMatQty.value) || 0;
    const size = editMatSize.value.trim();
    
    if (!name) {
      showToast('Podaj nazwę maty!', 'error');
      editMatName.focus();
      return;
    }
    
    // Buduj lokalizację
    let location = '';
    const locationType = document.querySelector('input[name="editLocationType"]:checked').value;
    
    if (locationType === 'rack') {
      location = buildLocationString(
        editMatRack.value.trim(),
        editMatRow.value.trim(),
        editMatPipe.value.trim()
      );
    } else {
      location = editMatPallet.value.trim() || 'PALETA';
    }
    
    editMatSubmit.disabled = true;
    editMatSubmit.innerHTML = '<span class="spinner"></span> Zapisywanie...';
    
    try {
      let finalName = name;
      let updateSuccess = false;
      let lastError = null;

      for (let i = 0; i < 10; i++) {
        const { error } = await window.supabase
          .from('logo_mats')
          .update({
            name: finalName,
            mat_number: matNumber || null,  // 🆕 DODANE
            location: location,
            size: size,
            quantity: qty
          })
          .eq('id', id);
        
        if (error) {
          if (error.code === '23505') {
            finalName += ' '; // Omijamy unikalność
            continue;
          }
          lastError = error;
          break;
        }
        
        updateSuccess = true;
        break;
      }
      
      if (!updateSuccess) {
        throw lastError || new Error("Przekroczono limit prób z duplikatami.");
      }
      
      showToast('✅ Mata zaktualizowana!', 'success');
      closeModal(editMatModal);
      
      // Odśwież cache i listę
      allLogoMats = [];
      const newMats = await fetchAndCacheLogoMats();
      renderMats(newMats, matsSearch.value);
      
    } catch (error) {
      console.error('Błąd aktualizacji maty:', error);
      let errMsg = error.message || 'Nieznany błąd';
      if (errMsg.includes('Failed to fetch')) {
        errMsg = 'Brak sieci. Sprawdź połączenie z internetem.';
      }
      showToast('Błąd aktualizacji: ' + errMsg, 'error');
    }
    
    editMatSubmit.disabled = false;
    editMatSubmit.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;margin-right:6px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
      Zapisz zmiany
    `;
  });

  // ==================== USUWANIE MATY ====================

  function openDeleteMatModal(mat) {
    deleteMatId.value = mat.id;
    deleteMatName.textContent = mat.name;
    openModal(deleteMatModal);
  }

  deleteMatCancel.addEventListener('click', () => closeModal(deleteMatModal));

  deleteMatConfirm.addEventListener('click', async () => {
    const id = deleteMatId.value;
    
    deleteMatConfirm.disabled = true;
    deleteMatConfirm.innerHTML = '<span class="spinner"></span> Usuwanie...';
    
    try {
      const { error } = await window.supabase
        .from('logo_mats')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      showToast('🗑️ Mata usunięta!', 'error');
      closeModal(deleteMatModal);
      
      // Odśwież cache i listę
      allLogoMats = [];
      const newMats = await fetchAndCacheLogoMats();
      renderMats(newMats, matsSearch.value);
      
    } catch (error) {
      console.error('Błąd usuwania maty:', error);
      showToast('Błąd usuwania: ' + error.message, 'error');
    }
    
    deleteMatConfirm.disabled = false;
    deleteMatConfirm.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px;margin-right:6px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      Usuń matę
    `;
  });

  // ==================== ROUTING SYSTEM ====================
  const views = {
    home: document.getElementById('homeView'),
    panel: document.getElementById('panelView'),
    mats: document.getElementById('matsView'),
    washing: document.getElementById('washingView'),
    archive: document.getElementById('archiveView'), // Przedsionek
    'archive-replacements': document.getElementById('archiveReplacementsView'), // NOWE
    'archive-washing': document.getElementById('archiveWashingView'), // NOWE (zmienione z archiveView)
    inventory: document.getElementById('inventoryView'),
    reports: document.getElementById('reportsView')
  };
  
  const headerTitle = document.getElementById('headerTitle');
  const backBtn = document.getElementById('backBtn');
  let currentView = 'home';
  const viewParents = {
    'home': null,
    'panel': 'home',
    'mats': 'home',
    'washing': 'home',
    'archive': 'home',
    'archive-replacements': 'archive',
    'archive-washing': 'archive',
    'inventory': 'home',
    'reports': 'home'
  };
  
  function navigateTo(viewName) {
    Object.values(views).forEach(v => v?.classList.remove('active'));
    views[viewName]?.classList.add('active');
    currentView = viewName;
    
    if (viewName === 'home') {
      headerTitle.textContent = 'Elis ServiceHub';
      backBtn.style.display = 'none';
      updateArchiveBadge();
    } else if (viewName === 'panel') {
      headerTitle.textContent = 'Panel Tras i Zmian';
      backBtn.style.display = 'flex';
    } else if (viewName === 'mats') {
      headerTitle.textContent = 'Lista Mat Logo';
      backBtn.style.display = 'flex';
      (async () => {
          const mats = await fetchAndCacheLogoMats();
          renderMats(mats, matsSearch.value);
      })();
    } else if (viewName === 'inventory') {
      headerTitle.textContent = 'Inwentaryzacja Mat';
      backBtn.style.display = 'flex';
      (async () => {
          const mats = await fetchInventoryMats();
          renderInventory(mats, document.getElementById('inventorySearch').value);
      })();
    } else if (viewName === 'washing') {
      headerTitle.textContent = 'System Prania Mat';
      backBtn.style.display = 'flex';
      loadWashingData();
    } else if (viewName === 'archive') {
      // 🔥 NOWE: Przedsionek archiwum
      headerTitle.textContent = 'Archiwum';
      backBtn.style.display = 'flex';
    } else if (viewName === 'archive-replacements') {
      // 🔥 NOWE: Archiwum zamienników
      headerTitle.textContent = 'Archiwum Zamienników';
      backBtn.style.display = 'flex';
      loadReplacementsArchive();
    } else if (viewName === 'archive-washing') {
      // 🔥 ZMIENIONE: Archiwum prań
      headerTitle.textContent = 'Archiwum Prań Mat';
      backBtn.style.display = 'flex';
      loadArchiveData();
    } else if (viewName === 'reports') {
      headerTitle.textContent = 'Zgłoszenia';
      backBtn.style.display = 'flex';
      (async () => {
          await fetchReports();
      })();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backBtn.addEventListener('click', () => {
    const parentView = viewParents[currentView] || 'home';
    navigateTo(parentView);
  });
  
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
  
    // ==================== PDF GENERATOR ====================
  async function generatePDF(elementId, filename) {
    const element = document.getElementById(elementId);
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    try {
      await html2pdf().set(opt).from(element).save();
      showToast("✅ PDF wygenerowany!");
    } catch (error) {
      console.error("Błąd generowania PDF:", error);
      showToast("❌ Błąd generowania PDF", "error");
    }
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
        },
        updateOptions: (newOptions) => {
            options = newOptions;
        }
    };
    
    function populateOptions(filter = "") {
      optionsList.innerHTML = "";
      let found = false;
      const processOption = (opt) => {
          const li = document.createElement("li");
          li.textContent = opt; 
          li.dataset.value = opt; 
          li.setAttribute('role', 'option');
          if (opt === appState[stateKey]) { 
            li.classList.add("selected"); 
            li.setAttribute('aria-selected', 'true'); 
          }
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
    wrapper.updateOptions = selectInstance.updateOptions;
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

  // ==================== PANEL PRANIA - ELEMENTY DOM ====================
  const washingMatSelectWrapper = document.getElementById('washingMatSelectWrapper');
  const washingQuantityInfo = document.getElementById('washingQuantityInfo');
  const washingAvailableQty = document.getElementById('washingAvailableQty');
  const washingQuantitySelector = document.getElementById('washingQuantitySelector');
  const washingQty = document.getElementById('washingQty');
  const washingQtyDec = document.getElementById('washingQtyDec');
  const washingQtyInc = document.getElementById('washingQtyInc');
  const addToWashingBtn = document.getElementById('addToWashingBtn');
  const activeWashingList = document.getElementById('activeWashingList');
  const washingSearch = document.getElementById('washingSearch');
  const washingCount = document.getElementById('washingCount');
  const washingFiltered = document.getElementById('washingFiltered');

  // Modals
  const editWashingModal = document.getElementById('editWashingModal');
  const editWashingMatName = document.getElementById('editWashingMatName');
  const editWashingQtyInput = document.getElementById('editWashingQtyInput');
  const editWashingQtyDec = document.getElementById('editWashingQtyDec');
  const editWashingQtyInc = document.getElementById('editWashingQtyInc');
  const editWashingCancel = document.getElementById('editWashingCancel');
  const editWashingSave = document.getElementById('editWashingSave');

  const deleteWashingModal = document.getElementById('deleteWashingModal');
  const deleteWashingText = document.getElementById('deleteWashingText');
  const deleteWashingCancel = document.getElementById('deleteWashingCancel');
  const deleteWashingConfirm = document.getElementById('deleteWashingConfirm');

  let editingWashingItem = null;
  let deletingWashingItem = null;

  // ==================== ARCHIWUM - ELEMENTY DOM ====================
  const archiveSearch = document.getElementById('archiveSearch');
  const archiveList = document.getElementById('archiveList');
  const archiveCount = document.getElementById('archiveCount');
  const archiveFiltered = document.getElementById('archiveFiltered');
  const exportArchiveBtn = document.getElementById('exportArchiveBtn');

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

  const singleModeSection = document.getElementById('singleModeSection');
  const distributeModeSection = document.getElementById('distributeModeSection');
  const distributeStep1 = document.getElementById('distributeStep1');
  const distributeStep2 = document.getElementById('distributeStep2');
  const distributeTotalQty = document.getElementById('distributeTotalQty');
  const startDistributeBtn = document.getElementById('startDistributeBtn');
  const distributeMatName = document.getElementById('distributeMatName');
  const distributeRemaining = document.getElementById('distributeRemaining');
  const distributeTotal = document.getElementById('distributeTotal');
  const distributeAssigned = document.getElementById('distributeAssigned');
  const distributeLeft = document.getElementById('distributeLeft');
  const distributeProgressFill = document.getElementById('distributeProgressFill');
  const distributeClientInput = document.getElementById('distributeClientInput');
  const distributeClientQty = document.getElementById('distributeClientQty');
  const addDistributeClientBtn = document.getElementById('addDistributeClientBtn');
  const distributeClientsList = document.getElementById('distributeClientsList');
  const cancelDistributeBtn = document.getElementById('cancelDistributeBtn');
  const confirmDistributeBtn = document.getElementById('confirmDistributeBtn');

  let distributeClients = [];
  let distributeData = { mat: '', total: 0 };

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
    route: '', 
    baseMat: '', 
    altMat: '',
    multiAltMat: '', 
    editMultiAltMat: '', 
    additionMat: '', 
    distributeMat: '',
    washingMat: '',
    palletRoute: ''
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
      : tempAlternatives.map((alt, index) => {
          const isNew = index >= tempAlternatives.length - 5;
          return `<div class="temp-alt-item ${isNew ? 'just-added' : ''}">
            <div class="temp-alt-item-details">
              <div class="temp-alt-item-mat">${alt.alt}<span class="badge">×${alt.qty}</span></div>
              ${alt.client ? `<div class="temp-alt-item-client">${alt.client}</div>` : ''}
            </div>
            <button class="btn-danger" data-index="${index}" aria-label="Usuń ten zamiennik">🗑️</button>
          </div>`;
        }).join('');
    
    setTimeout(() => {
      document.querySelectorAll('.temp-alt-item.just-added').forEach(el => {
        el.classList.remove('just-added');
      });
    }, 1500);
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
  const removeRouteGroup = (route) => { 
    changes = changes.filter(c => c.route !== route); 
    
    // 🔥 NOWE: Wyzeruj palety dla usuwanej trasy
    if (palletRoutes[route]) {
      delete palletRoutes[route];
      savePalletRoutes();
      console.log(`✅ Wyzerowano palety dla trasy ${route}`);
    }
    
    persist(); 
  };
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
    
    // 🔥 Zapamiętaj trasę przed usunięciem
    const deletedRoute = changes[index]?.route;
    
    element.classList.add("is-hiding"); 
    
    setTimeout(() => { 
      removeChange(index); 
      
      // 🔥 NOWE: Sprawdź czy to była ostatnia zmiana dla tej trasy
      if (deletedRoute) {
        const routeStillExists = changes.some(c => c.route === deletedRoute);
        
        if (!routeStillExists) {
          // Trasa całkowicie zniknęła - wyzeruj palety
          if (palletRoutes[deletedRoute]) {
            delete palletRoutes[deletedRoute];
            savePalletRoutes();
            console.log(`✅ Wyzerowano palety dla trasy ${deletedRoute} (ostatnia zmiana usunięta)`);
          }
          
          // Jeśli to była aktualnie wybrana trasa, odśwież licznik
          if (appState.route === deletedRoute) {
            updatePalletDisplay();
          }
        }
      }
      
      renderChanges(); 
      showToast("🗑️ Usunięto", "error"); 
    }, 300); 
    
    closeModal(deleteModal); 
  });

  deleteGroupConfirm.addEventListener("click", () => {
    if (routeGroupToDelete.route === null || !routeGroupToDelete.element) return;
    const { route, element } = routeGroupToDelete;
    
    closeModal(deleteGroupModal);
    element.classList.add("is-hiding");

    setTimeout(() => {
      removeRouteGroup(route);
      element.remove();
      
      // 🔥 NOWE: Jeśli usuwana trasa to obecnie wybrana, odśwież licznik
      if (appState.route === route) {
        updatePalletDisplay(); // Odświeży licznik (pokaże 0)
      }
      
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
      
      showToast("🗑️ Usunięto trasę i wyzerowano palety", "error");
      routeGroupToDelete = { route: null, element: null }; 
    }, 400); 
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
        
        // Sprawdź czy trasa ma palety
        const palletCount = getPalletsForRoute(route);
        let palletNotice = '';
        if (palletCount) {
          let palletWord;
          const lastDigit = palletCount % 10;
          const lastTwoDigits = palletCount % 100;
          
          if (palletCount === 1) {
            palletWord = 'PALETY';
          } else if (lastTwoDigits >= 12 && lastTwoDigits <= 14) {
            palletWord = 'PALET';
          } else if (lastDigit >= 2 && lastDigit <= 4) {
            palletWord = 'PALET';
          } else {
            palletWord = 'PALET';
          }
          
          palletNotice = `<div class="print-pallet-notice">🚚 TRASA SKŁADA SIĘ Z ${palletCount} ${palletWord}</div>`;
        }

        const replacements = routeChanges.filter(c => c.type !== 'addition');
        const additions = routeChanges.filter(c => c.type === 'addition');
        
        let printHTML = `
          <div class="print-header">
            <img src="icons/icon-192.png" alt="Elis Logo">
            <div class="title-block">
              <h1>Raport Zmian Mat</h1>
              <p>Trasa ${route} &nbsp;|&nbsp; Data: ${printDate}</p>
            </div>
          </div>
          ${palletNotice}
        `;
        
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
        
        // 🔥 NOWE: Archiwizuj trasę PRZED drukowaniem
        (async () => {
          const archived = await archiveRoute(route);
          
          if (archived) {
            // ✅ Trasa zarchiwizowana - drukuj
            setTimeout(() => { 
              try { 
                window.print(); 
              } catch (error) { 
                console.error("Błąd drukowania:", error); 
                showToast("Błąd podczas otwierania okna drukowania.", "error"); 
              } 
            }, 100);
          } else {
            // ❌ Błąd archiwizacji - NIE drukuj
            showToast("Nie można wydrukować - błąd archiwizacji", "error");
          }
        })();
        
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
    updatePalletDisplay();
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

  // ==================== INWENTARYZACJA MAT ====================
  let allInventoryMats = [];
  const inventorySearch = document.getElementById('inventorySearch');
  const inventoryList = document.getElementById('inventoryList');
  const inventoryTotal = document.getElementById('inventoryTotal');
  const inventoryOk = document.getElementById('inventoryOk');
  const inventoryNotOk = document.getElementById('inventoryNotOk');
  const loadInventoryBtn = document.getElementById('loadInventoryBtn');
  const clearInventoryBtn = document.getElementById('clearInventoryBtn');

  // Modale inwentaryzacji
  const inventoryLoadModal = document.getElementById('inventoryLoadModal');
  const inventoryLoadCancel = document.getElementById('inventoryLoadCancel');
  const inventoryLoadConfirm = document.getElementById('inventoryLoadConfirm');
  const inventoryClearModal = document.getElementById('inventoryClearModal');
  const inventoryClearCancel = document.getElementById('inventoryClearCancel');
  const inventoryClearConfirm = document.getElementById('inventoryClearConfirm');

  async function fetchInventoryMats() {
    inventoryList.innerHTML = `<div class="empty-state"><div class="empty-state-text">Pobieranie danych inwentaryzacji...</div></div>`;
    try {
      const { data, error } = await window.supabase
        .from('inventory_mats')
        .select('*')
        .order('name', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;
      allInventoryMats = data || [];
      return allInventoryMats;
    } catch (error) {
      console.error("Błąd pobierania mat z inventory_mats:", error);
      showToast("Błąd pobierania inwentaryzacji: " + (error.message || error), "error");
      inventoryList.innerHTML = `<div class="empty-state error"><div class="empty-state-text">Nie udało się pobrać danych. Sprawdź czy tabela inventory_mats istnieje w Supabase i ma włączone RLS policies.</div></div>`;
      return [];
    }
  }

  async function executeLoadFromLogoMats() {
    try {
      showToast("Rozpoczęto kopiowanie danych...", "success");
      // Najpierw pobierz oryginalne maty
      const { data: originalMats, error: readError } = await window.supabase
        .from('logo_mats')
        .select('name, mat_number, location, size, quantity');
        
      if (readError) throw readError;

      if (!originalMats || originalMats.length === 0) {
        showToast("Brak mat w głównej bazie do skopiowania.", "error");
        return;
      }

      // Oznacz maty domyślnie statusem 'unchecked'
      const newInventory = originalMats.map(mat => ({
        name: mat.name || null,
        mat_number: mat.mat_number || null,
        location: mat.location || null,
        size: mat.size || null,
        quantity: mat.quantity || 0,
        status: 'unchecked'
      }));

      // Usuń stare wpisy bez awarii (paczkowanie po max 150 sztuk chroni przed URI Too Long)
      let wipingInventory = true;
      while (wipingInventory) {
        const { data: rowsToDelete, error: selErr } = await window.supabase
          .from('inventory_mats')
          .select('id')
          .limit(150);
          
        if (selErr) throw selErr;
        
        if (!rowsToDelete || rowsToDelete.length === 0) {
          wipingInventory = false;
          break;
        }
        
        const ids = rowsToDelete.map(r => r.id);
        const { error: delErr } = await window.supabase
          .from('inventory_mats')
          .delete()
          .in('id', ids);
          
        if (delErr) throw delErr;
        if (rowsToDelete.length < 150) wipingInventory = false;
      }

      // Wstaw nowe — w partiach po 500 aby uniknąć limitu
      const batchSize = 500;
      for (let i = 0; i < newInventory.length; i += batchSize) {
        const batch = newInventory.slice(i, i + batchSize);
        const { error: insertError } = await window.supabase
          .from('inventory_mats')
          .insert(batch);
        if (insertError) throw insertError;
      }

      showToast(`Skopiowano ${newInventory.length} mat do inwentaryzacji!`, "success");
      const freshMats = await fetchInventoryMats();
      renderInventory(freshMats, inventorySearch.value);
      
    } catch (error) {
      console.error("Błąd kopiowania danych z logo_mats do inventory_mats:", error);
      showToast("Nie udało się skopiować danych: " + (error.message || error), "error");
    }
  }

  async function executeClearInventoryStatus() {
    try {
      const { error } = await window.supabase
        .from('inventory_mats')
        .update({ status: 'unchecked' })
        .in('status', ['ok', 'not_ok']);
        
      if (error) throw error;
      
      showToast("Oznaczenia zostały wyczyszczone.", "success");
      const freshMats = await fetchInventoryMats();
      renderInventory(freshMats, inventorySearch.value);
    } catch(error) {
      console.error("Błąd czyszczenia oznaczeń:", error);
      showToast("Próba wyczyszczenia zakończona błędem: " + (error.message || error), "error");
    }
  }

  async function updateInventoryStatus(id, newStatus) {
    try {
      // Optymistyczna aktualizacja — zmień dane w cache
      const index = allInventoryMats.findIndex(mat => mat.id === id);
      if (index !== -1) {
        allInventoryMats[index].status = newStatus;
      }

      // In-place aktualizacja DOM — NIE re-renderuj całej listy
      const itemEl = inventoryList.querySelector(`[data-inv-id="${id}"]`);
      if (itemEl) {
        // Usuń stare klasy statusu
        itemEl.classList.remove('status-unchecked', 'status-ok', 'status-not_ok');
        // Dodaj nową klasę
        itemEl.classList.add(`status-${newStatus}`);
      }

      // Przelicz statystyki
      updateInventoryStats();

      const { error } = await window.supabase
        .from('inventory_mats')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
        console.error("Błąd aktualizacji statusu maty:", error);
        showToast("Wystąpił błąd w oznaczaniu.", "error");
    }
  }

  // Przeliczenie statystyk bez przebudowy całej listy
  const inventoryChecked = document.getElementById('inventoryChecked');

  function updateInventoryStats() {
    let ok = 0, notOk = 0, total = allInventoryMats.length;
    allInventoryMats.forEach(mat => {
      if (mat.status === 'ok') ok++;
      if (mat.status === 'not_ok') notOk++;
    });
    const checked = ok + notOk;
    inventoryTotal.textContent = total;
    inventoryOk.textContent = ok;
    inventoryNotOk.textContent = notOk;
    inventoryChecked.textContent = `${checked} / ${total}`;
    clearInventoryBtn.disabled = checked === 0;
  }

  async function updateInventoryQuantity(id, newQuantity) {
    if (newQuantity < 0) return;
    try {
      // Optymistyczna aktualizacja ilości w lokalnym widoku
      const index = allInventoryMats.findIndex(mat => mat.id === id);
      if (index !== -1) {
        allInventoryMats[index].quantity = newQuantity;
        // Pomiń pełny render, aby nie gubić focusa z inputu, zrobiliśmy to w listenerach.
      }

      const { error } = await window.supabase
        .from('inventory_mats')
        .update({ quantity: newQuantity })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
        console.error("Błąd aktualizacji ilości maty:", error);
        showToast("Nie udało się zapisać zmienionej ilości.", "error");
    }
  }

  async function executeLoadToLogoMatsFromInventory() {
    try {
      showToast("Pobieranie zatwierdzonych stanów z inwentaryzacji...", "success");
      
      const { data: invMats, error: readError } = await window.supabase
        .from('inventory_mats')
        .select('*');
        
      if (readError) throw readError;

      if (!invMats || invMats.length === 0) {
        showToast("Brak mat w inwentaryzacji do skopiowania.", "error");
        return;
      }

      const newLogoMats = invMats.map(mat => ({
        name: mat.name,
        mat_number: mat.mat_number,
        location: mat.location,
        size: mat.size,
        quantity: mat.quantity
      }));

      // Usuń stare wpisy z logo_mats bez naruszenia URI (paczkuje po 150)
      let wipingLogoMats = true;
      while (wipingLogoMats) {
        const { data: rowsToDelete, error: selErr } = await window.supabase
          .from('logo_mats')
          .select('id')
          .limit(150);
          
        if (selErr) throw selErr;
        
        if (!rowsToDelete || rowsToDelete.length === 0) {
          wipingLogoMats = false;
          break;
        }
        
        const ids = rowsToDelete.map(r => r.id);
        const { error: delErr } = await window.supabase
          .from('logo_mats')
          .delete()
          .in('id', ids);
          
        if (delErr) throw delErr;
        if (rowsToDelete.length < 150) wipingLogoMats = false;
      }

      // Wstaw nowe inwentaryzacje z powrotem
      const batchSize = 500;
      for (let i = 0; i < newLogoMats.length; i += batchSize) {
        const batch = newLogoMats.slice(i, i + batchSize);
        const { error: insertError } = await window.supabase
          .from('logo_mats')
          .insert(batch);
        if (insertError) throw insertError;
      }

      showToast(`Nadpisano główną bazę stanem z inwentaryzacji!`, "success");
      allLogoMats = [];
      const newMats = await fetchAndCacheLogoMats();
      renderMats(newMats, matsSearch.value);
      
    } catch (error) {
      console.error("Błąd kopiowania danych z inwentaryzacji do logo_mats:", error);
      showToast("Nie udało się skopiować danych: " + (error.message || error), "error");
    }
  }

  // Funkcje aktualizacji inwentaryzacji
  const INV_PER_PAGE = 30;
  let filteredInventoryCache = [];
  let currentInventoryPage = 0;
  let isLoadingMoreInventory = false;
  let inventoryObserver = null;

  function renderInventory(matsData, filter = '') {
      const search = filter.toLowerCase().trim();
      filteredInventoryCache = matsData;

      if (search) {
        filteredInventoryCache = matsData.filter(mat => {
          return (mat.name?.toLowerCase() || '').includes(search) ||
                (mat.location?.toLowerCase() || '').includes(search) ||
                (mat.size?.toLowerCase() || '').includes(search) ||
                (mat.mat_number?.toLowerCase() || '').includes(search);
        });
      }

      // Reset paginacji
      currentInventoryPage = 0;
      isLoadingMoreInventory = false;

      // Odłącz stary observer
      if (inventoryObserver) {
        inventoryObserver.disconnect();
        inventoryObserver = null;
      }

      // Przelicz statystyki (używa allInventoryMats, nie filteredInventoryCache)
      updateInventoryStats();

      // Wyczyść listę
      inventoryList.innerHTML = '';
      hideInventoryLoadMore();

      if (filteredInventoryCache.length === 0) {
        inventoryList.innerHTML = `<div class="empty-state"><div class="empty-state-text">Brak danych inwentaryzacji. Kliknij "Wczytaj Listę", aby zacząć.</div></div>`;
        return;
      }

      // Renderuj pierwszą partię
      renderInventoryChunk();

      // Ustaw observer dla lazy loading dopiero po renderze pierwszej partii
      if (filteredInventoryCache.length > INV_PER_PAGE) {
        setTimeout(() => setupInventoryObserver(), 100);
      }
  }

  function renderInventoryChunk() {
    const start = currentInventoryPage * INV_PER_PAGE;
    const end = start + INV_PER_PAGE;
    const matsToRender = filteredInventoryCache.slice(start, end);

    if (matsToRender.length === 0) {
      hideInventoryLoadMore();
      return;
    }

    const fragment = document.createDocumentFragment();

    matsToRender.forEach(mat => {
      const div = document.createElement('div');
      div.className = `mat-item inventory-item status-${mat.status || 'unchecked'}`;
      div.dataset.invId = mat.id;

      let rawNum = mat.mat_number ? mat.mat_number.toString().trim() : '';
      if (rawNum.startsWith('#')) rawNum = rawNum.substring(1);
      const matNumberBadge = rawNum ? `<span class="mat-number-badge">${rawNum}</span>` : '';

      div.innerHTML = `
        <div class="mat-info">
          <div class="mat-name">
            ${escapeHtml(mat.name)}
          </div>
          <div class="mat-details">
            ${mat.location ? `<div class="mat-detail-item"><strong>${formatLocation(mat.location)}</strong></div>` : ''}
            ${mat.size ? `<div class="mat-detail-item">📏 ${escapeHtml(mat.size)}</div>` : ''}
          </div>
        </div>
        <div class="mat-actions" style="align-items: center; justify-content: space-between;">
          ${matNumberBadge}
          <div class="inventory-actions" style="display: flex; align-items: center; gap: 8px;">
            <button class="btn-inventory-ok" data-id="${mat.id}" aria-label="Zgodność">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <button class="btn-inventory-not-ok" data-id="${mat.id}" aria-label="Brak zgodności">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="inventory-qty-control">
            <button class="inv-qty-dec" data-id="${mat.id}">−</button>
            <input type="number" class="inv-qty-input" data-id="${mat.id}" value="${mat.quantity}" min="0">
            <button class="inv-qty-inc" data-id="${mat.id}">+</button>
          </div>
        </div>
      `;
      fragment.appendChild(div);
    });

    inventoryList.appendChild(fragment);

    // Sprawdź czy są kolejne strony
    if (end < filteredInventoryCache.length) {
      showInventoryLoadMore();
    } else {
      hideInventoryLoadMore();
    }
  }

  function setupInventoryObserver() {
    const sentinel = document.getElementById('inventoryLoadMoreSentinel');
    if (!sentinel) return;

    if (inventoryObserver) {
      inventoryObserver.disconnect();
    }

    inventoryObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isLoadingMoreInventory) {
          loadMoreInventory();
        }
      });
    }, {
      root: null,
      rootMargin: '300px',
      threshold: 0
    });

    inventoryObserver.observe(sentinel);
  }

  function loadMoreInventory() {
    const nextStart = (currentInventoryPage + 1) * INV_PER_PAGE;
    if (nextStart >= filteredInventoryCache.length) {
      hideInventoryLoadMore();
      return;
    }

    isLoadingMoreInventory = true;

    requestAnimationFrame(() => {
      currentInventoryPage++;
      renderInventoryChunk();
      // Małe opóźnienie żeby przeglądarka zdążyła zrenderować DOM
      // zanim pozwolimy na kolejną partię
      setTimeout(() => {
        isLoadingMoreInventory = false;
      }, 50);
    });
  }

  function showInventoryLoadMore() {
    const sentinel = document.getElementById('inventoryLoadMoreSentinel');
    if (sentinel) sentinel.style.display = 'flex';
  }

  function hideInventoryLoadMore() {
    const sentinel = document.getElementById('inventoryLoadMoreSentinel');
    if (sentinel) sentinel.style.display = 'none';
  }

  // Event delegation — jeden listener na cały kontener zamiast setek na poszczególnych przyciskach
  inventoryList.addEventListener('click', (e) => {
    const okBtn = e.target.closest('.btn-inventory-ok');
    if (okBtn) {
      e.stopPropagation();
      const id = okBtn.dataset.id;
      const mat = allInventoryMats.find(m => m.id === id);
      // Toggle: jeśli już jest 'ok', cofnij do 'unchecked'
      const newStatus = (mat && mat.status === 'ok') ? 'unchecked' : 'ok';
      updateInventoryStatus(id, newStatus);
      return;
    }

    const notOkBtn = e.target.closest('.btn-inventory-not-ok');
    if (notOkBtn) {
      e.stopPropagation();
      const id = notOkBtn.dataset.id;
      const mat = allInventoryMats.find(m => m.id === id);
      // Toggle: jeśli już jest 'not_ok', cofnij do 'unchecked'
      const newStatus = (mat && mat.status === 'not_ok') ? 'unchecked' : 'not_ok';
      updateInventoryStatus(id, newStatus);
      return;
    }

    const decBtn = e.target.closest('.inv-qty-dec');
    if (decBtn) {
      e.stopPropagation();
      const id = decBtn.dataset.id;
      const input = decBtn.nextElementSibling;
      let val = parseInt(input.value) || 0;
      if (val > 0) {
        val--;
        input.value = val;
        updateInventoryQuantity(id, val);
      }
      return;
    }

    const incBtn = e.target.closest('.inv-qty-inc');
    if (incBtn) {
      e.stopPropagation();
      const id = incBtn.dataset.id;
      const input = incBtn.previousElementSibling;
      let val = parseInt(input.value) || 0;
      val++;
      input.value = val;
      updateInventoryQuantity(id, val);
      return;
    }
  });

  inventoryList.addEventListener('change', (e) => {
    if (e.target.classList.contains('inv-qty-input')) {
      const id = e.target.dataset.id;
      let val = parseInt(e.target.value) || 0;
      if (val < 0) { val = 0; e.target.value = 0; }
      updateInventoryQuantity(id, val);
    }
  });

  inventorySearch?.addEventListener('input', (e) => {
    const value = e.target.value;
    inventorySearch.classList.toggle('searching', value.length > 0);
    renderInventory(allInventoryMats, value);
  });
  
  // Przycisk "Wczytaj Listę" — otwiera modal potwierdzenia
  loadInventoryBtn?.addEventListener('click', () => {
    openModal(inventoryLoadModal);
  });

  inventoryLoadCancel?.addEventListener('click', () => {
    closeModal(inventoryLoadModal);
  });

  inventoryLoadConfirm?.addEventListener('click', () => {
    closeModal(inventoryLoadModal);
    executeLoadFromLogoMats();
  });

  // Przycisk "Wyczyść Oznaczenia" — otwiera modal potwierdzenia
  clearInventoryBtn?.addEventListener('click', () => {
    openModal(inventoryClearModal);
  });

  inventoryClearCancel?.addEventListener('click', () => {
    closeModal(inventoryClearModal);
  });

  inventoryClearConfirm?.addEventListener('click', () => {
    closeModal(inventoryClearModal);
    executeClearInventoryStatus();
  });
  
  // ==================== LISTA MAT LOGO (SUPABASE) ====================
  const matsSearch = document.getElementById('matsSearch');
  const matsList = document.getElementById('matsList');
  const matsCount = document.getElementById('matsCount');
  const matsFiltered = document.getElementById('matsFiltered');
  const printMatsBtn = document.getElementById('printMatsBtn');
  const exportExcelBtn = document.getElementById('exportExcelBtn');

  async function fetchAndCacheLogoMats() {
    if (allLogoMats.length > 0) {
      return allLogoMats;
    }
    
    matsList.innerHTML = `<div class="empty-state"><div class="empty-state-text">Pobieranie danych z bazy...</div></div>`;
    
    try {
      const { data, error } = await window.supabase
        .from('logo_mats')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }
      
      allLogoMats = data;
      return data;

    } catch (error) {
      console.error("Błąd pobierania mat z Supabase:", error);
      showToast("Błąd pobierania danych mat. Sprawdź konsolę.", "error");
      matsList.innerHTML = `<div class="empty-state error"><div class="empty-state-text">Nie udało się pobrać danych.</div></div>`;
      return [];
    }
  }

  // 🆕 FUNKCJA FORMATUJĄCA LOKACJĘ
  function formatLocation(location) {
    if (!location) return '';
    
    // Specjalne lokacje (bez numerów regałów)
    const specialLocations = ['PALETA', 'REGAŁ', 'MAGAZYN', 'KASA', 'SPEC', 'NIEZNANE', 'POD-MAŁYMI-ŻABKAMI', 'BIURO', 'NOWY'];
    if (specialLocations.some(special => location.toUpperCase().includes(special))) {
      return `📦 ${location}`;
    }
    
    // Sprawdź czy to format REGAŁ-RZĄD-RURY (np. "2-1-7,,12" lub "A-1")
    const parts = location.split('-');
    
    if (parts.length >= 3) {
      // Format: REGAŁ-RZĄD-RURY
      const shelf = parts[0];
      const row = parts[1];
      const pipes = parts.slice(2).join('-'); // reszta to rury
      
      // Parsuj rury
      let pipeText = '';
      if (pipes.includes(',,')) {
        // Format zakresu: "7,,12" → "7-12"
        const rangeParts = pipes.split(',,').filter(p => p);
        if (rangeParts.length === 2) {
          pipeText = `${rangeParts[0]}-${rangeParts[1]}`;
        } else if (rangeParts.length === 1) {
          pipeText = rangeParts[0];
        } else {
          pipeText = pipes.replace(/,,/g, '-');
        }
      } else if (pipes.includes(',')) {
        // Format listy: "3,4,5" → "3, 4, 5"
        pipeText = pipes.replace(/,/g, ', ');
      } else {
        pipeText = pipes;
      }
      
      return `📍 Regał ${shelf} → Rząd ${row} → Rura ${pipeText}`;
      
    } else if (parts.length === 2) {
      // Format: REGAŁ-RZĄD (np. "A-1")
      return `📍 Regał ${parts[0]} / Rząd ${parts[1]}`;
    }
    
    // Fallback - zwróć oryginalną lokację
    return `📍 ${location}`;
  }


// ==================== ZOPTYMALIZOWANA LISTA MAT ====================

  /**
   * Główna funkcja renderowania mat z lazy loading
   */
  function renderMats(matsData, filter = '') {
    // Anuluj poprzedni debounce
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    // Debounce dla wyszukiwania (nie dla pierwszego ładowania)
    if (filter !== '' && matsData === allLogoMats) {
      searchDebounceTimer = setTimeout(() => {
        executeRenderMats(matsData, filter);
      }, SEARCH_DEBOUNCE_MS);
    } else {
      executeRenderMats(matsData, filter);
    }
  }

  /**
   * Wykonuje faktyczne renderowanie
   */
  function executeRenderMats(matsData, filter = '') {
    // Filtruj dane
    const search = filter.toLowerCase().trim();
    
    if (search) {
      filteredMatsCache = matsData.filter(mat => {
        return (mat.name?.toLowerCase() || '').includes(search) ||
              (mat.location?.toLowerCase() || '').includes(search) ||
              (mat.size?.toLowerCase() || '').includes(search) ||
              (mat.mat_number?.toLowerCase() || '').includes(search);
      });
    } else {
      filteredMatsCache = [...matsData];
    }
    
    // Reset paginacji
    currentMatsPage = 0;
    isLoadingMoreMats = false;
    
    // Aktualizuj statystyki
    updateMatsStats(matsData, filteredMatsCache, filter);
    
    // Wyczyść listę
    matsList.innerHTML = '';
    
    // Sprawdź czy są wyniki
    if (filteredMatsCache.length === 0) {
      renderMatsEmptyState(filter);
      hideMatsLoadMore();
      return;
    }
    
    // Renderuj pierwszą partię
    renderMatsChunk(true);
    
    // Ustaw observer dla lazy loading
    setupMatsObserver();
  }

  /**
   * Renderuje partię mat
   */
  function renderMatsChunk(isFirstChunk = false) {
    const start = currentMatsPage * MATS_PER_PAGE;
    const end = start + MATS_PER_PAGE;
    const matsToRender = filteredMatsCache.slice(start, end);
    
    if (matsToRender.length === 0) {
      hideMatsLoadMore();
      return;
    }
    
    // Użyj DocumentFragment dla lepszej wydajności
    const fragment = document.createDocumentFragment();
    
    matsToRender.forEach(mat => {
      const matElement = createMatElement(mat);
      fragment.appendChild(matElement);
    });
    
    // Dodaj do DOM w jednej operacji
    matsList.appendChild(fragment);
    
    // Podłącz event listenery dla przycisków admina
    if (isAdmin) {
      attachMatAdminListeners(matsToRender);
    }
    
    // Sprawdź czy są kolejne strony
    const hasMore = end < filteredMatsCache.length;
    
    if (hasMore) {
      showMatsLoadMore();
    } else {
      hideMatsLoadMore();
    }
  }

  /**
   * Tworzy pojedynczy element maty (wydajniej niż innerHTML)
   */
  function createMatElement(mat) {
    const div = document.createElement('div');
    div.className = 'mat-item';
    div.dataset.matId = mat.id;
    
    // Admin actions
    const adminActionsHtml = isAdmin ? `
      <div class="mat-admin-actions">
        <button class="btn-edit-mat" data-mat-id="${mat.id}" aria-label="Edytuj matę">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        ${mat.status !== 'pending' ? `
        <button class="btn-delete-mat" data-mat-id="${mat.id}" aria-label="Usuń matę">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>` : ''}
      </div>
    ` : '';
    
    // Numer maty badge
    let rawNum = mat.mat_number ? mat.mat_number.toString().trim() : '';
    if (rawNum.startsWith('#')) rawNum = rawNum.substring(1);
    const matNumberBadge = rawNum ? `<span class="mat-number-badge">${rawNum}</span>` : '';
    
    div.innerHTML = `
      <div class="mat-info">
        <div class="mat-name">
          ${escapeHtml(mat.name)}
        </div>
        <div class="mat-details">
          ${mat.location ? `<div class="mat-detail-item"><strong>${formatLocation(mat.location)}</strong></div>` : ''}
          ${mat.size ? `<div class="mat-detail-item">📏 ${escapeHtml(mat.size)}</div>` : ''}
        </div>
      </div>
      <div class="mat-actions" style="align-items: center; justify-content: space-between;">
        ${matNumberBadge}
        <div style="display:flex; align-items:center; gap:8px;">
          ${adminActionsHtml}
          <div class="mat-qty-badge">${mat.quantity}</div>
        </div>
      </div>
    `;
    
    return div;
  }

  /**
   * Escape HTML dla bezpieczeństwa
   */
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Podłącza listenery dla przycisków admina w konkretnej partii
   */
  function attachMatAdminListeners(mats) {
    mats.forEach(mat => {
      const editBtn = matsList.querySelector(`.btn-edit-mat[data-mat-id="${mat.id}"]`);
      const deleteBtn = matsList.querySelector(`.btn-delete-mat[data-mat-id="${mat.id}"]`);
      
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditMatModal(mat);
        });
      }
      
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openDeleteMatModal(mat);
        });
      }
    });
  }

  /**
   * Aktualizuje statystyki mat
   */
  function updateMatsStats(allMats, filtered, filter) {
    const totalQuantity = allMats.reduce((sum, mat) => sum + (mat.quantity || 0), 0);
    matsCount.textContent = `Załadowano: ${allMats.length} mat (łącznie: ${totalQuantity} szt.)`;
    
    if (filter) {
      matsFiltered.style.display = 'inline';
      const filteredQuantity = filtered.reduce((sum, mat) => sum + (mat.quantity || 0), 0);
      matsFiltered.textContent = `Znaleziono: ${filtered.length} (${filteredQuantity} szt.)`;
    } else {
      matsFiltered.style.display = 'none';
    }
  }

  /**
   * Renderuje empty state
   */
  function renderMatsEmptyState(filter) {
    matsList.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <div class="empty-state-text">
          ${filter ? 'Nie znaleziono mat spełniających kryteria.' : 'Brak danych do wyświetlenia.'}
        </div>
      </div>
    `;
  }

  /**
   * Ustawia Intersection Observer dla lazy loading
   */
  function setupMatsObserver() {
    const sentinel = document.getElementById('matsLoadMoreSentinel');
    if (!sentinel) return;
    
    // Odłącz poprzedni observer
    if (matsObserver) {
      matsObserver.disconnect();
    }
    
    // Utwórz nowy observer
    matsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isLoadingMoreMats) {
          loadMoreMats();
        }
      });
    }, {
      root: null,
      rootMargin: '200px', // Zacznij ładować 200px przed końcem
      threshold: 0
    });
    
    matsObserver.observe(sentinel);
  }

  /**
   * Ładuje kolejną partię mat
   */
  function loadMoreMats() {
    const nextStart = (currentMatsPage + 1) * MATS_PER_PAGE;
    
    // Sprawdź czy są jeszcze maty do załadowania
    if (nextStart >= filteredMatsCache.length) {
      hideMatsLoadMore();
      return;
    }
    
    isLoadingMoreMats = true;
    showMatsLoadMore();
    
    // Użyj requestAnimationFrame dla płynności
    requestAnimationFrame(() => {
      currentMatsPage++;
      renderMatsChunk(false);
      isLoadingMoreMats = false;
    });
  }

  /**
   * Pokazuje wskaźnik ładowania
   */
  function showMatsLoadMore() {
    const sentinel = document.getElementById('matsLoadMoreSentinel');
    if (sentinel) {
      sentinel.style.display = 'flex';
    }
  }

  /**
   * Ukrywa wskaźnik ładowania
   */
  function hideMatsLoadMore() {
    const sentinel = document.getElementById('matsLoadMoreSentinel');
    if (sentinel) {
      sentinel.style.display = 'none';
    }
  }
  
  matsSearch.addEventListener('input', (e) => {
    const value = e.target.value;
    
    // Pokaż wskaźnik wyszukiwania
    matsSearch.classList.toggle('searching', value.length > 0);
    
    renderMats(allLogoMats, value);
  });

  // Obsługa klawisza Escape - wyczyść wyszukiwanie
  matsSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      matsSearch.value = '';
      matsSearch.classList.remove('searching');
      renderMats(allLogoMats, '');
    }
  });
  
  exportExcelBtn.addEventListener('click', async () => {
    if (allLogoMats.length === 0) {
      showToast("Brak danych mat do wyeksportowania.", "error");
      return;
    }
    if (typeof ExcelJS === 'undefined') {
      showToast("Biblioteka Excel nie jest załadowana", "error");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inwentaryzacja Mat', { pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      workbook.creator = 'Elis System';
      workbook.created = new Date();
      workbook.company = 'Elis';
      const currentDate = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const totalQuantity = allLogoMats.reduce((sum, mat) => sum + mat.quantity, 0);
      const sortedMats = [...allLogoMats].sort((a, b) => a.name.localeCompare(b.name, 'pl'));

      worksheet.mergeCells('A1:D1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'ELIS - INWENTARYZACJA MAT LOGO';
      titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00A9BE' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 35;

      worksheet.mergeCells('A2:D2');
      const dateCell = worksheet.getCell('A2');
      dateCell.value = `Data wygenerowania: ${currentDate}`;
      dateCell.font = { name: 'Calibri', size: 10, italic: true };
      dateCell.alignment = { horizontal: 'center' };
      dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
      worksheet.addRow([]);

      const summaryRow1 = worksheet.addRow(['PODSUMOWANIE', '', '', '']);
      worksheet.mergeCells(`A${summaryRow1.number}:D${summaryRow1.number}`);
      summaryRow1.getCell(1).font = { name: 'Calibri', size: 12, bold: true };
      summaryRow1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3E9F0' } };
      summaryRow1.height = 25;

      const statsRow1 = worksheet.addRow(['Liczba pozycji:', allLogoMats.length, '', '']);
      const statsRow2 = worksheet.addRow(['Suma mat (szt.):', totalQuantity, '', '']);
      [statsRow1, statsRow2].forEach(row => {
        row.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
        row.getCell(2).font = { name: 'Calibri', size: 11 };
        row.getCell(2).alignment = { horizontal: 'left' };
      });
      worksheet.addRow([]);

      const headerRow = worksheet.addRow(['Nazwa maty', 'Lokalizacja', 'Rozmiar', 'Ilość (szt.)']);
      headerRow.height = 30;
      headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1117' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.eachCell((cell) => { cell.border = { top: { style: 'thin', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'medium', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } } }; });

      sortedMats.forEach((mat, index) => {
        const row = worksheet.addRow([mat.name, mat.location || 'Nie określono', mat.size || 'Nie określono', mat.quantity]);
        row.height = 22;
        row.font = { name: 'Calibri', size: 10 };
        if (index % 2 === 0) { row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }; }
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(4).font = { name: 'Calibri', size: 10, bold: true };
        row.eachCell((cell) => { cell.border = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin', color: { argb: 'FFD1D5DB' } }, bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, right: { style: 'thin', color: { argb: 'FFD1D5DB' } } }; });
      });

      worksheet.addRow([]);
      const totalRow = worksheet.addRow(['', '', 'SUMA CAŁKOWITA:', totalQuantity]);
      totalRow.height = 28;
      totalRow.getCell(3).font = { name: 'Calibri', size: 11, bold: true };
      totalRow.getCell(4).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF00A9BE' } };
      totalRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
      totalRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      totalRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F7FA' } };

      worksheet.addRow([]);
      const footerRow = worksheet.addRow(['Dokument wygenerowany automatycznie przez system Elis', '', '', '']);
      worksheet.mergeCells(`A${footerRow.number}:D${footerRow.number}`);
      footerRow.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF6B7280' } };
      footerRow.getCell(1).alignment = { horizontal: 'center' };

      worksheet.columns = [ { width: 40 }, { width: 25 }, { width: 18 }, { width: 15 } ];
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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

  printMatsBtn.addEventListener('click', () => {
    if (allLogoMats.length === 0) {
      showToast("Brak danych mat do wydrukowania.", "error");
      return;
    }
    const printDate = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const totalQuantity = allLogoMats.reduce((sum, mat) => sum + mat.quantity, 0);
    const sortedMats = [...allLogoMats].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    
    let printHTML = `
      <div class="print-mats-header">
        <img src="icons/icon-192.png" alt="Elis Logo">
        <div class="title-block">
          <h1>Lista Mat Logo - Inwentaryzacja</h1>
          <p>Data wydruku: ${printDate}</p>
        </div>
      </div>
      <div class="print-mats-summary">
        <p><strong>Łączna liczba pozycji:</strong> ${allLogoMats.length}</p>
        <p><strong>Suma wszystkich mat:</strong> ${totalQuantity} szt.</p>
      </div>
      <table class="print-mats-table">
        <thead><tr><th>Nazwa</th><th>Lokalizacja</th><th>Rozmiar</th><th>Ilość</th></tr></thead>
        <tbody>
    `;
    sortedMats.forEach(mat => {
      printHTML += `<tr><td>${mat.name}</td><td>${mat.location || '—'}</td><td>${mat.size || '—'}</td><td>${mat.quantity}</td></tr>`;
    });
    printHTML += `</tbody></table><div class="print-mats-footer"><p>Dokument wygenerowany automatycznie przez system Elis</p></div>`;
    printOutput.innerHTML = printHTML;
    setTimeout(() => { try { window.print(); } catch (error) { console.error("Błąd drukowania:", error); showToast("Błąd podczas otwierania okna drukowania.", "error"); } }, 100);
  });
  
  // ==================== KREATOR PODZIAŁU MAT ====================
  document.querySelectorAll('input[name="advancedMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const mode = e.target.value;
      if (mode === 'single') {
        singleModeSection.style.display = 'block';
        distributeModeSection.style.display = 'none';
      } else {
        singleModeSection.style.display = 'none';
        distributeModeSection.style.display = 'block';
        distributeStep1.style.display = 'block';
        distributeStep2.style.display = 'none';
        
        const summarySection = document.getElementById('distributeSummary');
        if (summarySection) {
          summarySection.style.display = 'none';
        }
      }
      updateFormState();
    });
  });

  startDistributeBtn.addEventListener('click', () => {
    if (!appState.distributeMat) {
      showToast("Wybierz matę!", "error");
      return;
    }
    const total = Number(distributeTotalQty.value);
    if (total < 1 || total > 100) {
      showToast("Ilość musi być od 1 do 100!", "error");
      return;
    }
    
    const summarySection = document.getElementById('distributeSummary');
    if (summarySection) {
      summarySection.style.display = 'none';
    }
    
    distributeData = { mat: appState.distributeMat, total };
    distributeClients = [];
    
    distributeMatName.textContent = appState.distributeMat;
    distributeTotal.textContent = total;
    distributeRemaining.textContent = total;
    distributeAssigned.textContent = '0';
    distributeLeft.textContent = total;
    distributeProgressFill.style.width = '0%';
    
    distributeClientInput.value = '';
    distributeClientQty.value = '1';
    distributeClientsList.innerHTML = '<p style="text-align: center; color: var(--muted); font-size: 14px; margin: 12px 0 0 0;">Dodaj pierwszego klienta</p>';
    
    distributeStep1.style.display = 'none';
    distributeStep2.style.display = 'block';
    confirmDistributeBtn.disabled = true;
  });

  addDistributeClientBtn.addEventListener('click', () => {
    const client = distributeClientInput.value.trim();
    const qty = Number(distributeClientQty.value);
    
    if (!client) {
      showToast("Podaj nazwę klienta!", "error");
      return;
    }
    
    const assigned = distributeClients.reduce((sum, c) => sum + c.qty, 0);
    const remaining = distributeData.total - assigned;
    
    if (qty < 1) {
      showToast("Ilość musi być większa niż 0!", "error");
      return;
    }
    
    if (qty > remaining) {
      showToast(`Możesz przydzielić maksymalnie ${remaining} szt.!`, "error");
      return;
    }
    
    distributeClients.push({ client, qty });
    renderDistributeClients();
    updateDistributeProgress();
    
    distributeClientInput.value = '';
    distributeClientQty.value = Math.min(1, remaining - qty);
    distributeClientInput.focus();
  });

  function renderDistributeClients() {
    if (distributeClients.length === 0) {
      distributeClientsList.innerHTML = `
        <div class="distribute-empty-state">
          <span style="font-size: 32px; opacity: 0.3;">📋</span>
          <p>Nie dodano jeszcze żadnych klientów</p>
        </div>`;
      return;
    }
    
    distributeClientsList.innerHTML = distributeClients.map((c, index) => 
      `<div class="distribute-client-card">
        <div class="distribute-client-info">
          <div class="distribute-client-name">${c.client}</div>
          <div class="distribute-client-qty">Przydzielono: <strong>${c.qty}</strong> szt.</div>
        </div>
        <button class="distribute-client-remove btn-danger" data-index="${index}">
          Usuń
        </button>
      </div>`
    ).join('');
  }

  function updateDistributeProgress() {
    const assigned = distributeClients.reduce((sum, c) => sum + c.qty, 0);
    const remaining = distributeData.total - assigned;
    const percentage = (assigned / distributeData.total) * 100;
    
    distributeAssigned.textContent = assigned;
    distributeLeft.textContent = remaining;
    distributeRemaining.textContent = remaining;
    distributeProgressFill.style.width = `${percentage}%`;
    
    const isComplete = remaining === 0;
    confirmDistributeBtn.disabled = !isComplete;
    
    const summarySection = document.getElementById('distributeSummary');
    if (isComplete && distributeClients.length > 0) {
      summarySection.style.display = 'block';
      
      document.getElementById('distributeSummaryMat').textContent = distributeData.mat;
      document.getElementById('distributeSummaryCount').textContent = distributeClients.length;
      
      const summaryList = document.getElementById('distributeSummaryList');
      summaryList.innerHTML = distributeClients.map(c => 
        `<div class="distribute-summary-item">
          <span class="distribute-summary-item-name">${c.client}</span>
          <span class="distribute-summary-item-qty">×${c.qty}</span>
        </div>`
      ).join('');
      
      confirmDistributeBtn.innerHTML = '<span style="font-size: 16px; margin-right: 6px;">✓</span> Zatwierdź podział';
    } else {
      summarySection.style.display = 'none';
      confirmDistributeBtn.innerHTML = `<span style="font-size: 16px; margin-right: 6px;">⏳</span> Rozdziel wszystkie (brakuje ${remaining})`;
    }
  }

  distributeClientsList.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-danger[data-index]');
    if (btn) {
      const index = Number(btn.dataset.index);
      distributeClients.splice(index, 1);
      renderDistributeClients();
      updateDistributeProgress();
    }
  });

  cancelDistributeBtn.addEventListener('click', () => {
    distributeStep1.style.display = 'block';
    distributeStep2.style.display = 'none';
    distributeClients = [];
    
    const summarySection = document.getElementById('distributeSummary');
    if (summarySection) {
      summarySection.style.display = 'none';
    }
  });

  confirmDistributeBtn.addEventListener('click', () => {
    const assigned = distributeClients.reduce((sum, c) => sum + c.qty, 0);
    if (assigned !== distributeData.total) {
      showToast("Musisz przydzielić wszystkie maty!", "error");
      return;
    }
    
    distributeClients.forEach(c => {
      tempAlternatives.push({
        alt: distributeData.mat,
        qty: c.qty,
        client: c.client
      });
    });
    
    const clientCount = distributeClients.length;
    showToast(`✅ Dodano ${clientCount} ${clientCount === 1 ? 'klienta' : clientCount < 5 ? 'klientów' : 'klientów'} do listy!`);
    
    distributeStep1.style.display = 'block';
    distributeStep2.style.display = 'none';
    distributeClients = [];
    const distributeMatSelectWrapper = document.getElementById('distributeMatSelectWrapper');
    distributeMatSelectWrapper.reset('— wybierz matę —');
    distributeTotalQty.value = '1';
    
    const singleRadio = document.querySelector('input[name="advancedMode"][value="single"]');
    singleRadio.checked = true;
    singleModeSection.style.display = 'block';
    distributeModeSection.style.display = 'none';
    
    renderTempAltList();
    updateFormState();
    
    setTimeout(() => {
      tempMultiAltList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  });
  
  // ==================== PANEL PRANIA - FUNKCJE ====================

  function getCurrentShift() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    
    if (totalMinutes >= 360 && totalMinutes < 840) {
      return '1 zmiana';
    } else if (totalMinutes >= 840 && totalMinutes < 1320) {
      return '2 zmiana';
    } else {
      return null;
    }
  }

  function updateShiftInfo() {
    const shiftInfoCard = document.getElementById('currentShiftInfo');
    if (!shiftInfoCard) return;
    
    const currentShift = getCurrentShift();
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    if (currentShift) {
      const isFirstShift = currentShift === '1 zmiana';
      const endHour = isFirstShift ? '14:00' : '22:00';
      
      const endTime = new Date();
      if (isFirstShift) {
        endTime.setHours(14, 0, 0, 0);
      } else {
        endTime.setHours(22, 0, 0, 0);
      }
      
      const diffMs = endTime - now;
      const remainingHours = Math.floor(diffMs / (1000 * 60 * 60));
      const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const timeLeft = remainingHours > 0 ? `${remainingHours}h ${remainingMinutes}min` : `${remainingMinutes}min`;
      
      shiftInfoCard.className = 'shift-info-card active';
      shiftInfoCard.innerHTML = `
        <div class="shift-info-icon">✅</div>
        <div class="shift-info-content">
          <div class="shift-info-title">Trwa zmiana</div>
          <div class="shift-info-desc">Możesz dodawać maty do prania. Zmiana kończy się o ${endHour} (pozostało ${timeLeft})</div>
        </div>
        <div class="shift-badge">${currentShift}</div>
      `;
    } else {
      const nextShiftStart = hours < 6 ? '6:00' : '6:00 (następnego dnia)';
      shiftInfoCard.className = 'shift-info-card inactive';
      shiftInfoCard.innerHTML = `
        <div class="shift-info-icon">⏸️</div>
        <div class="shift-info-content">
          <div class="shift-info-title">Brak aktywnej zmiany</div>
          <div class="shift-info-desc">Dodawanie mat dostępne w godzinach: 6:00-14:00 (1 zmiana) i 14:00-22:00 (2 zmiana). Następna zmiana: ${nextShiftStart}</div>
        </div>
        <div class="shift-badge">POZA GODZINAMI</div>
      `;
    }
  }

  async function fetchActiveWashing() {
    try {
      const { data, error } = await window.supabase
        .from('washing_queue')
        .select('*')
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error("Błąd pobierania aktywnych prań:", error);
      showToast("Błąd pobierania danych prania.", "error");
      return [];
    }
  }

  function getTotalQuantity(matName) {
    const matInDb = allLogoMats.find(m => m.name === matName);
    return matInDb ? matInDb.quantity : 0;
  }

  function getAvailableQuantity(matName) {
    const totalQty = getTotalQuantity(matName);
    const inWashing = allWashingItems
      .filter(item => item.mat_name === matName)
      .reduce((sum, item) => sum + (item.quantity || 0), 0);
    return Math.max(0, totalQty - inWashing);
  }

  async function loadWashingData() {
    updateShiftInfo();
    setInterval(updateShiftInfo, 60000);
    
    await checkAndArchiveOldWashing();
    
    const mats = await fetchAndCacheLogoMats();
    const matNames = mats.map(m => m.name).filter((v, i, a) => a.indexOf(v) === i).sort();
    washingMatSelectWrapper.updateOptions(matNames);
    
    const activeItems = await fetchActiveWashing();
    allWashingItems = activeItems;
    renderWashingList(activeItems, '');
    
    updateWashingFormState();
  }

  function updateWashingFormState() {
    const matSelected = !!appState.washingMat;
    
    // 🔥 Pobierz elementy lokalnie (bezpieczniej)
    const washingQuantitySelector = document.getElementById('washingQuantitySelector');
    const washingQty = document.getElementById('washingQty');
    const addToWashingBtn = document.getElementById('addToWashingBtn');
    
    // Sprawdź czy elementy istnieją
    if (!washingQuantitySelector || !washingQty || !addToWashingBtn) {
      console.warn('⚠️ Elementy prania nie znalezione');
      return;
    }
    
    if (matSelected) {
      // ✅ ZAWSZE POKAŻ SELEKTOR ILOŚCI
      washingQuantitySelector.style.display = 'block';
      washingQty.max = 100;
      washingQty.value = Math.min(Number(washingQty.value) || 1, 100);
      
      // ✅ PRZYCISK ZAWSZE AKTYWNY
      addToWashingBtn.disabled = false;
      addToWashingBtn.textContent = 'Wrzuć do prania';
    } else {
      washingQuantitySelector.style.display = 'none';
      addToWashingBtn.disabled = true;
      addToWashingBtn.textContent = 'Wrzuć do prania';
    }
  }

  function renderWashingList(items, filter = '') {
    const filtered = items.filter(item => {
      const search = filter.toLowerCase();
      return (item.mat_name?.toLowerCase() || '').includes(search) ||
             (item.mat_location?.toLowerCase() || '').includes(search) ||
             (item.mat_size?.toLowerCase() || '').includes(search) ||
             (item.shift?.toLowerCase() || '').includes(search);
    });

    if (washingCount) {
      const totalQty = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      washingCount.textContent = `W praniu: ${items.length} pozycji (${totalQty} szt.)`;
      
      if (filter && washingFiltered) {
        washingFiltered.style.display = 'inline';
        const filteredQty = filtered.reduce((sum, item) => sum + (item.quantity || 1), 0);
        washingFiltered.textContent = `Znaleziono: ${filtered.length} pozycji (${filteredQty} szt.)`;
      } else if (washingFiltered) {
        washingFiltered.style.display = 'none';
      }
    }

    if (filtered.length === 0) {
      activeWashingList.innerHTML = `<div class="empty-state">
        <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <div class="empty-state-text">${filter ? 'Nie znaleziono mat spełniających kryteria.' : 'Brak mat w praniu.<br>Dodaj pierwszą matę z listy powyżej.'}</div>
      </div>`;
      return;
    }

    activeWashingList.innerHTML = filtered.map(item => {
      const startDate = new Date(item.started_at);
      const startTime = startDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      const startDateStr = startDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
      
      const qtyBadge = item.quantity > 1 ? `<span class="washing-item-qty-badge">×${item.quantity}</span>` : '';
      
      return `
        <div class="washing-item" data-washing-id="${item.id}">
          <div class="washing-item-header">
            <div class="washing-item-name">${item.mat_name}${qtyBadge}</div>
            <div class="washing-item-shift">${item.shift}</div>
          </div>
          <div class="washing-item-details">
            ${item.mat_location ? `
              <div class="washing-item-detail">
                <strong>${formatLocation(item.mat_location)}</strong>
              </div>
            ` : ''}
            ${item.mat_size ? `
              <div class="washing-item-detail">
                <span>📏</span>
                <span>${item.mat_size}</span>
              </div>
            ` : ''}
          </div>
          <div class="washing-item-time">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Dodano: ${startDateStr} o ${startTime}</span>
          </div>
          <div class="washing-item-actions">
            <button class="btn-secondary btn-edit-washing" data-action="edit-washing">
              ✏️ Edytuj
            </button>
            <button class="btn-danger btn-delete-washing" data-action="delete-washing">
              🗑️ Usuń
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  washingMatSelectWrapper.addEventListener("change", () => {
    updateWashingFormState();
  });

  washingQtyDec.addEventListener('click', () => {
    washingQty.value = Math.max(1, Number(washingQty.value) - 1);
  });

  washingQtyInc.addEventListener('click', () => {
    const max = Number(washingQty.max);
    washingQty.value = Math.min(max, Number(washingQty.value) + 1);
  });

  // ==================== ARCHIWUM PRAŃ - FUNKCJE ====================

  // 🔥 NOWA FUNKCJA: Sprawdza czy są prania do usunięcia w ciągu 7 dni
  async function checkUpcomingDeletions() {
    try {
      const { data, error } = await window.supabase
        .from('washing_archive')
        .select('*');
      
      if (error) throw error;
      if (!data || data.length === 0) return { total: 0, critical: 0, warning: 0 };
      
      const now = new Date();
      let critical = 0; // <= 3 dni
      let warning = 0;  // 4-7 dni
      
      data.forEach(item => {
        // ✅ UŻYJ delete_at Z BAZY JEŚLI ISTNIEJE!
        let deleteDate;
        if (item.delete_at) {
          deleteDate = new Date(item.delete_at);
        } else {
          // Fallback gdyby nie było w bazie
          const archivedDate = new Date(item.archived_at);
          deleteDate = new Date(archivedDate);
          deleteDate.setDate(deleteDate.getDate() + 14);
        }
        
        const diffTime = deleteDate - now;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysLeft <= 3 && daysLeft >= 0) critical++;
        else if (daysLeft <= 7 && daysLeft > 3) warning++;
      });
      
      console.log('📊 Archiwum stats:', { total: data.length, critical, warning }); // DEBUG
      
      return { total: data.length, critical, warning };
    } catch (error) {
      console.error('Błąd sprawdzania usunięć:', error);
      return { total: 0, critical: 0, warning: 0 };
    }
  }

  // 🔥 NOWA FUNKCJA: Sprawdza nadchodzące usunięcia w archiwum ZAMIENNIKÓW
  async function checkReplacementsUpcomingDeletions() {
    try {
      const { data, error } = await window.supabase
        .from('replacements_archive')
        .select('*');
      
      if (error) throw error;
      if (!data || data.length === 0) return { total: 0, critical: 0, warning: 0 };
      
      const now = new Date();
      let critical = 0; // <= 3 dni
      let warning = 0;  // 4-7 dni
      
      data.forEach(item => {
        let deleteDate;
        if (item.delete_at) {
          deleteDate = new Date(item.delete_at);
        } else {
          const archivedDate = new Date(item.archived_at);
          deleteDate = new Date(archivedDate);
          deleteDate.setDate(deleteDate.getDate() + 14);
        }
        
        const diffTime = deleteDate - now;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysLeft <= 3 && daysLeft >= 0) critical++;
        else if (daysLeft <= 7 && daysLeft > 3) warning++;
      });
      
      return { total: data.length, critical, warning };
    } catch (error) {
      console.error('Błąd sprawdzania usunięć zamienników:', error);
      return { total: 0, critical: 0, warning: 0 };
    }
  }

  // 🔥 NOWA FUNKCJA: Ustawia przypomnienie dla archiwum ZAMIENNIKÓW
  async function scheduleReplacementsReminder() {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      showToast('Odmówiono dostępu do powiadomień', 'error');
      return;
    }
    
    const stats = await checkReplacementsUpcomingDeletions();
    
    if (stats.critical === 0 && stats.warning === 0) {
      showToast('Brak tras do usunięcia w najbliższym czasie', 'info');
      return;
    }
    
    // Zapisz w localStorage timestamp przypomnienia
    const reminderTime = new Date();
    reminderTime.setHours(9, 0, 0, 0); // Jutro o 9:00
    reminderTime.setDate(reminderTime.getDate() + 1);
    
    localStorage.setItem('replacementsReminder', reminderTime.toISOString());
    localStorage.setItem('replacementsReminderStats', JSON.stringify(stats));
    
    showToast(`✅ Przypomnienie ustawione na jutro o 9:00`, 'success');
    
    // Jeśli są krytyczne, pokaż natychmiastowe powiadomienie
    if (stats.critical > 0) {
      new Notification('⚠️ Elis - Pilne!', {
        body: `${stats.critical} ${stats.critical === 1 ? 'trasa zostanie usunięta' : 'tras zostanie usuniętych'} w ciągu 3 dni!`,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        requireInteraction: true
      });
    }
  }

  // 🔥 NOWA FUNKCJA: Sprawdza przypomnienia dla zamienników
  function checkReplacementsScheduledReminder() {
    const reminderTime = localStorage.getItem('replacementsReminder');
    if (!reminderTime) return;
    
    const now = new Date();
    const scheduled = new Date(reminderTime);
    
    if (now >= scheduled) {
      const stats = JSON.parse(localStorage.getItem('replacementsReminderStats') || '{}');
      
      if (Notification.permission === 'granted') {
        new Notification('🔔 Elis - Przypomnienie', {
          body: `Masz ${stats.critical || 0} krytycznych i ${stats.warning || 0} ostrzeżeń w archiwum zamienników`,
          icon: 'icons/icon-192.png',
          badge: 'icons/icon-192.png'
        });
      }
      
      localStorage.removeItem('replacementsReminder');
      localStorage.removeItem('replacementsReminderStats');
    }
  }
  
  // 🔥 NOWA FUNKCJA: Aktualizuje badge na kafelku archiwum
  async function updateArchiveBadge() {
    const archiveNavBtn = document.querySelector('[data-navigate="archive"]');
    if (!archiveNavBtn) {
      console.warn('⚠️ Nie znaleziono przycisku archiwum!');
      return;
    }
    
    const stats = await checkUpcomingDeletions();
    console.log('🎯 Aktualizuję badge, stats:', stats); // DEBUG
    
    // Usuń stary badge jeśli istnieje
    const oldBadge = archiveNavBtn.querySelector('.archive-warning-badge');
    if (oldBadge) oldBadge.remove();
    
    // Dodaj nowy badge jeśli są ostrzeżenia
    if (stats.critical > 0 || stats.warning > 0) {
      const badge = document.createElement('div');
      badge.className = 'archive-warning-badge';
      
      if (stats.critical > 0) {
        badge.classList.add('critical');
        badge.innerHTML = `⚠️ ${stats.critical} ${stats.critical === 1 ? 'wpis' : 'wpisy'} do usunięcia!`;
      } else {
        badge.classList.add('warning');
        badge.innerHTML = `⏰ ${stats.warning} ${stats.warning === 1 ? 'wpis' : 'wpisy'} wkrótce usuniętych`;
      }
      
      archiveNavBtn.appendChild(badge);
      console.log('✅ Badge dodany!', badge); // DEBUG
    } else {
      console.log('ℹ️ Brak ostrzeżeń - badge nie dodany');
    }
  }

  // 🔥 NOWA FUNKCJA: Aktualizuje badge na kafelku archiwum ZAMIENNIKÓW
  async function updateReplacementsArchiveBadge() {
    const archiveReplacementsNavBtn = document.querySelector('[data-navigate="archive-replacements"]');
    if (!archiveReplacementsNavBtn) return;
    
    const stats = await checkReplacementsUpcomingDeletions();
    
    // Usuń stary badge jeśli istnieje
    const oldBadge = archiveReplacementsNavBtn.querySelector('.archive-warning-badge');
    if (oldBadge) oldBadge.remove();
    
    // Dodaj nowy badge jeśli są ostrzeżenia
    if (stats.critical > 0 || stats.warning > 0) {
      const badge = document.createElement('div');
      badge.className = 'archive-warning-badge';
      
      if (stats.critical > 0) {
        badge.classList.add('critical');
        badge.innerHTML = `⚠️ ${stats.critical} ${stats.critical === 1 ? 'trasa' : 'tras'} do usunięcia!`;
      } else {
        badge.classList.add('warning');
        badge.innerHTML = `⏰ ${stats.warning} ${stats.warning === 1 ? 'trasa' : 'tras'} wkrótce usuniętych`;
      }
      
      archiveReplacementsNavBtn.appendChild(badge);
    }
  }

  // 🔥 NOWA FUNKCJA: Prosi o pozwolenie na powiadomienia
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      showToast('Twoja przeglądarka nie wspiera powiadomień', 'error');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }

  // 🔥 NOWA FUNKCJA: Ustawia przypomnienie
  async function scheduleArchiveReminder() {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      showToast('Odmówiono dostępu do powiadomień', 'error');
      return;
    }
    
    const stats = await checkUpcomingDeletions();
    
    if (stats.critical === 0 && stats.warning === 0) {
      showToast('Brak prań do usunięcia w najbliższym czasie', 'info');
      return;
    }
    
    // Zapisz w localStorage timestamp przypomnienia
    const reminderTime = new Date();
    reminderTime.setHours(9, 0, 0, 0); // Jutro o 9:00
    reminderTime.setDate(reminderTime.getDate() + 1);
    
    localStorage.setItem('archiveReminder', reminderTime.toISOString());
    localStorage.setItem('archiveReminderStats', JSON.stringify(stats));
    
    showToast(`✅ Przypomnienie ustawione na jutro o 9:00`, 'success');
    
    // Jeśli są krytyczne, pokaż natychmiastowe powiadomienie
    if (stats.critical > 0) {
      new Notification('⚠️ Elis - Pilne!', {
        body: `${stats.critical} ${stats.critical === 1 ? 'pranie zostanie usunięte' : 'prania zostaną usunięte'} w ciągu 3 dni!`,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        requireInteraction: true
      });
    }
  }

  // 🔥 NOWA FUNKCJA: Sprawdza czy trzeba wyświetlić przypomnienie
  function checkScheduledReminder() {
    const reminderTime = localStorage.getItem('archiveReminder');
    if (!reminderTime) return;
    
    const now = new Date();
    const scheduled = new Date(reminderTime);
    
    if (now >= scheduled) {
      const stats = JSON.parse(localStorage.getItem('archiveReminderStats') || '{}');
      
      if (Notification.permission === 'granted') {
        new Notification('🔔 Elis - Przypomnienie', {
          body: `Masz ${stats.critical || 0} krytycznych i ${stats.warning || 0} ostrzeżeń w archiwum prań`,
          icon: 'icons/icon-192.png',
          badge: 'icons/icon-192.png'
        });
      }
      
      localStorage.removeItem('archiveReminder');
      localStorage.removeItem('archiveReminderStats');
    }
  }

  async function fetchArchiveData(filters = {}) {
    try {
      let query = window.supabase
        .from('washing_archive')
        .select('*')
        .order('archived_at', { ascending: false });
      
      if (filters.dateFrom) {
        query = query.gte('archived_at', filters.dateFrom + 'T00:00:00');
      }
      if (filters.dateTo) {
        query = query.lte('archived_at', filters.dateTo + 'T23:59:59');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // 🔥 POPRAWKA: Sprawdź czy są dane
      if (!data || data.length === 0) {
        console.log('ℹ️ Archiwum puste lub brak danych w wybranym zakresie');
        return [];
      }
      
      const enrichedData = data.map(item => {
        const archivedDate = new Date(item.archived_at);
        
        let deleteDate;
        if (item.delete_at) {
          deleteDate = new Date(item.delete_at);
        } else {
          deleteDate = new Date(archivedDate);
          deleteDate.setDate(deleteDate.getDate() + 14);
        }
        
        const now = new Date();
        const diffTime = deleteDate - now;
        const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        
        const startedDate = new Date(item.started_at);
        const durationMs = archivedDate - startedDate;
        const durationHours = Math.round(durationMs / (1000 * 60 * 60));
        
        return {
          ...item,
          delete_at: deleteDate.toISOString(),
          days_until_deletion: daysLeft,
          duration_hours: item.duration_hours || durationHours
        };
      });
      
      console.log(`✅ Załadowano ${enrichedData.length} wpisów z archiwum`); // 🔥 NOWE
      return enrichedData;
      
    } catch (error) {
      console.error('❌ Błąd pobierania archiwum:', error);
      
      // 🔥 POPRAWKA: Bardziej szczegółowy komunikat
      if (error.message.includes('permission')) {
        showToast('Brak uprawnień do archiwum. Skontaktuj się z administratorem.', 'error');
      } else if (error.message.includes('network')) {
        showToast('Błąd połączenia z bazą danych. Sprawdź internet.', 'error');
      } else {
        showToast('Błąd pobierania archiwum: ' + error.message, 'error');
      }
      
      return [];
    }
  }

  async function loadArchiveData() {
    archiveList.innerHTML = '<div class="empty-state"><div class="empty-state-text">Ładowanie archiwum...</div></div>';
    
    const items = await fetchArchiveData();
    allArchiveItems = items;
    renderArchiveList(items, '');
    
    // 🔥 NOWE: Sprawdź przypomnienia
    checkScheduledReminder();
    
    // 🔥 NOWE: Podepnij przycisk przypomnienia
    const reminderBtn = document.getElementById('setReminderBtn');
    if (reminderBtn) {
      reminderBtn.addEventListener('click', scheduleArchiveReminder);
    }
    
    const archiveDateFrom = document.getElementById('archiveDateFrom');
    const archiveDateTo = document.getElementById('archiveDateTo');
    const archiveDateReset = document.getElementById('archiveDateReset');
    
    if (archiveSearch) {
      // Usuń stare listenery (jeśli są)
      const newArchiveSearch = archiveSearch.cloneNode(true);
      archiveSearch.parentNode.replaceChild(newArchiveSearch, archiveSearch);
      
      newArchiveSearch.addEventListener('input', async (e) => {
        const filters = {
          dateFrom: archiveDateFrom?.value,
          dateTo: archiveDateTo?.value
        };
        const data = await fetchArchiveData(filters);
        renderArchiveList(data, e.target.value);
      });
    }
    
    if (archiveDateFrom || archiveDateTo) {
      [archiveDateFrom, archiveDateTo].forEach(input => {
        if (input) {
          input.addEventListener('change', async () => {
            const filters = {
              dateFrom: archiveDateFrom?.value,
              dateTo: archiveDateTo?.value
            };
            const data = await fetchArchiveData(filters);
            const searchValue = document.getElementById('archiveSearch')?.value || '';
            renderArchiveList(data, searchValue);
          });
        }
      });
    }
    
    if (archiveDateReset) {
      archiveDateReset.addEventListener('click', async () => {
        if (archiveDateFrom) archiveDateFrom.value = '';
        if (archiveDateTo) archiveDateTo.value = '';
        const data = await fetchArchiveData();
        const searchValue = document.getElementById('archiveSearch')?.value || '';
        renderArchiveList(data, searchValue);
      });
    }
  }

  function renderArchiveList(items, filter = '') {
    const filtered = items.filter(item => {
      const search = filter.toLowerCase();
      return (item.mat_name?.toLowerCase() || '').includes(search) ||
            (item.mat_location?.toLowerCase() || '').includes(search) ||
            (item.mat_size?.toLowerCase() || '').includes(search) ||
            (item.shift?.toLowerCase() || '').includes(search);
    });
    
    const totalMats = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    archiveCount.textContent = `${items.length} wpisów (${totalMats} mat)`;
    
    if (filter) {
      archiveFiltered.style.display = 'inline';
      const filteredMats = filtered.reduce((sum, item) => sum + (item.quantity || 0), 0);
      archiveFiltered.textContent = `Znaleziono: ${filtered.length} (${filteredMats} mat)`;
    } else {
      archiveFiltered.style.display = 'none';
    }
    
    if (filtered.length === 0) {
      archiveList.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <div class="empty-state-text">${filter ? 'Nie znaleziono wpisów' : 'Archiwum jest puste'}</div>
        </div>
      `;
      return;
    }
    
    // 🔥 POPRAWKA: Przenosimy deklaracje zmiennych DO WNĘTRZA map()
    // W renderArchiveList, zmień część z duration_hours na:
    archiveList.innerHTML = filtered.map(item => {
      const startDate = new Date(item.started_at);
      const archiveDate = new Date(item.archived_at);
      const deleteDate = new Date(item.delete_at);
      const daysLeft = item.days_until_deletion;

      // ✅ OBLICZ DNI PRANIA (zamiast godzin)
      const diffMs = archiveDate - startDate;
      const durationDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const durationText = durationDays === 1 ? '1 dzień' : `${durationDays} dni`;

      let countdownClass = 'archive-countdown-ok';
      let countdownIcon = '📅';
      if (daysLeft <= 3) {
        countdownClass = 'archive-countdown-warning';
        countdownIcon = '⚠️';
      } else if (daysLeft <= 7) {
        countdownClass = 'archive-countdown-notice';
        countdownIcon = '⏰';
      }

      const totalDays = 14;
      const elapsedDays = totalDays - daysLeft;
      const progressPercent = (elapsedDays / totalDays) * 100;

      let progressColor = 'linear-gradient(90deg, #10b981, #059669)';
      if (daysLeft <= 3) {
        progressColor = 'linear-gradient(90deg, #f87171, #ef4444)';
      } else if (daysLeft <= 7) {
        progressColor = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
      }
      
      return `
        <div class="archive-item">
          <div class="archive-item-header">
            <div class="archive-item-name">
              ${item.mat_name}
              ${item.quantity > 1 ? `<span class="archive-item-qty-badge">×${item.quantity}</span>` : ''}
            </div>
            <div class="archive-item-shift">${item.shift || '-'}</div>
          </div>
          
          <div class="archive-item-details">
            ${item.mat_location ? `<div class="archive-item-detail"><span>📍</span><strong>${item.mat_location}</strong></div>` : ''}
            ${item.mat_size ? `<div class="archive-item-detail"><span>📏</span><span>${item.mat_size}</span></div>` : ''}
            <div class="archive-item-detail"><span>⏱️</span><span>Prane: ${durationText} temu}</span></div>
          </div>
          
          <div class="archive-item-dates">
            <div class="archive-date-info">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>
                <span class="archive-date-label">Rozpoczęto:</span>
                ${startDate.toLocaleDateString('pl-PL')} ${startDate.toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})}
              </span>
            </div>
            <div class="archive-date-info">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="21 8 21 21 3 21 3 8"></polyline>
                <rect x="1" y="3" width="22" height="5"></rect>
              </svg>
              <span>
                <span class="archive-date-label">Zarchiwizowano:</span>
                ${archiveDate.toLocaleDateString('pl-PL')} ${archiveDate.toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})}
              </span>
            </div>
          </div>
          
          <div class="archive-time-progress">
            <div class="archive-time-progress-bar">
              <div class="archive-time-progress-fill" style="width: ${progressPercent}%; background: ${progressColor}"></div>
            </div>
            <div class="archive-time-progress-labels">
              <span class="archive-time-elapsed">${elapsedDays} dni minęło</span>
              <span class="archive-time-left">${daysLeft} dni zostało</span>
            </div>
          </div>

          <div class="archive-countdown ${countdownClass}">
            <span class="archive-countdown-icon">${countdownIcon}</span>
            <span class="archive-countdown-text">
              Automatyczne usunięcie za: <strong>${daysLeft} ${daysLeft === 1 ? 'dzień' : 'dni'}</strong>
              <span class="archive-countdown-date">(${deleteDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })})</span>
            </span>
          </div>
        </div>
      `;
    }).join('');

    updateArchiveStats(items);
  }

  function updateArchiveStats(items) {
    if (items.length === 0) {
      document.getElementById('archiveTotalEntries').textContent = '0';
      document.getElementById('archiveTotalMats').textContent = '0';
      document.getElementById('archiveDateRange').textContent = '-';
      return;
    }
    
    const totalMats = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const dates = items.map(item => new Date(item.archived_at)).sort((a, b) => a - b);
    const oldest = dates[0];
    const newest = dates[dates.length - 1];
    
    document.getElementById('archiveTotalEntries').textContent = items.length;
    document.getElementById('archiveTotalMats').textContent = totalMats;
    
    if (oldest.toDateString() === newest.toDateString()) {
      document.getElementById('archiveDateRange').textContent = oldest.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
    } else {
      document.getElementById('archiveDateRange').textContent = 
        `${oldest.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })} - ${newest.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })}`;
    }
  }

  if (washingSearch) {
    washingSearch.addEventListener('input', (e) => {
      renderWashingList(allWashingItems, e.target.value);
    });
  }

  addToWashingBtn.addEventListener("click", async () => {
    if (!appState.washingMat) {
      showToast("Wybierz matę!", "error");
      return;
    }

    const currentShift = getCurrentShift();
    if (!currentShift) {
      showToast("Można dodawać maty do prania tylko podczas zmian (6-14 i 14-22).", "error");
      return;
    }

    const matDetails = allLogoMats.find(m => m.name === appState.washingMat);
    if (!matDetails) {
      showToast("Nie znaleziono szczegółów maty. Spróbuj odświeżyć listę mat.", "error");
      return;
    }

    const qtyToWash = Number(washingQty.value);

    if (qtyToWash < 1 || qtyToWash > 100) {
      showToast("Ilość musi być od 1 do 100!", "error");
      return;
    }
    
    // 🔥 NOWE: Sprawdź czy washingQty istnieje
    if (!washingQty || isNaN(qtyToWash)) {
      showToast("Błąd odczytu ilości. Odśwież stronę.", "error");
      return;
    }

    try {
      addToWashingBtn.disabled = true;
      addToWashingBtn.textContent = 'Dodawanie...';

      // 🔥 NOWE: Sprawdź czy mata była dodana w ciągu ostatnich 5 minut
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      
      const { data: recentMats, error: fetchError } = await window.supabase
        .from('washing_queue')
        .select('*')
        .eq('mat_name', matDetails.name)
        .eq('shift', currentShift)
        .gte('started_at', fiveMinutesAgo.toISOString())
        .order('started_at', { ascending: false })
        .limit(1);
      
      if (fetchError) throw fetchError;

      // 🔥 Jeśli znaleziono matę w ciągu 5 min - ZWIĘKSZ ILOŚĆ
      if (recentMats && recentMats.length > 0) {
        const existingMat = recentMats[0];
        const newQuantity = existingMat.quantity + qtyToWash;
        
        const { error: updateError } = await window.supabase
          .from('washing_queue')
          .update({ quantity: newQuantity })
          .eq('id', existingMat.id);
        
        if (updateError) throw updateError;
        
        showToast(`✅ Zwiększono ilość! Razem: ${newQuantity} × ${matDetails.name}`);
        
      } else {
        // 🔥 Jeśli NIE znaleziono - DODAJ NOWY WPIS
        const matToAdd = {
          mat_name: matDetails.name,
          mat_location: matDetails.location,
          mat_size: matDetails.size,
          quantity: qtyToWash,
          shift: currentShift
        };
        
        const { error: insertError } = await window.supabase
          .from('washing_queue')
          .insert([matToAdd]);

        if (insertError) throw insertError;

        showToast(`✅ Dodano ${qtyToWash} × ${matDetails.name} do prania!`);
      }
      
      washingMatSelectWrapper.reset('— wybierz matę logo —');
      washingQty.value = 1;
      
      const activeItems = await fetchActiveWashing();
      allWashingItems = activeItems;
      renderWashingList(activeItems, washingSearch?.value || '');
      updateWashingFormState();

    } catch (error) {
      console.error("Błąd dodawania do prania:", error);
      showToast("Błąd zapisu do bazy danych.", "error");
    } finally {
      addToWashingBtn.disabled = false;
      addToWashingBtn.textContent = 'Wrzuć do prania';
    }
  });

  activeWashingList.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    const washingItem = e.target.closest('[data-washing-id]');
    
    if (!washingItem || !action) return;
    
    const washingId = washingItem.dataset.washingId;
    
    try {
      const { data, error } = await window.supabase
        .from('washing_queue')
        .select('*')
        .eq('id', washingId);  // 🔥 USUNIĘTO .single()
      
      if (error) throw error;
      
      // 🔥 NOWE: Sprawdź czy znaleziono dane
      if (!data || data.length === 0) {
        showToast('Nie znaleziono maty w praniu', 'error');
        return;
      }
      
      const item = data[0];  // 🔥 Weź pierwszy element z tablicy
      
      if (action === 'edit-washing') {
        openEditWashingModal(item);  // 🔥 Użyj 'item' zamiast 'data'
      } else if (action === 'delete-washing') {
        openDeleteWashingModal(item);  // 🔥 Użyj 'item'
      }
    } catch (error) {
      console.error('Błąd pobierania danych prania:', error);
      showToast('Błąd pobierania danych: ' + error.message, 'error');
    }
  });

  function openEditWashingModal(item) {
    editingWashingItem = item;
    editWashingMatName.textContent = item.mat_name;
    
    editWashingQtyInput.value = item.quantity;
    editWashingQtyInput.min = 1;
    editWashingQtyInput.max = 100;
    
    openModal(editWashingModal);
  }

  function openDeleteWashingModal(item) {
    deletingWashingItem = item;
    const qtyText = item.quantity > 1 ? ` (${item.quantity} szt.)` : '';
    deleteWashingText.innerHTML = `Czy na pewno usunąć z prania:<br><b>${item.mat_name}${qtyText}</b>?`;
    openModal(deleteWashingModal);
  }

  editWashingQtyDec.addEventListener('click', () => {
    editWashingQtyInput.value = Math.max(1, Number(editWashingQtyInput.value) - 1);
  });

  editWashingQtyInc.addEventListener('click', () => {
    const max = Number(editWashingQtyInput.max);
    editWashingQtyInput.value = Math.min(max, Number(editWashingQtyInput.value) + 1);
  });

  editWashingSave.addEventListener('click', async () => {
    if (!editingWashingItem) return;
    
    const newQty = Number(editWashingQtyInput.value);
    
    if (newQty < 1 || newQty > 100) {
      showToast('Ilość musi być od 1 do 100!', 'error');
      return;
    }

    try {
      const { error: updateError } = await window.supabase
        .from('washing_queue')
        .update({ quantity: newQty })
        .eq('id', editingWashingItem.id);
      
      if (updateError) throw updateError;
      
      showToast('✅ Zaktualizowano ilość!');
      closeModal(editWashingModal);
      
      const activeItems = await fetchActiveWashing();
      allWashingItems = activeItems;
      renderWashingList(activeItems, washingSearch?.value || '');
      updateWashingFormState();
      
    } catch (error) {
      console.error('Błąd aktualizacji:', error);
      showToast('Błąd zapisu do bazy.', 'error');
    }
  });

  deleteWashingConfirm.addEventListener('click', async () => {
    if (!deletingWashingItem) return;
    
    try {
      const { error: deleteError } = await window.supabase
        .from('washing_queue')
        .delete()
        .eq('id', deletingWashingItem.id);
      
      if (deleteError) throw deleteError;
      
      showToast('🗑️ Usunięto z prania!', 'error');
      closeModal(deleteWashingModal);
      
      const activeItems = await fetchActiveWashing();
      allWashingItems = activeItems;
      renderWashingList(activeItems, washingSearch?.value || '');
      updateWashingFormState();
      
    } catch (error) {
      console.error('Błąd usuwania:', error);
      showToast('Błąd usuwania z bazy.', 'error');
    }
  });

  editWashingCancel.addEventListener('click', () => closeModal(editWashingModal));
  deleteWashingCancel.addEventListener('click', () => closeModal(deleteWashingModal));

  // ==================== ARCHIWIZACJA ====================
  
  async function checkAndArchiveOldWashing() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const { data: washingItems, error: fetchError } = await window.supabase
        .from('washing_queue')
        .select('*');
      
      if (fetchError) throw fetchError;
      if (!washingItems || washingItems.length === 0) return;
      
      const itemsToArchive = washingItems.filter(item => {
        const itemDate = new Date(item.started_at);
        const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
        return itemDay < today;
      });
      
      if (itemsToArchive.length === 0) return;
      
      const archiveData = itemsToArchive.map(item => ({
        ...item,
        archived_at: new Date().toISOString()
      }));
      
      const { error: insertError } = await window.supabase
        .from('washing_archive')
        .insert(archiveData);
      
      if (insertError) throw insertError;
      
      const idsToDelete = itemsToArchive.map(item => item.id);
      const { error: deleteError } = await window.supabase
        .from('washing_queue')
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) throw deleteError;
      
      console.log(`✅ Zarchiwizowano ${itemsToArchive.length} starych prań`);
      
    } catch (error) {
      console.error('Błąd archiwizacji:', error);
    }
  }

  async function cleanOldReplacementsArchive() {
    try {
      const now = new Date();
      
      const { data: oldItems, error: fetchError } = await window.supabase
        .from('replacements_archive')
        .select('id, delete_at')
        .lt('delete_at', now.toISOString());
      
      if (fetchError) throw fetchError;
      if (!oldItems || oldItems.length === 0) {
        console.log('ℹ️ Brak starych wpisów do usunięcia z archiwum zamienników');
        return;
      }
      
      const idsToDelete = oldItems.map(item => item.id);
      
      const { error: deleteError } = await window.supabase
        .from('replacements_archive')
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) throw deleteError;
      
      console.log(`✅ Usunięto ${oldItems.length} starych wpisów z archiwum zamienników`);
      
    } catch (error) {
      console.error('❌ Błąd czyszczenia archiwum zamienników:', error);
    }
  }

  // ==================== DRUKOWANIE I EXPORT ARCHIWUM ====================

  const printArchiveBtn = document.getElementById('printArchive');
  const exportArchiveExcelBtn = document.getElementById('exportArchiveExcel');

  if (printArchiveBtn) {
    printArchiveBtn.addEventListener('click', () => {
      if (allArchiveItems.length === 0) {
        showToast("Brak danych w archiwum do wydrukowania.", "error");
        return;
      }
      
      const printDate = new Date().toLocaleDateString('pl-PL', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const totalMats = allArchiveItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const sortedItems = [...allArchiveItems].sort((a, b) => {
        return new Date(b.archived_at) - new Date(a.archived_at);
      });
      
      // Grupuj po dacie archiwizacji
      const groupedByDate = {};
      sortedItems.forEach(item => {
        const archDate = new Date(item.archived_at);
        const dateKey = archDate.toLocaleDateString('pl-PL', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
        if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
        groupedByDate[dateKey].push(item);
      });
      
      let printHTML = `
        <div class="print-header">
          <img src="icons/icon-192.png" alt="Elis Logo">
          <div class="title-block">
            <h1>Raport Archiwum Zamienników</h1>
            <p>Wygenerowano: ${printDate}</p>
          </div>
        </div>
        
        <div class="print-archive-summary">
          <div class="print-summary-row">
            <span class="print-summary-label">Łączna liczba wpisów:</span>
            <span class="print-summary-value">${allArchiveItems.length}</span>
          </div>
          <div class="print-summary-row">
            <span class="print-summary-label">Suma wypranych mat:</span>
            <span class="print-summary-value">${totalMats} szt.</span>
          </div>
        </div>
      `;
      
      // Renderuj grupy po datach
      Object.keys(groupedByDate).forEach(dateKey => {
        const dayItems = groupedByDate[dateKey];
        const dayQty = dayItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
        
        printHTML += `
          <div class="print-archive-date-section">
            <h2 class="print-archive-date-header">
              📅 ${dateKey} 
              <span class="print-archive-date-badge">${dayItems.length} ${dayItems.length === 1 ? 'wpis' : 'wpisów'} (${dayQty} szt.)</span>
            </h2>
            <table class="print-archive-table">
              <thead>
                <tr>
                  <th>Mata</th>
                  <th>Lokalizacja</th>
                  <th>Rozmiar</th>
                  <th>Ilość</th>
                  <th>Zmiana</th>
                  <th>Prane (dni temu)</th>
                </tr>
              </thead>
              <tbody>
        `;
        
        dayItems.forEach(item => {
          // Oblicz dni prania
          const startDate = new Date(item.started_at);
          const archDate = new Date(item.archived_at);
          const diffMs = archDate - startDate;
          const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const daysText = days === 1 ? '1 dzień' : `${days} dni`;
          
          printHTML += `
            <tr>
              <td><strong>${item.mat_name}</strong></td>
              <td>${item.mat_location || '—'}</td>
              <td>${item.mat_size || '—'}</td>
              <td class="text-center"><strong>${item.quantity || 1}</strong></td>
              <td class="text-center">${item.shift || '—'}</td>
              <td class="text-center">${daysText}</td>
            </tr>
          `;
        });
        
        printHTML += `
              </tbody>
            </table>
          </div>
        `;
      });
      
      printHTML += `
        <div class="print-archive-footer">
          <p><strong>Elis ServiceHub</strong> - System Zarządzania Matami</p>
          <p style="margin-top: 8px; font-size: 9pt; color: #6b7280;">
            Raport zawiera kompletną historię prań mat z podziałem na daty archiwizacji
          </p>
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
  }

  // ========== EXPORT ARCHIWUM DO EXCELA ==========
  if (exportArchiveExcelBtn) {
    exportArchiveExcelBtn.addEventListener('click', async () => {
      if (allArchiveItems.length === 0) {
        showToast("Brak danych w archiwum do wyeksportowania.", "error");
        return;
      }
      if (typeof ExcelJS === 'undefined') {
        showToast("Biblioteka Excel nie jest załadowana", "error");
        return;
      }

      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Archiwum Prań', { 
          pageSetup: { 
            paperSize: 9, 
            orientation: 'landscape', 
            fitToPage: true, 
            fitToWidth: 1, 
            fitToHeight: 0 
          } 
        });
        
        workbook.creator = 'Elis ServiceHub';
        workbook.created = new Date();
        workbook.company = 'Elis';
        
        const currentDate = new Date().toLocaleDateString('pl-PL', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        // NAGŁÓWEK
        worksheet.mergeCells('A1:G1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'ELIS - ARCHIWUM PRAŃ MAT';
        titleCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00A9BE' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 40;

        worksheet.mergeCells('A2:G2');
        const dateCell = worksheet.getCell('A2');
        dateCell.value = `Data wygenerowania: ${currentDate}`;
        dateCell.font = { name: 'Calibri', size: 11, italic: true };
        dateCell.alignment = { horizontal: 'center' };
        dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        worksheet.addRow([]);

        // PODSUMOWANIE
        const totalMats = allArchiveItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const summaryRow1 = worksheet.addRow(['PODSUMOWANIE', '', '', '', '', '', '']);
        worksheet.mergeCells(`A${summaryRow1.number}:G${summaryRow1.number}`);
        summaryRow1.getCell(1).font = { name: 'Calibri', size: 13, bold: true };
        summaryRow1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3E9F0' } };
        summaryRow1.height = 28;

        const statsRow1 = worksheet.addRow(['Liczba wpisów:', allArchiveItems.length, '', '', '', '', '']);
        const statsRow2 = worksheet.addRow(['Suma wypranych mat:', totalMats, '', '', '', '', '']);
        
        [statsRow1, statsRow2].forEach(row => {
          row.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
          row.getCell(2).font = { name: 'Calibri', size: 11, color: { argb: 'FF00A9BE' } };
          row.getCell(2).alignment = { horizontal: 'left' };
          row.height = 22;
        });
        
        worksheet.addRow([]);

        // NAGŁÓWKI KOLUMN
        const headerRow = worksheet.addRow([
          'Nazwa maty', 
          'Lokalizacja', 
          'Rozmiar', 
          'Ilość', 
          'Zmiana', 
          'Data archiwizacji',
          'Prane (dni temu)'
        ]);
        
        headerRow.height = 32;
        headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1117' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        headerRow.eachCell((cell) => { 
          cell.border = { 
            top: { style: 'thin', color: { argb: 'FF000000' } }, 
            left: { style: 'thin', color: { argb: 'FF000000' } }, 
            bottom: { style: 'medium', color: { argb: 'FF000000' } }, 
            right: { style: 'thin', color: { argb: 'FF000000' } } 
          }; 
        });

        // DANE
        const sortedItems = [...allArchiveItems].sort((a, b) => {
          return new Date(b.archived_at) - new Date(a.archived_at);
        });

        sortedItems.forEach((item, index) => {
          const archDate = new Date(item.archived_at);
          const archDateStr = archDate.toLocaleDateString('pl-PL', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
          });
          
          // Oblicz dni prania
          const startDate = new Date(item.started_at);
          const diffMs = archDate - startDate;
          const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          
          const row = worksheet.addRow([
            item.mat_name,
            item.mat_location || 'Nie określono',
            item.mat_size || 'Nie określono',
            item.quantity || 1,
            item.shift || '-',
            archDateStr,
            days
          ]);
          
          row.height = 24;
          row.font = { name: 'Calibri', size: 10 };
          
          if (index % 2 === 0) { 
            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }; 
          }
          
          row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
          row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
          row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(4).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF00A9BE' } };
          row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(7).font = { name: 'Calibri', size: 10, bold: true };
          
          row.eachCell((cell) => { 
            cell.border = { 
              top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, 
              left: { style: 'thin', color: { argb: 'FFD1D5DB' } }, 
              bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, 
              right: { style: 'thin', color: { argb: 'FFD1D5DB' } } 
            }; 
          });
        });

        // SZEROKOŚCI KOLUMN
        worksheet.columns = [ 
          { width: 38 }, 
          { width: 25 }, 
          { width: 18 }, 
          { width: 10 }, 
          { width: 15 },
          { width: 18 },
          { width: 18 }
        ];
        
        // STOPKA
        worksheet.addRow([]);
        const footerRow = worksheet.addRow(['Dokument wygenerowany automatycznie przez system Elis ServiceHub', '', '', '', '', '', '']);
        worksheet.mergeCells(`A${footerRow.number}:G${footerRow.number}`);
        footerRow.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF6B7280' } };
        footerRow.getCell(1).alignment = { horizontal: 'center' };

        // ZAPIS I POBIERANIE
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const fileName = `Elis_Archiwum_Pran_${new Date().toISOString().split('T')[0]}.xlsx`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
        
        showToast("✅ Wyeksportowano archiwum do Excel!");
        
      } catch (error) {
        console.error('Błąd eksportu archiwum:', error);
        showToast("Błąd podczas eksportu: " + error.message, "error");
      }
    });
  }

  // ==================== SYSTEM PALET W TRASACH ====================

  let palletRoutes = JSON.parse(localStorage.getItem('palletRoutes') || '{}'); // Zmienione na obiekt!

  function updatePalletDisplay() {
    const palletCountSection = document.getElementById('palletCountSection'); // ← pobiera lokalnie
    const palletCountValue = document.getElementById('palletCountValue'); // ← pobiera lokalnie
  }

  function initPalletSystem() {
    const palletCountDec = document.getElementById('palletCountDec'); // ← pobiera lokalnie
    const palletCountInc = document.getElementById('palletCountInc'); // ← pobiera lokalnie
  }

  function savePalletRoutes() {
    localStorage.setItem('palletRoutes', JSON.stringify(palletRoutes));
  }

  function getPalletsForRoute(route) {
    return palletRoutes[route] || 0;
  }

  function updatePalletDisplay() {
    if (!palletCountSection) return; // 🔥 ZABEZPIECZENIE
    
    if (!appState.route) {
      palletCountSection.style.display = 'none';
      return;
    }
    
    const count = getPalletsForRoute(appState.route);
    if (palletCountValue) palletCountValue.textContent = count;
    palletCountSection.style.display = 'block';
  }

  function changePalletCount(delta) {
    if (!appState.route) return;
    
    const currentCount = getPalletsForRoute(appState.route);
    const newCount = Math.max(0, Math.min(99, currentCount + delta));
    
    if (newCount === 0) {
      delete palletRoutes[appState.route];
    } else {
      palletRoutes[appState.route] = newCount;
    }
    
    savePalletRoutes();
    updatePalletDisplay();
    
    // Toast feedback
    if (newCount === 0) {
      showToast(`📦 Usunięto palety z trasy ${appState.route}`, 'error');
    } else {
      const word = newCount === 1 ? 'paleta' : (newCount < 5 ? 'palety' : 'palet');
      showToast(`📦 Trasa ${appState.route}: ${newCount} ${word}`);
    }
  }

  function initPalletSystem() {
    if (!palletCountDec || !palletCountInc) {
      console.warn('⚠️ Elementy systemu palet nie znalezione');
      return;
    }
    
    palletCountDec.addEventListener('click', () => changePalletCount(-1));
    palletCountInc.addEventListener('click', () => changePalletCount(1));
    
    console.log('✅ System palet zainicjalizowany (inline)');
  }

  /**
   * Zapisuje trasę do archiwum i usuwa z localStorage
   */
  async function archiveRoute(route) {
    try {
      // Pobierz zmiany dla tej trasy
      const routeChanges = changes.filter(c => c.route === route);
      
      if (routeChanges.length === 0) {
        showToast('Brak zmian do zarchiwizowania', 'error');
        return false;
      }
      
      // Pobierz ilość palet
      const palletCount = getPalletsForRoute(route) || 0;
      
      // Przygotuj dane do archiwum
      const archiveData = {
        route: route,
        changes: routeChanges, // JSONB w Supabase
        pallet_count: palletCount
        // archived_at i delete_at ustawia trigger w bazie
      };
      
              // 🔥 WYZERUJ PALETY DLA TEJ TRASY
      if (palletRoutes[route]) {
        delete palletRoutes[route];
        savePalletRoutes();
        console.log(`✅ Wyzerowano palety dla trasy ${route}`);
        
        // 🔥 NOWE: Odśwież licznik palet jeśli to aktualnie wybrana trasa
        if (appState.route === route) {
          updatePalletDisplay();
        }
      }

      console.log('📦 Archiwizuję trasę:', archiveData);
      
      // Zapisz do Supabase
      const { data, error } = await window.supabase
        .from('replacements_archive')
        .insert([archiveData])
        .select();
      
      if (error) throw error;
      
      console.log('✅ Trasa zarchiwizowana:', data);
      
      // 🔥 WYZERUJ PALETY DLA TEJ TRASY
      if (palletRoutes[route]) {
        delete palletRoutes[route];
        savePalletRoutes();
        console.log(`✅ Wyzerowano palety dla trasy ${route}`);
      }
      
      // Usuń trasę z localStorage (changes)
      removeRouteGroup(route);
      
      // Odśwież widok
      renderChanges();
      
      showToast(`📁 Trasa ${route} zarchiwizowana!`, 'success');
      return true;
      
    } catch (error) {
      console.error('❌ Błąd archiwizacji trasy:', error);
      showToast('Błąd archiwizacji: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * Pobiera archiwum zamienników z Supabase
   */
  async function fetchReplacementsArchive(filters = {}) {
    try {
      let query = window.supabase
        .from('replacements_archive')
        .select('*')
        .order('archived_at', { ascending: false });
      
      // Opcjonalne filtry (na przyszłość)
      if (filters.dateFrom) {
        query = query.gte('archived_at', filters.dateFrom + 'T00:00:00');
      }
      if (filters.dateTo) {
        query = query.lte('archived_at', filters.dateTo + 'T23:59:59');
      }
      if (filters.route) {
        query = query.eq('route', filters.route);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.log('ℹ️ Archiwum zamienników puste');
        return [];
      }
      
      // Wzbogać dane o dni do usunięcia
      const enrichedData = data.map(item => {
        const archivedDate = new Date(item.archived_at);
        
        let deleteDate;
        if (item.delete_at) {
          deleteDate = new Date(item.delete_at);
        } else {
          deleteDate = new Date(archivedDate);
          deleteDate.setDate(deleteDate.getDate() + 14);
        }
        
        const now = new Date();
        const diffTime = deleteDate - now;
        const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        
        return {
          ...item,
          delete_at: deleteDate.toISOString(),
          days_until_deletion: daysLeft,
          changes_count: Array.isArray(item.changes) ? item.changes.length : 0
        };
      });
      
      console.log(`✅ Załadowano ${enrichedData.length} tras z archiwum`);
      return enrichedData;
      
    } catch (error) {
      console.error('❌ Błąd pobierania archiwum zamienników:', error);
      
      if (error.message.includes('permission')) {
        showToast('Brak uprawnień do archiwum. Skontaktuj się z administratorem.', 'error');
      } else if (error.message.includes('network')) {
        showToast('Błąd połączenia z bazą danych. Sprawdź internet.', 'error');
      } else {
        showToast('Błąd pobierania archiwum: ' + error.message, 'error');
      }
      
      return [];
    }
  }

  /**
   * Ładuje i renderuje archiwum zamienników
   */
  async function loadReplacementsArchive() {
    const archiveReplacementsList = document.getElementById('archiveReplacementsList');
    const archiveReplacementsSearch = document.getElementById('archiveReplacementsSearch');
    
    if (!archiveReplacementsList) {
      console.warn('⚠️ Element archiveReplacementsList nie znaleziony');
      return;
    }
    
    archiveReplacementsList.innerHTML = '<div class="empty-state"><div class="empty-state-text">Ładowanie archiwum...</div></div>';
    
    const items = await fetchReplacementsArchive();
    allReplacementsArchive = items;
    renderReplacementsArchive(items, '');
    
    // 🔥 NOWE: Sprawdź przypomnienia dla zamienników
    checkReplacementsScheduledReminder();
    
    // 🔥 NOWE: Podepnij przycisk przypomnienia
    const reminderBtn = document.getElementById('setReplacementsReminderBtn');
    if (reminderBtn) {
      // Usuń stare listenery
      const newReminderBtn = reminderBtn.cloneNode(true);
      reminderBtn.parentNode.replaceChild(newReminderBtn, reminderBtn);
      newReminderBtn.addEventListener('click', scheduleReplacementsReminder);
    }

    // 🔥 NOWE: Podłącz przyciski
    const printBtn = document.getElementById('printReplacementsArchive');
    const excelBtn = document.getElementById('exportReplacementsExcel');
    
    if (printBtn) {
      // Usuń stare listenery
      const newPrintBtn = printBtn.cloneNode(true);
      printBtn.parentNode.replaceChild(newPrintBtn, printBtn);
      newPrintBtn.addEventListener('click', printReplacementsArchive);
    }
    
    if (excelBtn) {
      const newExcelBtn = excelBtn.cloneNode(true);
      excelBtn.parentNode.replaceChild(newExcelBtn, excelBtn);
      newExcelBtn.addEventListener('click', exportReplacementsToExcel);
    }

    // Podłącz wyszukiwarkę
    if (archiveReplacementsSearch) {
      // Usuń stare listenery
      const newSearch = archiveReplacementsSearch.cloneNode(true);
      archiveReplacementsSearch.parentNode.replaceChild(newSearch, archiveReplacementsSearch);
      
      newSearch.addEventListener('input', (e) => {
        renderReplacementsArchive(allReplacementsArchive, e.target.value);
      });
    }
  }

  /**
   * Renderuje listę archiwum zamienników
   */
  function renderReplacementsArchive(items, filter = '') {
    const archiveReplacementsList = document.getElementById('archiveReplacementsList');
    const archiveReplacementsTotal = document.getElementById('archiveReplacementsTotal');
    const archiveReplacementsFiltered = document.getElementById('archiveReplacementsFiltered');
    
    if (!archiveReplacementsList) return;
    
    // Filtrowanie
    const filtered = items.filter(item => {
      const search = filter.toLowerCase();
      const routeMatch = item.route?.toLowerCase().includes(search);
      
      // Szukaj w zmianach
      const changesMatch = item.changes?.some(change => {
        if (change.type === 'addition') {
          return change.mat?.toLowerCase().includes(search);
        }
        return change.base?.toLowerCase().includes(search) || 
              change.alt?.toLowerCase().includes(search) ||
              change.alternatives?.some(alt => alt.alt?.toLowerCase().includes(search));
      });
      
      return routeMatch || changesMatch;
    });
    
    // Aktualizuj statystyki
    updateReplacementsArchiveStats(items);
    
    // Licznik
    const totalChanges = items.reduce((sum, item) => sum + (item.changes_count || 0), 0);
    if (archiveReplacementsTotal) {
      archiveReplacementsTotal.textContent = `${items.length} tras (${totalChanges} zmian)`;
    }
    
    if (filter && archiveReplacementsFiltered) {
      archiveReplacementsFiltered.style.display = 'inline';
      const filteredChanges = filtered.reduce((sum, item) => sum + (item.changes_count || 0), 0);
      archiveReplacementsFiltered.textContent = `Znaleziono: ${filtered.length} tras (${filteredChanges} zmian)`;
    } else if (archiveReplacementsFiltered) {
      archiveReplacementsFiltered.style.display = 'none';
    }
    
    // Pusta lista
    if (filtered.length === 0) {
      archiveReplacementsList.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <div class="empty-state-text">${filter ? 'Nie znaleziono tras spełniających kryteria.' : 'Archiwum zamienników jest puste.<br>Wydrukuj trasę, aby ją zarchiwizować.'}</div>
        </div>
      `;
      return;
    }
    
    // Renderuj trasy
    archiveReplacementsList.innerHTML = filtered.map(item => {
      const archiveDate = new Date(item.archived_at);
      const dateStr = archiveDate.toLocaleDateString('pl-PL', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const timeStr = archiveDate.toLocaleTimeString('pl-PL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const daysLeft = item.days_until_deletion;
      let deleteWarning = '';
      
      if (daysLeft <= 3) {
        deleteWarning = `<span style="color: #ef4444; font-weight: 600; margin-left: 12px;">⚠️ Usunięcie za ${daysLeft} ${daysLeft === 1 ? 'dzień' : 'dni'}!</span>`;
      } else if (daysLeft <= 7) {
        deleteWarning = `<span style="color: #f59e0b; font-weight: 600; margin-left: 12px;">⏰ Usunięcie za ${daysLeft} dni</span>`;
      }
      
      // Renderuj zmiany
      const changesHtml = (item.changes || []).map(change => {
        if (change.type === 'addition') {
          return `
            <div class="archive-change-item addition">
              <div class="archive-change-base">
                <span style="color: var(--primary); font-size: 16px;">➕</span>
                <strong>DOŁOŻENIE:</strong> ${change.mat}
                <span class="badge">×${change.qty}</span>
              </div>
            </div>
          `;
        } else if (change.type === 'multi') {
          const altsHtml = change.alternatives.map(alt => 
            `<li>${alt.alt} <span class="badge">×${alt.qty}</span> ${alt.client ? `<span style="color: var(--muted); font-style: italic;">— ${alt.client}</span>` : ''}</li>`
          ).join('');
          
          return `
            <div class="archive-change-item">
              <div class="archive-change-base">
                ${change.base} <span class="badge">×${change.qtyBase}</span>
              </div>
              <ul class="archive-change-alts">${altsHtml}</ul>
            </div>
          `;
        } else {
          // simple
          return `
            <div class="archive-change-item">
              <div class="archive-change-base">
                ${change.base} <span class="badge">×${change.qty}</span>
              </div>
              <ul class="archive-change-alts">
                <li>${change.alt} <span class="badge">×${change.qty}</span> ${change.client ? `<span style="color: var(--muted); font-style: italic;">— ${change.client}</span>` : ''}</li>
              </ul>
            </div>
          `;
        }
      }).join('');
      
      return `
        <div class="archive-route-item">
          <div class="archive-route-header">
            <div class="archive-route-title">Trasa ${item.route}</div>
            <div class="archive-route-meta">
              <div class="archive-route-badge">${item.changes_count} ${item.changes_count === 1 ? 'zmiana' : item.changes_count < 5 ? 'zmiany' : 'zmian'}</div>
              ${item.pallet_count > 0 ? `<div class="archive-route-pallet">📦 ${item.pallet_count} ${item.pallet_count === 1 ? 'paleta' : item.pallet_count < 5 ? 'palety' : 'palet'}</div>` : ''}
            </div>
          </div>
          
          <div class="archive-route-changes">
            ${changesHtml}
          </div>
          
          <div class="archive-route-footer">
            <div class="archive-route-date">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>Zarchiwizowano: ${dateStr} o ${timeStr}</span>
            </div>
            <div>${deleteWarning}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Aktualizuje statystyki archiwum zamienników
   */
  function updateReplacementsArchiveStats(items) {
    const archiveReplacementsCount = document.getElementById('archiveReplacementsCount');
    const archiveReplacementsPallets = document.getElementById('archiveReplacementsPallets');
    const archiveReplacementsChanges = document.getElementById('archiveReplacementsChanges');
    
    if (!archiveReplacementsCount) return;
    
    const totalPallets = items.reduce((sum, item) => sum + (item.pallet_count || 0), 0);
    const totalChanges = items.reduce((sum, item) => sum + (item.changes_count || 0), 0);
    
    archiveReplacementsCount.textContent = items.length;
    archiveReplacementsPallets.textContent = totalPallets;
    archiveReplacementsChanges.textContent = totalChanges;
  }

  // ==================== FUNKCJE POMOCNICZE DLA RAPORTÓW ====================

  /**
   * Zwraca poniedziałek danego tygodnia
   */
  function getMonday(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d;
  }

  /**
   * Zwraca niedzielę danego tygodnia
   */
  function getSunday(monday) {
    const d = new Date(monday);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  /**
   * Grupuje archiwum zamienników po tygodniach
   */
  function groupReplacementsByWeeks(items) {
    const weeks = {};
    
    items.forEach(item => {
      const date = new Date(item.archived_at);
      const monday = getMonday(date);
      const weekKey = monday.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          start: monday,
          end: getSunday(monday),
          items: []
        };
      }
      
      weeks[weekKey].items.push(item);
    });
    
    return weeks;
  }

  /**
   * 🧠 INTELIGENTNA ANALIZA - najczęściej brakująca mata
   * Zwraca JEDNĄ najczęściej brakującą matę (pomija gdy mata została na tej samej)
   */
  function analyzeMostMissingMats(items) {
    const matCounts = {};
    
    items.forEach(item => {
      if (!item.changes || !Array.isArray(item.changes)) return;
      
      item.changes.forEach(change => {
        // Pomijamy dołożenia
        if (change.type === 'addition') return;
        
        const baseMat = change.base;
        
        if (change.type === 'multi') {
          // Tryb zaawansowany/rozdzielenie
          // Liczymy tylko alternatywy RÓŻNE od bazy
          change.alternatives.forEach(alt => {
            if (alt.alt !== baseMat) {
              matCounts[baseMat] = (matCounts[baseMat] || 0) + alt.qty;
            }
          });
        } else {
          // Tryb prosty
          // Liczymy tylko jeśli zamiennik != baza
          if (change.alt !== baseMat) {
            matCounts[baseMat] = (matCounts[baseMat] || 0) + change.qty;
          }
        }
      });
    });
    
    // Znajdź najczęściej brakującą matę
    let topMat = null;
    let maxCount = 0;
    
    Object.entries(matCounts).forEach(([mat, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topMat = mat;
      }
    });
    
    // Zwróć JEDEN obiekt zamiast tablicy
    return topMat ? { mat: topMat, count: maxCount } : null;
  }

  /**
   * 📄 Drukowanie archiwum zamienników z podziałem na tygodnie
   */
  function printReplacementsArchive() {
    if (allReplacementsArchive.length === 0) {
      showToast("Brak danych w archiwum zamienników do wydrukowania.", "error");
      return;
    }
    
    const printDate = new Date().toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // 🧠 Analiza danych
    const mostMissing = analyzeMostMissingMats(allReplacementsArchive);
    const weeks = groupReplacementsByWeeks(allReplacementsArchive);
    const totalPallets = allReplacementsArchive.reduce((sum, item) => sum + (item.pallet_count || 0), 0);
    const totalChanges = allReplacementsArchive.reduce((sum, item) => sum + (item.changes_count || 0), 0);
    
    let printHTML = `
      <div class="print-header">
        <img src="icons/icon-192.png" alt="Elis Logo">
        <div class="title-block">
          <h1>Raport Archiwum Zamienników</h1>
          <p>Wygenerowano: ${printDate}</p>
        </div>
      </div>
      
      <div class="print-archive-summary" style="page-break-after: avoid;">
        <h3 style="margin: 0 0 12px; font-size: 13pt; color: #00a9be; border-bottom: 2px solid #00a9be; padding-bottom: 6px;">
          📊 Kluczowe Statystyki
        </h3>
        
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px;">
          <div class="print-summary-row" style="padding: 8px; background: #f8f9fa; border-radius: 6px; text-align: center;">
            <div style="font-size: 9pt; color: #6b7280; margin-bottom: 4px;">Tras</div>
            <div style="font-size: 18pt; font-weight: 700; color: #00a9be;">${allReplacementsArchive.length}</div>
          </div>
          <div class="print-summary-row" style="padding: 8px; background: #f8f9fa; border-radius: 6px; text-align: center;">
            <div style="font-size: 9pt; color: #6b7280; margin-bottom: 4px;">Zmian</div>
            <div style="font-size: 18pt; font-weight: 700; color: #00a9be;">${totalChanges}</div>
          </div>
          <div class="print-summary-row" style="padding: 8px; background: #f8f9fa; border-radius: 6px; text-align: center;">
            <div style="font-size: 9pt; color: #6b7280; margin-bottom: 4px;">Palet</div>
            <div style="font-size: 18pt; font-weight: 700; color: #00a9be;">${totalPallets}</div>
          </div>
          <div class="print-summary-row" style="padding: 8px; background: #f8f9fa; border-radius: 6px; text-align: center;">
            <div style="font-size: 9pt; color: #6b7280; margin-bottom: 4px;">Tygodni</div>
            <div style="font-size: 18pt; font-weight: 700; color: #00a9be;">${Object.keys(weeks).length}</div>
          </div>
        </div>
    `;

    // 🔥 NAJCZĘŚCIEJ BRAKUJĄCA MATA (kompaktowo)
    if (mostMissing) {
      const label = mostMissing.count === 1 ? 'zamiana' : mostMissing.count < 5 ? 'zamiany' : 'zamian';
      printHTML += `
        <div class="print-missing-mat-card">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 16pt;">⚠️</span>
            <div>
              <div style="font-size: 8pt; color: #92400e; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Najczęściej brakująca:</div>
              <div style="font-size: 11pt; font-weight: 700; color: #1a1a1a; margin-top: 2px;">${mostMissing.mat}</div>
            </div>
          </div>
          <div style="background: #fbbf24; color: white; padding: 6px 12px; border-radius: 6px; font-size: 10pt; font-weight: 700;">
            ${mostMissing.count} ${label}
          </div>
        </div>
        <p class="print-missing-mat-note">* Licznik uwzględnia tylko rzeczywiste zamiany</p>
      `;
    }

    printHTML += `</div>`; // Koniec summary

    // 📅 Podział na tygodnie
    const weekKeys = Object.keys(weeks).sort().reverse(); // Najnowsze na górze
    
    weekKeys.forEach((weekKey, weekIndex) => {
      const week = weeks[weekKey];
      const startStr = week.start.toLocaleDateString('pl-PL', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
      const endStr = week.end.toLocaleDateString('pl-PL', { 
        day: '2-digit', 
        month: 'long',
        year: 'numeric' 
      });
      
      const weekPallets = week.items.reduce((sum, item) => sum + (item.pallet_count || 0), 0);
      const weekChanges = week.items.reduce((sum, item) => sum + (item.changes_count || 0), 0);
      
      printHTML += `
        <div class="print-archive-date-section">
          <h2 class="print-archive-date-header" style="background: linear-gradient(135deg, #00a9be 0%, #008299 100%); color: white; padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <span>📅 Tydzień: ${startStr} – ${endStr}</span>
            <span style="background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 6px; font-size: 11pt;">
              ${week.items.length} ${week.items.length === 1 ? 'trasa' : week.items.length < 5 ? 'trasy' : 'tras'} | ${weekChanges} zmian | ${weekPallets} palet
            </span>
          </h2>
      `;
      
      // Grupuj trasy po dniach tygodnia
      const dayGroups = {};
      week.items.forEach(item => {
        const dayKey = new Date(item.archived_at).toLocaleDateString('pl-PL', { 
          weekday: 'long',
          day: '2-digit',
          month: '2-digit'
        });
        if (!dayGroups[dayKey]) dayGroups[dayKey] = [];
        dayGroups[dayKey].push(item);
      });
      
      // Renderuj dni
      Object.keys(dayGroups).forEach(dayKey => {
        const dayItems = dayGroups[dayKey];
        
        printHTML += `
          <h3 style="font-size: 12pt; margin: 20px 0 12px; color: #00a9be; border-bottom: 2px solid #e3e9f0; padding-bottom: 6px;">
            📆 ${dayKey}
          </h3>
        `;
        
        dayItems.forEach(item => {
          const timeStr = new Date(item.archived_at).toLocaleTimeString('pl-PL', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          printHTML += `
            <div class="print-route-block" style="margin-bottom: 20px; padding: 12px; background: #fafafa; border-left: 4px solid #00a9be; border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="margin: 0; font-size: 11pt; color: #333;">
                  🚚 Trasa ${item.route} <span style="color: #6b7280; font-weight: normal; font-size: 9pt;">(godz. ${timeStr})</span>
                </h4>
                ${item.pallet_count > 0 ? `
                  <span style="background: #10b981; color: white; padding: 4px 10px; border-radius: 6px; font-size: 9pt; font-weight: 600;">
                    📦 ${item.pallet_count} ${item.pallet_count === 1 ? 'paleta' : item.pallet_count < 5 ? 'palety' : 'palet'}
                  </span>
                ` : ''}
              </div>
          `;
          
          // Renderuj zmiany
          (item.changes || []).forEach(change => {
            if (change.type === 'addition') {
              printHTML += `
                <div class="print-change-item print-addition" style="margin-top: 8px;">
                  <div class="base">+ ${change.mat} (×${change.qty})</div>
                </div>
              `;
            } else if (change.type === 'multi') {
              const alts = change.alternatives.map(alt => 
                `<li>${alt.alt} (×${alt.qty})${alt.client ? ` <span class="client">— ${alt.client}</span>` : ''}</li>`
              ).join('');
              printHTML += `
                <div class="print-change-item" style="margin-top: 8px;">
                  <div class="base">${change.base} (×${change.qtyBase})</div>
                  <ul class="multi-alt-list">${alts}</ul>
                </div>
              `;
            } else {
              printHTML += `
                <div class="print-change-item" style="margin-top: 8px;">
                  <div class="base">${change.base} (×${change.qty})</div>
                  <div class="simple-alt">${change.alt} (×${change.qty})${change.client ? ` <span class="client">— ${change.client}</span>` : ''}</div>
                </div>
              `;
            }
          });
          
          printHTML += `</div>`; // Koniec trasy
        });
      });
      
      printHTML += `</div>`; // Koniec tygodnia
    });
    
    printHTML += `
      <div class="print-archive-footer">
        <p><strong>Elis ServiceHub</strong> - System Zarządzania Matami Logo</p>
        <p style="margin-top: 8px; font-size: 9pt; color: #6b7280;">
          Raport zawiera kompletną historię zarchiwizowanych tras z podziałem na tygodnie i dni
        </p>
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
  }

  /**
   * 📊 Excel export archiwum zamienników
   */
  async function exportReplacementsToExcel() {
    if (allReplacementsArchive.length === 0) {
      showToast("Brak danych w archiwum zamienników do wyeksportowania.", "error");
      return;
    }
    if (typeof ExcelJS === 'undefined') {
      showToast("Biblioteka Excel nie jest załadowana", "error");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Archiwum Zamienników', {
        pageSetup: {
          paperSize: 9,
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0
        }
      });
      
      workbook.creator = 'Elis ServiceHub';
      workbook.created = new Date();
      workbook.company = 'Elis';
      
      const currentDate = new Date().toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Analiza
      const mostMissing = analyzeMostMissingMats(allReplacementsArchive);
      const weeks = groupReplacementsByWeeks(allReplacementsArchive);
      const totalPallets = allReplacementsArchive.reduce((sum, item) => sum + (item.pallet_count || 0), 0);
      const totalChanges = allReplacementsArchive.reduce((sum, item) => sum + (item.changes_count || 0), 0);

      // === NAGŁÓWEK ===
      worksheet.mergeCells('A1:G1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'ELIS - RAPORT ARCHIWUM ZAMIENNIKÓW';
      titleCell.font = { name: 'Calibri', size: 22, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00A9BE' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 45;

      worksheet.mergeCells('A2:G2');
      const dateCell = worksheet.getCell('A2');
      dateCell.value = `Wygenerowano: ${currentDate}`;
      dateCell.font = { name: 'Calibri', size: 11, italic: true };
      dateCell.alignment = { horizontal: 'center' };
      dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
      worksheet.addRow([]);

      // === STATYSTYKI ===
      const summaryTitle = worksheet.addRow(['KLUCZOWE STATYSTYKI', '', '', '', '', '', '']);
      worksheet.mergeCells(`A${summaryTitle.number}:G${summaryTitle.number}`);
      summaryTitle.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF00A9BE' } };
      summaryTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3E9F0' } };
      summaryTitle.height = 30;
      summaryTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

      // 🔥 NAPRAWIONE - wartości NIE w merged cells
      const statsRow1 = worksheet.addRow([
        'Łączna liczba tras:', 
        allReplacementsArchive.length, 
        '',
        'Wszystkich zmian:', 
        totalChanges, 
        '', 
        ''
      ]);

      const statsRow2 = worksheet.addRow([
        'Suma palet:', 
        totalPallets, 
        '',
        'Liczba tygodni:', 
        Object.keys(weeks).length, 
        '', 
        ''
      ]);

      [statsRow1, statsRow2].forEach(row => {
        row.height = 26;
        // Etykiety (kolumny A i D)
        [1, 4].forEach(col => {
          row.getCell(col).font = { name: 'Calibri', size: 11, bold: true };
          row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
          row.getCell(col).alignment = { horizontal: 'left', vertical: 'middle' };
        });
        
        // Wartości (kolumny B i E) - BEZ MERGE!
        [2, 5].forEach(col => {
          row.getCell(col).font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF00A9BE' } };
          row.getCell(col).alignment = { horizontal: 'left', vertical: 'middle' };
        });
      });

      worksheet.addRow([]);

      // 🔥 NAJCZĘŚCIEJ BRAKUJĄCA MATA
      if (mostMissing) {
        const label = mostMissing.count === 1 ? 'zamiana' : mostMissing.count < 5 ? 'zamiany' : 'zamian';
        
        const missingRow = worksheet.addRow([
          `⚠️ Najczęściej brakująca: ${mostMissing.mat}`,  // 🔥 POPRAWIONE: Wszystko w jednej komórce
          '', 
          '', 
          `${mostMissing.count} ${label}`,  // 🔥 SKRÓCONE
          '', 
          '', 
          ''
        ]);
        
        worksheet.mergeCells(`A${missingRow.number}:C${missingRow.number}`);  // 🔥 Merge A:C
        worksheet.mergeCells(`D${missingRow.number}:G${missingRow.number}`);
        
        missingRow.height = 28;  // 🔥 Trochę niższy
        
        // 🔥 POPRAWIONE: Ustaw fill dla WSZYSTKICH komórek
        for (let col = 1; col <= 7; col++) {
          const cell = missingRow.getCell(col);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
        
        // Stylowanie głównej komórki (A:C)
        missingRow.getCell(1).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF92400E' } };
        
        // Stylowanie licznika (D:G)
        missingRow.getCell(4).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        missingRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
        missingRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      }

      worksheet.addRow([]);  // 🔥 Pusty wiersz po statystykach

      // === TYGODNIE ===
      const weekKeys = Object.keys(weeks).sort().reverse();
      
      weekKeys.forEach(weekKey => {
        const week = weeks[weekKey];
        const startStr = week.start.toLocaleDateString('pl-PL');
        const endStr = week.end.toLocaleDateString('pl-PL');
        
        const weekTitle = worksheet.addRow([`📅 Tydzień: ${startStr} - ${endStr}`, '', '', '', '', '', '']);
        worksheet.mergeCells(`A${weekTitle.number}:G${weekTitle.number}`);
        weekTitle.getCell(1).font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
        weekTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00A9BE' } };
        weekTitle.height = 32;
        weekTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        
        // Tabela
        const tableHeader = worksheet.addRow(['Trasa', 'Data i czas', '', 'Palety', 'Zmian', 'Szczegóły', '']);
        worksheet.mergeCells(`F${tableHeader.number}:G${tableHeader.number}`);
        tableHeader.height = 26;
        tableHeader.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        tableHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1117' } };
        tableHeader.eachCell(cell => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        
        week.items.forEach((item, idx) => {
          const archDate = new Date(item.archived_at);
          const dateStr = archDate.toLocaleDateString('pl-PL', { 
            weekday: 'short',
            day: '2-digit',
            month: '2-digit'
          });
          const timeStr = archDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
          
          // Podsumowanie zmian
          const changesText = (item.changes || []).map(c => {
            if (c.type === 'addition') return `+ ${c.mat} (×${c.qty})`;
            if (c.type === 'multi') return `${c.base} → ${c.alternatives.length} zamienników`;
            return `${c.base} → ${c.alt}`;
          }).join(' | ');
          
          const row = worksheet.addRow([
            item.route,
            `${dateStr} ${timeStr}`,
            '', // separator
            item.pallet_count || 0,
            item.changes_count || 0,
            changesText,
            ''
          ]);
          worksheet.mergeCells(`F${row.number}:G${row.number}`);
          row.height = 22;
          row.getCell(1).font = { bold: true };
          row.getCell(4).alignment = { horizontal: 'center' };
          row.getCell(5).alignment = { horizontal: 'center' };
          row.getCell(5).font = { bold: true, color: { argb: 'FF00A9BE' } };
          
          if (idx % 2 === 0) {
            row.eachCell(cell => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            });
          }
        });
        
        worksheet.addRow([]);
      });

      // 🔥 POPRAWIONE SZEROKOŚCI (7 kolumn)
      worksheet.columns = [
        { width: 28 },  // A - etykiety/trasa
        { width: 22 },  // B - wartości/data
        { width: 3 },   // C - separator
        { width: 28 },  // D - etykiety/palety
        { width: 20 },  // E - wartości/zmian
        { width: 50 },  // F - szczegóły
        { width: 5 }    // G - separator
      ];

      // STOPKA
      worksheet.addRow([]);
      const footer = worksheet.addRow(['Dokument wygenerowany przez Elis ServiceHub - System Zarządzania Matami Logo', '', '', '', '', '', '']);
      worksheet.mergeCells(`A${footer.number}:G${footer.number}`);
      footer.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF6B7280' } };
      footer.getCell(1).alignment = { horizontal: 'center' };

      // ZAPIS
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `Elis_Archiwum_Zamiennikow_${new Date().toISOString().split('T')[0]}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      
      showToast("✅ Wyeksportowano archiwum zamienników do Excel!");
      
    } catch (error) {
      console.error('Błąd eksportu:', error);
      showToast("Błąd podczas eksportu: " + error.message, "error");
    }
  }

// ==================== INICJALIZACJA ====================
  async function init() {
    const logoMatsPromise = fetchAndCacheLogoMats();
    
    createCustomSelect(routeSelectWrapper, routesByDay, "— wybierz trasę —", "route", true);
    createCustomSelect(baseMatSelectWrapper, mats, "— wybierz matę —", "baseMat");
    createCustomSelect(altMatSelectWrapper, mats, "— wybierz zamiennik —", "altMat");
    createCustomSelect(multiAltSelectWrapper, mats, "— wybierz zamiennik —", "multiAltMat");
    createCustomSelect(editMultiAltSelectWrapper, mats, "— wybierz zamiennik —", "editMultiAltMat");
    createCustomSelect(additionMatSelectWrapper, mats, "— wybierz matę —", "additionMat");
    const distributeMatSelectWrapper = document.getElementById('distributeMatSelectWrapper');
    createCustomSelect(distributeMatSelectWrapper, mats, "— wybierz matę —", "distributeMat");
    createCustomSelect(washingMatSelectWrapper, [], "— wybierz matę logo —", "washingMat");
    
    renderChanges();
    updateFormState();
    
    const logoMatsData = await logoMatsPromise;
    const logoMatNames = logoMatsData.map(m => m.name).filter((v, i, a) => a.indexOf(v) === i).sort();
    washingMatSelectWrapper.updateOptions(logoMatNames);
    
    // 🔥 NOWE: Aktualizuj badge archiwum przy starcie
    updateArchiveBadge();
    
    // 🔥 NOWE: Aktualizuj badge archiwum zamienników przy starcie
    updateReplacementsArchiveBadge();
    setInterval(updateReplacementsArchiveBadge, 5 * 60 * 1000);

    // 🔥 NOWE: Sprawdź przypomnienia
    checkScheduledReminder();
    setInterval(checkScheduledReminder, 60000); // Sprawdzaj co minutę
    
    // 🔥 NOWE: Odświeżaj badge co 5 minut
    setInterval(updateArchiveBadge, 5 * 60 * 1000);
        
    // 🔥 NOWE: Sprawdź przypomnienia dla zamienników
    checkReplacementsScheduledReminder();
    setInterval(checkReplacementsScheduledReminder, 60000); // Sprawdzaj co minutę

    // ==================== REALTIME SUBSCRIPTIONS ====================

    const washingChannel = window.supabase
      .channel('washing-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'washing_queue' 
      }, async (payload) => {
        console.log('✨ Zmiana w kolejce prania!', payload);
        if (currentView === 'washing') {
          const activeItems = await fetchActiveWashing();
          allWashingItems = activeItems;
          renderWashingList(activeItems, washingSearch?.value || '');
          updateWashingFormState();
        }
      })
      .subscribe();

    const matsChannel = window.supabase
      .channel('mats-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'logo_mats' 
      }, async (payload) => {
        console.log('✨ Zmiana w liście mat!', payload);
        allLogoMats = [];
        const newMats = await fetchAndCacheLogoMats();
        
        if (currentView === 'mats') {
          renderMats(newMats, matsSearch.value);
        }
        
        const logoMatNames = newMats.map(m => m.name).filter((v, i, a) => a.indexOf(v) === i).sort();
        washingMatSelectWrapper.updateOptions(logoMatNames);
      })
      .subscribe();

    // 🔥 NOWE: Realtime dla archiwum zamienników
    const replacementsArchiveChannel = window.supabase
      .channel('replacements-archive-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'replacements_archive' 
      }, async (payload) => {
        console.log('✨ Zmiana w archiwum zamienników!', payload);
        if (currentView === 'archive-replacements') {
          const items = await fetchReplacementsArchive();
          allReplacementsArchive = items;
          const searchValue = document.getElementById('archiveReplacementsSearch')?.value || '';
          renderReplacementsArchive(items, searchValue);
        }
      })
      .subscribe();

    // Dodanie Realtime dla inwentaryzacji
    const inventoryChannel = window.supabase
      .channel('inventory-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'inventory_mats' 
      }, (payload) => {
        console.log('✨ Zmiana w inwentaryzacji na żywo!', payload);
        if (payload.eventType === 'UPDATE') {
          const index = allInventoryMats.findIndex(mat => mat.id === payload.new.id);
          if (index !== -1) {
             allInventoryMats[index] = payload.new;
             if (currentView === 'inventory') {
                 const itemEl = inventoryList.querySelector(`[data-inv-id="${payload.new.id}"]`);
                 if (itemEl) {
                     itemEl.className = 'inventory-item mat-item status-' + payload.new.status;
                     const qtyInput = itemEl.querySelector('.inv-qty-val');
                     if (qtyInput) qtyInput.value = payload.new.custom_qty !== null ? payload.new.custom_qty : payload.new.original_qty;
                 }
                 if (typeof updateInventoryStats === 'function') updateInventoryStats();
             }
          }
        } else if (payload.eventType === 'INSERT') {
          allInventoryMats.push(payload.new);
          if (currentView === 'inventory' && typeof updateInventoryStats === 'function') updateInventoryStats();
        }
      })
      .subscribe();

    // Dodanie Realtime dla zgłoszeń
    const reportsChannel = window.supabase
      .channel('reports-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reports' 
      }, async (payload) => {
        console.log('✨ Zmiana w zgłoszeniach!', payload);
        if (currentView === 'reports') {
          await fetchReports();
        }
      })
      .subscribe();

    initPalletSystem();
    navigateTo('home');
  }

  // ==================== ZGŁOSZENIA (LOGIKA JS) ====================
  const REPORT_PER_PAGE = 30;
  let allReports = [];
  let filteredReportsCache = [];
  let currentReportPage = 0;
  let isLoadingMoreReports = false;
  let reportsObserver = null;
  let currentReportTab = 'pending'; // 'pending' | 'resolved'
  let reportCurrentFile = null;
  let currentlyViewedReportId = null;

  const reportsSearch = document.getElementById('reportsSearch');
  const reportsList = document.getElementById('reportsList');
  const reportsPendingCount = document.getElementById('reportsPendingCount');
  const reportsResolvedCount = document.getElementById('reportsResolvedCount');
  const newReportBtn = document.getElementById('newReportBtn');
  const reportsTabs = document.querySelectorAll('.reports-tab');
  const reportsDeleteOldContainer = document.getElementById('reportsDeleteOldContainer');
  const reportsDeleteOldBtn = document.getElementById('reportsDeleteOldBtn');

  const reportsDeleteOldModal = document.getElementById('reportsDeleteOldModal');
  const reportsDeleteOldCancel = document.getElementById('reportsDeleteOldCancel');
  const reportsDeleteOldConfirm = document.getElementById('reportsDeleteOldConfirm');

  const reportFormModal = document.getElementById('reportFormModal');
  const reportDeleteConfirmModal = document.getElementById('reportDeleteConfirmModal');
  const reportDeleteConfirmCancel = document.getElementById('reportDeleteConfirmCancel');
  const reportDeleteConfirmConfirm = document.getElementById('reportDeleteConfirmConfirm');
  const reportFormCancel = document.getElementById('reportFormCancel');
  const reportFormSubmit = document.getElementById('reportFormSubmit');
  
  const reportMatName = document.getElementById('reportMatName');
  const reportDescription = document.getElementById('reportDescription');
  const reportFileInput = document.getElementById('reportFileInput');
  const reportFileBtnCamera = document.getElementById('reportFileBtnCamera');
  const reportFileBtnGallery = document.getElementById('reportFileBtnGallery');
  const reportFilePreview = document.getElementById('reportFilePreview');
  const reportPreviewImg = document.getElementById('reportPreviewImg');
  const reportFileRemove = document.getElementById('reportFileRemove');
  const reportTypeBtns = document.querySelectorAll('.report-type-btn');

  const reportDetailModal = document.getElementById('reportDetailModal');
  const reportDetailBody = document.getElementById('reportDetailBody');
  const reportDetailActions = document.getElementById('reportDetailActions');
  const reportDetailResolved = document.getElementById('reportDetailResolved');
  const reportDetailClose = document.getElementById('reportDetailClose');
  const reportResponseText = document.getElementById('reportResponseText');
  const reportResolveBtn = document.getElementById('reportResolveBtn');
  const quickActionBtns = document.querySelectorAll('.quick-action-btn');

  // Funkcje narzędziowe zgłoszeń
  function getReportTypeLabel(type) {
    if (type === 'damaged') return 'Mata zniszczona';
    if (type === 'over_quantity') return 'Nad stan liczbowy';
    return type;
  }

  function getReportBadgeHtml(type) {
    if (type === 'damaged') {
      return `<div class="report-card-badge report-badge-damaged">Zniszczona</div>`;
    }
    if (type === 'over_quantity') {
      return `<div class="report-card-badge" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25);">Nad stan</div>`;
    }
    return '';
  }

  // Pobieranie zgłoszeń z Supabase
  async function fetchReports() {
    reportsList.innerHTML = `<div class="empty-state"><div class="empty-state-text">Pobieranie zgłoszeń...</div></div>`;
    hideReportsLoadMore();
    try {
      const { data, error } = await window.supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      allReports = data || [];
      renderReports();
    } catch (error) {
      console.error("Błąd pobierania zgłoszeń:", error);
      showToast("Nie udało się pobrać zgłoszeń.", "error");
      reportsList.innerHTML = `<div class="empty-state error"><div class="empty-state-text">Błąd pobierania danych z bazy.</div></div>`;
    }
  }

  // Obliczanie licznika zakładek
  function updateReportsCounts() {
    const pendingCount = allReports.filter(r => r.status === 'pending').length;
    const resolvedCount = allReports.filter(r => r.status === 'resolved').length;
    reportsPendingCount.textContent = pendingCount;
    reportsResolvedCount.textContent = resolvedCount;
  }

  // Renderowanie zgłoszeń z paginacją
  function renderReports(filter = reportsSearch?.value || '') {
    updateReportsCounts();
    
    let filtered = allReports.filter(r => r.status === currentReportTab);
    const search = filter.toLowerCase().trim();
    if (search) {
      filtered = filtered.filter(r => {
        return (r.mat_name?.toLowerCase() || '').includes(search) ||
               (r.description?.toLowerCase() || '').includes(search) ||
               (getReportTypeLabel(r.report_type).toLowerCase()).includes(search);
      });
    }

    filteredReportsCache = filtered;
    currentReportPage = 0;
    isLoadingMoreReports = false;

    if (reportsObserver) {
      reportsObserver.disconnect();
      reportsObserver = null;
    }

    reportsList.innerHTML = '';
    hideReportsLoadMore();

    if (filteredReportsCache.length === 0) {
      const typeText = currentReportTab === 'pending' ? 'oczekujących' : 'sprawdzonych';
      reportsList.innerHTML = `<div class="empty-state"><div class="empty-state-text">Brak ${typeText} zgłoszeń.</div></div>`;
      return;
    }

    renderReportsChunk();

    if (filteredReportsCache.length > REPORT_PER_PAGE) {
      setTimeout(() => setupReportsObserver(), 100);
    }
  }

  function renderReportsChunk() {
    const start = currentReportPage * REPORT_PER_PAGE;
    const end = start + REPORT_PER_PAGE;
    const reportsToRender = filteredReportsCache.slice(start, end);

    if (reportsToRender.length === 0) {
      hideReportsLoadMore();
      return;
    }

    const fragment = document.createDocumentFragment();

    reportsToRender.forEach(report => {
      const div = document.createElement('div');
      div.className = 'report-card';
      div.dataset.reportId = report.id;

      const dateStr = new Date(report.created_at).toLocaleString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      const attachmentHtml = report.attachment_url ? 
        `<div class="report-card-attachment">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          Tak
        </div>` : '';

      const resolvedStr = report.status === 'resolved' ? 
        `<span><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#00d26a" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Rozwiązano</span>` : '';

      div.innerHTML = `
        <div class="report-card-header">
          <div class="report-card-title">${escapeHtml(report.mat_name)}</div>
          ${getReportBadgeHtml(report.report_type)}
        </div>
        <div class="report-card-meta">
          <span>📅 ${dateStr}</span>
          ${attachmentHtml}
          ${resolvedStr}
        </div>
        ${report.description ? `<div class="report-card-desc">${escapeHtml(report.description)}</div>` : ''}
      `;
      fragment.appendChild(div);
    });

    reportsList.appendChild(fragment);

    if (end < filteredReportsCache.length) {
      showReportsLoadMore();
    } else {
      hideReportsLoadMore();
    }
  }

  function setupReportsObserver() {
    const sentinel = document.getElementById('reportsLoadMoreSentinel');
    if (!sentinel) return;

    if (reportsObserver) {
      reportsObserver.disconnect();
    }

    reportsObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !isLoadingMoreReports) {
          loadMoreReports();
        }
      });
    }, {
      root: null,
      rootMargin: '300px',
      threshold: 0
    });
    reportsObserver.observe(sentinel);
  }

  function loadMoreReports() {
    const nextStart = (currentReportPage + 1) * REPORT_PER_PAGE;
    if (nextStart >= filteredReportsCache.length) {
      hideReportsLoadMore();
      return;
    }
    isLoadingMoreReports = true;
    requestAnimationFrame(() => {
      currentReportPage++;
      renderReportsChunk();
      setTimeout(() => { isLoadingMoreReports = false; }, 50);
    });
  }

  function showReportsLoadMore() {
    const sentinel = document.getElementById('reportsLoadMoreSentinel');
    if (sentinel) sentinel.style.display = 'flex';
  }

  function hideReportsLoadMore() {
    const sentinel = document.getElementById('reportsLoadMoreSentinel');
    if (sentinel) sentinel.style.display = 'none';
  }

  // Zakładki i wyszukiwanie
  reportsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      reportsTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentReportTab = tab.dataset.tab;
      
      if (currentReportTab === 'resolved') {
        reportsDeleteOldContainer.style.display = 'flex';
      } else {
        reportsDeleteOldContainer.style.display = 'none';
      }
      
      renderReports();
    });
  });

  reportsSearch?.addEventListener('input', (e) => {
    renderReports(e.target.value);
  });

  // Usuwanie starych zgłoszeń (> 24h)
  reportsDeleteOldBtn?.addEventListener('click', () => {
    openModal(reportsDeleteOldModal);
  });

  reportsDeleteOldCancel?.addEventListener('click', () => {
    closeModal(reportsDeleteOldModal);
  });

  let selectedReportType = 'over_quantity';

  reportsDeleteOldConfirm?.addEventListener('click', async () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const origText = reportsDeleteOldConfirm.innerText;
    reportsDeleteOldConfirm.innerText = 'Usuwanie...';
    reportsDeleteOldConfirm.disabled = true;
    reportsDeleteOldCancel.disabled = true;
    
    try {
      const { error } = await window.supabase
        .from('reports')
        .delete()
        .eq('status', 'resolved')
        .lt('resolved_at', twentyFourHoursAgo);
        
      if (error) throw error;
      showToast('Usunięto stare zgłoszenia!', 'success');
      closeModal(reportsDeleteOldModal);
      await fetchReports();
    } catch (err) {
      console.error("Błąd usuwania starych zgłoszeń:", err);
      showToast("Nie udało się usunąć starych zgłoszeń.", "error");
    } finally {
      reportsDeleteOldConfirm.innerText = origText;
      reportsDeleteOldConfirm.disabled = false;
      reportsDeleteOldCancel.disabled = false;
    }
  });

  // Nowe zgłoszenie - obsługa UI
  newReportBtn?.addEventListener('click', () => {
    reportMatName.value = '';
    reportDescription.value = '';
    reportCurrentFile = null;
    reportFileInput.value = '';
    reportFilePreview.style.display = 'none';
    reportPreviewImg.src = '';
    
    reportTypeBtns.forEach(b => b.classList.remove('active'));
    document.querySelector('.report-type-btn[data-type="over_quantity"]')?.classList.add('active');

    openModal(reportFormModal);
  });

  reportFormCancel?.addEventListener('click', () => closeModal(reportFormModal));

  reportTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      reportTypeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Upload plików API HTML
  reportFileBtnCamera?.addEventListener('click', () => {
    reportFileInput.setAttribute('capture', 'environment');
    reportFileInput.click();
  });

  reportFileBtnGallery?.addEventListener('click', () => {
    reportFileInput.removeAttribute('capture');
    reportFileInput.click();
  });

  reportFileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      reportCurrentFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        reportPreviewImg.src = e.target.result;
        reportFilePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });

  reportFileRemove?.addEventListener('click', () => {
    reportCurrentFile = null;
    reportFileInput.value = '';
    reportFilePreview.style.display = 'none';
    reportPreviewImg.src = '';
  });

  function generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async function uploadReportImage(file) {
    if (!file) return null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${generateUuid()}.${fileExt}`;

      const { data, error } = await window.supabase.storage
        .from('report-attachments')
        .upload(fileName, file);

      if (error) throw error;
      
      const { data: publicData } = window.supabase.storage
        .from('report-attachments')
        .getPublicUrl(fileName);

      return publicData.publicUrl;
    } catch (err) {
      console.error("Błąd uploadu załącznika:", err);
      showToast("Nie udało się zgrać zdjęcia. Zgłoszenie bez zdjęcia.", "error");
      return null;
    }
  }

  // Zapis do bazy
  reportFormSubmit?.addEventListener('click', async () => {
    const matName = reportMatName.value.trim();
    if (!matName) {
      showToast("Wpisz nazwę maty!", "error");
      return;
    }

    const typeBtn = document.querySelector('.report-type-btn.active');
    const reportType = typeBtn ? typeBtn.dataset.type : 'over_quantity';
    const description = reportDescription.value.trim();
    
    // Blokada guzika
    const origText = reportFormSubmit.innerText;
    reportFormSubmit.innerText = 'Wysyłanie...';
    reportFormSubmit.disabled = true;

    try {
      let attachmentUrl = null;
      if (reportCurrentFile) {
        attachmentUrl = await uploadReportImage(reportCurrentFile);
      }

      const { error } = await window.supabase
        .from('reports')
        .insert([{
          mat_name: matName,
          report_type: reportType,
          description: description || null,
          attachment_url: attachmentUrl,
          status: 'pending'
        }]);

      if (error) throw error;

      showToast("Zgłoszenie wysłane pomyślnie!", "success");
      closeModal(reportFormModal);
      
      // Realtime samo odświeży listę! Użytkownik zobaczy nowy stan w ułamek sekundy (lub samo przełącza zakładkę).
      if (currentReportTab !== 'pending') {
         document.querySelector('.reports-tab[data-tab="pending"]')?.click();
      }
    } catch (err) {
      console.error("Błąd zapisu zgłoszenia:", err);
      showToast("Błąd przy zapisywaniu zgłoszenia.", "error");
    } finally {
      reportFormSubmit.innerText = origText;
      reportFormSubmit.disabled = false;
    }
  });

  // Szczegóły zgłoszenia
  reportsList?.addEventListener('click', (e) => {
    const card = e.target.closest('.report-card');
    if (!card) return;

    const id = card.dataset.reportId;
    const report = allReports.find(r => r.id === id);
    if (!report) return;

    currentlyViewedReportId = id;

    quickActionBtns.forEach(b => b.classList.remove('selected'));
    reportResponseText.value = '';

    const dateStr = new Date(report.created_at).toLocaleString('pl-PL');
    
    let html = `
      <div class="report-detail-row">
        <span class="report-detail-label">Mata</span>
        <span class="report-detail-value">${escapeHtml(report.mat_name)}</span>
      </div>
      <div class="report-detail-row">
        <span class="report-detail-label">Data zgłoszenia</span>
        <span class="report-detail-value" style="font-weight: 500;">${dateStr}</span>
      </div>
      <div class="report-detail-row" style="border-bottom: none; padding-bottom: 0;">
        <span class="report-detail-label">Typ zgłoszenia</span>
      </div>
      <div style="margin-bottom: 8px;">${getReportBadgeHtml(report.report_type)}</div>
    `;

    if (report.description) {
      html += `
        <div class="report-detail-label" style="margin-top: 8px; margin-bottom: 4px;">Opis dodatkowy</div>
        <div class="report-detail-desc">${escapeHtml(report.description)}</div>
      `;
    }

    if (report.attachment_url) {
      html += `
        <div class="report-detail-label" style="margin-top: 12px; margin-bottom: 4px;">Załączone zdjęcie</div>
        <div class="report-detail-image">
          <img src="${report.attachment_url}" alt="Załącznik">
        </div>
      `;
    }

    reportDetailBody.innerHTML = html;

    if (report.status === 'resolved') {
      reportDetailActions.style.display = 'none';
      reportDetailResolved.style.display = 'block';
      const resDate = report.resolved_at ? new Date(report.resolved_at).toLocaleString('pl-PL') : '';
      let actionLabel = report.response_type;
      if (actionLabel === 'repair') actionLabel = '🔧 Naprawa maty';
      if (actionLabel === 'utilize') actionLabel = '🗑️ Utylizacja maty';
      if (actionLabel === 'replace_set') actionLabel = '🔄 Wymiana kompletu';
      if (actionLabel === 'over_quantity_ok') actionLabel = '✅ Nad stan (Akceptacja)';
      if (actionLabel === 'custom') actionLabel = 'Własna odpowiedź';

      reportDetailResolved.innerHTML = `
        <h4>Wykonana akcja: ${actionLabel}</h4>
        ${report.response_text ? `<p><strong>Notatka:</strong> ${escapeHtml(report.response_text)}</p>` : ''}
        <p style="font-size: 0.8rem; margin-top: 8px; color: var(--muted);">Sprawdzono: ${resDate}</p>
      `;
      // Przywracam pokazanie jak jest RESOLVED
      document.getElementById('reportDetailDelete').style.display = 'block';
    } else {
      reportDetailActions.style.display = 'block';
      reportDetailResolved.style.display = 'none';
      reportResolveBtn.disabled = true;
      // Wymuszam ukrycie jak jest PENDING
      document.getElementById('reportDetailDelete').style.display = 'none';
    }

    openModal(reportDetailModal);
  });

  reportDetailClose?.addEventListener('click', () => {
    closeModal(reportDetailModal);
  });

  const reportDetailDelete = document.getElementById('reportDetailDelete');
  
  // Customowa funkcja usuwania zgłoszenia z dodatkowym modalem
  reportDetailDelete?.addEventListener('click', () => {
    openModal(reportDeleteConfirmModal);
  });

  reportDeleteConfirmCancel?.addEventListener('click', () => {
    closeModal(reportDeleteConfirmModal);
  });

  reportDeleteConfirmConfirm?.addEventListener('click', async () => {
    if (!currentlyViewedReportId) return;
    
    const origText = reportDeleteConfirmConfirm.innerText;
    reportDeleteConfirmConfirm.innerText = 'Usuwanie...';
    reportDeleteConfirmConfirm.disabled = true;

    try {
      const { error } = await window.supabase
        .from('reports')
        .delete()
        .eq('id', currentlyViewedReportId);

      if (error) throw error;
      
      showToast('Zgłoszenie trwale usunięte!', 'success');
      closeModal(reportDeleteConfirmModal);
      closeModal(reportDetailModal); // zamknięcie głównego modala również
      await fetchReports();
    } catch (err) {
      console.error("Błąd usuwania zgłoszenia", err);
      showToast('Nie udało się usunąć zgłoszenia.', 'error');
    } finally {
      reportDeleteConfirmConfirm.innerText = origText;
      reportDeleteConfirmConfirm.disabled = false;
    }
  });

  // Obsługa przycisków
  quickActionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('selected')) {
        btn.classList.remove('selected');
      } else {
        quickActionBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      }
      checkResolveBtnState();
    });
  });

  reportResponseText?.addEventListener('input', () => {
    checkResolveBtnState();
  });

  function checkResolveBtnState() {
    const hasQuickAction = document.querySelector('.quick-action-btn.selected');
    const hasText = reportResponseText.value.trim().length > 0;
    reportResolveBtn.disabled = !(hasQuickAction || hasText);
  }

  reportResolveBtn?.addEventListener('click', async () => {
    if (!currentlyViewedReportId) return;

    const quickBtn = document.querySelector('.quick-action-btn.selected');
    const responseType = quickBtn ? quickBtn.dataset.action : 'custom';
    const responseText = reportResponseText.value.trim();

    const origText = reportResolveBtn.innerText;
    reportResolveBtn.innerText = 'Zapisywanie...';
    reportResolveBtn.disabled = true;

    try {
      const { error } = await window.supabase
        .from('reports')
        .update({
          status: 'resolved',
          response_type: responseType,
          response_text: responseText || null,
          resolved_at: new Date().toISOString()
        })
        .eq('id', currentlyViewedReportId);

      if (error) throw error;

      showToast("Zgłoszenie rozwiązane!", "success");
      closeModal(reportDetailModal);
    } catch (err) {
      console.error("Błąd oznaczania zgłoszenia:", err);
      showToast("Nie udało się rozwiązać zgłoszenia.", "error");
    } finally {
      reportResolveBtn.innerText = origText;
      reportResolveBtn.disabled = false;
    }
  });

  init();

});
