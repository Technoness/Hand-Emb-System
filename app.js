// ====================================================================
// CraftFlow - Hand Embroidery Production & Inventory SaaS
// Main Application Controller & View Renderer
// Multi-Line Inward/Outward Challans & Strict (Style + Category) Mapping
// ====================================================================

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  initTheme();
  initNavigation();
  initMasterInventoryView();
  initReceivingLogView();
  initDispatchLogView();
  initFinalStyleView();
  initContractorsView();
  initPaymentSheetView();
  initNeonSyncView();
  initModalHandlers();
  initPaymentModalHandlers();
  initUserManagementHandlers();
  initAuthSystem();

  // If a valid session exists, apply permissions and render
  const currentUser = window.db.getCurrentUser();
  if (currentUser) {
    applyUserPermissions(currentUser);
    renderAll();
    checkNeonStatus();
    startLiveNeonConnection();
  }
}

// -------------------------------------------------------------
// Global Toast System
// -------------------------------------------------------------
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let icon = `✓`;
  if (type === "error") icon = `✕`;
  if (type === "info") icon = `ℹ`;

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// -------------------------------------------------------------
// Theme Management (Dark / Light)
// -------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem("hand_emb_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);

  const toggleBtn = document.getElementById("btn-theme-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("hand_emb_theme", next);
      updateThemeIcon(next);
      showToast(`Switched to ${next} theme`, "info");
    });
  }
}

function updateThemeIcon(theme) {
  const icon = document.getElementById("theme-icon");
  if (!icon) return;
  if (theme === "dark") {
    icon.innerHTML = `
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    `;
  } else {
    icon.innerHTML = `
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    `;
  }
}

// -------------------------------------------------------------
// Navigation Tabs
// -------------------------------------------------------------
function initNavigation() {
  const tabBtns = document.querySelectorAll(".nav-tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      switchTab(targetTab);
    });
  });

  const neonPill = document.getElementById("neon-quick-status");
  if (neonPill) {
    neonPill.addEventListener("click", () => switchTab("neon-sync"));
  }
}

function switchTab(tabId) {
  const permKey = tabId.replace(/-/g, '_');
  if (!window.db.canUserAccessTab(permKey)) {
    showToast("Access Restricted: You do not have permission to view this tab.", "error");
    return;
  }

  document.querySelectorAll(".nav-tab-btn").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-tab") === tabId);
  });

  document.querySelectorAll(".tab-view").forEach(view => {
    view.classList.remove("active");
  });

  const activeView = document.getElementById(`${tabId}-view`);
  if (activeView) {
    activeView.classList.add("active");
  }

  // Refresh relevant views on switch
  if (tabId === "master-inventory") renderMasterInventory();
  if (tabId === "receiving-log") renderReceivingLog();
  if (tabId === "dispatch-log") renderDispatchLog();
  if (tabId === "final-style") renderFinalStyleSheet();
  if (tabId === "contractors") renderContractorsView();
  if (tabId === "payment-sheet") renderPaymentSheet();
}

// -------------------------------------------------------------
// Master Render Orchestrator
// -------------------------------------------------------------
function renderAll() {
  renderKPIs();
  renderMasterInventory();
  renderReceivingLog();
  renderDispatchLog();
  renderFinalStyleSheet();
  renderContractorsView();
  renderPaymentSheet();
  populateDropdowns();
}

// -------------------------------------------------------------
// KPI Summary Calculations
// -------------------------------------------------------------
function renderKPIs() {
  const master = window.db.getMasterInventory();
  const recLogs = window.db.getReceivingLogs();
  const disLogs = window.db.getDispatchLogs();

  let totalCut = 0;
  let totalReceived = 0;
  let totalDispatched = 0;
  let totalBalHemb = 0;
  let totalBalStock = 0;

  master.forEach(item => {
    totalCut += item.cut_qty;
    totalReceived += item.received_qty;
    totalDispatched += item.dispatch_from_hemb;
    totalBalHemb += item.balance_from_hemb;
    totalBalStock += item.balance_from_stock;
  });

  document.getElementById("kpi-total-cut").textContent = totalCut.toLocaleString();
  document.getElementById("kpi-total-received").textContent = totalReceived.toLocaleString();
  document.getElementById("kpi-total-dispatched").textContent = totalDispatched.toLocaleString();
  document.getElementById("kpi-total-balance-hemb").textContent = totalBalHemb.toLocaleString();
  document.getElementById("kpi-total-balance-stock").textContent = totalBalStock.toLocaleString();

  // Navigation Badges
  const badgeMaster = document.getElementById("badge-master-count");
  if (badgeMaster) badgeMaster.textContent = master.length;

  const badgeRec = document.getElementById("badge-rec-count");
  if (badgeRec) badgeRec.textContent = recLogs.length;

  const badgeDis = document.getElementById("badge-dis-count");
  if (badgeDis) badgeDis.textContent = disLogs.length;

  const badgeFinal = document.getElementById("badge-final-count");
  if (badgeFinal) badgeFinal.textContent = window.db.getFinalStyles().length;

  const badgePayment = document.getElementById("badge-payment-count");
  if (badgePayment) badgePayment.textContent = window.db.getPaymentSheets().length;
}

// -------------------------------------------------------------
// TAB 1: MASTER INVENTORY TABLE (Aggregated per Style + Category)
// -------------------------------------------------------------
function initMasterInventoryView() {
  const searchInput = document.getElementById("master-search-input");
  const contractorFilter = document.getElementById("filter-contractor");
  const categoryFilter = document.getElementById("filter-category");
  const balanceFilter = document.getElementById("filter-balance-status");

  [searchInput, contractorFilter, categoryFilter, balanceFilter].forEach(el => {
    if (el) el.addEventListener("input", () => renderMasterInventory());
  });

  document.getElementById("btn-export-master-csv")?.addEventListener("click", exportMasterInventoryToCSV);
  
  // Navigation buttons inside toolbar
  document.getElementById("btn-goto-receiving")?.addEventListener("click", () => switchTab("receiving-log"));
  document.getElementById("btn-goto-dispatch")?.addEventListener("click", () => switchTab("dispatch-log"));

  // Quick Open Modal
  document.getElementById("btn-quick-receiving")?.addEventListener("click", () => {
    openMasterEntryModal(null, "receiving");
  });

  document.getElementById("btn-quick-dispatch")?.addEventListener("click", () => {
    openMasterEntryModal(null, "dispatch");
  });

  document.getElementById("btn-open-new-entry")?.addEventListener("click", () => {
    openMasterEntryModal(null, "receiving");
  });

  // Clear all data (Locally and on Neon)
  document.getElementById("btn-clear-all")?.addEventListener("click", async () => {
    if (confirm("Are you sure you want to clear all data? This will wipe the local cache AND truncate Neon cloud database tables so both stay completely in sync.")) {
      await window.db.clearAllData(true);
      renderAll();
      showToast("All data cleared from local cache and Neon Cloud database!", "info");
      syncLiveFromNeon(true);
    }
  });
}

