# CivicPulse Backend API

Community Issue Reporting & Municipal Response Platform — NestJS Backend

## 🏗️ Architecture

```
src/
├── auth/               # JWT + OTP authentication, RBAC guards
├── users/              # User profile & admin user management
├── reports/            # Report CRUD, status lifecycle, upvotes
├── routing-engine/     # Ward resolution, dept assignment, priority scoring
├── uploads/            # Pre-signed S3 URL generation
├── notifications/      # FCM push notifications (with console fallback)
├── analytics/          # MongoDB aggregation-based analytics & CSV export
├── admin-config/       # Categories, routing rules, priority weights
├── schemas/            # Mongoose schemas (User, Report, Department, Ward, etc.)
├── common/             # Enums, filters, interceptors
├── seed/               # Database seed script
└── main.ts             # App bootstrap with Swagger docs
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB 6+ (local or Atlas)

### Setup

```bash
# Install dependencies
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your MONGO_URI if not using localhost

# Seed the database
npm run seed

# Start development server
npm run start:dev
```

### Access Points
- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api/docs

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for access token signing |
| `JWT_REFRESH_SECRET` | Yes | Secret for refresh token signing |
| `JWT_ACCESS_EXPIRY` | No | Access token TTL (default: `15m`) |
| `JWT_REFRESH_EXPIRY` | No | Refresh token TTL (default: `7d`) |
| `AWS_REGION` | No | AWS region for S3 (default: `ap-south-1`) |
| `AWS_ACCESS_KEY_ID` | No | AWS access key (mock mode if empty) |
| `AWS_SECRET_ACCESS_KEY` | No | AWS secret key (mock mode if empty) |
| `AWS_S3_BUCKET_NAME` | No | S3 bucket name (default: `civicpulse-uploads`) |
| `FCM_SERVICE_ACCOUNT_PATH` | No | Path to Firebase service account JSON (console-only if empty) |
| `SLA_TARGET_HOURS` | No | SLA target for analytics (default: `24`) |

## 🌱 Seed Data

After running `npm run seed`, the database contains:

- **4 Wards** — Ahmedabad-inspired rectangular zones
- **6 Departments** — Sanitation, PWD, Electrical, Water, Animal Control, General
- **Routing Rules** — Full (category × ward) → department mapping
- **11 Users**:
  - Super Admin: `admin@civicpulse.in` / `Admin@123`
  - Dept Heads: `priya@civicpulse.in`, `amit@civicpulse.in` / `Admin@123`
  - Staff: `ravi@civicpulse.in`, `sunita@civicpulse.in`, `kiran@civicpulse.in` / `Admin@123`
  - Citizens: OTP flow with `+919876543210` to `+919876543214`
- **20 Sample Reports** — spread across categories, statuses, and wards

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/citizen/otp-request` | — | Request OTP (dev: returns OTP in response) |
| POST | `/auth/citizen/otp-verify` | — | Verify OTP → get tokens |
| POST | `/auth/staff/login` | — | Staff email+password login |
| POST | `/auth/refresh` | — | Refresh access token |
| POST | `/auth/logout` | JWT | Revoke refresh tokens |

### Reports
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/reports` | Citizen | Create report (with auto-routing) |
| GET | `/reports` | JWT | List reports (role-scoped) |
| GET | `/reports/:id` | JWT | Report detail + status history |
| PATCH | `/reports/:id/status` | JWT | Update status (state machine enforced) |
| POST | `/reports/:id/upvote` | Citizen | Upvote/confirm report |
| PATCH | `/reports/:id/reassign` | Admin | Reassign department/staff |
| GET | `/map/reports` | Public | Lightweight map data |

### Uploads
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/uploads/presigned-url` | JWT | Get S3 pre-signed upload URL |

### Analytics
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/analytics/summary` | Admin | Full analytics dashboard data |
| GET | `/analytics/export` | Admin | CSV export of reports |

### Admin Config
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET/PUT | `/admin/categories` | Super Admin | Manage report categories |
| GET/PUT | `/admin/routing-rules` | Super Admin | Manage routing rules |
| GET/PUT | `/admin/priority-weights` | Super Admin | Manage scoring weights |
| GET/POST/PATCH | `/admin/departments` | Super Admin | Manage departments |
| POST | `/admin/users` | Super Admin | Create staff accounts |
| GET | `/admin/users` | Super Admin | List staff accounts |

## 🧪 Testing

```bash
# Unit tests (routing engine + priority scoring)
npm run test

# Run specific test file
npm run test -- --testPathPattern=routing-engine

# Coverage
npm run test:cov
```

## 📊 Key Features

### Automated Routing Engine
Reports are auto-routed on submission:
1. **Ward Resolution** — GPS coordinates → ward via point-in-polygon against boundary GeoJSON
2. **Department Assignment** — (category, ward) → department via configurable rules table
3. **Priority Scoring** — `score = w1×nearby_reports + w2×upvotes + w3×urgency_keywords + w4×category_weight`
4. **Priority Tiers** — Critical (≥40), High (≥25), Medium (≥12), Low (<12)

### Status State Machine
```
Submitted → Acknowledged → In Progress → Resolved → Verified
                                              ↘ Reopened → Acknowledged
```
- Each transition requires a mandatory note
- Resolution requires an after-photo
- Citizens can verify/reopen within 48 hours

### Duplicate Detection
On report creation, the system queries for open reports within **50m radius** with the **same category** in the **last 14 days**.

## 🏛️ License
MIT
