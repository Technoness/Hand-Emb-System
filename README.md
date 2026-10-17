# CraftFlow - Hand Embroidery Department Production & Inventory SaaS

A modern, high-performance web software application designed for the **Hand Embroidery Department** in garment & apparel manufacturing.

This application directly digitizes and automates the workflows from your Excel workbooks:
1. **Master Inventory (Image 1)**: Complete tracking of receiving cut pieces, logging challans, dispatching finished embroidery, and tracking balances with contractors.
2. **Daily Final Style Status Report (Image 2)**: Select any **Style Code** and **Category**, and the system **instantly auto-fetches** Contractor Name, Cut Quantity, Received Quantity, Balance from Stock, and Balance in H-Emb (WIP), allowing quick daily floor remarks and status updates.
3. **Neon PostgreSQL Cloud Sync**: Direct serverless database connection with offline-first local persistence.

---

## 🚀 Quick Start (Browser-Ready)

You do **NOT** need to install Node, Python, or npm! 
1. Open your folder: `c:\Users\amir.ghouri\Desktop\Hand Emb System\`
2. Double-click `index.html` (or right-click -> Open with Google Chrome / Microsoft Edge).
3. The software will instantly load with pre-populated sample data matching your Excel sheets!

---

## 🌟 Key Features

### 1. Master Inventory & Challan Management (Exact to Image 1)
- **Columns**: SR, Style Code, Ship (e.g., CPC), Category (Shirt, Dupatta, etc.), Cut Qty.
- **Receiving Section**: Received Qty, Balance from Stock (`Cut - Received`), Date Receive, Challan Rec.
- **Dispatch Section**: Dispatch from H-Emb, Balance from H-Emb (`Received - Dispatch`), Total Balance (`Cut - Dispatch`), Date Dispatch, Challan Dis, Contractor Name.
- **Excel-Accurate Visual Highlighting**: Non-zero balances automatically display with a soft pink/red background just like Excel.
- **New Entry Modal**: Features real-time calculation preview as you type quantities.
- **Filters & Search**: Instantly search by Style Code, Contractor, Challan number, or filter by Contractor and Balance status.
- **Export**: One-click export to CSV / Excel.

### 2. Daily Final Style Running Sheet (Exact to Image 2 - Auto-Fetch)
- **Instant Auto-Fetch**:
  - In the **Daily Final Style Sheet** tab, simply choose a `Style Code` and `Category`.
  - The software **automatically fetches** Contractor Name, Cut Qty, Received Qty, Balance from Stock, and Balance from H-Emb!
- **Auto-Add Active Styles**:
  - One-click button to automatically add all styles currently active on the embroidery floor with pending balances!
- **Floor Remarks & Status**:
  - Direct inline editing of remarks with quick preset buttons: `MATERIAL NOT AVAILABLE`, `MATERIAL ISSUE`, `Inline`, `ALTER`, or custom dates.
- **Contractor Workload Sidebar**:
  - Shows real-time summary of how many pending pieces are sitting with each contractor (e.g. Touseef, Asif, Shoaib, Naveed, Imtiaz, etc.).
- **Print / PDF Report**:
  - Styled for official paper printing or PDF export with clean black-and-white borders, official title header, and sheet date.

### 3. Contractor Hub & Directory
- View workload distribution per contractor.
- Track total pieces assigned, completed, and pending.
- Add new embroidery contractors.

### 4. Neon PostgreSQL Database Integration
- **Serverless PostgreSQL**:
  - Direct connection to Neon PostgreSQL (`https://console.neon.tech`).
  - Configure connection string or HTTP SQL endpoint in the **Neon PostgreSQL** tab.
  - "Test Neon Connection" with live ping.
  - "Push Local Data to Neon Cloud" & "Pull Cloud Data from Neon".
  - "Initialize Neon Tables" executes the database DDL automatically.
- **Offline-First Architecture**:
  - Uses browser `localStorage` as primary zero-latency cache.
  - Zero downtime even if internet disconnects.

---

## 🗄️ PostgreSQL Database Schema (`schema.sql`)

The database schema is provided in [`schema.sql`](file:///c:/Users/amir.ghouri/Desktop/Hand%20Emb%20System/schema.sql):
- `contractors`: id, name, phone, rate_per_piece, status
- `master_inventory`: sr_no, style_code, ship, category, cut_qty, received_qty, balance_from_stock, date_receive, challan_rec, dispatch_from_hemb, balance_from_hemb, total_balance, date_dispatch, challan_dis, contractor_name, status, remarks
- `final_style_report`: report_date, serial_no, style_code, category, contractor_name, cut_qty, received_qty, balance_from_stock, balance_from_hemb, time_remarks
- `v_contractor_summary`: View summarizing pending balances per contractor.

You can also copy the SQL directly from the software UI under **Neon PostgreSQL -> View PostgreSQL Schema**.

---

## 💻 Tech Stack
- **HTML5**: Clean semantic SaaS architecture
- **CSS3 / Vanilla**: Modern dark/light design system with Inter & JetBrains Mono typography, glassmorphism, responsive grid, and `@media print` rules
- **JavaScript (ES6+)**: Zero-dependency modular controllers
- **Storage**: Browser LocalStorage + Neon Serverless PostgreSQL HTTP API