function renderMasterInventory() {
  const tbody = document.getElementById("tbody-master-inventory");
  if (!tbody) return;

  const canEdit = window.db.canUserPerformAction("can_edit");
  const canDelete = window.db.canUserPerformAction("can_delete");
  const canCreate = window.db.canUserPerformAction("can_create");

  const searchQuery = (document.getElementById("master-search-input")?.value || "").toLowerCase().trim();
  const selectedContractor = document.getElementById("filter-contractor")?.value || "";
  const selectedCategory = document.getElementById("filter-category")?.value || "";
  const selectedBalance = document.getElementById("filter-balance-status")?.value || "";

  let list = window.db.getMasterInventory();

  // Filter
  list = list.filter(item => {
    const codeMatch = (item.style_code || "").toLowerCase().includes(searchQuery);
    const catMatch = (item.category || "").toLowerCase().includes(searchQuery);
    const contMatch = (item.contractor_name || "").toLowerCase().includes(searchQuery);
    const challanRecMatch = (item.challan_rec || "").toLowerCase().includes(searchQuery);
    const challanDisMatch = (item.challan_dis || "").toLowerCase().includes(searchQuery);
    const queryPassed = !searchQuery || codeMatch || catMatch || contMatch || challanRecMatch || challanDisMatch;

    const contractorPassed = !selectedContractor || (item.contractor_name || "").toLowerCase() === selectedContractor.toLowerCase();
    const categoryPassed = !selectedCategory || (item.category || "").toLowerCase() === selectedCategory.toLowerCase();

    let balancePassed = true;
    if (selectedBalance === "pending_hemb") balancePassed = item.balance_from_hemb > 0;
    if (selectedBalance === "pending_stock") balancePassed = item.balance_from_stock > 0;
    if (selectedBalance === "completed") balancePassed = item.balance_from_hemb === 0 && item.balance_from_stock === 0;

    return queryPassed && contractorPassed && categoryPassed && balancePassed;
  });

  if (list.length === 0) {
    const isFiltered = !!(searchQuery || selectedContractor || selectedCategory || selectedBalance);
    tbody.innerHTML = `
      <tr>
        <td colspan="16" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
          <div style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.35rem;">
            ${isFiltered ? "No matching styles or categories found" : "No styles in Master Inventory yet"}
          </div>
          <p style="font-size: 0.85rem; margin-bottom: 1rem;">
            ${isFiltered ? "Try clearing search or filter selections." : "Ready for fresh entries! Click '+ New Style Entry' to record your styles, cut pieces & challans."}
          </p>
          ${!isFiltered && canCreate ? `<button class="btn btn-primary btn-sm" onclick="openMasterEntryModal(null, 'receiving')">📥 + Record Receiving</button>` : ""}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(item => {
    const balStockClass = item.balance_from_stock > 0 ? "balance-highlight-pink" : "balance-zero-green";
    const balHembClass = item.balance_from_hemb > 0 ? "balance-highlight-pink" : "balance-zero-green";
    const totalBalClass = item.total_balance > 0 ? "balance-highlight-pink" : "balance-zero-green";

    return `
      <tr>
        <td style="text-align: center; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono);">${item.sr_no || item.id}</td>
        <td>
          <span class="style-code-badge">${escapeHtml(item.style_code)}</span>
        </td>
        <td class="cell-ship">${escapeHtml(item.ship || '-')}</td>
        <td><span class="badge-tag inline">${escapeHtml(item.category)}</span></td>
        <td style="font-weight: 700; font-family: var(--font-mono);">${item.cut_qty.toLocaleString()}</td>
        
        <!-- Receiving Summary -->
        <td class="cell-rec-qty">${item.received_qty.toLocaleString()}</td>
        <td class="${balStockClass}">${item.balance_from_stock.toLocaleString()}</td>
        <td style="font-size: 0.775rem; color: var(--text-muted);">${escapeHtml(item.date_receive || '-')}</td>
        <td style="font-family: var(--font-mono); font-size: 0.775rem;">${escapeHtml(item.challan_rec || '-')}</td>
        
        <!-- Dispatch Summary -->
        <td class="cell-dis-qty">${item.dispatch_from_hemb.toLocaleString()}</td>
        <td class="${balHembClass}">${item.balance_from_hemb.toLocaleString()}</td>
        <td class="${totalBalClass}">${item.total_balance.toLocaleString()}</td>
        <td style="font-size: 0.775rem; color: var(--text-muted);">${escapeHtml(item.date_dispatch || '-')}</td>
        <td style="font-family: var(--font-mono); font-size: 0.775rem;">${escapeHtml(item.challan_dis || '-')}</td>
        <td>
          <span class="contractor-tag">
            <span class="avatar-dot"></span>
            ${escapeHtml(item.contractor_name || 'Unassigned')}
          </span>
        </td>
        
        <td style="text-align: center;">
          <div style="display: flex; gap: 0.35rem; justify-content: center; align-items: center;">
            ${canEdit ? `<button class="btn btn-secondary btn-sm" onclick="editMasterEntry(${item.id})" title="Edit style entry">Edit</button>` : ''}
            ${canDelete ? `<button class="btn btn-secondary btn-sm" style="color: var(--accent-rose);" onclick="deleteMasterEntry(${item.id})" title="Delete entry">✕</button>` : ''}
            ${!canEdit && !canDelete ? `<span style="color: var(--text-faint); font-size: 0.75rem;">View Only</span>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// -------------------------------------------------------------
// TAB 2: INWARD RECEIVING LOG VIEW (Discrete Challan Lines)
// -------------------------------------------------------------
function initReceivingLogView() {
  const searchInput = document.getElementById("rec-search-input");
  const catFilter = document.getElementById("filter-rec-category");
  const contFilter = document.getElementById("filter-rec-contractor");

  [searchInput, catFilter, contFilter].forEach(el => {
    if (el) el.addEventListener("input", () => renderReceivingLog());
  });

  document.getElementById("btn-open-rec-modal")?.addEventListener("click", () => {
    openMasterEntryModal(null, "receiving");
  });

  document.getElementById("btn-export-rec-csv")?.addEventListener("click", exportReceivingLogToCSV);
}

function renderReceivingLog() {
  const tbody = document.getElementById("tbody-receiving-log");
  const tfoot = document.getElementById("tfoot-receiving-log");
  if (!tbody) return;

  const canEdit = window.db.canUserPerformAction("can_edit");
  const canDelete = window.db.canUserPerformAction("can_delete");

  const searchQuery = (document.getElementById("rec-search-input")?.value || "").toLowerCase().trim();
  const selectedCat = document.getElementById("filter-rec-category")?.value || "";
  const selectedCont = document.getElementById("filter-rec-contractor")?.value || "";

  let list = window.db.getReceivingLogs();

  // Filter
  list = list.filter(item => {
    const codeMatch = (item.style_code || "").toLowerCase().includes(searchQuery);
    const catMatch = (item.category || "").toLowerCase().includes(searchQuery);
    const challanMatch = (item.challan_rec || "").toLowerCase().includes(searchQuery);
    const contMatch = (item.contractor_name || "").toLowerCase().includes(searchQuery);
    const remarksMatch = (item.remarks || "").toLowerCase().includes(searchQuery);
    const queryPassed = !searchQuery || codeMatch || catMatch || challanMatch || contMatch || remarksMatch;

    const catPassed = !selectedCat || (item.category || "").toLowerCase() === selectedCat.toLowerCase();
    const contPassed = !selectedCont || (item.contractor_name || "").toLowerCase() === selectedCont.toLowerCase();

    return queryPassed && catPassed && contPassed;
  });

  // KPIs
  const allLogs = window.db.getReceivingLogs();
  const totalPieces = allLogs.reduce((acc, r) => acc + (parseInt(r.received_qty, 10) || 0), 0);
  const distinctVarieties = new Set(allLogs.map(r => `${r.style_code}:::${r.category}`)).size;

  const elEntries = document.getElementById("rec-kpi-entries");
  if (elEntries) elEntries.textContent = allLogs.length.toLocaleString();
  const elPieces = document.getElementById("rec-kpi-pieces");
  if (elPieces) elPieces.textContent = totalPieces.toLocaleString();
  const elDistinct = document.getElementById("rec-kpi-distinct");
  if (elDistinct) elDistinct.textContent = distinctVarieties.toLocaleString();
  const elBadge = document.getElementById("rec-kpi-count-badge");
  if (elBadge) elBadge.textContent = `${allLogs.length} Challans`;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          No receiving challan entries found. Click <strong>"📥 + New Receiving Entry"</strong> to record incoming goods from cutting.
        </td>
      </tr>
    `;
    if (tfoot) tfoot.innerHTML = "";
    return;
  }

  let sumCut = 0;
  let sumRec = 0;

  tbody.innerHTML = list.map((item) => {
    sumCut += (item.cut_qty || 0);
    sumRec += (item.received_qty || 0);

    return `
      <tr>
        <td style="text-align: center; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono);">${item.sr_no || item.id}</td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(item.date_receive || '-')}</td>
        <td class="cell-challan-rec">${escapeHtml(item.challan_rec || '-')}</td>
        <td><span class="style-code-badge">${escapeHtml(item.style_code)}</span></td>
        <td><span class="badge-tag inline">${escapeHtml(item.category)}</span></td>
        <td>
          <span class="contractor-tag">
            <span class="avatar-dot"></span>
            ${escapeHtml(item.contractor_name || '-')}
          </span>
        </td>
        <td style="text-align: right; font-family: var(--font-mono); font-weight: 600;">${(item.cut_qty || 0).toLocaleString()}</td>
        <td class="cell-rec-qty">${(item.received_qty || 0).toLocaleString()}</td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(item.remarks || '-')}</td>
        <td style="text-align: center; white-space: nowrap;">
          ${canEdit ? `<button class="btn btn-secondary btn-sm" style="color: var(--primary); padding: 2px 8px; margin-right: 4px;" onclick="editReceivingLogEntry(${item.id})" title="Edit receiving challan">✏️ Edit</button>` : ''}
          ${canDelete ? `<button class="btn btn-secondary btn-sm" style="color: var(--accent-rose); padding: 2px 7px;" onclick="deleteReceivingLogEntry(${item.id})" title="Delete receiving challan">✕</button>` : ''}
          ${!canEdit && !canDelete ? `<span style="color: var(--text-faint); font-size: 0.75rem;">View Only</span>` : ''}
        </td>
      </tr>
    `;
  }).join("");

  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: right; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.8rem; padding: 0.85rem 1rem;">Filtered Totals (${list.length} Challans):</td>
        <td style="text-align: right; font-family: var(--font-mono);">${sumCut.toLocaleString()}</td>
        <td class="cell-rec-qty">${sumRec.toLocaleString()}</td>
        <td colspan="2"></td>
      </tr>
    `;
  }
}

function deleteReceivingLogEntry(id) {
  if (!window.db.canUserPerformAction("can_delete")) {
    showToast("Permission Denied: You do not have permission to delete receiving challans.", "error");
    return;
  }
  if (confirm("Delete this receiving challan entry? Master inventory balance will be automatically recalculated.")) {
    window.db.deleteReceivingLog(id);
    renderAll();
    showToast("Receiving challan deleted and balance recalculated.");
  }
}

// -------------------------------------------------------------
// TAB 3: OUTWARD DISPATCH LOG VIEW (Discrete Challan Lines)
// -------------------------------------------------------------
function initDispatchLogView() {
  const searchInput = document.getElementById("dis-search-input");
  const catFilter = document.getElementById("filter-dis-category");
  const contFilter = document.getElementById("filter-dis-contractor");

  [searchInput, catFilter, contFilter].forEach(el => {
    if (el) el.addEventListener("input", () => renderDispatchLog());
  });

  document.getElementById("btn-open-dis-modal")?.addEventListener("click", () => {
    openMasterEntryModal(null, "dispatch");
  });

  document.getElementById("btn-export-dis-csv")?.addEventListener("click", exportDispatchLogToCSV);
}

function renderDispatchLog() {
  const tbody = document.getElementById("tbody-dispatch-log");
  const tfoot = document.getElementById("tfoot-dispatch-log");
  if (!tbody) return;

  const canEdit = window.db.canUserPerformAction("can_edit");
  const canDelete = window.db.canUserPerformAction("can_delete");

  const searchQuery = (document.getElementById("dis-search-input")?.value || "").toLowerCase().trim();
  const selectedCat = document.getElementById("filter-dis-category")?.value || "";
  const selectedCont = document.getElementById("filter-dis-contractor")?.value || "";

  let list = window.db.getDispatchLogs();

  // Filter
  list = list.filter(item => {
    const codeMatch = (item.style_code || "").toLowerCase().includes(searchQuery);
    const catMatch = (item.category || "").toLowerCase().includes(searchQuery);
    const challanMatch = (item.challan_dis || "").toLowerCase().includes(searchQuery);
    const contMatch = (item.contractor_name || "").toLowerCase().includes(searchQuery);
    const remarksMatch = (item.remarks || "").toLowerCase().includes(searchQuery);
    const queryPassed = !searchQuery || codeMatch || catMatch || challanMatch || contMatch || remarksMatch;

    const catPassed = !selectedCat || (item.category || "").toLowerCase() === selectedCat.toLowerCase();
    const contPassed = !selectedCont || (item.contractor_name || "").toLowerCase() === selectedCont.toLowerCase();

    return queryPassed && catPassed && contPassed;
  });

  // KPIs
  const allLogs = window.db.getDispatchLogs();
  const totalPieces = allLogs.reduce((acc, d) => acc + (parseInt(d.dispatch_qty, 10) || 0), 0);
  const distinctVarieties = new Set(allLogs.map(d => `${d.style_code}:::${d.category}`)).size;

  const elEntries = document.getElementById("dis-kpi-entries");
  if (elEntries) elEntries.textContent = allLogs.length.toLocaleString();
  const elPieces = document.getElementById("dis-kpi-pieces");
  if (elPieces) elPieces.textContent = totalPieces.toLocaleString();
  const elDistinct = document.getElementById("dis-kpi-distinct");
  if (elDistinct) elDistinct.textContent = distinctVarieties.toLocaleString();
  const elBadge = document.getElementById("dis-kpi-count-badge");
  if (elBadge) elBadge.textContent = `${allLogs.length} Challans`;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          No dispatch challan entries found. Click <strong>"📤 + New Dispatch Entry"</strong> to record finished embroidery dispatches.
        </td>
      </tr>
    `;
    if (tfoot) tfoot.innerHTML = "";
    return;
  }

  let sumDis = 0;

  tbody.innerHTML = list.map((item) => {
    sumDis += (item.dispatch_qty || 0);

    let remarkBadge = "";
    const rLower = (item.remarks || "").toLowerCase();
    if (rLower.includes("alter")) remarkBadge = `<span class="badge-tag alter">ALTER</span> `;
    else if (rLower.includes("inline")) remarkBadge = `<span class="badge-tag inline">INLINE</span> `;
    else if (rLower.includes("issue") || rLower.includes("m-na")) remarkBadge = `<span class="badge-tag issue">ISSUE</span> `;

    return `
      <tr>
        <td style="text-align: center; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono);">${item.sr_no || item.id}</td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(item.date_dispatch || '-')}</td>
        <td class="cell-challan-dis">${escapeHtml(item.challan_dis || '-')}</td>
        <td><span class="style-code-badge">${escapeHtml(item.style_code)}</span></td>
        <td><span class="badge-tag inline">${escapeHtml(item.category)}</span></td>
        <td>
          <span class="contractor-tag">
            <span class="avatar-dot"></span>
            ${escapeHtml(item.contractor_name || '-')}
          </span>
        </td>
        <td class="cell-dis-qty">${(item.dispatch_qty || 0).toLocaleString()}</td>
        <td style="font-size: 0.8rem;">${remarkBadge}${escapeHtml(item.remarks || '-')}</td>
        <td style="text-align: center; white-space: nowrap;">
          ${canEdit ? `<button class="btn btn-secondary btn-sm" style="color: var(--primary); padding: 2px 8px; margin-right: 4px;" onclick="editDispatchLogEntry(${item.id})" title="Edit dispatch challan">✏️ Edit</button>` : ''}
          ${canDelete ? `<button class="btn btn-secondary btn-sm" style="color: var(--accent-rose); padding: 2px 7px;" onclick="deleteDispatchLogEntry(${item.id})" title="Delete dispatch challan">✕</button>` : ''}
          ${!canEdit && !canDelete ? `<span style="color: var(--text-faint); font-size: 0.75rem;">View Only</span>` : ''}
        </td>
      </tr>
    `;
  }).join("");

  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: right; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.8rem; padding: 0.85rem 1rem;">Filtered Totals (${list.length} Challans):</td>
        <td class="cell-dis-qty">${sumDis.toLocaleString()}</td>
        <td colspan="2"></td>
      </tr>
    `;
  }
}

function deleteDispatchLogEntry(id) {
  if (!window.db.canUserPerformAction("can_delete")) {
    showToast("Permission Denied: You do not have permission to delete dispatch challans.", "error");
    return;
  }
  if (confirm("Delete this dispatch challan entry? Master inventory balance will be automatically recalculated.")) {
    window.db.deleteDispatchLog(id);
    renderAll();
    showToast("Dispatch challan deleted and balance recalculated.");
  }
}

// -------------------------------------------------------------
// TAB 4: DAILY FINAL STYLE REPORT (Strict Style + Category)
// -------------------------------------------------------------
function initFinalStyleView() {
  const datePicker = document.getElementById("report-date-picker");
  if (datePicker) {
    datePicker.value = window.db.getReportDate();
    updateDateDisplay(datePicker.value);

    datePicker.addEventListener("change", (e) => {
      window.db.setReportDate(e.target.value);
      updateDateDisplay(e.target.value);
    });
  }

  // When Style Code is selected, update available categories
  const quickSelect = document.getElementById("quick-style-select");
  if (quickSelect) {
    quickSelect.addEventListener("change", (e) => {
      const selectedCode = e.target.value;
      if (selectedCode) {
        const categories = window.db.getCategoriesForStyle(selectedCode);
        const catSelect = document.getElementById("quick-category-select");
        if (catSelect && categories.length > 0) {
          catSelect.value = categories[0];
        }
      }
    });
  }

  // Add to daily sheet button
  document.getElementById("btn-add-final-style")?.addEventListener("click", () => {
    const styleSelect = document.getElementById("quick-style-select");
    const catSelect = document.getElementById("quick-category-select");
    const remarksInput = document.getElementById("quick-remarks-input");

    const code = styleSelect?.value?.trim();
    const cat = catSelect?.value?.trim() || "Shirt";
    const remarks = remarksInput?.value?.trim() || "";

    if (!code) {
      showToast("Please select a Style Code first!", "error");
      return;
    }

    window.db.addFinalStyle(code, cat, remarks);
    renderFinalStyleSheet();
    showToast(`Added ${code} (${cat}) to Daily Sheet!`);

    if (remarksInput) remarksInput.value = "";
  });

  // Auto-populate active styles with pending H-Emb balance
  document.getElementById("btn-auto-populate-active")?.addEventListener("click", () => {
    const master = window.db.getMasterInventory();
    const activeStyles = master.filter(m => m.balance_from_hemb > 0);

    if (activeStyles.length === 0) {
      showToast("No active styles with pending H-Emb balance found.", "info");
      return;
    }

    const currentFinal = window.db.getFinalStyles();
    let addedCount = 0;

    activeStyles.forEach(s => {
      // STRICT MATCH on both style_code AND category
      const alreadyInSheet = currentFinal.some(f => 
        f.style_code.toLowerCase() === s.style_code.toLowerCase() && 
        f.category.toLowerCase() === s.category.toLowerCase()
      );
      if (!alreadyInSheet) {
        window.db.addFinalStyle(s.style_code, s.category, s.remarks || "");
        addedCount++;
      }
    });

    renderFinalStyleSheet();
    showToast(`Added ${addedCount} active running styles to today's sheet!`);
  });

  // Print button
  document.getElementById("btn-print-report")?.addEventListener("click", () => {
    window.print();
  });

  // Export report
  document.getElementById("btn-export-final-csv")?.addEventListener("click", exportFinalStylesToCSV);
}

function updateDateDisplay(dateStr) {
  if (!dateStr) return;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = months[parseInt(parts[1], 10) - 1] || parts[1];
    const formatted = `${parts[2]}-${monthName}-${parts[0]}`;
    document.getElementById("report-formatted-date").textContent = formatted;
    document.getElementById("print-date-display").textContent = `Date: ${formatted}`;
  }
}

function setQuickRemark(tag) {
  const input = document.getElementById("quick-remarks-input");
  if (input) {
    input.value = tag;
    input.focus();
  }
}

function renderFinalStyleSheet() {
  const tbody = document.getElementById("tbody-final-styles");
  const tfoot = document.getElementById("tfoot-final-styles");
  if (!tbody) return;

  const canEdit = window.db.canUserPerformAction("can_edit");
  const canDelete = window.db.canUserPerformAction("can_delete");

  const list = window.db.getFinalStyles();

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          No styles added to this sheet yet. Select a Style Code & Category above or click <strong>"Auto-Add Active Styles"</strong>.
        </td>
      </tr>
    `;
    if (tfoot) tfoot.innerHTML = "";
    renderContractorSummarySidebar();
    return;
  }

  let totalCut = 0;
  let totalRec = 0;
  let totalBalStock = 0;
  let totalBalHemb = 0;

  tbody.innerHTML = list.map((item, index) => {
    totalCut += item.cut_qty;
    totalRec += item.received_qty;
    totalBalStock += item.balance_from_stock;
    totalBalHemb += item.balance_from_hemb;

    const balStockClass = item.balance_from_stock > 0 ? "balance-highlight-pink" : "";
    const balHembClass = item.balance_from_hemb > 0 ? "balance-highlight-pink" : "";

    let remarkBadge = "";
    const rLower = (item.time_remarks || "").toLowerCase();
    if (rLower.includes("not available") || rLower.includes("issue") || rLower.includes("m-na")) {
      remarkBadge = `<span class="badge-tag issue" style="margin-right: 4px;">MATERIAL ISSUE</span>`;
    } else if (rLower.includes("inline")) {
      remarkBadge = `<span class="badge-tag inline" style="margin-right: 4px;">INLINE</span>`;
    } else if (rLower.includes("alter")) {
      remarkBadge = `<span class="badge-tag alter" style="margin-right: 4px;">ALTER</span>`;
    }

    return `
      <tr>
        <td style="text-align: center; font-weight: 700; font-family: var(--font-mono); color: var(--text-muted);">${item.s_no || index + 1}</td>
        <td>
          <span class="style-code-badge">${escapeHtml(item.style_code)}</span>
        </td>
        <td><span class="badge-tag inline">${escapeHtml(item.category)}</span></td>
        <td style="font-weight: 600;">
          <span class="contractor-tag">
            <span class="avatar-dot"></span>
            ${escapeHtml(item.contractor_name || '-')}
          </span>
        </td>
        <td style="font-weight: 700; font-family: var(--font-mono); text-align: right;">${item.cut_qty.toLocaleString()}</td>
        <td style="font-weight: 600; font-family: var(--font-mono); text-align: right;">${item.received_qty.toLocaleString()}</td>
        <td class="${balStockClass}" style="text-align: right; font-family: var(--font-mono);">${item.balance_from_stock.toLocaleString()}</td>
        <td class="${balHembClass}" style="text-align: right; font-family: var(--font-mono);">${item.balance_from_hemb.toLocaleString()}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            ${remarkBadge}
            <input 
              type="text" 
              class="inline-remark-input" 
              value="${escapeHtml(item.time_remarks || '')}" 
              placeholder="${canEdit ? 'Click to add remarks/date/time...' : 'Read only'}" 
              ${!canEdit ? 'disabled' : ''}
              onchange="updateFinalStyleRemark(${item.s_no}, this.value)"
            >
          </div>
        </td>
        <td style="text-align: center;">
          ${canDelete ? `
          <button class="btn btn-secondary btn-sm" style="color: var(--accent-rose); padding: 2px 7px;" onclick="removeFinalStyleRow(${item.s_no})" title="Remove from sheet">
            ✕
          </button>` : `<span style="color: var(--text-faint); font-size: 0.75rem;">—</span>`}
        </td>
      </tr>
    `;
  }).join("");

  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: right; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.8rem; padding: 0.85rem 1rem;">Total Styles (${list.length}):</td>
        <td style="text-align: right; font-family: var(--font-mono);">${totalCut.toLocaleString()}</td>
        <td style="text-align: right; font-family: var(--font-mono);">${totalRec.toLocaleString()}</td>
        <td style="text-align: right; font-family: var(--font-mono);">${totalBalStock.toLocaleString()}</td>
        <td style="text-align: right; font-family: var(--font-mono); color: var(--accent-rose);">${totalBalHemb.toLocaleString()}</td>
        <td colspan="2"></td>
      </tr>
    `;
  }

  renderContractorSummarySidebar();
}

