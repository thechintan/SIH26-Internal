# CivicPulse Admin Portal

The municipal operations web admin portal for **CivicPulse** — Community Issue Reporting & Municipal Response Platform.

Built with **React (Vite + TypeScript)**, **TailwindCSS**, **TanStack Query**, **Leaflet**, and **Recharts**.

---

## 🏛️ Features

- 🔐 **Role-Based Access Control (RBAC)**:
  - **Super Admin**: Complete system oversight, cross-department queue, GIS map, performance analytics, and admin configuration (categories, routing rules table, formula weights, staff management).
  - **Department Head**: Scoped to department-specific reports, SLA tracking, staff assignments, and analytics.
  - **Field Staff**: Scoped to assigned reports, field inspection workflows, mandatory status updates, and resolution after-photo verification.
- 🗺️ **Live Interactive GIS Map**:
  - OpenStreetMap tiles with custom priority markers (Critical with pulsing glowing ring, High, Medium, Low).
  - Marker clustering and interactive report preview popups.
  - Hotspot **Heatmap Toggle** (`leaflet.heat`) to detect issue density clusters.
  - Ahmedabad **Ward Boundary Polygon Overlays** (Navrangpura, Maninagar, Satellite, Bopal).
  - 30-second automated interval refetching (SRS FR-7.4).
- 📋 **Filterable & Sortable Report Queue**:
  - Filter by Category, Status, Priority Tier, Ward, Department, and Date Range.
  - Multi-attribute search and sorting (Newest, Oldest, Priority Score, Confirmations).
  - Full pagination controls with CSV export.
- 🔍 **Report Detail & Resolution Lifecycle**:
  - High-resolution Photo Evidence Gallery with zoomable full-screen **Photo Lightbox**.
  - **Voice Note Audio Player** for citizen voice recordings.
  - Interactive **Mini-Map** pinpointing exact GPS coordinates.
  - **Status History Audit Trail**: Vertical timeline showing transition actor, timestamp, mandatory notes, and after-photos.
  - **State Machine Enforcement**: Transition reports from `submitted` → `acknowledged` → `in_progress` → `resolved` (with mandatory after-photo upload via S3 pre-signed URLs) → `verified`/`reopened`.
  - **Reassignment Panel**: Reassign department and field staff officer on demand.
- 📊 **Performance & SLA Analytics**:
  - 30-Day Daily Volume Area Trend Chart.
  - Categorical Issue Distribution Donut Chart.
  - Departmental Workload & Avg Resolution Comparison Bar Chart.
  - Ward Grievance Density Chart.
  - One-click CSV Export calling `/analytics/export`.
- ⚙️ **Admin Configuration (Super Admin)**:
  - Report Categories CRUD.
  - (Category, Ward) → Department Routing Rules Table (SRS FR-9.1).
  - Priority Scoring Weights ($w_1, w_2, w_3, w_4$) formula tuner.
  - Municipal Staff Account registration (`POST /admin/users`).

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 20+
- Backend running on `http://localhost:3000` (see `../backend/README.md`)

### 2. Installation

```bash
# Navigate to the admin portal directory
cd admin-portal

# Install dependencies
npm install
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and set your API base URL:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | NestJS Backend API URL |

### 4. Run Development Server

```bash
npm run dev
```

The portal will be available at `http://localhost:5173`.

### 5. Production Build

```bash
npm run build
npm run preview
```

---

## 👥 Demo Credentials (One-Click Login on UI)

The login screen includes 1-click demo login buttons for evaluators:

| Role | Email | Password | Scope |
|---|---|---|---|
| **Super Admin** | `admin@civicpulse.in` | `Admin@123` | All privileges, config, full data |
| **Dept Head (Sanitation)** | `priya@civicpulse.in` | `Admin@123` | Sanitation department reports |
| **Dept Head (PWD)** | `amit@civicpulse.in` | `Admin@123` | Public Works department reports |
| **Field Staff** | `ravi@civicpulse.in` | `Admin@123` | Assigned reports only |

> **Note**: If testing on a fresh database, make sure to run `npm run seed` in `../backend` first to populate wards, sample reports, and demo accounts.
