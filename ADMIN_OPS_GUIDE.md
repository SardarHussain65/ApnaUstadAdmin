# ApnaUstad Admin Operations & Architecture Guide (Production Edition)

## 1. Executive Architecture Overview
ApnaUstad Operations Console is an enterprise-grade mission control platform engineered specifically for on-demand home and trade services across Pakistan (Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta).

### Modern Technology Stack
- **Framework:** TanStack Start + TanStack Router (SSR + Client Hydration)
- **Runtime & Deployment:** Node 20, Vite 7, Nitro Engine (Cloudflare Workers / Docker ready)
- **UI & Design System:** Tailored CSS Tokens, Radix UI primitives, Recharts, Lucide Icons, Glassmorphic Pakistani Cyan/Purple palette
- **Backend Architecture:** Node 20 + Express 5 + TypeScript + MongoDB (Mongoose) + Socket.io + FCM Broadcast

---

## 2. Security & RBAC Enforcement (5 System Roles)
Every administrative route and API endpoint is strictly gated through granular Role-Based Access Control (`requirePermission`):

| Module | Super Admin | Admin | Support | Verifier | Finance |
|---|:---:|:---:|:---:|:---:|:---:|
| **Realtime Dashboard & KPIs** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Customer Accounts & Bans** | ✓ | ✓ | ✓ | ✓ | — |
| **Worker Roster & Go-Live Activation** | ✓ | ✓ | — | ✓ | — |
| **NADRA CNIC Verification Queue** | ✓ | ✓ | — | ✓ | — |
| **Booking Dispatch & Arbitrations** | ✓ | ✓ | ✓ | — | ✓ |
| **Category & Skills Catalog** | ✓ | ✓ | — | — | — |
| **Wallets & Top-Up Approvals** | ✓ | ✓ | — | — | ✓ |
| **Dispute Resolution Desk** | ✓ | ✓ | ✓ | — | — |
| **Support Desk & Private Team Notes** | ✓ | ✓ | ✓ | — | — |
| **Promos & Discounts Engine** | ✓ | ✓ | — | — | ✓ |
| **Push Broadcasts & Notifications** | ✓ | ✓ | — | — | — |
| **Audit Log Trail & Diff Inspector** | ✓ | ✓ | — | — | — |
| **Platform Rules & Staged Diff Rollback** | ✓ | ✓ | — | — | — |
| **Sub-Admin Creation & RBAC Management** | ✓ | — | — | — | — |

---

## 3. Dedicated Queues & Pakistani Operational Workflows

### 3.1. Onboarding Pipeline Queue (`/onboarding`)
- **Blocker Filter Chips:** Quickly isolates ustads blocked by CNIC, pending skill approval, low starter wallet balance, or ready to go live.
- **4-Step Review Drawer:**
  1. Personal Profile & Pakistani phone verification
  2. CNIC Documents Pan/Zoom + 90° Image Rotation + Masked/Reveal modal
  3. Trade Specialty Approvals
  4. Final Decision: One-click Go-Live Activation, Starter Credit grant, or NADRA document re-upload request.

### 3.2. Facial & CNIC Verification Queue (`/verification`)
- **Side-by-Side Facial Matcher:** High-resolution live worker selfie compared directly against government-issued NADRA card.
- **Document Manipulator:** 1x to 2.5x zoom with 90° rotation controls to read sideways phone captures.
- **Pakistani NADRA Preset Checklist:** One-click rejections for expired CNIC, blurred capture, missing backside, or name mismatch.

### 3.3. Manual Top-Ups & Financial Approvals (`/wallets`)
- **Payment Gateway Proof Lightbox:** Rotatable screenshot inspector for mobile bank receipts.
- **Automated TID Matching:** Pattern detection for Pakistani payment rails (JazzCash, EasyPaisa, Meezan/HBL/Faysal Bank IBFT).
- **Projected Balance Calculator:** Automatically computes and displays current available balance vs post-approval balance.
- **Audit Presets:** Standard rejection reasons ("TID not found in banking portal", "Amount mismatch", "Duplicate receipt reused").

### 3.4. Dispute Resolution Desk (`/disputes`)
- **4-Way Outcome Matrix:**
  1. Full Client Refund (100% debit Ustad / credit client)
  2. Partial Split Refund (Interactive slider with 50/50 quick button)
  3. Release Escrow to Ustad (Dismiss client complaint)
  4. Keep Under Investigation
- **Disciplinary Sanctions:** Worker wallet penalty deduction, warning letters, or temporary account suspension.

### 3.5. Support Desk & Private Audit Notes (`/support`)
- **Dual-Stream Threading:**
  - *Customer Messages:* Outbound replies with immediate push alert to customer mobile app.
  - *Internal Team Notes:* Admin-only gold-styled audit notes with author attribution and timestamps.
- **Urdu/English Quick Templates:** Instant canned replies for greeting, cancellation inquiry, payment proof request, and polite closing.

---

## 4. Pakistani Regional Operations & Live Ops Radar
The **Live Operations Radar** component (`src/components/admin/LiveOpsMap.tsx`) provides an interactive command canvas covering:
- **Major City Hubs:** Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta.
- **Interactive Layers:**
  - *Active Ustads:* Live online workforce clusters ready for immediate dispatch.
  - *Pending Jobs:* Bookings awaiting matching with alert pings.
  - *Demand Heatmap:* Surging customer demand gradients.
- **Geo-Targeted Broadcast Composer:** Send instant or scheduled push notifications targeted to specific Pakistani cities or nationwide.

---

## 5. Security Policies & Disaster Recovery Runbook

### Inactivity Guard
- Automatic 20-minute idle inactivity timeout.
- 60-second warning countdown modal with options to extend session or safely lock.

### System Settings Safe-Rollback
- All platform rules changes (commission rates, urgent pricing, cancellation windows) are tracked via live diff inspection before publishing.
- One-click rollback button discards staged changes back to live database state.

### Emergency Database Backup & Restart
```bash
# Backend dev server:
npm run dev # Port 5001

# Admin console dev server:
npm run dev # Port 8080/8081

# Production build preview:
npm run build && npm run preview
```