function updateFinalStyleRemark(sNo, val) {
  if (!window.db.canUserPerformAction("can_edit")) {
    showToast("Permission Denied: You do not have permission to edit remarks.", "error");
    return;
  }
  window.db.updateFinalStyleRemarks(sNo, val);
}

function removeFinalStyleRow(sNo) {
  if (!window.db.canUserPerformAction("can_delete")) {
    showToast("Permission Denied: You do not have permission to remove rows.", "error");
    return;
  }
  window.db.removeFinalStyle(sNo);
  renderFinalStyleSheet();
  showToast("Style removed from daily sheet.", "info");
}

function renderContractorSummarySidebar() {
  const container = document.getElementById("contractor-summary-list");
  const countBadge = document.getElementById("cont-summary-count");
  if (!container) return;

  const summaries = window.db.getContractorSummaries();
  const activeWithBalance = summaries.filter(c => c.balanceInHemb > 0);

  if (countBadge) {
    countBadge.textContent = `${activeWithBalance.length} Active Conts`;
  }

  if (activeWithBalance.length === 0) {
    container.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 1.5rem;">No contractors with pending embroidery balance.</div>`;
    return;
  }

  container.innerHTML = activeWithBalance.map(c => `
    <div class="summary-item">
      <div>
        <div style="font-weight: 700; font-size: 0.875rem;">${escapeHtml(c.name)}</div>
        <div style="font-size: 0.725rem; color: var(--text-faint);">${c.styleCount} Styles | Cut: ${c.totalCut.toLocaleString()}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 800; font-family: var(--font-mono); color: var(--accent-rose); font-size: 0.95rem;">
          ${c.balanceInHemb.toLocaleString()}
        </div>
        <div style="font-size: 0.7rem; color: var(--text-muted);">Pcs in H-Emb</div>
      </div>
    </div>
  `).join("");
}

// -------------------------------------------------------------
// TAB 5: CONTRACTORS DIRECTORY VIEW
// -------------------------------------------------------------
function initContractorsView() {
  document.getElementById("btn-open-new-contractor")?.addEventListener("click", () => {
    document.getElementById("form-contractor").reset();
    const alertBox = document.getElementById("modal-cont-alert");
    if (alertBox) alertBox.style.display = "none";
    openModal("modal-contractor");
  });

  const form = document.getElementById("form-contractor");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("cont-name")?.value.trim();
      const phone = document.getElementById("cont-phone")?.value.trim();
      const status = document.getElementById("cont-status")?.value || "Active";

      if (!name) {
        showToast("Contractor Name is required!", "error");
        return;
      }

      const saveBtn = form.querySelector("button[type='submit']");
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
      }

      const res = await window.db.addContractorWithNeon({ name, phone, status });

      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Contractor";
      }

      closeModal("modal-contractor");
      form.reset();
      renderAll();

      if (res.neonSynced) {
        showToast(`✓ Contractor "${name}" saved & synced to Neon Cloud!`);
      } else if (res.error) {
        showToast(`Contractor saved locally (Neon: ${res.error})`, "error");
      } else {
        showToast(`Contractor "${name}" saved locally!`);
      }
    });
  }
}

function renderContractorsView() {
  const grid = document.getElementById("contractors-card-grid");
  if (!grid) return;

  const summaries = window.db.getContractorSummaries();

  if (summaries.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No contractors added yet.</div>`;
    return;
  }

  grid.innerHTML = summaries.map(c => `
    <div class="contractor-summary-card">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--primary-glow); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem;">
            ${escapeHtml(c.name.substring(0, 1).toUpperCase())}
          </div>
          <div>
            <h3 style="margin-bottom: 0; padding-bottom: 0; border-bottom: none;">${escapeHtml(c.name)}</h3>
            <span style="font-size: 0.725rem; color: var(--text-faint);">${c.styleCount} Styles Assigned</span>
          </div>
        </div>
        <span class="badge-tag inline">Active</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 1rem; background: var(--bg-card-hover); padding: 0.75rem; border-radius: var(--radius-md);">
        <div>
          <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">In H-Emb (WIP)</div>
          <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-rose); font-family: var(--font-mono);">
            ${c.balanceInHemb.toLocaleString()}
          </div>
        </div>
        <div>
          <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Total Dispatched</div>
          <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-emerald); font-family: var(--font-mono);">
            ${c.totalDispatched.toLocaleString()}
          </div>
        </div>
      </div>

      <div style="margin-top: 1rem; font-size: 0.75rem; color: var(--text-muted);">
        <div>Assigned varieties:</div>
        <div style="margin-top: 0.35rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">
          ${c.styles.slice(0, 6).map(s => `<span class="style-code-badge" style="font-size: 0.7rem;">${escapeHtml(s)}</span>`).join("")}
          ${c.styles.length > 6 ? `<span style="color: var(--text-faint);">+${c.styles.length - 6} more</span>` : ''}
        </div>
      </div>
    </div>
  `).join("");
}

// -------------------------------------------------------------
// TAB 6: NEON POSTGRESQL CLOUD SYNC & SETTINGS
// -------------------------------------------------------------
function initNeonSyncView() {
  const cfg = window.db.getConfig();
  const connInput = document.getElementById("neon-conn-string");
  const endInput = document.getElementById("neon-endpoint-url");
  const keyInput = document.getElementById("neon-api-key");
  const autoSyncChk = document.getElementById("chk-auto-sync");
  const autoSyncBadge = document.getElementById("auto-sync-status-badge");

  function updateAutoSyncUI(isEnabled) {
    if (autoSyncChk) autoSyncChk.checked = isEnabled;
    if (autoSyncBadge) {
      autoSyncBadge.textContent = isEnabled ? "✓ Auto-Sync ON" : "Off";
      autoSyncBadge.className = isEnabled ? "badge-tag inline" : "badge-tag alter";
    }
  }

  if (connInput) connInput.value = cfg.neonConnectionString || "";
  if (endInput) endInput.value = cfg.neonEndpointUrl || "";
  if (keyInput) keyInput.value = cfg.neonApiKey || "";
  
  // Set persistent checkbox state
  const isAuto = window.db.isAutoSyncEnabled();
  updateAutoSyncUI(isAuto);

  if (cfg.lastSyncTime) {
    const el = document.getElementById("last-sync-time");
    if (el) el.textContent = `Last synced: ${new Date(cfg.lastSyncTime).toLocaleString()}`;
  }

  // Toggle password visibility
  document.getElementById("btn-toggle-neon-pw")?.addEventListener("click", () => {
    if (connInput) {
      connInput.type = connInput.type === "password" ? "text" : "password";
    }
  });

  // IMMEDIATE AUTO-SYNC PERSISTENCE
  if (autoSyncChk) {
    autoSyncChk.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      window.db.setAutoSync(isChecked);
      updateAutoSyncUI(isChecked);

      if (isChecked) {
        showToast("✓ Live Auto-Sync enabled and permanently saved!", "success");
        startLiveNeonConnection();
      } else {
        showToast("Auto-sync disabled.", "info");
        startLiveNeonConnection();
      }
    });
  }

  // Save Settings
  document.getElementById("btn-save-neon-cfg")?.addEventListener("click", () => {
    const val = connInput.value.trim();
    if (val.includes("****")) {
      showToast("Notice: In Neon Console, click 'Show password' to copy your real password instead of '****'!", "error");
    }

    const isChecked = autoSyncChk ? autoSyncChk.checked : window.db.isAutoSyncEnabled();
    window.db.saveConfig({
      neonConnectionString: val,
      neonEndpointUrl: endInput.value.trim(),
      neonApiKey: keyInput.value.trim(),
      autoSync: isChecked
    });
    updateAutoSyncUI(isChecked);
    showToast("Neon settings saved!");
    startLiveNeonConnection();
  });

  // Test Connection
  document.getElementById("btn-test-neon")?.addEventListener("click", async () => {
    const resBox = document.getElementById("neon-test-result");
    resBox.style.display = "block";
    resBox.innerHTML = `<span style="color: var(--primary);">Connecting to Neon PostgreSQL...</span>`;

    const res = await window.db.testNeonConnection();
    if (res.success) {
      resBox.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid var(--accent-emerald); padding: 0.75rem; border-radius: var(--radius-md); color: var(--accent-emerald); font-size: 0.85rem;">
          ✓ Successfully connected to Neon PostgreSQL!<br>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${JSON.stringify(res.data)}</span>
        </div>
      `;
      showToast("Neon Connection Verified!");
      checkNeonStatus(true);
      startLiveNeonConnection();
    } else {
      resBox.innerHTML = `
        <div style="background: rgba(244, 63, 94, 0.12); border: 1px solid var(--accent-rose); padding: 0.75rem; border-radius: var(--radius-md); color: var(--accent-rose); font-size: 0.85rem;">
          ✕ Neon Connection Failed: ${escapeHtml(res.error)}
        </div>
      `;
      showToast("Neon Connection Failed", "error");
      checkNeonStatus(false);
    }
  });

  // Initialize Tables
  document.getElementById("btn-init-neon-tables")?.addEventListener("click", async () => {
    try {
      showToast("Initializing tables on Neon...", "info");
      await window.db.initNeonTables();
      showToast("PostgreSQL tables successfully created on Neon!");
      startLiveNeonConnection();
    } catch (err) {
      showToast(`Error initializing tables: ${err.message}`, "error");
    }
  });

  // Push to Neon
  document.getElementById("btn-push-to-neon")?.addEventListener("click", async () => {
    showToast("Pushing data to Neon PostgreSQL...", "info");
    const res = await window.db.syncToNeon();
    if (res.success) {
      showToast(res.message);
      document.getElementById("last-sync-time").textContent = `Last synced: ${new Date().toLocaleString()}`;
    } else {
      showToast(`Push failed: ${res.error}`, "error");
    }
  });

  // Pull from Neon
  document.getElementById("btn-pull-from-neon")?.addEventListener("click", async () => {
    showToast("Pulling data from Neon...", "info");
    await syncLiveFromNeon(false);
  });

  // View Schema Modal
  document.getElementById("btn-view-schema-modal")?.addEventListener("click", () => {
    openSchemaModal();
  });
}

// -------------------------------------------------------------
// REAL-TIME LIVE NEON CONNECTION (Bi-directional Polling & Focus)
// -------------------------------------------------------------
let liveSyncTimer = null;
let isLiveSyncing = false;

function startLiveNeonConnection() {
  const cfg = window.db.getConfig();

  if (liveSyncTimer) {
    clearInterval(liveSyncTimer);
    liveSyncTimer = null;
  }

  // Only start active polling if autoSync is enabled and connection string is configured
  if (!cfg.autoSync || (!cfg.neonConnectionString && !cfg.neonEndpointUrl)) {
    checkNeonStatus();
    return;
  }

  // 1. Initial immediate background sync on startup
  syncLiveFromNeon(true);

  // 2. Continuous real-time polling every 3.5 seconds
  liveSyncTimer = setInterval(() => {
    const currentCfg = window.db.getConfig();
    if (currentCfg.autoSync && (currentCfg.neonConnectionString || currentCfg.neonEndpointUrl)) {
      syncLiveFromNeon(true);
    }
  }, 3500);
}

// 3. Instant sync whenever user switches back to this tab (window focus!)
window.addEventListener("focus", () => {
  const currentCfg = window.db.getConfig();
  if (currentCfg.autoSync && (currentCfg.neonConnectionString || currentCfg.neonEndpointUrl)) {
    syncLiveFromNeon(true);
  }
});

async function syncLiveFromNeon(isBackground = true) {
  if (isLiveSyncing) return;

  // Don't disturb user if they are currently typing in an open modal
  const activeModal = document.querySelector(".modal-backdrop.open");
  if (activeModal && isBackground) return;

  isLiveSyncing = true;
  try {
    const res = await window.db.fetchFromNeon();
    if (res.success) {
      renderAll();

      const dot = document.getElementById("neon-status-dot");
      const label = document.getElementById("neon-status-label");
      if (dot && label) {
        dot.className = "status-dot connected";
        label.textContent = `⚡ Live Connected (${res.count})`;
      }

      const lastSyncEl = document.getElementById("last-sync-time");
      if (lastSyncEl) {
        lastSyncEl.textContent = `Live synced: ${new Date().toLocaleTimeString()}`;
      }

      if (!isBackground) {
        showToast(`✓ Synced from Neon Cloud (${res.count} styles in database)`);
      }
    }
  } catch (err) {
    console.warn("Live sync polling error:", err);
  } finally {
    isLiveSyncing = false;
  }
}

async function checkNeonStatus(forcedOnlineState) {
  const dot = document.getElementById("neon-status-dot");
  const label = document.getElementById("neon-status-label");
  if (!dot || !label) return;

  if (forcedOnlineState === true) {
    dot.className = "status-dot connected";
    label.textContent = "⚡ Neon Online";
    return;
  }

  const cfg = window.db.getConfig();
  if (cfg.autoSync && (cfg.neonConnectionString || cfg.neonEndpointUrl)) {
    dot.className = "status-dot connected";
    label.textContent = `⚡ Live Connected (${window.db.getMasterInventory().length})`;
  } else if (cfg.neonConnectionString || cfg.neonEndpointUrl) {
    dot.className = "status-dot connected";
    label.textContent = "Neon Ready";
  } else {
    dot.className = "status-dot";
    label.textContent = "Neon Local";
  }
}

