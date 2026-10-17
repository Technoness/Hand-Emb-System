// ====================================================================
// Database & Storage Layer: Clean State + Neon PostgreSQL Integration
// Multi-Line Inward/Outward Challans & Strict (Style + Category) Mapping
// ====================================================================

const DB_KEYS = {
  MASTER_INVENTORY: "hand_emb_master_inventory_v2",
  RECEIVING_LOG: "hand_emb_receiving_log_v2",
  DISPATCH_LOG: "hand_emb_dispatch_log_v2",
  FINAL_STYLES: "hand_emb_final_styles_v2",
  CONTRACTORS: "hand_emb_contractors_v2",
  CONFIG: "hand_emb_config_v2",
  REPORT_DATE: "hand_emb_report_date_v2",
  USERS: "hand_emb_users_v2",
  CURRENT_USER: "hand_emb_current_user_v2"
};

class DatabaseService {
  constructor() {
    this.cleanLegacyDummyData();
    this.initLocalStorage();
  }

  // Remove old v1 dummy data if present in user's browser
  cleanLegacyDummyData() {
    const legacyKeys = [
      "hand_emb_master_inventory_v1",
      "hand_emb_final_styles_v1",
      "hand_emb_contractors_v1",
      "hand_emb_report_date_v1",
      "hand_emb_config_v1"
    ];
    legacyKeys.forEach(k => localStorage.removeItem(k));
  }

  // Initialize clean empty data
  initLocalStorage() {
    if (!localStorage.getItem(DB_KEYS.CONTRACTORS)) {
      localStorage.setItem(DB_KEYS.CONTRACTORS, JSON.stringify([]));
    }
    if (!localStorage.getItem(DB_KEYS.MASTER_INVENTORY)) {
      localStorage.setItem(DB_KEYS.MASTER_INVENTORY, JSON.stringify([]));
    }
    if (!localStorage.getItem(DB_KEYS.RECEIVING_LOG)) {
      localStorage.setItem(DB_KEYS.RECEIVING_LOG, JSON.stringify([]));
    }
    if (!localStorage.getItem(DB_KEYS.DISPATCH_LOG)) {
      localStorage.setItem(DB_KEYS.DISPATCH_LOG, JSON.stringify([]));
    }
    if (!localStorage.getItem(DB_KEYS.FINAL_STYLES)) {
      localStorage.setItem(DB_KEYS.FINAL_STYLES, JSON.stringify([]));
    }
    if (!localStorage.getItem(DB_KEYS.REPORT_DATE)) {
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem(DB_KEYS.REPORT_DATE, today);
    }
    if (!localStorage.getItem(DB_KEYS.CONFIG)) {
      localStorage.setItem(DB_KEYS.CONFIG, JSON.stringify({
        neonConnectionString: "",
        neonEndpointUrl: "",
        neonApiKey: "",
        autoSync: false,
        lastSyncTime: null
      }));
    }
    if (!localStorage.getItem(DB_KEYS.USERS)) {
      const defaultAdmin = [{
        id: 1,
        username: "admin",
        password: "admin123",
        full_name: "Amir Ghouri",
        role: "admin",
        status: "Active",
        created_at: new Date().toISOString(),
        permissions: {
          tabs: {
            master_inventory: true,
            receiving_log: true,
            dispatch_log: true,
            final_style: true,
            contractors: true,
            neon_sync: true
          },
          actions: {
            can_create: true,
            can_edit: true,
            can_delete: true
          }
        }
      }];
      localStorage.setItem(DB_KEYS.USERS, JSON.stringify(defaultAdmin));
    }
  }

