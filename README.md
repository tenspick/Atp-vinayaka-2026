# ANANTHAMPALLI VILLAGE VINAYAKA CHAVITHI 2026 (AVVC 2026)

Full-stack production-grade website and local admin management system for **ANANTHAMPALLI VILLAGE VINAYAKA CHAVITHI 2026**.

---

## 🛠️ Technology Stack

- **Backend**: Node.js + Express.js REST API
- **Database**: SQLite (`better-sqlite3`) stored locally at `database/festival.sqlite`
- **Authentication**: Session-based auth (`express-session`), password hashing (`bcryptjs`), role-based access (`SUPER_ADMIN`, `ADMIN`)
- **Frontend**: Semantic HTML5, CSS3 (Vanilla + CSS Variables + Festive Aesthetics), Vanilla JavaScript (ES6+ async/await fetch)
- **Utilities**: WhatsApp prefilled link generator (`https://wa.me/91...`), auto-sequential receipt numbers (`AVVC-2026-XXXX`), CSV Export engine, Print CSS.

---

## 🚀 How to Run Locally

### 1. Prerequisites
- Node.js (v16+ or v18+ recommended)
- npm (Node Package Manager)

### 2. Installation Steps

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` or use the provided `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Initialize & Seed SQLite Database**:
   Run the seed script to create all 8 SQLite database tables and initialize 10 admin accounts (`admin01` to `admin10`):
   ```bash
   npm run seed
   ```

4. **Start Local Express Server**:
   ```bash
   npm start
   ```

5. **Access Application in Browser**:
   - **Public Website**: [http://localhost:3000](http://localhost:3000)
   - **Admin Management Portal**: [http://localhost:3000/admin/login.html](http://localhost:3000/admin/login.html)

---

## 🔐 Admin Accounts & Login

The seed script initializes **10 admin accounts**:

| Username | Role | Default Password |
|---|---|---|
| `admin01` | SUPER_ADMIN | `Admin@2026` |
| `admin02` | ADMIN | `Admin02@2026` |
| `admin03` | ADMIN | `Admin03@2026` |
| `admin04` | ADMIN | `Admin04@2026` |
| `admin05` | ADMIN | `Admin05@2026` |
| `admin06` | ADMIN | `Admin06@2026` |
| `admin07` | ADMIN | `Admin07@2026` |
| `admin08` | ADMIN | `Admin08@2026` |
| `admin09` | ADMIN | `Admin09@2026` |
| `admin10` | ADMIN | `Admin10@2026` |

*Passwords can be customized in the `.env` file prior to running `npm run seed` or changed inside the Admin Settings tab.*

---

## 💰 Chandaa & WhatsApp Receipt Workflow

1. Log into Admin Portal at `/admin/login.html`.
2. Click **"+ Collect New Chandaa"**.
3. The system automatically queries SQLite and pre-fills the next sequential receipt number (e.g. `AVVC-2026-0001`, `AVVC-2026-0002`).
4. Enter Donor Name, 10-digit mobile number, Amount (₹), and Payment Method.
5. Click **"SAVE DONATION & GENERATE RECEIPT"**.
6. The receipt modal automatically pops up with options:
   - **🖨️ PRINT RECEIPT**: Formatted with print CSS for A4 or thermal printers.
   - **📱 SEND ON WHATSAPP**: Automatically pre-fills a formatted personalized message and opens WhatsApp for the donor's mobile number (`https://wa.me/91<mobile>?text=...`).

---

## 💾 Database Location & Backup

- **Database File**: `database/festival.sqlite`
- **In-App Backup**: In the Admin Dashboard under **Settings**, click **"💾 Backup SQLite Database File"** to instantly download a timestamped copy of `festival.sqlite`.
- **Manual Backup**: Simply copy the `database/festival.sqlite` file to a safe USB drive or cloud backup.

---

## 🏷️ Required Branding Footer

Prominently displayed across all public pages, admin panels, and donation receipts:

```text
DESIGNED AND DEVELOPED PROUDLY IN ANANTHAMPALLI BY KLIVOO NEXT GEN CRMS
(A TENSPICK INITIATIVE)
Contact Developer for Queries: 7330863893 — WhatsApp Only
Made with Love by Klivoo (By Tenspick Labs)
```