// -------------------------------------------------------------
// Populating Dynamic Select Elements & Autocomplete Lists
// -------------------------------------------------------------
function populateDropdowns() {
  const contractors = window.db.getContractors();
  const master = window.db.getMasterInventory();

  // Contractor Filters across views
  const filterConts = [
    document.getElementById("filter-contractor"),
    document.getElementById("filter-rec-contractor"),
    document.getElementById("filter-dis-contractor")
  ];

  filterConts.forEach(filterEl => {
    if (filterEl) {
      const cur = filterEl.value;
      filterEl.innerHTML = `<option value="">All Contractors</option>` + 
        contractors.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
      filterEl.value = cur;
    }
  });

  // Datalist in Modal (Contractors)
  const datalistCont = document.getElementById("contractors-datalist");
  if (datalistCont) {
    datalistCont.innerHTML = contractors.map(c => `<option value="${escapeHtml(c.name)}">`).join("");
  }

  // Datalist in Modal (Style Codes)
  const datalistStyles = document.getElementById("styles-master-datalist");
  if (datalistStyles) {
    const uniqueStyles = [...new Set(master.map(m => m.style_code))].filter(Boolean);
    datalistStyles.innerHTML = uniqueStyles.map(code => {
      const categories = window.db.getCategoriesForStyle(code).join(", ");
      const label = categories ? `${code} (${categories})` : code;
      return `<option value="${escapeHtml(code)}">${escapeHtml(label)}</option>`;
    }).join("");
  }

  // Style Code dropdown in Final Style quick add bar
  const quickStyleSelect = document.getElementById("quick-style-select");
  if (quickStyleSelect) {
    const curVal = quickStyleSelect.value;
    const uniqueStyles = [...new Set(master.map(m => m.style_code))].filter(Boolean);
    quickStyleSelect.innerHTML = `<option value="">-- Choose Style Code --</option>` +
      uniqueStyles.map(code => `<option value="${escapeHtml(code)}">${escapeHtml(code)}</option>`).join("");
    quickStyleSelect.value = curVal;
  }
}

// -------------------------------------------------------------
// MODALS LOGIC & LIVE FORM AUTO-FETCH (Strict Style + Category)
// -------------------------------------------------------------
function initModalHandlers() {
  // Mode toggle tabs inside modal (Receiving vs Dispatch vs Both)
  const modeTabs = document.querySelectorAll(".form-toggle-tab");
  modeTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetMode = tab.getAttribute("data-mode");
      setFormMode(targetMode);
    });
  });

  // Live calculation & auto-fetch listeners
  const styleCodeInput = document.getElementById("entry-style-code");
  const categorySelect = document.getElementById("entry-category");
  const cutInput = document.getElementById("entry-cut-qty");
  const recInput = document.getElementById("entry-received-qty");
  const disInput = document.getElementById("entry-dispatch-qty");
  const remarksInput = document.getElementById("entry-remarks");

  // When style code or category changes -> STRICT LIVE FETCH
  if (styleCodeInput) {
    styleCodeInput.addEventListener("input", () => handleLiveStyleFetch());
    styleCodeInput.addEventListener("change", () => handleLiveStyleFetch());
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", () => handleLiveStyleFetch());
  }

  // Live KPI preview calculation as quantities change
  [cutInput, recInput, disInput, remarksInput].forEach(inp => {
    if (inp) {
      inp.addEventListener("input", updateModalPreviewBalances);
    }
  });

  // Master Entry Form Submit
  const form = document.getElementById("form-master-entry");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      saveMasterEntryFromForm();
    });
  }

  // Edit Log Entry Form Submit
  const editLogForm = document.getElementById("form-edit-log-entry");
  if (editLogForm) {
    editLogForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveEditLogFromForm();
    });
  }

  // Live preview for Edit Log Modal
  ["edit-log-style-code", "edit-log-category", "edit-log-qty", "edit-log-cut-qty"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", updateEditLogModalPreview);
    document.getElementById(id)?.addEventListener("change", updateEditLogModalPreview);
  });
}

function setFormMode(mode) {
  const targetMode = (mode === "dispatch") ? "dispatch" : "receiving";
  document.querySelectorAll(".form-toggle-tab").forEach(tab => {
    tab.classList.toggle("active", tab.getAttribute("data-mode") === targetMode);
  });

  const hiddenMode = document.getElementById("current-form-mode");
  if (hiddenMode) hiddenMode.value = targetMode;

  const recSection = document.getElementById("form-section-receiving");
  const disSection = document.getElementById("form-section-dispatch");
  const saveBtn = document.getElementById("btn-save-master-entry");

  if (targetMode === "receiving") {
    if (recSection) recSection.style.display = "block";
    if (disSection) disSection.style.display = "none";
    if (saveBtn) {
      saveBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Save Receiving Challan & Next
      `;
    }
  } else {
    if (recSection) recSection.style.display = "none";
    if (disSection) disSection.style.display = "block";
    if (saveBtn) {
      saveBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Save Dispatch Challan & Next
      `;
    }
  }

  updateModalPreviewBalances();
}

// STRICT Auto-Fetch matching on BOTH Style Code AND Category
function handleLiveStyleFetch() {
  const code = (document.getElementById("entry-style-code")?.value || "").trim();
  const cat = (document.getElementById("entry-category")?.value || "Shirt").trim();
  const badge = document.getElementById("style-fetch-status");

  if (!code) {
    if (badge) badge.style.display = "none";
    updateModalPreviewBalances();
    return;
  }

  // STRICT LOOKUP: requires BOTH code AND category to match!
  const existing = window.db.findMasterByStyleAndCategory(code, cat);

  if (existing) {
    if (badge) {
      badge.style.display = "inline-block";
      badge.className = "badge-tag inline";
      badge.textContent = `✓ Found: ${existing.style_code} [${existing.category}] (Cut: ${existing.cut_qty}, Rec: ${existing.received_qty}, Dis: ${existing.dispatch_from_hemb})`;
    }

    // Auto-fetch master details
    document.getElementById("entry-id").value = existing.id;
    if (existing.sr_no) document.getElementById("entry-sr").value = existing.sr_no;
    if (existing.contractor_name) document.getElementById("entry-contractor").value = existing.contractor_name;
    if (existing.cut_qty) document.getElementById("entry-cut-qty").value = existing.cut_qty;
    if (existing.ship) document.getElementById("entry-ship").value = existing.ship;
    if (existing.remarks) document.getElementById("entry-remarks").value = existing.remarks;
  } else {
    if (badge) {
      badge.style.display = "inline-block";
      badge.className = "badge-tag alter";
      badge.textContent = `+ New Category for Style: ${code} [${cat}] (Ready to add)`;
    }
    // New category - clear ID so it doesn't overwrite another category
    document.getElementById("entry-id").value = "";
  }

  updateModalPreviewBalances();
}

// Update all 6 Live KPIs in the modal reflecting Style Code + Category
function updateModalPreviewBalances() {
  const code = (document.getElementById("entry-style-code")?.value || "").trim();
  const cat = (document.getElementById("entry-category")?.value || "Shirt").trim();
  const existing = window.db.findMasterByStyleAndCategory(code, cat);

  const cut = parseInt(document.getElementById("entry-cut-qty")?.value, 10) || (existing ? existing.cut_qty : 0) || 0;
  const currentMode = document.getElementById("current-form-mode")?.value || "receiving";

  let rec = parseInt(document.getElementById("entry-received-qty")?.value, 10) || 0;
  let dis = parseInt(document.getElementById("entry-dispatch-qty")?.value, 10) || 0;

  if (currentMode === "receiving" && existing) {
    rec = existing.received_qty + rec;
    dis = existing.dispatch_from_hemb;
  } else if (currentMode === "dispatch" && existing) {
    rec = existing.received_qty;
    dis = existing.dispatch_from_hemb + dis;
  } else if (existing) {
    if (!rec) rec = existing.received_qty;
    if (!dis) dis = existing.dispatch_from_hemb;
  }

  const balStock = Math.max(0, cut - rec);
  const balHemb = rec - dis; // True WIP balance
  const balTotal = Math.max(0, cut - dis);

  // 1. Cut
  const elCut = document.getElementById("preview-total-cut");
  if (elCut) elCut.textContent = cut.toLocaleString();

  // 2. Total Received
  const elRec = document.getElementById("preview-total-received");
  if (elRec) elRec.textContent = rec.toLocaleString();

  // 3. Balance From Stock
  const elBalStock = document.getElementById("preview-bal-stock");
  if (elBalStock) {
    if (cut > 0 && rec > cut) {
      elBalStock.style.color = "#f43f5e";
      elBalStock.textContent = `${(cut - rec).toLocaleString()} (EXCESS!)`;
    } else {
      elBalStock.style.color = "var(--accent-amber)";
      elBalStock.textContent = balStock.toLocaleString();
    }
  }

  // 4. Total Dispatched
  const elDis = document.getElementById("preview-total-dispatched");
  if (elDis) elDis.textContent = dis.toLocaleString();

  // 5. Balance in H-Emb
  const elBalHemb = document.getElementById("preview-bal-hemb");
  if (elBalHemb) {
    if (balHemb < 0) {
      elBalHemb.style.color = "#f43f5e";
      elBalHemb.textContent = `${balHemb.toLocaleString()} (OVER-DISPATCH!)`;
      if (elBalHemb.parentElement) elBalHemb.parentElement.style.borderColor = "rgba(244, 63, 94, 0.6)";
    } else {
      elBalHemb.style.color = "var(--accent-pink)";
      elBalHemb.textContent = balHemb.toLocaleString();
      if (elBalHemb.parentElement) elBalHemb.parentElement.style.borderColor = "";
    }
  }

  // 6. Total Pending Balance
  const elBalTotal = document.getElementById("preview-bal-total");
  if (elBalTotal) elBalTotal.textContent = balTotal.toLocaleString();
}