  // Complete clean wipe
  async clearAllData(clearNeon = false) {
    localStorage.setItem(DB_KEYS.CONTRACTORS, JSON.stringify([]));
    localStorage.setItem(DB_KEYS.MASTER_INVENTORY, JSON.stringify([]));
    localStorage.setItem(DB_KEYS.RECEIVING_LOG, JSON.stringify([]));
    localStorage.setItem(DB_KEYS.DISPATCH_LOG, JSON.stringify([]));
    localStorage.setItem(DB_KEYS.FINAL_STYLES, JSON.stringify([]));

    if (clearNeon) {
      const cfg = this.getConfig();
      if (cfg.neonConnectionString || cfg.neonEndpointUrl) {
        try {
          await this.executeNeonQuery("TRUNCATE TABLE receiving_log, dispatch_log, master_inventory, final_style_report;");
        } catch (err) {
          console.warn("Neon truncate error:", err);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // Config & Auto-Sync State (Persistent)
  // -------------------------------------------------------------
  getConfig() {
    return JSON.parse(localStorage.getItem(DB_KEYS.CONFIG) || "{}");
  }

  saveConfig(cfg) {
    const current = this.getConfig();
    const updated = { ...current, ...cfg };
    localStorage.setItem(DB_KEYS.CONFIG, JSON.stringify(updated));
    return updated;
  }

  isAutoSyncEnabled() {
    const cfg = this.getConfig();
    return Boolean(cfg.autoSync);
  }

  setAutoSync(enabled) {
    const updated = this.saveConfig({ autoSync: Boolean(enabled) });
    return updated.autoSync;
  }

  triggerAutoSyncIfEnabled() {
    const cfg = this.getConfig();
    if (cfg.autoSync && cfg.neonConnectionString) {
      this.syncToNeon().catch(err => console.warn("Background auto-sync failed:", err));
    }
  }

  // -------------------------------------------------------------
  // Calculations
  // -------------------------------------------------------------
  computeRecordBalances(item) {
    const cut = parseInt(item.cut_qty, 10) || 0;
    const rec = parseInt(item.received_qty, 10) || 0;
    const dis = parseInt(item.dispatch_from_hemb, 10) || 0;

    const balanceFromStock = Math.max(0, cut - rec);
    const balanceFromHemb = rec - dis; // True WIP balance (negative indicates over-dispatch/deficit)
    const totalBalance = Math.max(0, cut - dis);

    return {
      balance_from_stock: balanceFromStock,
      balance_from_hemb: balanceFromHemb,
      total_balance: totalBalance
    };
  }

  // -------------------------------------------------------------
  // Master Inventory (Aggregated view per Style Code + Category)
  // -------------------------------------------------------------
  getMasterInventory() {
    const data = JSON.parse(localStorage.getItem(DB_KEYS.MASTER_INVENTORY) || "[]");
    return data.map(item => ({
      ...item,
      ...this.computeRecordBalances(item)
    }));
  }

  saveMasterInventory(list) {
    localStorage.setItem(DB_KEYS.MASTER_INVENTORY, JSON.stringify(list));
    this.triggerAutoSyncIfEnabled();
  }

  addMasterInventory(item) {
    const list = this.getMasterInventory();
    const newId = list.length > 0 ? Math.max(...list.map(i => i.id || 0)) + 1 : 1;
    const maxSr = list.length > 0 ? Math.max(...list.map(i => parseInt(i.sr_no, 10) || 0)) : 0;
    
    const record = {
      id: newId,
      sr_no: item.sr_no ? parseInt(item.sr_no, 10) : maxSr + 1,
      style_code: (item.style_code || "").trim(),
      ship: (item.ship || "").trim(),
      category: (item.category || "Shirt").trim(),
      cut_qty: parseInt(item.cut_qty, 10) || 0,
      received_qty: parseInt(item.received_qty, 10) || 0,
      date_receive: item.date_receive || "",
      challan_rec: item.challan_rec || "",
      dispatch_from_hemb: parseInt(item.dispatch_from_hemb, 10) || 0,
      date_dispatch: item.date_dispatch || "",
      challan_dis: item.challan_dis || "",
      contractor_name: (item.contractor_name || "").trim(),
      status: item.status || "In Progress",
      remarks: item.remarks || ""
    };

    list.unshift(record);
    this.saveMasterInventory(list);

    if (record.contractor_name) {
      this.ensureContractorExists(record.contractor_name);
    }

    return record;
  }

  updateMasterInventory(id, updatedFields) {
    const list = this.getMasterInventory();
    const index = list.findIndex(i => i.id === id);
    if (index === -1) return null;

    list[index] = {
      ...list[index],
      ...updatedFields,
      id: id,
      cut_qty: parseInt(updatedFields.cut_qty !== undefined ? updatedFields.cut_qty : list[index].cut_qty, 10) || 0,
      received_qty: parseInt(updatedFields.received_qty !== undefined ? updatedFields.received_qty : list[index].received_qty, 10) || 0,
      dispatch_from_hemb: parseInt(updatedFields.dispatch_from_hemb !== undefined ? updatedFields.dispatch_from_hemb : list[index].dispatch_from_hemb, 10) || 0
    };

    if (list[index].contractor_name) {
      this.ensureContractorExists(list[index].contractor_name);
    }

    this.saveMasterInventory(list);
    return list[index];
  }

  async deleteMasterInventory(id) {
    let list = this.getMasterInventory();
    const item = list.find(i => i.id === id);
    list = list.filter(i => i.id !== id);
    localStorage.setItem(DB_KEYS.MASTER_INVENTORY, JSON.stringify(list));

    const cfg = this.getConfig();
    if (cfg.neonConnectionString || cfg.neonEndpointUrl) {
      try {
        await this.executeNeonQuery("DELETE FROM master_inventory WHERE id = $1;", [id]);
        if (item) {
          await this.executeNeonQuery("DELETE FROM receiving_log WHERE LOWER(style_code) = LOWER($1) AND LOWER(category) = LOWER($2);", [item.style_code, item.category]);
          await this.executeNeonQuery("DELETE FROM dispatch_log WHERE LOWER(style_code) = LOWER($1) AND LOWER(category) = LOWER($2);", [item.style_code, item.category]);
        }
      } catch (err) {
        console.warn("Neon delete error:", err);
      }
    }
    return true;
  }

  // STRICT LOOKUP: Both style code AND category MUST match!
  findMasterByStyleAndCategory(styleCode, category) {
    if (!styleCode) return null;
    const list = this.getMasterInventory();
    const cleanCode = styleCode.trim().toLowerCase();
    const cleanCat = (category || "").trim().toLowerCase();

    // Strict matching on BOTH style_code AND category
    const found = list.find(i => 
      (i.style_code || "").trim().toLowerCase() === cleanCode &&
      (!cleanCat || (i.category || "").trim().toLowerCase() === cleanCat)
    );

    return found ? { ...found, ...this.computeRecordBalances(found) } : null;
  }

  // Get all categories registered for a specific style code
  getCategoriesForStyle(styleCode) {
    if (!styleCode) return [];
    const list = this.getMasterInventory();
    const cleanCode = styleCode.trim().toLowerCase();
    const matching = list.filter(i => (i.style_code || "").trim().toLowerCase() === cleanCode);
    return matching.map(i => i.category);
  }

  // -------------------------------------------------------------
  // RECEIVING LOG CRUD (Every receiving entry saved as new line)
  // -------------------------------------------------------------
  getReceivingLogs() {
    return JSON.parse(localStorage.getItem(DB_KEYS.RECEIVING_LOG) || "[]");
  }

  saveReceivingLogs(list) {
    localStorage.setItem(DB_KEYS.RECEIVING_LOG, JSON.stringify(list));
    this.triggerAutoSyncIfEnabled();
  }

  async addReceivingLog(entry) {
    const list = this.getReceivingLogs();
    const newId = list.length > 0 ? Math.max(...list.map(i => i.id || 0)) + 1 : 1;
    const maxSr = list.length > 0 ? Math.max(...list.map(i => parseInt(i.sr_no, 10) || 0)) : 0;

    const record = {
      id: newId,
      sr_no: entry.sr_no ? parseInt(entry.sr_no, 10) : maxSr + 1,
      style_code: (entry.style_code || "").trim(),
      category: (entry.category || "Shirt").trim(),
      contractor_name: (entry.contractor_name || "").trim(),
      cut_qty: parseInt(entry.cut_qty, 10) || 0,
      received_qty: parseInt(entry.received_qty, 10) || 0,
      date_receive: entry.date_receive || "",
      challan_rec: (entry.challan_rec || "").trim(),
      remarks: entry.remarks || "",
      created_at: new Date().toISOString()
    };

    list.unshift(record); // newest first
    this.saveReceivingLogs(list);

    if (record.contractor_name) {
      this.ensureContractorExists(record.contractor_name);
    }

    // Auto-update master inventory aggregate for this (style_code, category)
    const masterRecord = this.recalculateMasterForStyleAndCategory(record.style_code, record.category, {
      cut_qty: record.cut_qty,
      contractor_name: record.contractor_name,
      ship: entry.ship,
      date_receive: record.date_receive,
      challan_rec: record.challan_rec,
      remarks: record.remarks
    });

    // Push to Neon if configured
    let neonResult = { success: false };
    const cfg = this.getConfig();
    if (cfg.neonConnectionString || cfg.neonEndpointUrl) {
      try {
        await this.initNeonTables();

        // Push receiving log row
        await this.executeNeonQuery(
          `INSERT INTO receiving_log 
           (id, sr_no, style_code, category, contractor_name, cut_qty, received_qty, date_receive, challan_rec, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             sr_no = EXCLUDED.sr_no,
             style_code = EXCLUDED.style_code,
             category = EXCLUDED.category,
             contractor_name = EXCLUDED.contractor_name,
             cut_qty = EXCLUDED.cut_qty,
             received_qty = EXCLUDED.received_qty,
             date_receive = EXCLUDED.date_receive,
             challan_rec = EXCLUDED.challan_rec,
             remarks = EXCLUDED.remarks;`,
          [
            record.id, record.sr_no, record.style_code, record.category, record.contractor_name,
            record.cut_qty, record.received_qty, record.date_receive, record.challan_rec, record.remarks
          ]
        );

        if (record.contractor_name) {
          await this.executeNeonQuery(
            `INSERT INTO contractors (name, phone, status) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING;`,
            [record.contractor_name, '', 'Active']
          );
        }

        await this.syncMasterRecordToNeon(masterRecord);
        neonResult = { success: true };
      } catch (err) {
        console.warn("Neon receiving log push error:", err);
        neonResult = { success: false, error: err.message };
      }
    }

    return {
      success: true,
      record: record,
      masterRecord: masterRecord,
      neonSynced: neonResult.success,
      neonError: neonResult.error
    };
  }

  deleteReceivingLog(id) {
    let list = this.getReceivingLogs();
    const item = list.find(i => i.id === id);
    if (!item) return false;

    list = list.filter(i => i.id !== id);
    this.saveReceivingLogs(list);

    // Recalculate Master for affected style + category
    this.recalculateMasterForStyleAndCategory(item.style_code, item.category);

    // Remove from Neon
    const cfg = this.getConfig();
    if (cfg.neonConnectionString || cfg.neonEndpointUrl) {
      this.executeNeonQuery("DELETE FROM receiving_log WHERE id = $1;", [id]).catch(err => {
        console.warn("Neon delete receiving_log error:", err);
      });
    }

    return true;
  }

  async updateReceivingLog(id, updatedData) {
    let list = this.getReceivingLogs();
    const item = list.find(i => i.id === id);
    if (!item) throw new Error(`Receiving challan #${id} not found.`);

    const oldStyle = item.style_code;
    const oldCat = item.category;

    if (updatedData.sr_no !== undefined) item.sr_no = parseInt(updatedData.sr_no, 10) || item.sr_no;
    if (updatedData.style_code) item.style_code = updatedData.style_code.trim();
    if (updatedData.category) item.category = updatedData.category.trim();
    if (updatedData.contractor_name !== undefined) item.contractor_name = updatedData.contractor_name.trim();
    if (updatedData.cut_qty !== undefined) item.cut_qty = parseInt(updatedData.cut_qty, 10) || 0;
    if (updatedData.received_qty !== undefined) item.received_qty = parseInt(updatedData.received_qty, 10) || 0;
    if (updatedData.date_receive !== undefined) item.date_receive = updatedData.date_receive.trim();
    if (updatedData.challan_rec !== undefined) item.challan_rec = updatedData.challan_rec.trim();
    if (updatedData.remarks !== undefined) item.remarks = updatedData.remarks.trim();

    this.saveReceivingLogs(list);

    if (item.contractor_name) {
      this.ensureContractorExists(item.contractor_name);
    }

    // Recalculate Master for new style+category
    const newMaster = this.recalculateMasterForStyleAndCategory(item.style_code, item.category, {
      contractor_name: item.contractor_name,
      cut_qty: item.cut_qty,
      date_receive: item.date_receive,
      challan_rec: item.challan_rec,
      remarks: item.remarks
    });

    // If style code or category changed, also recalculate the old one
    if (oldStyle.toLowerCase() !== item.style_code.toLowerCase() || oldCat.toLowerCase() !== item.category.toLowerCase()) {
      this.recalculateMasterForStyleAndCategory(oldStyle, oldCat);
    }

    // Sync to Neon
    const cfg = this.getConfig();
    if (cfg.neonConnectionString || cfg.neonEndpointUrl) {
      try {
        await this.executeNeonQuery(
          `UPDATE receiving_log SET
             sr_no = $2,
             style_code = $3,
             category = $4,
             contractor_name = $5,
             cut_qty = $6,
             received_qty = $7,
             date_receive = $8,
             challan_rec = $9,
             remarks = $10
           WHERE id = $1;`,
          [
            item.id, item.sr_no || 0, item.style_code, item.category, item.contractor_name || '',
            item.cut_qty || 0, item.received_qty || 0, item.date_receive || '', item.challan_rec || '', item.remarks || ''
          ]
        );
        await this.syncMasterRecordToNeon(newMaster);
      } catch (err) {
        console.warn("Neon update receiving_log error:", err);
      }
    }

    return { success: true, record: item, masterRecord: newMaster };
  }

  // -------------------------------------------------------------
  // DISPATCH LOG CRUD (Every dispatch entry saved as new line)
  // -------------------------------------------------------------
  getDispatchLogs() {
    return JSON.parse(localStorage.getItem(DB_KEYS.DISPATCH_LOG) || "[]");
  }

  saveDispatchLogs(list) {
    localStorage.setItem(DB_KEYS.DISPATCH_LOG, JSON.stringify(list));
    this.triggerAutoSyncIfEnabled();
  }

  async addDispatchLog(entry) {
    const list = this.getDispatchLogs();
    const newId = list.length > 0 ? Math.max(...list.map(i => i.id || 0)) + 1 : 1;
    const maxSr = list.length > 0 ? Math.max(...list.map(i => parseInt(i.sr_no, 10) || 0)) : 0;

    const record = {
      id: newId,
      sr_no: entry.sr_no ? parseInt(entry.sr_no, 10) : maxSr + 1,
      style_code: (entry.style_code || "").trim(),
      category: (entry.category || "Shirt").trim(),
      contractor_name: (entry.contractor_name || "").trim(),
      dispatch_qty: parseInt(entry.dispatch_qty, 10) || 0,
      date_dispatch: entry.date_dispatch || "",
      challan_dis: (entry.challan_dis || "").trim(),
      remarks: entry.remarks || "",
      created_at: new Date().toISOString()
    };

    list.unshift(record); // newest first
    this.saveDispatchLogs(list);

    if (record.contractor_name) {
      this.ensureContractorExists(record.contractor_name);
    }

    // Auto-update master inventory aggregate for this (style_code, category)
    const masterRecord = this.recalculateMasterForStyleAndCategory(record.style_code, record.category, {
      contractor_name: record.contractor_name,
      ship: entry.ship,
      date_dispatch: record.date_dispatch,
      challan_dis: record.challan_dis,
      remarks: record.remarks
    });

    // Push to Neon if configured
    let neonResult = { success: false };
    const cfg = this.getConfig();
    if (cfg.neonConnectionString || cfg.neonEndpointUrl) {
      try {
        await this.initNeonTables();

        // Push dispatch log row
        await this.executeNeonQuery(
          `INSERT INTO dispatch_log 
           (id, sr_no, style_code, category, contractor_name, dispatch_qty, date_dispatch, challan_dis, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             sr_no = EXCLUDED.sr_no,
             style_code = EXCLUDED.style_code,
             category = EXCLUDED.category,
             contractor_name = EXCLUDED.contractor_name,
             dispatch_qty = EXCLUDED.dispatch_qty,
             date_dispatch = EXCLUDED.date_dispatch,
             challan_dis = EXCLUDED.challan_dis,
             remarks = EXCLUDED.remarks;`,
          [
            record.id, record.sr_no, record.style_code, record.category, record.contractor_name,
            record.dispatch_qty, record.date_dispatch, record.challan_dis, record.remarks
          ]
        );

        if (record.contractor_name) {
          await this.executeNeonQuery(
            `INSERT INTO contractors (name, phone, status) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING;`,
            [record.contractor_name, '', 'Active']
          );
        }

        await this.syncMasterRecordToNeon(masterRecord);
        neonResult = { success: true };
      } catch (err) {
        console.warn("Neon dispatch log push error:", err);
        neonResult = { success: false, error: err.message };
      }
    }

    return {
      success: true,
      record: record,
      masterRecord: masterRecord,
      neonSynced: neonResult.success,
      neonError: neonResult.error
    };
  }

  deleteDispatchLog(id) {
    let list = this.getDispatchLogs();
    const item = list.find(i => i.id === id);
    if (!item) return false;

    list = list.filter(i => i.id !== id);
    this.saveDispatchLogs(list);

    // Recalculate Master for affected style + category
    this.recalculateMasterForStyleAndCategory(item.style_code, item.category);

    // Remove from Neon
    const cfg = this.getConfig();
    if (cfg.neonConnectionString || cfg.neonEndpointUrl) {
      this.executeNeonQuery("DELETE FROM dispatch_log WHERE id = $1;", [id]).catch(err => {
        console.warn("Neon delete dispatch_log error:", err);
      });
    }

    return true;
  }

  async updateDispatchLog(id, updatedData) {
    let list = this.getDispatchLogs();
    const item = list.find(i => i.id === id);
    if (!item) throw new Error(`Dispatch challan #${id} not found.`);

    const oldStyle = item.style_code;
    const oldCat = item.category;

    if (updatedData.sr_no !== undefined) item.sr_no = parseInt(updatedData.sr_no, 10) || item.sr_no;
    if (updatedData.style_code) item.style_code = updatedData.style_code.trim();
    if (updatedData.category) item.category = updatedData.category.trim();
    if (updatedData.contractor_name !== undefined) item.contractor_name = updatedData.contractor_name.trim();
    if (updatedData.dispatch_qty !== undefined) item.dispatch_qty = parseInt(updatedData.dispatch_qty, 10) || 0;
    if (updatedData.date_dispatch !== undefined) item.date_dispatch = updatedData.date_dispatch.trim();
    if (updatedData.challan_dis !== undefined) item.challan_dis = updatedData.challan_dis.trim();
    if (updatedData.remarks !== undefined) item.remarks = updatedData.remarks.trim();

    this.saveDispatchLogs(list);

    if (item.contractor_name) {
      this.ensureContractorExists(item.contractor_name);
    }

    // Recalculate Master for new style+category
    const newMaster = this.recalculateMasterForStyleAndCategory(item.style_code, item.category, {
      contractor_name: item.contractor_name,
      date_dispatch: item.date_dispatch,
      challan_dis: item.challan_dis,
      remarks: item.remarks
    });

    // If style code or category changed, also recalculate the old one
    if (oldStyle.toLowerCase() !== item.style_code.toLowerCase() || oldCat.toLowerCase() !== item.category.toLowerCase()) {
      this.recalculateMasterForStyleAndCategory(oldStyle, oldCat);
    }

    // Sync to Neon
    const cfg = this.getConfig();
    if (cfg.neonConnectionString || cfg.neonEndpointUrl) {
      try {
        await this.executeNeonQuery(
          `UPDATE dispatch_log SET
             sr_no = $2,
             style_code = $3,
             category = $4,
             contractor_name = $5,
             dispatch_qty = $6,
             date_dispatch = $7,
             challan_dis = $8,
             remarks = $9
           WHERE id = $1;`,
          [
            item.id, item.sr_no || 0, item.style_code, item.category, item.contractor_name || '',
            item.dispatch_qty || 0, item.date_dispatch || '', item.challan_dis || '', item.remarks || ''
          ]
        );
        await this.syncMasterRecordToNeon(newMaster);
      } catch (err) {
        console.warn("Neon update dispatch_log error:", err);
      }
    }

    return { success: true, record: item, masterRecord: newMaster };
  }

  // -------------------------------------------------------------
  // RECALCULATION ENGINE: Dynamic Aggregation per (Style Code + Category)
  // -------------------------------------------------------------
  recalculateMasterForStyleAndCategory(styleCode, category, hints = {}) {
    const cleanCode = (styleCode || "").trim();
    const cleanCat = (category || "Shirt").trim();
    const masterList = this.getMasterInventory();

    // 1. Find existing master row strictly by (style_code, category)
    let item = masterList.find(m => 
      (m.style_code || "").trim().toLowerCase() === cleanCode.toLowerCase() &&
      (m.category || "").trim().toLowerCase() === cleanCat.toLowerCase()
    );

    // 2. Sum up all receiving logs matching (style_code, category)
    const recLogs = this.getReceivingLogs().filter(r =>
      (r.style_code || "").trim().toLowerCase() === cleanCode.toLowerCase() &&
      (r.category || "").trim().toLowerCase() === cleanCat.toLowerCase()
    );
    const totalReceived = recLogs.reduce((acc, r) => acc + (parseInt(r.received_qty, 10) || 0), 0);
    const latestRec = recLogs[0]; // newest is first

    // 3. Sum up all dispatch logs matching (style_code, category)
    const disLogs = this.getDispatchLogs().filter(d =>
      (d.style_code || "").trim().toLowerCase() === cleanCode.toLowerCase() &&
      (d.category || "").trim().toLowerCase() === cleanCat.toLowerCase()
    );
    const totalDispatched = disLogs.reduce((acc, d) => acc + (parseInt(d.dispatch_qty, 10) || 0), 0);
    const latestDis = disLogs[0];

    // Determine cut quantity
    let cutQty = hints.cut_qty ? parseInt(hints.cut_qty, 10) : 0;
    if (!cutQty && item) cutQty = item.cut_qty || 0;
    if (!cutQty && latestRec && latestRec.cut_qty) cutQty = latestRec.cut_qty;

    const contractor = hints.contractor_name || (item ? item.contractor_name : '') || (latestRec ? latestRec.contractor_name : '') || (latestDis ? latestDis.contractor_name : '');
    const ship = hints.ship || (item ? item.ship : '');
    const dateRec = hints.date_receive || (latestRec ? latestRec.date_receive : '') || (item ? item.date_receive : '');
    const challanRec = hints.challan_rec || (latestRec ? latestRec.challan_rec : '') || (item ? item.challan_rec : '');
    const dateDis = hints.date_dispatch || (latestDis ? latestDis.date_dispatch : '') || (item ? item.date_dispatch : '');
    const challanDis = hints.challan_dis || (latestDis ? latestDis.challan_dis : '') || (item ? item.challan_dis : '');
    const remarks = hints.remarks || (latestDis ? latestDis.remarks : '') || (latestRec ? latestRec.remarks : '') || (item ? item.remarks : '');

    if (item) {
      item.cut_qty = cutQty;
      // Exact sum from logs (or 0 if all logs deleted)
      item.received_qty = recLogs.length > 0 ? totalReceived : (hints.manual ? item.received_qty : 0);
      item.dispatch_from_hemb = disLogs.length > 0 ? totalDispatched : (hints.manual ? item.dispatch_from_hemb : 0);
      if (contractor) item.contractor_name = contractor;
      if (ship) item.ship = ship;
      if (dateRec) item.date_receive = dateRec;
      if (challanRec) item.challan_rec = challanRec;
      if (dateDis) item.date_dispatch = dateDis;
      if (challanDis) item.challan_dis = challanDis;
      if (remarks) item.remarks = remarks;
      item.status = (cutQty > 0 && item.dispatch_from_hemb >= cutQty) ? "Completed" : "In Progress";
    } else {
      const newId = masterList.length > 0 ? Math.max(...masterList.map(i => i.id || 0)) + 1 : 1;
      const maxSr = masterList.length > 0 ? Math.max(...masterList.map(i => parseInt(i.sr_no, 10) || 0)) : 0;
      item = {
        id: newId,
        sr_no: maxSr + 1,
        style_code: cleanCode,
        ship: ship,
        category: cleanCat,
        cut_qty: cutQty,
        received_qty: totalReceived,
        date_receive: dateRec,
        challan_rec: challanRec,
        dispatch_from_hemb: totalDispatched,
        date_dispatch: dateDis,
        challan_dis: challanDis,
        contractor_name: contractor,
        status: (cutQty > 0 && totalDispatched >= cutQty) ? "Completed" : "In Progress",
        remarks: remarks
      };
      masterList.unshift(item);
    }

    this.saveMasterInventory(masterList);
    return { ...item, ...this.computeRecordBalances(item) };
  }

  // Rebuild and aggregate all Master Inventory items from Receiving and Dispatch logs
  rebuildAllMastersFromLogs() {
    const recLogs = this.getReceivingLogs();
    const disLogs = this.getDispatchLogs();
    const pairs = new Set();

    recLogs.forEach(r => {
      if (r.style_code && r.category) pairs.add(`${r.style_code.trim()}:::${r.category.trim()}`);
    });
    disLogs.forEach(d => {
      if (d.style_code && d.category) pairs.add(`${d.style_code.trim()}:::${d.category.trim()}`);
    });

    pairs.forEach(pair => {
      const [styleCode, category] = pair.split(":::");
      this.recalculateMasterForStyleAndCategory(styleCode, category);
    });

    return this.getMasterInventory();
  }

  // Helper to sync an individual Master Inventory record to Neon
  async syncMasterRecordToNeon(savedRecord) {
    if (!savedRecord) return;
    const cfg = this.getConfig();
    if (!cfg.neonConnectionString && !cfg.neonEndpointUrl) return;

    await this.executeNeonQuery(
      `INSERT INTO master_inventory 
       (id, sr_no, style_code, ship, category, cut_qty, received_qty, date_receive, challan_rec, dispatch_from_hemb, date_dispatch, challan_dis, contractor_name, status, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         sr_no = EXCLUDED.sr_no,
         style_code = EXCLUDED.style_code,
         ship = EXCLUDED.ship,
         category = EXCLUDED.category,
         cut_qty = EXCLUDED.cut_qty,
         received_qty = EXCLUDED.received_qty,
         date_receive = EXCLUDED.date_receive,
         challan_rec = EXCLUDED.challan_rec,
         dispatch_from_hemb = EXCLUDED.dispatch_from_hemb,
         date_dispatch = EXCLUDED.date_dispatch,
         challan_dis = EXCLUDED.challan_dis,
         contractor_name = EXCLUDED.contractor_name,
         status = EXCLUDED.status,
         remarks = EXCLUDED.remarks,
         updated_at = NOW();`,
      [
        savedRecord.id, savedRecord.sr_no || 0, savedRecord.style_code, savedRecord.ship || '', savedRecord.category,
        savedRecord.cut_qty || 0, savedRecord.received_qty || 0, savedRecord.date_receive || '', savedRecord.challan_rec || '',
        savedRecord.dispatch_from_hemb || 0, savedRecord.date_dispatch || '', savedRecord.challan_dis || '',
        savedRecord.contractor_name || '', savedRecord.status || 'In Progress', savedRecord.remarks || ''
      ]
    );
  }

  async saveMasterEntryWithNeon(data) {
    let savedRecord = null;
    if (data.id) {
      savedRecord = this.updateMasterInventory(data.id, data);
    } else {
      const existing = this.findMasterByStyleAndCategory(data.style_code, data.category);
      if (existing) {
        savedRecord = this.updateMasterInventory(existing.id, data);
      } else {
        savedRecord = this.addMasterInventory(data);
      }
    }

    // Direct push to Neon if configured
    const cfg = this.getConfig();
    if (cfg.neonConnectionString || cfg.neonEndpointUrl) {
      try {
        await this.initNeonTables();

        if (savedRecord.contractor_name) {
          await this.executeNeonQuery(
            `INSERT INTO contractors (name, phone, status)
             VALUES ($1, $2, $3)
             ON CONFLICT (name) DO NOTHING;`,
            [savedRecord.contractor_name, '', 'Active']
          );
        }

        await this.syncMasterRecordToNeon(savedRecord);
        return { success: true, neonSynced: true, record: savedRecord };
      } catch (err) {
        console.warn("Direct Neon master push error:", err);
        return { success: true, neonSynced: false, error: err.message, record: savedRecord };
      }
    }

    return { success: true, neonSynced: false, record: savedRecord };
  }

  // -------------------------------------------------------------
  // Final Style Daily Report (Auto-fetch sheet)
  // -------------------------------------------------------------
  getFinalStyles() {
    const raw = JSON.parse(localStorage.getItem(DB_KEYS.FINAL_STYLES) || "[]");
    return raw.map((entry, idx) => {
      // STRICT MATCH on style_code AND category
      const master = this.findMasterByStyleAndCategory(entry.style_code, entry.category);
      if (master) {
        return {
          s_no: entry.s_no || idx + 1,
          style_code: entry.style_code,
          category: entry.category || master.category || "Shirt",
          contractor_name: master.contractor_name || "",
          cut_qty: master.cut_qty || 0,
          received_qty: master.received_qty || 0,
          balance_from_stock: master.balance_from_stock || 0,
          balance_from_hemb: master.balance_from_hemb || 0,
          time_remarks: entry.time_remarks || "",
          master_found: true
        };
      } else {
        return {
          s_no: entry.s_no || idx + 1,
          style_code: entry.style_code,
          category: entry.category || "Shirt",
          contractor_name: entry.contractor_name || "-",
          cut_qty: entry.cut_qty || 0,
          received_qty: entry.received_qty || 0,
          balance_from_stock: entry.balance_from_stock || 0,
          balance_from_hemb: entry.balance_from_hemb || 0,
          time_remarks: entry.time_remarks || "",
          master_found: false
        };
      }
    });
  }

  saveFinalStyles(list) {
    const minimal = list.map((item, idx) => ({
      s_no: idx + 1,
      style_code: item.style_code,
      category: item.category,
      time_remarks: item.time_remarks || ""
    }));
    localStorage.setItem(DB_KEYS.FINAL_STYLES, JSON.stringify(minimal));
    this.triggerAutoSyncIfEnabled();
  }

  addFinalStyle(styleCode, category, timeRemarks = "") {
    const list = this.getFinalStyles();
    const nextSNo = list.length + 1;
    list.push({
      s_no: nextSNo,
      style_code: styleCode.trim(),
      category: (category || "Shirt").trim(),
      time_remarks: timeRemarks.trim()
    });
    this.saveFinalStyles(list);
    return this.getFinalStyles();
  }

  updateFinalStyleRemarks(sNo, newRemarks) {
    const list = this.getFinalStyles();
    const item = list.find(i => i.s_no === sNo);
    if (item) {
      item.time_remarks = newRemarks;
      this.saveFinalStyles(list);
    }
    return this.getFinalStyles();
  }

  removeFinalStyle(sNo) {
    let list = this.getFinalStyles();
    list = list.filter(i => i.s_no !== sNo);
    this.saveFinalStyles(list);
    return this.getFinalStyles();
  }

  // -------------------------------------------------------------
  // Contractors
  // -------------------------------------------------------------
  getContractors() {
    return JSON.parse(localStorage.getItem(DB_KEYS.CONTRACTORS) || "[]");
  }

  saveContractors(list) {
    localStorage.setItem(DB_KEYS.CONTRACTORS, JSON.stringify(list));
  }

  ensureContractorExists(name) {
    if (!name) return;
    const list = this.getContractors();
    const exists = list.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      this.addContractorWithNeon({ name: name, phone: "", status: "Active" }).catch(() => {});
    }
  }

  async addContractorWithNeon(contractorData) {
    const list = this.getContractors();
    const existing = list.find(c => c.name.toLowerCase() === contractorData.name.trim().toLowerCase());
    let savedObj = null;

    if (existing) {
      existing.phone = contractorData.phone !== undefined ? contractorData.phone : existing.phone;
      existing.status = contractorData.status || existing.status;
      savedObj = existing;
    } else {
      savedObj = {
        id: list.length > 0 ? Math.max(...list.map(c => c.id || 0)) + 1 : 1,
        name: contractorData.name.trim(),
        phone: contractorData.phone || "",
        status: contractorData.status || "Active"
      };
      list.push(savedObj);
    }

    this.saveContractors(list);

    const cfg = this.getConfig();
    if (cfg.neonConnectionString || cfg.neonEndpointUrl) {
      try {
        await this.initNeonTables();
        await this.executeNeonQuery(
          `INSERT INTO contractors (name, phone, status)
           VALUES ($1, $2, $3)
           ON CONFLICT (name) DO UPDATE
           SET phone = EXCLUDED.phone, status = EXCLUDED.status;`,
          [savedObj.name, savedObj.phone || '', savedObj.status || 'Active']
        );
        return { success: true, neonSynced: true, contractor: savedObj };
      } catch (err) {
        console.warn("Direct Neon contractor push error:", err);
        return { success: true, neonSynced: false, error: err.message, contractor: savedObj };
      }
    }

    return { success: true, neonSynced: false, contractor: savedObj };
  }

  getContractorSummaries() {
    const master = this.getMasterInventory();
    const contractorMap = {};

    master.forEach(item => {
      const cont = item.contractor_name ? item.contractor_name.trim() : "Unassigned";
      if (!contractorMap[cont]) {
        contractorMap[cont] = {
          name: cont,
          styleCount: 0,
          totalCut: 0,
          totalReceived: 0,
          totalDispatched: 0,
          balanceInHemb: 0,
          balanceInStock: 0,
          styles: []
        };
      }
      contractorMap[cont].styleCount += 1;
      contractorMap[cont].totalCut += item.cut_qty;
      contractorMap[cont].totalReceived += item.received_qty;
      contractorMap[cont].totalDispatched += item.dispatch_from_hemb;
      contractorMap[cont].balanceInHemb += item.balance_from_hemb;
      contractorMap[cont].balanceInStock += item.balance_from_stock;
      contractorMap[cont].styles.push(`${item.style_code} (${item.category})`);
    });

    return Object.values(contractorMap).sort((a, b) => b.balanceInHemb - a.balanceInHemb);
  }

  // -------------------------------------------------------------
  // Report Date
  // -------------------------------------------------------------
  getReportDate() {
    return localStorage.getItem(DB_KEYS.REPORT_DATE) || new Date().toISOString().split("T")[0];
  }

  setReportDate(dateStr) {
    localStorage.setItem(DB_KEYS.REPORT_DATE, dateStr);
  }

  // -------------------------------------------------------------
  // USER AUTHENTICATION & ACCESS CONTROL (RBAC)
  // -------------------------------------------------------------
  getUsers() {
    const data = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || "[]");
    if (data.length === 0) {
      const defaultAdmin = [{
        id: 1,
        username: "admin",
        password: "admin123",
        full_name: "Amir Ghouri",
        role: "admin",
        status: "Active",
        created_at: new Date().toISOString(),
        permissions: {
          tabs: {
            master_inventory: true,
            receiving_log: true,
            dispatch_log: true,
            final_style: true,
            contractors: true,
            neon_sync: true
          },
          actions: {
            can_create: true,
            can_edit: true,
            can_delete: true
          }
        }
      }];
      localStorage.setItem(DB_KEYS.USERS, JSON.stringify(defaultAdmin));
      return defaultAdmin;
    }
    return data;
  }

  saveUsers(list) {
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(list));
    this.triggerAutoSyncIfEnabled();
  }

  getUserById(id) {
    return this.getUsers().find(u => u.id === id) || null;
  }

  getUserByUsername(username) {
    if (!username) return null;
    return this.getUsers().find(u => (u.username || "").toLowerCase() === username.toLowerCase().trim()) || null;
  }

  async saveUserAccount(userData) {
    const list = this.getUsers();
    const cleanUsername = (userData.username || "").toLowerCase().trim();

    if (!cleanUsername) throw new Error("Username is required.");
    if (!userData.password && !userData.id) throw new Error("Password is required for new accounts.");

    let userItem = null;

    if (userData.id) {
      // Edit existing user
      userItem = list.find(u => u.id === userData.id);
      if (!userItem) throw new Error("User account not found.");

      const duplicate = list.find(u => u.id !== userData.id && (u.username || "").toLowerCase() === cleanUsername);
      if (duplicate) throw new Error(`Username "${cleanUsername}" is already taken.`);

      userItem.username = cleanUsername;
      userItem.full_name = (userData.full_name || userItem.full_name).trim();
      if (userData.password) userItem.password = userData.password;
      
      if (userItem.id === 1) {
        userItem.role = "admin";
        userItem.status = "Active";
      } else {
        userItem.role = userData.role || userItem.role;
        userItem.status = userData.status || "Active";
      }

      userItem.permissions = userData.permissions || userItem.permissions;
      userItem.updated_at = new Date().toISOString();

    } else {
      // Add new user
      const duplicate = list.find(u => (u.username || "").toLowerCase() === cleanUsername);
      if (duplicate) throw new Error(`Username "${cleanUsername}" is already in use.`);

      const maxId = list.length > 0 ? Math.max(...list.map(u => u.id || 0)) : 0;
      userItem = {
        id: maxId + 1,
        username: cleanUsername,
        password: userData.password,
        full_name: (userData.full_name || cleanUsername).trim(),
        role: userData.role || "Operator",
        status: userData.status || "Active",
        created_at: new Date().toISOString(),
        permissions: userData.permissions || {
          tabs: {
            master_inventory: true,
            receiving_log: true,
            dispatch_log: true,
            final_style: false,
            contractors: false,
            neon_sync: false
          },
          actions: {
            can_create: true,
            can_edit: false,
            can_delete: false
          }
        }
      };
      list.push(userItem);
    }

    this.saveUsers(list);

    // If current logged-in user edited their own details, update current session
    const currentSession = this.getCurrentUser();
    if (currentSession && currentSession.id === userItem.id) {
      this.setCurrentUser(userItem);
    }

    // Sync user to Neon if configured
    const cfg = this.getConfig();
    if (cfg.neonConnectionString || cfg.neonEndpointUrl) {
      try {
        await this.executeNeonQuery(
          `INSERT INTO app_users (id, username, password, full_name, role, permissions, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (username) DO UPDATE SET
             password = EXCLUDED.password,
             full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             permissions = EXCLUDED.permissions,
             status = EXCLUDED.status;`,
          [
            userItem.id, userItem.username, userItem.password, userItem.full_name,
            userItem.role, JSON.stringify(userItem.permissions), userItem.status
          ]
        );
      } catch (err) {
        console.warn("Neon sync app_users error:", err);
      }
    }

    return userItem;
  }

  async deleteUserAccount(id) {
    if (id === 1) {
      throw new Error("Primary Master Admin account cannot be deleted.");
    }

    let list = this.getUsers();
    const user = list.find(u => u.id === id);
    if (!user) return false;

    if (user.role === "admin") {
      const adminCount = list.filter(u => u.role === "admin").length;
      if (adminCount <= 1) {
        throw new Error("Cannot delete the only remaining Admin account.");
      }
    }

    list = list.filter(u => u.id !== id);
    this.saveUsers(list);

    // Remove from Neon
    const cfg = this.getConfig();
    if (cfg.neonConnectionString || cfg.neonEndpointUrl) {
      this.executeNeonQuery("DELETE FROM app_users WHERE id = $1;", [id]).catch(err => {
        console.warn("Neon delete app_users error:", err);
      });
    }

    return true;
  }

  authenticateUser(username, password) {
    const cleanUser = (username || "").toLowerCase().trim();
    const cleanPass = (password || "").trim();

    const user = this.getUserByUsername(cleanUser);
    if (!user) {
      return { success: false, error: "Invalid username or password." };
    }

    if (user.status === "Disabled" || user.status === "Inactive") {
      return { success: false, error: "This user account is currently disabled. Please contact Admin." };
    }

    if (user.password !== cleanPass) {
      return { success: false, error: "Invalid username or password." };
    }

    this.setCurrentUser(user);
    return { success: true, user: user };
  }

  getCurrentUser() {
    return JSON.parse(localStorage.getItem(DB_KEYS.CURRENT_USER) || "null");
  }

  setCurrentUser(user) {
    if (!user) {
      localStorage.removeItem(DB_KEYS.CURRENT_USER);
    } else {
      localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
    }
  }

  logoutUser() {
    localStorage.removeItem(DB_KEYS.CURRENT_USER);
  }

  // Permission Checks
  canUserAccessTab(tabKey, user = null) {
    const cur = user || this.getCurrentUser();
    if (!cur) return false;
    if (cur.role === "admin") return true;
    if (!cur.permissions || !cur.permissions.tabs) return false;
    return !!cur.permissions.tabs[tabKey];
  }

  canUserPerformAction(actionKey, user = null) {
    const cur = user || this.getCurrentUser();
    if (!cur) return false;
    if (cur.role === "admin") return true;
    if (!cur.permissions || !cur.permissions.actions) return false;
    return !!cur.permissions.actions[actionKey];
  }

  // -------------------------------------------------------------
  // Neon PostgreSQL HTTP API & Sync
  // -------------------------------------------------------------
  parseNeonConfig() {
    const cfg = this.getConfig();
    const rawConn = (cfg.neonConnectionString || "").trim();
    let endpoint = (cfg.neonEndpointUrl || "").trim();
    let apiKey = (cfg.neonApiKey || "").trim();
    let user = "";
    let password = "";
    let host = "";
    let database = "";

    if (rawConn && rawConn.includes("@")) {
      try {
        const sanitized = rawConn.replace("postgresql://", "http://").replace("postgres://", "http://");
        const parsed = new URL(sanitized);
        user = decodeURIComponent(parsed.username);
        password = decodeURIComponent(parsed.password);
        host = parsed.hostname;
        database = parsed.pathname.replace(/^\//, "").split("?")[0];

        if (!endpoint) {
          endpoint = `https://${host}/sql`;
        }
        if (!apiKey && password) {
          apiKey = password;
        }
      } catch (err) {
        console.warn("Could not parse Neon URL:", err);
      }
    }

    return { endpoint, apiKey, connectionString: rawConn, user, password, host, database };
  }

  async executeNeonQuery(sqlQuery, params = []) {
    const { endpoint, apiKey, connectionString, password, host } = this.parseNeonConfig();

    if (!connectionString && !endpoint) {
      throw new Error("Neon Connection String is empty. Please paste your connection string from Neon Console.");
    }

    if (connectionString && connectionString.includes("****")) {
      throw new Error("Your connection string has hidden asterisks (****). In Neon Console, click 'Show password' (bottom left) to reveal your real password before copying!");
    }

    // Attempt 1: Official Neon Serverless Driver over CDN
    try {
      if (connectionString) {
        if (!window._neonDriverSql || window._neonDriverConn !== connectionString) {
          const neonModule = await import('https://cdn.jsdelivr.net/npm/@neondatabase/serverless@0.10.4/+esm');
          if (neonModule && neonModule.neon) {
            window._neonDriverSql = neonModule.neon(connectionString);
            window._neonDriverConn = connectionString;
          }
        }

        if (window._neonDriverSql) {
          const result = await window._neonDriverSql(sqlQuery, params);
          return { rows: Array.isArray(result) ? result : [result] };
        }
      }
    } catch (driverErr) {
      console.warn("Neon CDN driver fallback to direct HTTP:", driverErr.message);
    }

    // Attempt 2: Direct HTTP POST to Neon's /sql endpoint
    const targetUrl = endpoint || (host ? `https://${host}/sql` : "");
    if (!targetUrl) {
      throw new Error("Unable to determine Neon HTTP SQL endpoint. Please verify connection string.");
    }

    const headers = {
      "Content-Type": "application/json"
    };

    if (connectionString) {
      headers["Neon-Connection-String"] = connectionString;
    }
    const token = apiKey || password;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const payload = {
      query: sqlQuery,
      params: params
    };

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedMsg = errText;
      try {
        const json = JSON.parse(errText);
        parsedMsg = json.message || errText;
      } catch (e) {}
      throw new Error(`Neon Error (${response.status}): ${parsedMsg}`);
    }

    const data = await response.json();
    return data;
  }

  async testNeonConnection() {
    try {
      const result = await this.executeNeonQuery("SELECT NOW() as current_time, version() as pg_version;");
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async initNeonTables() {
    const tableQueries = [
      `CREATE TABLE IF NOT EXISTS contractors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        phone VARCHAR(50),
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS master_inventory (
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS receiving_log (
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
      );`,

      `CREATE TABLE IF NOT EXISTS dispatch_log (
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
      );`,

      `CREATE TABLE IF NOT EXISTS final_style_report (
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
      );`,

      `CREATE TABLE IF NOT EXISTS app_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        role VARCHAR(30) DEFAULT 'Operator',
        permissions JSONB,
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`
    ];

    for (const q of tableQueries) {
      await this.executeNeonQuery(q);
    }

    return { success: true };
  }

  async syncToNeon() {
    const master = this.getMasterInventory();
    const contractors = this.getContractors();
    const receivingLogs = this.getReceivingLogs();
    const dispatchLogs = this.getDispatchLogs();
    const users = this.getUsers();

    try {
      await this.initNeonTables();

      // 1. Sync Contractors
      for (const c of contractors) {
        await this.executeNeonQuery(
          `INSERT INTO contractors (id, name, phone, status) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (name) DO UPDATE 
           SET phone = EXCLUDED.phone, status = EXCLUDED.status;`,
          [c.id, c.name, c.phone || '', c.status || 'Active']
        );
      }

      // 2. Sync Receiving Logs
      for (const r of receivingLogs) {
        await this.executeNeonQuery(
          `INSERT INTO receiving_log 
           (id, sr_no, style_code, category, contractor_name, cut_qty, received_qty, date_receive, challan_rec, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             sr_no = EXCLUDED.sr_no,
             style_code = EXCLUDED.style_code,
             category = EXCLUDED.category,
             contractor_name = EXCLUDED.contractor_name,
             cut_qty = EXCLUDED.cut_qty,
             received_qty = EXCLUDED.received_qty,
             date_receive = EXCLUDED.date_receive,
             challan_rec = EXCLUDED.challan_rec,
             remarks = EXCLUDED.remarks;`,
          [
            r.id, r.sr_no || 0, r.style_code, r.category || 'Shirt', r.contractor_name || '',
            r.cut_qty || 0, r.received_qty || 0, r.date_receive || '', r.challan_rec || '', r.remarks || ''
          ]
        );
      }

      // 3. Sync Dispatch Logs
      for (const d of dispatchLogs) {
        await this.executeNeonQuery(
          `INSERT INTO dispatch_log 
           (id, sr_no, style_code, category, contractor_name, dispatch_qty, date_dispatch, challan_dis, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             sr_no = EXCLUDED.sr_no,
             style_code = EXCLUDED.style_code,
             category = EXCLUDED.category,
             contractor_name = EXCLUDED.contractor_name,
             dispatch_qty = EXCLUDED.dispatch_qty,
             date_dispatch = EXCLUDED.date_dispatch,
             challan_dis = EXCLUDED.challan_dis,
             remarks = EXCLUDED.remarks;`,
          [
            d.id, d.sr_no || 0, d.style_code, d.category || 'Shirt', d.contractor_name || '',
            d.dispatch_qty || 0, d.date_dispatch || '', d.challan_dis || '', d.remarks || ''
          ]
        );
      }

      // 4. Sync Master Inventory
      for (const m of master) {
        await this.syncMasterRecordToNeon(m);
      }

      // 5. Sync Application Users
      for (const u of users) {
        await this.executeNeonQuery(
          `INSERT INTO app_users (id, username, password, full_name, role, permissions, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (username) DO UPDATE SET
             password = EXCLUDED.password,
             full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             permissions = EXCLUDED.permissions,
             status = EXCLUDED.status;`,
          [
            u.id, u.username, u.password, u.full_name || '',
            u.role || 'Operator', JSON.stringify(u.permissions || {}), u.status || 'Active'
          ]
        );
      }

      const cfg = this.getConfig();
      cfg.lastSyncTime = new Date().toISOString();
      this.saveConfig(cfg);

      return {
        success: true,
        message: `Successfully synchronized ${master.length} styles, ${receivingLogs.length} receiving challans, ${dispatchLogs.length} dispatch challans, and ${users.length} users to Neon PostgreSQL!`
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async fetchFromNeon() {
    try {
      const masterRes = await this.executeNeonQuery("SELECT * FROM master_inventory ORDER BY sr_no DESC;");
      const contRes = await this.executeNeonQuery("SELECT * FROM contractors ORDER BY name ASC;");
      const recRes = await this.executeNeonQuery("SELECT * FROM receiving_log ORDER BY id DESC;");
      const disRes = await this.executeNeonQuery("SELECT * FROM dispatch_log ORDER BY id DESC;");
      const userRes = await this.executeNeonQuery("SELECT * FROM app_users ORDER BY id ASC;").catch(() => null);

      const masterRows = masterRes?.rows || (Array.isArray(masterRes) ? masterRes : []);
      const contRows = contRes?.rows || (Array.isArray(contRes) ? contRes : []);
      const recRows = recRes?.rows || (Array.isArray(recRes) ? recRes : []);
      const disRows = disRes?.rows || (Array.isArray(disRes) ? disRes : []);
      const userRows = userRes?.rows || (Array.isArray(userRes) ? userRes : []);

      // Directly update localStorage with cloud truth WITHOUT triggering reverse push!
      localStorage.setItem(DB_KEYS.CONTRACTORS, JSON.stringify(contRows));
      localStorage.setItem(DB_KEYS.RECEIVING_LOG, JSON.stringify(recRows));
      localStorage.setItem(DB_KEYS.DISPATCH_LOG, JSON.stringify(disRows));
      localStorage.setItem(DB_KEYS.MASTER_INVENTORY, JSON.stringify(masterRows));

      if (userRows.length > 0) {
        const parsedUsers = userRows.map(u => ({
          ...u,
          permissions: typeof u.permissions === "string" ? JSON.parse(u.permissions) : u.permissions
        }));
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(parsedUsers));
      }

      // If logs exist, aggregate them into master; if Neon is empty, ensure local master is 0!
      if (recRows.length > 0 || disRows.length > 0) {
        this.rebuildAllMastersFromLogs();
      } else if (masterRows.length === 0) {
        localStorage.setItem(DB_KEYS.MASTER_INVENTORY, JSON.stringify([]));
      }

      const cfg = this.getConfig();
      cfg.lastSyncTime = new Date().toISOString();
      localStorage.setItem(DB_KEYS.CONFIG, JSON.stringify(cfg));

      return {
        success: true,
        count: this.getMasterInventory().length,
        recCount: recRows.length,
        disCount: disRows.length,
        userCount: userRows.length
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

// Global DB Singleton
window.db = new DatabaseService();
