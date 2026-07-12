# TransitOps — Smart Transport Operations Platform

> 🏆 Odoo Hackathon Project | Full-Stack Fleet Management System

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, React Router v6, Recharts, jsPDF |
| Backend | Node.js + Express.js |
| Database | PostgreSQL (local) |
| Auth | JWT + bcrypt (RBAC) |
| Styling | Vanilla CSS (dark mode, glassmorphism) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ installed locally
- Git

### 1. Setup PostgreSQL Database
```sql
CREATE DATABASE transitops;
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL credentials
npm install
npm run migrate   # Create all tables
npm run seed      # Seed demo data
npm run dev       # Start backend on port 5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev       # Start frontend on port 5173
```

### 4. Open the App
Visit **http://localhost:5173**

---

## 🔑 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Fleet Manager | fleet@transitops.com | password123 |
| Driver | driver@transitops.com | password123 |
| Safety Officer | safety@transitops.com | password123 |
| Financial Analyst | finance@transitops.com | password123 |

---

## ✨ Features

- **Authentication** — JWT with RBAC (4 roles)
- **Dashboard** — Real-time KPIs, trip trends, fleet status charts
- **Vehicle Registry** — CRUD with unique reg. numbers, status tracking
- **Driver Management** — License expiry alerts, safety scores
- **Trip Management** — Full lifecycle: Draft → Dispatched → Completed/Cancelled
- **Maintenance** — Auto vehicle status transitions (Available ↔ In Shop)
- **Fuel & Expenses** — Cost tracking with CSV/PDF export
- **Reports & Analytics** — Fuel efficiency, operational cost, Vehicle ROI

## 🔒 Business Rules Enforced

- Retired/In Shop vehicles excluded from dispatch
- Expired/Suspended drivers excluded from dispatch
- Cargo weight validated against vehicle max load
- Atomic status transitions on dispatch/complete/cancel
- Maintenance creation auto-sets vehicle to In Shop

---

## 👥 Team

- Fleet Manager module
- Driver & Safety module
- Trip & Dispatch module
- Finance & Reporting module