// -------------------------------------------------------------
// Promise-based Warning & Confirmation Dialog (Over-Dispatch / Excess)
// -------------------------------------------------------------
function showWarningConfirmModal({
  title = "Over-Dispatch Warning",
  subtitle = "Quantity exceeds available stock",
  message = "The entered quantity exceeds available balance.",
  details = [],
  urduNote = "Stock say jitna maal aya hay, dispatch ussay zyada ho raha hay. Kya aap waqai is entry ko save karna chahtay hain?",
  confirmText = "✓ Yes, Allow Excess Entry",
  cancelText = "✕ Cancel & Adjust Qty"
}) {
  return new Promise((resolve) => {
    const modal = document.getElementById("modal-confirm-dialog");
    if (!modal) {
      resolve(confirm(`${message}\n\nDo you want to proceed anyway?`));
      return;
    }

    document.getElementById("confirm-dialog-title").textContent = title;
    document.getElementById("confirm-dialog-subtitle").textContent = subtitle;
    document.getElementById("confirm-dialog-message").innerHTML = message;
    document.getElementById("confirm-dialog-urdu-note").textContent = urduNote;

    const detailsBox = document.getElementById("confirm-dialog-details");
    if (detailsBox) {
      detailsBox.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1rem;">
          ${details.map(d => `
            <div>
              <span style="color: var(--text-muted); font-size: 0.75rem;">${d.label}:</span>
              <div style="font-weight: 700; font-family: var(--font-mono); color: ${d.color || 'var(--text-main)'}; font-size: 0.95rem;">
                ${d.value}
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }

    const btnProceed = document.getElementById("confirm-dialog-btn-proceed");
    const btnCancel = document.getElementById("confirm-dialog-btn-cancel");
    const btnX = document.getElementById("confirm-dialog-btn-x");

    btnProceed.textContent = confirmText;
    btnCancel.textContent = cancelText;

    const cleanup = () => {
      btnProceed.removeEventListener("click", onProceed);
      btnCancel.removeEventListener("click", onCancel);
      btnX.removeEventListener("click", onCancel);
      closeModal("modal-confirm-dialog");
    };

    const onProceed = () => {
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    btnProceed.addEventListener("click", onProceed);
    btnCancel.addEventListener("click", onCancel);
    btnX.addEventListener("click", onCancel);

    openModal("modal-confirm-dialog");
  });
}

function openMasterEntryModal(itemToEdit = null, preferredMode = "receiving") {
  if (itemToEdit && !window.db.canUserPerformAction("can_edit")) {
    showToast("Permission Denied: You do not have permission to edit records.", "error");
    return;
  }
  if (!itemToEdit && !window.db.canUserPerformAction("can_create")) {
    showToast("Permission Denied: You do not have permission to create records.", "error");
    return;
  }

  const form = document.getElementById("form-master-entry");
  form.reset();

  const title = document.getElementById("modal-entry-title");
  const idInput = document.getElementById("entry-id");
  const badge = document.getElementById("style-fetch-status");
  if (badge) badge.style.display = "none";

  populateDropdowns();

  if (itemToEdit) {
    title.textContent = `Edit Style Entry (${itemToEdit.style_code} [${itemToEdit.category}])`;
    idInput.value = itemToEdit.id;
    document.getElementById("entry-sr").value = itemToEdit.sr_no || "";
    document.getElementById("entry-style-code").value = itemToEdit.style_code || "";
    document.getElementById("entry-ship").value = itemToEdit.ship || "";
    document.getElementById("entry-category").value = itemToEdit.category || "Shirt";
    document.getElementById("entry-contractor").value = itemToEdit.contractor_name || "";
    document.getElementById("entry-cut-qty").value = itemToEdit.cut_qty || 0;
    document.getElementById("entry-received-qty").value = itemToEdit.received_qty || 0;
    document.getElementById("entry-date-receive").value = itemToEdit.date_receive || "";
    document.getElementById("entry-challan-rec").value = itemToEdit.challan_rec || "";
    document.getElementById("entry-dispatch-qty").value = itemToEdit.dispatch_from_hemb || 0;
    document.getElementById("entry-date-dispatch").value = itemToEdit.date_dispatch || "";
    document.getElementById("entry-challan-dis").value = itemToEdit.challan_dis || "";
    document.getElementById("entry-remarks").value = itemToEdit.remarks || "";
    setFormMode(preferredMode === "dispatch" ? "dispatch" : "receiving");
  } else {
    title.textContent = "Style Production & Balance Entry";
    idInput.value = "";
    const list = window.db.getMasterInventory();
    const maxSr = list.length > 0 ? Math.max(...list.map(i => parseInt(i.sr_no, 10) || 0)) : 0;
    document.getElementById("entry-sr").value = maxSr + 1;
    document.getElementById("entry-date-receive").value = getCurrentDateShort();
    document.getElementById("entry-date-dispatch").value = getCurrentDateShort();
    setFormMode(preferredMode === "dispatch" ? "dispatch" : "receiving");
  }

  const alertBox = document.getElementById("modal-form-alert");
  if (alertBox) alertBox.style.display = "none";

  updateModalPreviewBalances();
  openModal("modal-master-entry");
}

function showFormError(msg) {
  const alertBox = document.getElementById("modal-form-alert");
  if (alertBox) {
    alertBox.style.display = "block";
    alertBox.style.background = "rgba(244, 63, 94, 0.15)";
    alertBox.style.border = "1px solid #f43f5e";
    alertBox.style.color = "#fda4af";
    alertBox.innerHTML = msg;
  }
}

function showFormSuccess(msg) {
  const alertBox = document.getElementById("modal-form-alert");
  if (alertBox) {
    alertBox.style.display = "block";
    alertBox.style.background = "rgba(16, 185, 129, 0.15)";
    alertBox.style.border = "1px solid #10b981";
    alertBox.style.color = "#34d399";
    alertBox.innerHTML = `${msg}<br><span style='font-size:0.75rem; opacity:0.85;'>Form cleared. Date preserved. Ready for next entry!</span>`;
  }
}

async function saveMasterEntryFromForm() {
  const currentMode = document.getElementById("current-form-mode")?.value || "receiving";
  const idVal = document.getElementById("entry-id")?.value;

  const styleCode = (document.getElementById("entry-style-code")?.value || "").trim();
  const category = (document.getElementById("entry-category")?.value || "Shirt").trim();
  const contractor = (document.getElementById("entry-contractor")?.value || "").trim();
  const ship = (document.getElementById("entry-ship")?.value || "").trim();
  const cutQty = parseInt(document.getElementById("entry-cut-qty")?.value, 10) || 0;
  const remarks = (document.getElementById("entry-remarks")?.value || "").trim();

  // 1. Validations
  if (!styleCode) {
    showFormError("✕ Error: Please enter a <strong>Style Code</strong>!");
    document.getElementById("entry-style-code")?.focus();
    return;
  }

  if (!contractor) {
    showFormError("✕ Error: Please specify a <strong>Contractor Name</strong>!");
    document.getElementById("entry-contractor")?.focus();
    return;
  }

  const saveBtn = document.getElementById("btn-save-master-entry");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving to Database & Neon...";
  }

  try {
    if (currentMode === "receiving") {
      const recQty = parseInt(document.getElementById("entry-received-qty")?.value, 10) || 0;
      const dateRec = (document.getElementById("entry-date-receive")?.value || "").trim() || getCurrentDateShort();
      const challanRec = (document.getElementById("entry-challan-rec")?.value || "").trim();

      if (recQty <= 0) {
        showFormError("✕ Error: Please enter Received Quantity (greater than 0) for this receiving challan!");
        if (saveBtn) { saveBtn.disabled = false; setFormMode("receiving"); }
        document.getElementById("entry-received-qty")?.focus();
        return;
      }

      // Check excess receiving over cut order
      const existing = window.db.findMasterByStyleAndCategory(styleCode, category);
      const effectiveCut = cutQty || (existing ? existing.cut_qty : 0);
      const alreadyRec = existing ? existing.received_qty : 0;
      if (effectiveCut > 0 && (alreadyRec + recQty) > effectiveCut) {
        const remainingCut = Math.max(0, effectiveCut - alreadyRec);
        const excess = (alreadyRec + recQty) - effectiveCut;
        const confirmed = await showWarningConfirmModal({
          title: "⚠️ Excess Receiving Warning",
          subtitle: `Style: ${styleCode} [${category}]`,
          message: `Stock say aany wala maal Cut Order say zyada hay!<br>You are receiving <strong>${recQty.toLocaleString()} pcs</strong>, which exceeds the remaining Cut Order balance (<strong>${remainingCut.toLocaleString()} pcs</strong>) by <strong style="color: #f43f5e;">+${excess.toLocaleString()} pcs</strong>!`,
          details: [
            { label: "Style & Category", value: `${styleCode} [${category}]` },
            { label: "Total Cut Order", value: `${effectiveCut.toLocaleString()} pcs` },
            { label: "Already Received", value: `${alreadyRec.toLocaleString()} pcs` },
            { label: "Remaining from Cut", value: `${remainingCut.toLocaleString()} pcs`, color: "#38bdf8" },
            { label: "Entered Receiving", value: `${recQty.toLocaleString()} pcs`, color: "#f59e0b" },
            { label: "Excess over Cut", value: `+${excess.toLocaleString()} pcs`, color: "#f43f5e" }
          ],
          urduNote: `Cutting/Stock say total cut order ${effectiveCut.toLocaleString()} pcs tha aur ${alreadyRec.toLocaleString()} pcs pehle aa chukay hain. Aap ${recQty.toLocaleString()} pcs enter kar rahay hain jo cut order say zyada hay. Kya aap waqai save karna chahtay hain?`,
          confirmText: "✓ Yes, Allow Excess Receiving",
          cancelText: "✕ Cancel & Adjust Qty"
        });

        if (!confirmed) {
          showFormError(`⚠️ Receiving entry cancelled. Remaining cut order is <strong>${remainingCut.toLocaleString()} pcs</strong>.`);
          if (saveBtn) { saveBtn.disabled = false; setFormMode("receiving"); }
          document.getElementById("entry-received-qty")?.focus();
          return;
        }
      }

      const res = await window.db.addReceivingLog({
        style_code: styleCode,
        category: category,
        contractor_name: contractor,
        cut_qty: cutQty,
        received_qty: recQty,
        date_receive: dateRec,
        challan_rec: challanRec,
        ship: ship,
        remarks: remarks
      });

      const syncText = res.neonSynced ? " <span class='badge-tag inline'>☁️ Synced to Neon</span>" : "";
      showFormSuccess(`✓ Receiving Challan #${challanRec || 'Logged'} (${recQty.toLocaleString()} pcs) saved as a new line for <strong>${escapeHtml(styleCode)} [${category}]</strong>! Total received to date: ${res.masterRecord.received_qty.toLocaleString()} pcs.${syncText}`);

    } else if (currentMode === "dispatch") {
      const disQty = parseInt(document.getElementById("entry-dispatch-qty")?.value, 10) || 0;
      const dateDis = (document.getElementById("entry-date-dispatch")?.value || "").trim() || getCurrentDateShort();
      const challanDis = (document.getElementById("entry-challan-dis")?.value || "").trim();

      if (disQty <= 0) {
        showFormError("✕ Error: Please enter Dispatch Quantity (greater than 0) for this dispatch challan!");
        if (saveBtn) { saveBtn.disabled = false; setFormMode("dispatch"); }
        document.getElementById("entry-dispatch-qty")?.focus();
        return;
      }

      // Check available WIP balance in Hand Embroidery
      const existing = window.db.findMasterByStyleAndCategory(styleCode, category);
      const totalRec = existing ? existing.received_qty : 0;
      const alreadyDis = existing ? existing.dispatch_from_hemb : 0;
      const availableHemb = totalRec - alreadyDis;

      if (disQty > availableHemb) {
        const excess = disQty - availableHemb;
        const confirmed = await showWarningConfirmModal({
          title: "⚠️ Over-Dispatch Warning",
          subtitle: `Style: ${styleCode} [${category}]`,
          message: `Stock say Hand-Embroidery may total <strong>${totalRec.toLocaleString()} pcs</strong> ai thay aur pehle say <strong>${alreadyDis.toLocaleString()} pcs</strong> dispatch ho chukay hain.<br><br>Available Balance sirf <strong style="color: #38bdf8;">${Math.max(0, availableHemb).toLocaleString()} pcs</strong> hay, lekin aap <strong>${disQty.toLocaleString()} pcs</strong> dispatch kar rahay hain (<strong style="color: #f43f5e;">+${excess.toLocaleString()} pcs zyada</strong>)!`,
          details: [
            { label: "Style & Category", value: `${styleCode} [${category}]` },
            { label: "Total Received (Stock)", value: `${totalRec.toLocaleString()} pcs` },
            { label: "Already Dispatched", value: `${alreadyDis.toLocaleString()} pcs` },
            { label: "Available in H-Emb", value: `${Math.max(0, availableHemb).toLocaleString()} pcs`, color: "#38bdf8" },
            { label: "Attempted Dispatch", value: `${disQty.toLocaleString()} pcs`, color: "#f59e0b" },
            { label: "Excess / Deficit", value: `+${excess.toLocaleString()} pcs`, color: "#f43f5e" }
          ],
          urduNote: `Stock say jitna maal aya hay (${totalRec.toLocaleString()} pcs), dispatch ussay zyada ho raha hay (${(alreadyDis + disQty).toLocaleString()} pcs). Kya aap waqai is over-dispatch entry ko confirm kar ke save karna chahtay hain?`,
          confirmText: "✓ Yes, Allow Excess Dispatch",
          cancelText: "✕ Cancel & Adjust Qty"
        });

        if (!confirmed) {
          showFormError(`⚠️ Dispatch entry cancelled. Maximum available balance in Hand-Embroidery is <strong>${Math.max(0, availableHemb).toLocaleString()} pcs</strong>.`);
          if (saveBtn) { saveBtn.disabled = false; setFormMode("dispatch"); }
          document.getElementById("entry-dispatch-qty")?.focus();
          return;
        }
      }

      const res = await window.db.addDispatchLog({
        style_code: styleCode,
        category: category,
        contractor_name: contractor,
        dispatch_qty: disQty,
        date_dispatch: dateDis,
        challan_dis: challanDis,
        ship: ship,
        remarks: remarks
      });

      const syncText = res.neonSynced ? " <span class='badge-tag inline'>☁️ Synced to Neon</span>" : "";
      showFormSuccess(`✓ Dispatch Challan #${challanDis || 'Logged'} (${disQty.toLocaleString()} pcs) saved as a new line for <strong>${escapeHtml(styleCode)} [${category}]</strong>! Remaining H-Emb WIP: ${res.masterRecord.balance_from_hemb.toLocaleString()} pcs.${syncText}`);

    } else {
      // Both / Master Full Edit
      const recQty = parseInt(document.getElementById("entry-received-qty")?.value, 10) || 0;
      const disQty = parseInt(document.getElementById("entry-dispatch-qty")?.value, 10) || 0;
      const dateRec = (document.getElementById("entry-date-receive")?.value || "").trim();
      const challanRec = (document.getElementById("entry-challan-rec")?.value || "").trim();
      const dateDis = (document.getElementById("entry-date-dispatch")?.value || "").trim();
      const challanDis = (document.getElementById("entry-challan-dis")?.value || "").trim();

      if (disQty > recQty) {
        const excess = disQty - recQty;
        const confirmed = await showWarningConfirmModal({
          title: "⚠️ Over-Dispatch Warning",
          subtitle: `Style: ${styleCode} [${category}]`,
          message: `Dispatch quantity (<strong>${disQty.toLocaleString()} pcs</strong>) exceeds Received quantity (<strong>${recQty.toLocaleString()} pcs</strong>) by <strong style="color: #f43f5e;">+${excess.toLocaleString()} pcs</strong>!`,
          details: [
            { label: "Style & Category", value: `${styleCode} [${category}]` },
            { label: "Received in H-Emb", value: `${recQty.toLocaleString()} pcs`, color: "#38bdf8" },
            { label: "Dispatch from H-Emb", value: `${disQty.toLocaleString()} pcs`, color: "#f59e0b" },
            { label: "Excess / Deficit", value: `+${excess.toLocaleString()} pcs`, color: "#f43f5e" }
          ],
          urduNote: `Received maal say zyada dispatch enter ho raha hay. Kya aap waqai save karna chahtay hain?`,
          confirmText: "✓ Yes, Allow Excess Dispatch",
          cancelText: "✕ Cancel & Adjust Qty"
        });

        if (!confirmed) {
          showFormError(`⚠️ Master entry cancelled. Dispatch quantity exceeds received quantity.`);
          if (saveBtn) { saveBtn.disabled = false; setFormMode("both"); }
          document.getElementById("entry-dispatch-qty")?.focus();
          return;
        }
      }

      await window.db.saveMasterEntryWithNeon({
        id: idVal ? parseInt(idVal, 10) : undefined,
        style_code: styleCode,
        category: category,
        contractor_name: contractor,
        cut_qty: cutQty,
        received_qty: recQty,
        date_receive: dateRec,
        challan_rec: challanRec,
        dispatch_from_hemb: disQty,
        date_dispatch: dateDis,
        challan_dis: challanDis,
        ship: ship,
        remarks: remarks
      });

      showFormSuccess(`✓ Master Record for <strong>${escapeHtml(styleCode)} [${category}]</strong> saved successfully!`);
    }

  } catch (err) {
    showFormError(`✕ Error saving entry: ${err.message}`);
    if (saveBtn) { saveBtn.disabled = false; setFormMode(currentMode); }
    return;
  }

  if (saveBtn) {
    saveBtn.disabled = false;
    setFormMode(currentMode);
  }

  // Refresh all background tables and navigation badges
  renderAll();

  // PRESERVE DATES
  const preserveDateRec = document.getElementById("entry-date-receive")?.value || getCurrentDateShort();
  const preserveDateDis = document.getElementById("entry-date-dispatch")?.value || getCurrentDateShort();

  // CLEAR FIELDS FOR RAPID SUCCESSIVE ENTRY (Modal stays open!)
  document.getElementById("entry-id").value = "";
  document.getElementById("entry-style-code").value = "";
  document.getElementById("entry-ship").value = "";
  document.getElementById("entry-contractor").value = "";
  document.getElementById("entry-cut-qty").value = "";
  document.getElementById("entry-received-qty").value = 0;
  document.getElementById("entry-dispatch-qty").value = 0;
  document.getElementById("entry-challan-rec").value = "";
  document.getElementById("entry-challan-dis").value = "";
  document.getElementById("entry-remarks").value = "";

  // RESTORE DATES
  if (document.getElementById("entry-date-receive")) document.getElementById("entry-date-receive").value = preserveDateRec;
  if (document.getElementById("entry-date-dispatch")) document.getElementById("entry-date-dispatch").value = preserveDateDis;

  // Next SR Number
  const list = window.db.getMasterInventory();
  const maxSr = list.length > 0 ? Math.max(...list.map(i => parseInt(i.sr_no, 10) || 0)) : 0;
  if (document.getElementById("entry-sr")) document.getElementById("entry-sr").value = maxSr + 1;

  // Reset live badge & KPIs
  const badge = document.getElementById("style-fetch-status");
  if (badge) badge.style.display = "none";
  updateModalPreviewBalances();

  // Focus on Style Code input for fast next entry!
  document.getElementById("entry-style-code")?.focus();
}

function editMasterEntry(id) {
  if (!window.db.canUserPerformAction("can_edit")) {
    showToast("Permission Denied: You do not have permission to edit records.", "error");
    return;
  }
  const item = window.db.getMasterInventory().find(i => i.id === id);
  if (item) {
    openMasterEntryModal(item, "receiving");
  }
}

function deleteMasterEntry(id) {
  if (!window.db.canUserPerformAction("can_delete")) {
    showToast("Permission Denied: You do not have permission to delete records.", "error");
    return;
  }
  const item = window.db.getMasterInventory().find(i => i.id === id);
  if (!item) return;

  if (confirm(`Are you sure you want to delete Style ${item.style_code} [${item.category}]?`)) {
    window.db.deleteMasterInventory(id);
    renderAll();
    showToast(`Style ${item.style_code} [${item.category}] deleted.`);
  }
}

// -------------------------------------------------------------
// EDIT CHALLAN LOG MODAL (Receiving & Dispatch Logs)
// -------------------------------------------------------------
let currentEditingLog = null;

function editReceivingLogEntry(id) {
  if (!window.db.canUserPerformAction("can_edit")) {
    showToast("Permission Denied: You do not have permission to edit receiving challans.", "error");
    return;
  }
  const item = window.db.getReceivingLogs().find(r => r.id === id);
  if (!item) {
    showToast("Receiving challan not found!", "error");
    return;
  }

  currentEditingLog = { type: "receiving", ...item };
  openEditLogModal(currentEditingLog);
}

function editDispatchLogEntry(id) {
  if (!window.db.canUserPerformAction("can_edit")) {
    showToast("Permission Denied: You do not have permission to edit dispatch challans.", "error");
    return;
  }
  const item = window.db.getDispatchLogs().find(d => d.id === id);
  if (!item) {
    showToast("Dispatch challan not found!", "error");
    return;
  }

  currentEditingLog = { type: "dispatch", ...item };
  openEditLogModal(currentEditingLog);
}

function openEditLogModal(entry) {
  populateDropdowns();

  document.getElementById("edit-log-id").value = entry.id;
  document.getElementById("edit-log-type").value = entry.type;

  const titleEl = document.getElementById("edit-log-title");
  const subEl = document.getElementById("edit-log-subtitle");
  const cutGroup = document.getElementById("edit-group-cut-qty");
  const labelQty = document.getElementById("edit-label-qty");
  const alertBox = document.getElementById("modal-edit-alert");
  if (alertBox) alertBox.style.display = "none";

  if (entry.type === "receiving") {
    titleEl.textContent = `✏️ Edit Inward Receiving Challan #${entry.challan_rec || entry.id}`;
    subEl.textContent = "Update incoming goods from cutting/stock & recalculate balances";
    if (cutGroup) cutGroup.style.display = "block";
    if (labelQty) labelQty.textContent = "Received Quantity *:";
    document.getElementById("edit-log-challan").value = entry.challan_rec || "";
    document.getElementById("edit-log-date").value = entry.date_receive || "";
    document.getElementById("edit-log-cut-qty").value = entry.cut_qty || 0;
    document.getElementById("edit-log-qty").value = entry.received_qty || 0;
  } else {
    titleEl.textContent = `✏️ Edit Outward Dispatch Challan #${entry.challan_dis || entry.id}`;
    subEl.textContent = "Update finished embroidery dispatch to unit & recalculate balances";
    if (cutGroup) cutGroup.style.display = "none";
    if (labelQty) labelQty.textContent = "Dispatch Quantity *:";
    document.getElementById("edit-log-challan").value = entry.challan_dis || "";
    document.getElementById("edit-log-date").value = entry.date_dispatch || "";
    document.getElementById("edit-log-cut-qty").value = 0;
    document.getElementById("edit-log-qty").value = entry.dispatch_qty || 0;
  }

  document.getElementById("edit-log-style-code").value = entry.style_code || "";
  document.getElementById("edit-log-category").value = entry.category || "Shirt";
  document.getElementById("edit-log-contractor").value = entry.contractor_name || "";
  document.getElementById("edit-log-remarks").value = entry.remarks || "";

  updateEditLogModalPreview();
  openModal("modal-edit-log-entry");
}

function updateEditLogModalPreview() {
  const code = (document.getElementById("edit-log-style-code")?.value || "").trim();
  const cat = (document.getElementById("edit-log-category")?.value || "Shirt").trim();
  const type = document.getElementById("edit-log-type")?.value || "receiving";
  const qty = parseInt(document.getElementById("edit-log-qty")?.value, 10) || 0;

  const existing = window.db.findMasterByStyleAndCategory(code, cat);
  let rec = existing ? existing.received_qty : 0;
  let dis = existing ? existing.dispatch_from_hemb : 0;

  // Account for the entry currently being edited
  if (currentEditingLog && currentEditingLog.style_code === code && currentEditingLog.category === cat) {
    if (type === "receiving") {
      rec = (rec - (currentEditingLog.received_qty || 0)) + qty;
    } else {
      dis = (dis - (currentEditingLog.dispatch_qty || 0)) + qty;
    }
  }

  const balHemb = rec - dis;

  const elRec = document.getElementById("edit-preview-total-rec");
  if (elRec) elRec.textContent = rec.toLocaleString();

  const elDis = document.getElementById("edit-preview-total-dis");
  if (elDis) elDis.textContent = dis.toLocaleString();

  const elBal = document.getElementById("edit-preview-bal-hemb");
  if (elBal) {
    if (balHemb < 0) {
      elBal.style.color = "#f43f5e";
      elBal.textContent = `${balHemb.toLocaleString()} (OVER!)`;
    } else {
      elBal.style.color = "var(--accent-pink)";
      elBal.textContent = balHemb.toLocaleString();
    }
  }
}

async function saveEditLogFromForm() {
  const id = parseInt(document.getElementById("edit-log-id")?.value, 10);
  const type = document.getElementById("edit-log-type")?.value;
  const challan = (document.getElementById("edit-log-challan")?.value || "").trim();
  const dateStr = (document.getElementById("edit-log-date")?.value || "").trim();
  const styleCode = (document.getElementById("edit-log-style-code")?.value || "").trim();
  const category = (document.getElementById("edit-log-category")?.value || "Shirt").trim();
  const contractor = (document.getElementById("edit-log-contractor")?.value || "").trim();
  const cutQty = parseInt(document.getElementById("edit-log-cut-qty")?.value, 10) || 0;
  const qty = parseInt(document.getElementById("edit-log-qty")?.value, 10) || 0;
  const remarks = (document.getElementById("edit-log-remarks")?.value || "").trim();

  const alertBox = document.getElementById("modal-edit-alert");
  const showAlert = (msg) => {
    if (alertBox) {
      alertBox.style.display = "block";
      alertBox.style.background = "rgba(244, 63, 94, 0.15)";
      alertBox.style.border = "1px solid #f43f5e";
      alertBox.style.color = "#fda4af";
      alertBox.innerHTML = msg;
    }
  };

  if (!styleCode) return showAlert("✕ Error: Style Code is required!");
  if (!contractor) return showAlert("✕ Error: Contractor Name is required!");
  if (!challan) return showAlert("✕ Error: Challan Number is required!");
  if (!dateStr) return showAlert("✕ Error: Date is required!");
  if (qty <= 0) return showAlert("✕ Error: Quantity must be greater than 0!");

  const saveBtn = document.getElementById("btn-save-edit-log");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Updating & Recalculating...";
  }

  try {
    if (type === "receiving") {
      // Check excess receiving over cut order if cut is specified
      const existing = window.db.findMasterByStyleAndCategory(styleCode, category);
      const effectiveCut = cutQty || (existing ? existing.cut_qty : 0);
      let alreadyRec = existing ? existing.received_qty : 0;
      if (currentEditingLog && currentEditingLog.style_code === styleCode && currentEditingLog.category === category) {
        alreadyRec -= (currentEditingLog.received_qty || 0);
      }

      if (effectiveCut > 0 && (alreadyRec + qty) > effectiveCut) {
        const remainingCut = Math.max(0, effectiveCut - alreadyRec);
        const excess = (alreadyRec + qty) - effectiveCut;
        const confirmed = await showWarningConfirmModal({
          title: "⚠️ Excess Receiving Warning",
          subtitle: `Style: ${styleCode} [${category}]`,
          message: `Updated received quantity (<strong>${qty.toLocaleString()} pcs</strong>) exceeds remaining Cut Order (<strong>${remainingCut.toLocaleString()} pcs</strong>) by <strong style="color: #f43f5e;">+${excess.toLocaleString()} pcs</strong>!`,
          details: [
            { label: "Style & Category", value: `${styleCode} [${category}]` },
            { label: "Total Cut Order", value: `${effectiveCut.toLocaleString()} pcs` },
            { label: "Other Received", value: `${alreadyRec.toLocaleString()} pcs` },
            { label: "Remaining Cut", value: `${remainingCut.toLocaleString()} pcs`, color: "#38bdf8" },
            { label: "New Receiving", value: `${qty.toLocaleString()} pcs`, color: "#f59e0b" },
            { label: "Excess over Cut", value: `+${excess.toLocaleString()} pcs`, color: "#f43f5e" }
          ],
          urduNote: `Cutting say aya hua maal cut order say zyada ho raha hay. Kya aap waqai is change ko save karna chahtay hain?`,
          confirmText: "✓ Yes, Update Excess Receiving",
          cancelText: "✕ Cancel & Adjust Qty"
        });

        if (!confirmed) {
          if (saveBtn) saveBtn.disabled = false;
          saveBtn.textContent = "✓ Update Challan & Recalculate";
          return;
        }
      }

      await window.db.updateReceivingLog(id, {
        challan_rec: challan,
        date_receive: dateStr,
        style_code: styleCode,
        category: category,
        contractor_name: contractor,
        cut_qty: cutQty,
        received_qty: qty,
        remarks: remarks
      });

      showToast(`✓ Inward Challan #${challan} updated successfully!`);

    } else {
      // Dispatch Over-Check
      const existing = window.db.findMasterByStyleAndCategory(styleCode, category);
      const totalRec = existing ? existing.received_qty : 0;
      let otherDis = existing ? existing.dispatch_from_hemb : 0;
      if (currentEditingLog && currentEditingLog.style_code === styleCode && currentEditingLog.category === category) {
        otherDis -= (currentEditingLog.dispatch_qty || 0);
      }
      const availableHemb = totalRec - otherDis;

      if (qty > availableHemb) {
        const excess = qty - availableHemb;
        const confirmed = await showWarningConfirmModal({
          title: "⚠️ Over-Dispatch Warning",
          subtitle: `Style: ${styleCode} [${category}]`,
          message: `Stock say Hand-Embroidery may total <strong>${totalRec.toLocaleString()} pcs</strong> ai thay aur baaqi dispatches <strong>${otherDis.toLocaleString()} pcs</strong> hain.<br><br>Available Balance sirf <strong style="color: #38bdf8;">${Math.max(0, availableHemb).toLocaleString()} pcs</strong> hay, lekin aap <strong>${qty.toLocaleString()} pcs</strong> update kar rahay hain (<strong style="color: #f43f5e;">+${excess.toLocaleString()} pcs zyada</strong>)!`,
          details: [
            { label: "Style & Category", value: `${styleCode} [${category}]` },
            { label: "Total Received (Stock)", value: `${totalRec.toLocaleString()} pcs` },
            { label: "Other Dispatched", value: `${otherDis.toLocaleString()} pcs` },
            { label: "Available in H-Emb", value: `${Math.max(0, availableHemb).toLocaleString()} pcs`, color: "#38bdf8" },
            { label: "Updated Dispatch", value: `${qty.toLocaleString()} pcs`, color: "#f59e0b" },
            { label: "Excess / Deficit", value: `+${excess.toLocaleString()} pcs`, color: "#f43f5e" }
          ],
          urduNote: `Stock say jitna maal aya hay, dispatch ussay zyada ho raha hay. Kya aap waqai is over-dispatch ko update karna chahtay hain?`,
          confirmText: "✓ Yes, Allow Excess Dispatch",
          cancelText: "✕ Cancel & Adjust Qty"
        });

        if (!confirmed) {
          if (saveBtn) saveBtn.disabled = false;
          saveBtn.textContent = "✓ Update Challan & Recalculate";
          return;
        }
      }

      await window.db.updateDispatchLog(id, {
        challan_dis: challan,
        date_dispatch: dateStr,
        style_code: styleCode,
        category: category,
        contractor_name: contractor,
        dispatch_qty: qty,
        remarks: remarks
      });

      showToast(`✓ Outward Challan #${challan} updated successfully!`);
    }

    closeModal("modal-edit-log-entry");
    renderAll();

  } catch (err) {
    showAlert(`✕ Error: ${err.message}`);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "✓ Update Challan & Recalculate";
    }
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("open");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("open");
}

function openSchemaModal() {
  const codeBlock = document.getElementById("schema-code-block");
  if (codeBlock) {
    codeBlock.textContent = `
-- Neon PostgreSQL Schema for Hand Embroidery System
-- 1. Contractors Master Table
CREATE TABLE IF NOT EXISTS contractors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Inventory (Aggregated summary per Style Code + Category)
CREATE TABLE IF NOT EXISTS master_inventory (
  id SERIAL PRIMARY KEY,
  sr_no INT,
  style_code VARCHAR(100) NOT NULL,
  ship VARCHAR(50) DEFAULT '',
  category VARCHAR(50) NOT NULL,
  cut_qty INT NOT NULL DEFAULT 0,
  received_qty INT NOT NULL DEFAULT 0,
  date_receive VARCHAR(100),
  challan_rec VARCHAR(100),
  dispatch_from_hemb INT NOT NULL DEFAULT 0,
  date_dispatch VARCHAR(100),
  challan_dis VARCHAR(100),
  contractor_name VARCHAR(100),
  status VARCHAR(30) DEFAULT 'In Progress',
  remarks TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_style_category UNIQUE (style_code, category)
);

-- 3. Individual Receiving Log (Every receiving challan saved on a new line)
CREATE TABLE IF NOT EXISTS receiving_log (
  id SERIAL PRIMARY KEY,
  sr_no INT,
  style_code VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  contractor_name VARCHAR(100),
  cut_qty INT DEFAULT 0,
  received_qty INT NOT NULL DEFAULT 0,
  date_receive VARCHAR(100) NOT NULL,
  challan_rec VARCHAR(100),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Individual Dispatch Log (Every dispatch challan saved on a new line)
CREATE TABLE IF NOT EXISTS dispatch_log (
  id SERIAL PRIMARY KEY,
  sr_no INT,
  style_code VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  contractor_name VARCHAR(100),
  dispatch_qty INT NOT NULL DEFAULT 0,
  date_dispatch VARCHAR(100) NOT NULL,
  challan_dis VARCHAR(100),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Daily Final Style Report
CREATE TABLE IF NOT EXISTS final_style_report (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  serial_no INT NOT NULL,
  style_code VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  contractor_name VARCHAR(100),
  cut_qty INT DEFAULT 0,
  received_qty INT DEFAULT 0,
  balance_from_stock INT DEFAULT 0,
  balance_from_hemb INT DEFAULT 0,
  time_remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. User Accounts & RBAC Permissions
CREATE TABLE IF NOT EXISTS app_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(150),
  role VARCHAR(50) DEFAULT 'Operator',
  permissions JSONB,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
    `.trim();
  }
  openModal("modal-schema");
}

function copySchemaToClipboard() {
  const codeBlock = document.getElementById("schema-code-block");
  if (codeBlock) {
    navigator.clipboard.writeText(codeBlock.textContent).then(() => {
      showToast("Schema SQL copied to clipboard!");
    });
  }
}

// -------------------------------------------------------------
// CSV / Excel Export Utilities
// -------------------------------------------------------------
function exportMasterInventoryToCSV() {
  const list = window.db.getMasterInventory();
  if (list.length === 0) {
    showToast("No data to export", "info");
    return;
  }

  const headers = [
    "SR", "STYLE CODE", "SHIP", "CATEGORY", "CUT QTY", 
    "RECEIVED QTY", "BALANCE FROM STOCK", "DATE RECEIVE", "CHALLAN REC", 
    "DISPATCH FROM H-EMB", "BALNCE FROM H-EMB", "TOTAL BALANCE", 
    "DATE DISPATCH", "CHALLAN DIS", "CONT NAME", "REMARKS"
  ];

  const rows = list.map(item => [
    item.sr_no,
    `"${item.style_code}"`,
    `"${item.ship || ''}"`,
    `"${item.category}"`,
    item.cut_qty,
    item.received_qty,
    item.balance_from_stock,
    `"${item.date_receive || ''}"`,
    `"${item.challan_rec || ''}"`,
    item.dispatch_from_hemb,
    item.balance_from_hemb,
    item.total_balance,
    `"${item.date_dispatch || ''}"`,
    `"${item.challan_dis || ''}"`,
    `"${item.contractor_name || ''}"`,
    `"${item.remarks || ''}"`
  ]);

  downloadCSV("Master_Inventory_Summary.csv", [headers, ...rows]);
}

function exportReceivingLogToCSV() {
  const list = window.db.getReceivingLogs();
  if (list.length === 0) {
    showToast("No receiving entries to export", "info");
    return;
  }

  const headers = [
    "SR", "DATE RECEIVE", "CHALLAN REC", "STYLE CODE", "CATEGORY", "CONTRACTOR", "CUT QTY", "RECEIVED QTY", "REMARKS"
  ];

  const rows = list.map(item => [
    item.sr_no || item.id,
    `"${item.date_receive || ''}"`,
    `"${item.challan_rec || ''}"`,
    `"${item.style_code}"`,
    `"${item.category}"`,
    `"${item.contractor_name}"`,
    item.cut_qty || 0,
    item.received_qty,
    `"${item.remarks || ''}"`
  ]);

  downloadCSV("Inward_Receiving_Challans.csv", [headers, ...rows]);
}

function exportDispatchLogToCSV() {
  const list = window.db.getDispatchLogs();
  if (list.length === 0) {
    showToast("No dispatch entries to export", "info");
    return;
  }

  const headers = [
    "SR", "DATE DISPATCH", "CHALLAN DIS", "STYLE CODE", "CATEGORY", "CONTRACTOR", "DISPATCH QTY", "STATUS / REMARKS"
  ];

  const rows = list.map(item => [
    item.sr_no || item.id,
    `"${item.date_dispatch || ''}"`,
    `"${item.challan_dis || ''}"`,
    `"${item.style_code}"`,
    `"${item.category}"`,
    `"${item.contractor_name}"`,
    item.dispatch_qty,
    `"${item.remarks || ''}"`
  ]);

  downloadCSV("Outward_Dispatch_Challans.csv", [headers, ...rows]);
}

function exportFinalStylesToCSV() {
  const list = window.db.getFinalStyles();
  const dateStr = window.db.getReportDate();

  const headers = [
    "S NO", "STYLE CODE", "CATEGORY", "CONT NAME", "CUT QTY", 
    "RECEIVED QTY", "BALANCE FROM STOCK", "BALNCE FROM H-EMB", "TIME / REMARKS"
  ];

  const rows = list.map(item => [
    item.s_no,
    `"${item.style_code}"`,
    `"${item.category}"`,
    `"${item.contractor_name}"`,
    item.cut_qty,
    item.received_qty,
    item.balance_from_stock,
    item.balance_from_hemb,
    `"${item.time_remarks || ''}"`
  ]);

  downloadCSV(`Final_Style_Report_${dateStr}.csv`, [headers, ...rows]);
}

function downloadCSV(filename, rows) {
  const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast(`Downloaded ${filename}!`);
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function getCurrentDateShort() {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ====================================================================
// AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC) CONTROLLERS
// ====================================================================

// -------------------------------------------------------------
// 5-MINUTE AUTO LOGOUT INACTIVITY SYSTEM
// -------------------------------------------------------------
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (300,000 ms)
let inactivityTimer = null;
let lastUserActivity = Date.now();
let activityListenersAttached = false;

function recordUserActivity() {
  const now = Date.now();
  if (now - lastUserActivity < 1000) return; // throttle 1s
  lastUserActivity = now;
  try {
    localStorage.setItem("craftflow_last_activity", String(now));
  } catch (e) {}
  resetInactivityTimer();
}

function resetInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }

  // Only track when user is logged in
  if (!window.db || !window.db.getCurrentUser()) return;

  inactivityTimer = setTimeout(() => {
    checkAndTriggerInactivityLogout();
  }, INACTIVITY_TIMEOUT_MS);
}

function checkAndTriggerInactivityLogout() {
  if (!window.db || !window.db.getCurrentUser()) return;

  let storedActivity = lastUserActivity;
  try {
    const s = parseInt(localStorage.getItem("craftflow_last_activity"), 10);
    if (s && !isNaN(s)) storedActivity = Math.max(storedActivity, s);
  } catch (e) {}

  const elapsed = Date.now() - storedActivity;
  if (elapsed >= INACTIVITY_TIMEOUT_MS) {
    performInactivityAutoLogout();
  } else {
    // Re-arm timer for remaining time
    const remaining = Math.max(1000, INACTIVITY_TIMEOUT_MS - elapsed);
    inactivityTimer = setTimeout(checkAndTriggerInactivityLogout, remaining);
  }
}

function performInactivityAutoLogout() {
  if (!window.db || !window.db.getCurrentUser()) return;

  stopInactivityTimer();

  // Close all open modals
  document.querySelectorAll(".modal-backdrop.open").forEach(m => m.classList.remove("open"));

  // Log user out from database / local storage session
  window.db.logoutUser();

  // Show login screen overlay
  const overlay = document.getElementById("auth-screen-overlay");
  if (overlay) overlay.style.display = "flex";

  const passInput = document.getElementById("login-password");
  if (passInput) {
    passInput.value = "";
    passInput.setAttribute("type", "password");
  }

  const togglePassBtn = document.getElementById("btn-toggle-login-pass");
  if (togglePassBtn) {
    const eyeOpen = togglePassBtn.querySelector(".eye-open");
    const eyeClosed = togglePassBtn.querySelector(".eye-closed");
    if (eyeOpen) eyeOpen.style.display = "block";
    if (eyeClosed) eyeClosed.style.display = "none";
  }

  // Display timeout warning on the login screen
  const errorAlert = document.getElementById("auth-error-alert");
  if (errorAlert) {
    errorAlert.style.display = "block";
    errorAlert.style.background = "rgba(245, 158, 11, 0.15)";
    errorAlert.style.border = "1.5px solid #f59e0b";
    errorAlert.style.color = "#fbbf24";
    errorAlert.innerHTML = `⏱️ <strong>Session Expired (Auto-Logout)</strong><br><span style="font-size: 0.8rem; opacity: 0.9;">5 minute tak koi activity na honay ki wajah say software automatically logout ho gaya hai. Dobara login karein.</span>`;
  }

  const userInput = document.getElementById("login-username");
  if (userInput) userInput.focus();

  showToast("⏱️ Inactivity Timeout: 5 minutes idle — logged out automatically.", "warning");
}

function initInactivityTimer() {
  lastUserActivity = Date.now();
  try {
    localStorage.setItem("craftflow_last_activity", String(lastUserActivity));
  } catch (e) {}

  if (!activityListenersAttached) {
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach(evt => {
      window.addEventListener(evt, recordUserActivity, { passive: true });
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        checkAndTriggerInactivityLogout();
      }
    });

    window.addEventListener("focus", () => {
      checkAndTriggerInactivityLogout();
    });

    activityListenersAttached = true;
  }

  resetInactivityTimer();
}

function stopInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

function initAuthSystem() {
  const overlay = document.getElementById("auth-screen-overlay");
  const loginForm = document.getElementById("form-login");
  const togglePassBtn = document.getElementById("btn-toggle-login-pass");
  const logoutBtn = document.getElementById("btn-user-logout");
  const passInput = document.getElementById("login-password");
  const errorAlert = document.getElementById("auth-error-alert");

  // Show/Hide Password Toggle
  if (togglePassBtn && passInput) {
    togglePassBtn.addEventListener("click", () => {
      const isPass = passInput.getAttribute("type") === "password";
      passInput.setAttribute("type", isPass ? "text" : "password");
      const eyeOpen = togglePassBtn.querySelector(".eye-open");
      const eyeClosed = togglePassBtn.querySelector(".eye-closed");
      if (eyeOpen && eyeClosed) {
        eyeOpen.style.display = isPass ? "none" : "block";
        eyeClosed.style.display = isPass ? "block" : "none";
      } else {
        togglePassBtn.textContent = isPass ? "Hide" : "Show";
      }
      togglePassBtn.setAttribute("title", isPass ? "Hide password" : "Show password");
      togglePassBtn.setAttribute("aria-label", isPass ? "Hide password" : "Show password");
    });
  }

  // Check current session
  const currentUser = window.db.getCurrentUser();
  if (currentUser) {
    if (overlay) overlay.style.display = "none";
    updateHeaderUserProfile(currentUser);
    applyUserPermissions(currentUser);
    initInactivityTimer(); // Start 5-minute inactivity tracker
  } else {
    if (overlay) overlay.style.display = "flex";
  }

  // Handle Login Submission
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById("login-username");
      const username = usernameInput ? usernameInput.value.trim() : "";
      const password = passInput ? passInput.value : "";
      const submitBtn = document.getElementById("btn-submit-login");

      if (errorAlert) {
        errorAlert.style.display = "none";
        errorAlert.textContent = "";
      }

      if (!username || !password) {
        if (errorAlert) {
          errorAlert.style.display = "block";
          errorAlert.textContent = "Please enter both username and password.";
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Verifying...";
      }

      const result = window.db.authenticateUser(username, password);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "🔐 Sign In to Workspace";
      }

      if (result.success) {
        if (overlay) overlay.style.display = "none";
        if (passInput) {
          passInput.value = "";
          passInput.setAttribute("type", "password");
          const eyeOpen = togglePassBtn ? togglePassBtn.querySelector(".eye-open") : null;
          const eyeClosed = togglePassBtn ? togglePassBtn.querySelector(".eye-closed") : null;
          if (eyeOpen && eyeClosed) {
            eyeOpen.style.display = "block";
            eyeClosed.style.display = "none";
          }
        }
        updateHeaderUserProfile(result.user);
        applyUserPermissions(result.user);
        renderAll();
        checkNeonStatus();
        startLiveNeonConnection();
        initInactivityTimer(); // Start 5-minute inactivity tracker on login
        showToast(`Welcome back, ${result.user.full_name || result.user.username}!`, "success");
      } else {
        if (errorAlert) {
          errorAlert.style.display = "block";
          errorAlert.textContent = result.error || "Invalid username or password.";
        }
        if (passInput) {
          passInput.value = "";
          passInput.focus();
        }
      }
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to sign out of CraftFlow?")) {
        stopInactivityTimer();
        window.db.logoutUser();
        if (overlay) overlay.style.display = "flex";
        if (passInput) {
          passInput.value = "";
          passInput.setAttribute("type", "password");
          const eyeOpen = togglePassBtn ? togglePassBtn.querySelector(".eye-open") : null;
          const eyeClosed = togglePassBtn ? togglePassBtn.querySelector(".eye-closed") : null;
          if (eyeOpen && eyeClosed) {
            eyeOpen.style.display = "block";
            eyeClosed.style.display = "none";
          }
          if (togglePassBtn) {
            togglePassBtn.setAttribute("title", "Show password");
            togglePassBtn.setAttribute("aria-label", "Show password");
          }
        }
        if (errorAlert) errorAlert.style.display = "none";
        const userInput = document.getElementById("login-username");
        if (userInput) userInput.focus();
        showToast("Signed out successfully.", "info");
      }
    });
  }
}

function updateHeaderUserProfile(user) {
  if (!user) return;
  const avatarEl = document.getElementById("header-user-avatar");
  const nameEl = document.getElementById("header-user-name");
  const roleEl = document.getElementById("header-user-role");
  const mgmtBtn = document.getElementById("btn-open-user-mgmt");

  if (avatarEl) {
    const names = (user.full_name || user.username || "U").trim().split(" ");
    let initials = names[0].charAt(0).toUpperCase();
    if (names.length > 1) initials += names[names.length - 1].charAt(0).toUpperCase();
    avatarEl.textContent = initials;
  }

  if (nameEl) nameEl.textContent = user.full_name || user.username;
  if (roleEl) {
    const roleCapitalized = (user.role || "User").charAt(0).toUpperCase() + (user.role || "User").slice(1);
    roleEl.textContent = roleCapitalized;
  }

  if (mgmtBtn) {
    // Only Admin can open User Management & Permissions
    mgmtBtn.style.display = (user.role === "admin") ? "inline-flex" : "none";
  }
}

function applyUserPermissions(user) {
  if (!user) return;

  const tabButtons = document.querySelectorAll(".nav-tab-btn");
  let firstVisibleTab = null;
  let currentActiveAllowed = false;

  tabButtons.forEach(btn => {
    const dataTab = btn.getAttribute("data-tab");
    const permKey = dataTab.replace(/-/g, "_");
    const isAllowed = window.db.canUserAccessTab(permKey, user);

    btn.style.display = isAllowed ? "" : "none";

    if (isAllowed && !firstVisibleTab) {
      firstVisibleTab = dataTab;
    }

    if (btn.classList.contains("active")) {
      currentActiveAllowed = isAllowed;
    }
  });

  // If active tab is forbidden for this user, jump to first allowed tab
  if (!currentActiveAllowed && firstVisibleTab) {
    switchTab(firstVisibleTab);
  }

  // Action Permissions (Create, Edit, Delete)
  const canCreate = window.db.canUserPerformAction("can_create", user);
  const canDelete = window.db.canUserPerformAction("can_delete", user);

  // Toggle Create Buttons
  const createBtnIds = [
    "btn-open-new-entry",
    "btn-quick-receiving",
    "btn-quick-dispatch",
    "btn-open-rec-modal",
    "btn-open-dis-modal",
    "btn-open-new-contractor",
    "btn-add-final-style",
    "btn-auto-populate-active",
    "btn-open-payment-modal"
  ];
  createBtnIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = canCreate ? "" : "none";
  });

  // Toggle Wipe Data Button
  const clearBtn = document.getElementById("btn-clear-all");
  if (clearBtn) clearBtn.style.display = canDelete ? "" : "none";
}

// -------------------------------------------------------------
// USER MANAGEMENT MODAL CONTROLLER (ADMIN ONLY)
// -------------------------------------------------------------
function initUserManagementHandlers() {
  const openMgmtBtn = document.getElementById("btn-open-user-mgmt");
  const createNewUserBtn = document.getElementById("btn-create-new-user");
  const userForm = document.getElementById("form-user-account");
  const roleSelect = document.getElementById("user-form-role");
  const btnSelectAll = document.getElementById("btn-select-all-tabs");
  const btnDeselectAll = document.getElementById("btn-deselect-all-tabs");

  if (openMgmtBtn) {
    openMgmtBtn.addEventListener("click", () => {
      renderUsersTable();
      openModal("modal-user-management");
    });
  }

  if (createNewUserBtn) {
    createNewUserBtn.addEventListener("click", () => {
      openUserFormModal(null);
    });
  }

  if (btnSelectAll) {
    btnSelectAll.addEventListener("click", () => {
      setAllTabCheckboxes(true);
    });
  }

  if (btnDeselectAll) {
    btnDeselectAll.addEventListener("click", () => {
      setAllTabCheckboxes(false);
    });
  }

  if (roleSelect) {
    roleSelect.addEventListener("change", (e) => {
      applyRolePreset(e.target.value);
    });
  }

  if (userForm) {
    userForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await saveUserAccountFromForm();
    });
  }
}

function renderUsersTable() {
  const tbody = document.getElementById("tbody-users-list");
  if (!tbody) return;

  const users = window.db.getUsers();
  const currentSession = window.db.getCurrentUser();

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No users found.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map((u, idx) => {
    const isPrimaryAdmin = u.id === 1;
    const isSelf = currentSession && currentSession.id === u.id;

    // Tab badges
    const tabs = u.permissions?.tabs || {};
    const allowedTabNames = [];
    if (tabs.master_inventory) allowedTabNames.push("Master");
    if (tabs.receiving_log) allowedTabNames.push("Receiving");
    if (tabs.dispatch_log) allowedTabNames.push("Dispatch");
    if (tabs.final_style) allowedTabNames.push("Daily Sheet");
    if (tabs.contractors) allowedTabNames.push("Contractors");
    if (tabs.payment_sheet || (u.role === "admin")) allowedTabNames.push("Payment");
    if (tabs.neon_sync) allowedTabNames.push("Neon");

    const tabsHtml = u.role === "admin" 
      ? `<span class="badge-tag inline" style="background: rgba(99, 102, 241, 0.15); color: #818cf8;">All Tabs (7/7)</span>`
      : allowedTabNames.length > 0 
        ? `<div style="display: flex; flex-wrap: wrap; gap: 3px;">${allowedTabNames.map(t => `<span class="badge-tag" style="font-size: 0.675rem; padding: 1px 6px;">${t}</span>`).join("")}</div>`
        : `<span style="color: var(--text-faint); font-size: 0.75rem;">None</span>`;

    // Action rights badges
    const actions = u.permissions?.actions || {};
    let actionsHtml = "";
    if (u.role === "admin") {
      actionsHtml = `<span class="badge-tag inline" style="color: #38bdf8;">Full Access (C, E, D)</span>`;
    } else {
      const rights = [];
      if (actions.can_create) rights.push(`<span class="badge-tag inline" style="padding: 1px 5px; font-size: 0.675rem;">➕ Create</span>`);
      if (actions.can_edit) rights.push(`<span class="badge-tag alter" style="padding: 1px 5px; font-size: 0.675rem;">✏️ Edit</span>`);
      if (actions.can_delete) rights.push(`<span class="badge-tag issue" style="padding: 1px 5px; font-size: 0.675rem;">✕ Delete</span>`);
      if (rights.length === 0) rights.push(`<span class="badge-tag" style="background: rgba(148,163,184,0.1); color: #94a3b8; font-size: 0.675rem; padding: 1px 6px;">👁️ View Only</span>`);
      actionsHtml = `<div style="display: flex; flex-wrap: wrap; gap: 3px;">${rights.join("")}</div>`;
    }

    const statusBadge = (u.status === "Active")
      ? `<span class="badge-tag inline" style="font-size: 0.7rem;">Active</span>`
      : `<span class="badge-tag issue" style="font-size: 0.7rem;">Disabled</span>`;

    const roleColor = u.role === "admin" ? "#818cf8" : (u.role === "manager" ? "#38bdf8" : (u.role === "operator" ? "#34d399" : "#fbbf24"));

    return `
      <tr>
        <td style="text-align: center; font-weight: 700; color: var(--text-muted); font-family: var(--font-mono);">${idx + 1}</td>
        <td>
          <div style="font-weight: 700; color: #fff;">${escapeHtml(u.full_name || u.username)} ${isSelf ? `<span class="badge-tag inline" style="font-size: 0.65rem; margin-left: 4px;">You</span>` : ""}</div>
          <div style="font-size: 0.725rem; color: var(--text-muted); font-family: var(--font-mono);">@${escapeHtml(u.username)}</div>
        </td>
        <td>
          <span style="font-weight: 700; color: ${roleColor}; text-transform: capitalize; font-size: 0.8rem;">
            ${escapeHtml(u.role || 'user')}
          </span>
        </td>
        <td>${tabsHtml}</td>
        <td>${actionsHtml}</td>
        <td style="text-align: center;">${statusBadge}</td>
        <td style="text-align: center; white-space: nowrap;">
          <button class="btn btn-secondary btn-sm" style="color: var(--primary); padding: 2px 7px; margin-right: 4px;" onclick="openUserFormModal(${u.id})" title="Edit user permissions">
            ✏️ Edit
          </button>
          ${!isPrimaryAdmin ? `
            <button class="btn btn-secondary btn-sm" style="color: var(--accent-rose); padding: 2px 6px;" onclick="deleteUserAccountAction(${u.id})" title="Delete user">
              ✕
            </button>
          ` : `
            <button class="btn btn-secondary btn-sm" style="opacity: 0.3; cursor: not-allowed; padding: 2px 6px;" disabled title="Primary Admin protected">
              🔒
            </button>
          `}
        </td>
      </tr>
    `;
  }).join("");
}

function openUserFormModal(userId = null) {
  const form = document.getElementById("form-user-account");
  if (form) form.reset();

  const alertBox = document.getElementById("modal-user-alert");
  if (alertBox) alertBox.style.display = "none";

  const titleEl = document.getElementById("user-form-modal-title");
  const subEl = document.getElementById("user-form-modal-subtitle");
  const idInput = document.getElementById("user-form-id");
  const usernameInput = document.getElementById("user-form-username");
  const passHint = document.getElementById("user-password-hint");
  const passInput = document.getElementById("user-form-password");
  const roleSelect = document.getElementById("user-form-role");
  const statusSelect = document.getElementById("user-form-status");

  if (userId) {
    const user = window.db.getUserById(userId);
    if (!user) return;

    if (titleEl) titleEl.textContent = `Edit User: ${user.full_name}`;
    if (subEl) subEl.textContent = `Modify account details, roles, and granular access rights for @${user.username}`;
    if (idInput) idInput.value = user.id;
    if (usernameInput) {
      usernameInput.value = user.username;
      usernameInput.disabled = (user.id === 1);
    }
    const fullnameInput = document.getElementById("user-form-fullname");
    if (fullnameInput) fullnameInput.value = user.full_name;

    if (passInput) {
      passInput.value = "";
      passInput.placeholder = "•••••••• (Leave blank to keep unchanged)";
      passInput.required = false;
    }
    if (passHint) passHint.textContent = "(Leave blank to keep current)";

    if (roleSelect) {
      roleSelect.value = user.role || "operator";
      roleSelect.disabled = (user.id === 1);
    }
    if (statusSelect) {
      statusSelect.value = user.status || "Active";
      statusSelect.disabled = (user.id === 1);
    }

    const tabs = user.permissions?.tabs || {};
    const checkEl = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

    checkEl("perm-tab-master", tabs.master_inventory);
    checkEl("perm-tab-rec", tabs.receiving_log);
    checkEl("perm-tab-dis", tabs.dispatch_log);
    checkEl("perm-tab-final", tabs.final_style);
    checkEl("perm-tab-cont", tabs.contractors);
    checkEl("perm-tab-payment", tabs.payment_sheet !== undefined ? tabs.payment_sheet : true);
    checkEl("perm-tab-neon", tabs.neon_sync);

    const actions = user.permissions?.actions || {};
    checkEl("perm-action-create", actions.can_create);
    checkEl("perm-action-edit", actions.can_edit);
    checkEl("perm-action-delete", actions.can_delete);

  } else {
    if (titleEl) titleEl.textContent = "Add New User Account";
    if (subEl) subEl.textContent = "Create login credentials and customize access permissions";
    if (idInput) idInput.value = "";
    if (usernameInput) {
      usernameInput.value = "";
      usernameInput.disabled = false;
    }
    const fullnameInput = document.getElementById("user-form-fullname");
    if (fullnameInput) fullnameInput.value = "";

    if (passInput) {
      passInput.value = "";
      passInput.placeholder = "Enter initial password";
      passInput.required = true;
    }
    if (passHint) passHint.textContent = "(Required for new user)";

    if (roleSelect) {
      roleSelect.value = "operator";
      roleSelect.disabled = false;
    }
    if (statusSelect) {
      statusSelect.value = "Active";
      statusSelect.disabled = false;
    }

    applyRolePreset("operator");
  }

  openModal("modal-user-form");
}

function applyRolePreset(role) {
  const checkEl = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

  if (role === "admin") {
    setAllTabCheckboxes(true);
    checkEl("perm-action-create", true);
    checkEl("perm-action-edit", true);
    checkEl("perm-action-delete", true);
  } else if (role === "manager") {
    checkEl("perm-tab-master", true);
    checkEl("perm-tab-rec", true);
    checkEl("perm-tab-dis", true);
    checkEl("perm-tab-final", true);
    checkEl("perm-tab-cont", true);
    checkEl("perm-tab-payment", true);
    checkEl("perm-tab-neon", false);
    checkEl("perm-action-create", true);
    checkEl("perm-action-edit", true);
    checkEl("perm-action-delete", false);
  } else if (role === "operator") {
    checkEl("perm-tab-master", true);
    checkEl("perm-tab-rec", true);
    checkEl("perm-tab-dis", true);
    checkEl("perm-tab-final", false);
    checkEl("perm-tab-cont", false);
    checkEl("perm-tab-payment", true);
    checkEl("perm-tab-neon", false);
    checkEl("perm-action-create", true);
    checkEl("perm-action-edit", false);
    checkEl("perm-action-delete", false);
  } else if (role === "viewer") {
    checkEl("perm-tab-master", true);
    checkEl("perm-tab-rec", true);
    checkEl("perm-tab-dis", true);
    checkEl("perm-tab-final", true);
    checkEl("perm-tab-cont", true);
    checkEl("perm-tab-payment", true);
    checkEl("perm-tab-neon", false);
    checkEl("perm-action-create", false);
    checkEl("perm-action-edit", false);
    checkEl("perm-action-delete", false);
  }
}

function setAllTabCheckboxes(val) {
  const ids = ["perm-tab-master", "perm-tab-rec", "perm-tab-dis", "perm-tab-final", "perm-tab-cont", "perm-tab-payment", "perm-tab-neon"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = val;
  });
}

function showUserFormAlert(msg, type = "error") {
  const alertBox = document.getElementById("modal-user-alert");
  if (!alertBox) return;
  alertBox.style.display = "block";
  if (type === "error") {
    alertBox.style.background = "rgba(244, 63, 94, 0.15)";
    alertBox.style.border = "1px solid #f43f5e";
    alertBox.style.color = "#fda4af";
  } else {
    alertBox.style.background = "rgba(16, 185, 129, 0.15)";
    alertBox.style.border = "1px solid #10b981";
    alertBox.style.color = "#34d399";
  }
  alertBox.textContent = msg;
}

async function saveUserAccountFromForm() {
  const alertBox = document.getElementById("modal-user-alert");
  if (alertBox) alertBox.style.display = "none";

  const idVal = document.getElementById("user-form-id")?.value;
  const username = (document.getElementById("user-form-username")?.value || "").trim();
  const fullname = (document.getElementById("user-form-fullname")?.value || "").trim();
  const password = (document.getElementById("user-form-password")?.value || "").trim();
  const role = document.getElementById("user-form-role")?.value || "operator";
  const status = document.getElementById("user-form-status")?.value || "Active";

  if (!username) {
    showUserFormAlert("Username is required.", "error");
    return;
  }
  if (!fullname) {
    showUserFormAlert("Full Name / Designation is required.", "error");
    return;
  }
  if (!idVal && !password) {
    showUserFormAlert("Password is required for new accounts.", "error");
    return;
  }

  const isChecked = (id) => !!document.getElementById(id)?.checked;

  const permissions = {
    tabs: {
      master_inventory: isChecked("perm-tab-master"),
      receiving_log: isChecked("perm-tab-rec"),
      dispatch_log: isChecked("perm-tab-dis"),
      final_style: isChecked("perm-tab-final"),
      contractors: isChecked("perm-tab-cont"),
      payment_sheet: isChecked("perm-tab-payment"),
      neon_sync: isChecked("perm-tab-neon")
    },
    actions: {
      can_create: isChecked("perm-action-create"),
      can_edit: isChecked("perm-action-edit"),
      can_delete: isChecked("perm-action-delete")
    }
  };

  // If role is admin, ensure full access
  if (role === "admin") {
    Object.keys(permissions.tabs).forEach(k => permissions.tabs[k] = true);
    Object.keys(permissions.actions).forEach(k => permissions.actions[k] = true);
  }

  const saveBtn = document.getElementById("btn-save-user-account");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
  }

  try {
    const saved = await window.db.saveUserAccount({
      id: idVal ? parseInt(idVal, 10) : undefined,
      username,
      full_name: fullname,
      password: password || undefined,
      role,
      status,
      permissions
    });

    closeModal("modal-user-form");
    renderUsersTable();

    // If current user modified their own profile, refresh session view
    const cur = window.db.getCurrentUser();
    if (cur && cur.id === saved.id) {
      updateHeaderUserProfile(saved);
      applyUserPermissions(saved);
      renderAll();
    }

    showToast(`✓ User account "${saved.username}" saved successfully!`);
  } catch (err) {
    showUserFormAlert(err.message, "error");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "✓ Save User Account";
    }
  }
}

async function deleteUserAccountAction(id) {
  const user = window.db.getUserById(id);
  if (!user) return;

  if (id === 1) {
    showToast("Primary Admin account (Amir Ghouri) cannot be deleted.", "error");
    return;
  }

  if (confirm(`Are you sure you want to delete user account "${user.full_name} (@${user.username})"?`)) {
    try {
      await window.db.deleteUserAccount(id);
      renderUsersTable();
      showToast(`User account "@${user.username}" deleted successfully.`);
    } catch (err) {
      showToast(err.message, "error");
    }
  }
}
