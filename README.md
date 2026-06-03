# 🌟 Book A Celebrity

A premium, high-end celebrity booking platform featuring editorial design typography, real-time fan interactions, secure transactional donation capabilities, and an exclusive membership experience.

---

## 📖 Table of Contents
- [✨ Key Features](#-key-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [📂 Project Structure](#-project-structure)
- [⚙️ Setup & Installation](#️-setup--installation)
- [🚀 Production & Build](#-production--build)
- [🔒 Environment Config](#-environment-config)

---

## ✨ Key Features

This platform is structured around three distinct portal levels: **Fans (Users)**, **Celebrities (Admins)**, and **Internal Platform Managers (Super Admins)**.

### 🧑‍🎤 1. Fan Experience (User Role)
- **Personalized Fan Card:** An exclusive digital member identity card tracking membership status, active VIP level, and historic booking statistics.
- **Bespoke Bookings:** Custom interactive panels for requesting personalized greetings, virtual event appearances, or general celebrity packages.
- **Direct VIP Inboxes:** Immediate messaging portals enabling Fans to send premium text messages to celebrities.
- **Donation & Gifting Hub:** Integrated transaction interfaces for supporting charity initiatives or sending digital gifts directly to their favorite celebrities.

### 🎭 2. Celebrity Management (Admin Role)
- **Celebrity Dashboard:** A structured operational dashboard to accept or decline incoming booking orders, coordinate schedules, and configure booking price rates.
- **Engagement Analytics:** Built-in charts and metrics tracking active bookings, total income, and fan engagement trends.
- **Direct Message Moderation:** Centralized portal to read and reply to fan VIP messages.

### 👑 3. Platform Administration (Super Admin Role)
- **Super Dashboard:** Global administrative metrics covering active celebrities, total monthly platform bookings, and total fee distributions.
- **Verification System:** Safe-listing and verification workflow to onboard, review, and authorize newly registered celebrity candidates.
- **User Audits:** Complete controls to manage both user profiles and celebrity pages, keeping the platform secure and aligned.

---

## 🛠️ Tech Stack

- **Frontend Core:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- **Styling & Theme:** [Tailwind CSS](https://tailwindcss.com/) direct utility architecture with a high-contrast elegant light theme.
- **Animations:** [Framer Motion / Motion](https://motion.dev/) for staggered listing entrances, slide-in sidebar overlays, and tactile hover transitions.
- **Database & Authentication:** [Firebase Firestore](https://firebase.google.com/docs/firestore) and [Firebase Authentication](https://firebase.google.com/docs/auth) for real-time secure state synchronization.
- **Server proxy Layer:** [Express](https://expressjs.com/) on [Node.js](https://nodejs.org/) to handle server-side configurations and keep external SDK integrations secure.

---

## 📂 Project Structure

```bash
├── api/                       # Production server-side build output
├── src/
│   ├── components/            # Reusable UI widgets
│   │   ├── CelebrityLayout.tsx# Main responsive screen frames and layouts
│   │   ├── ChatWidget.tsx     # Direct user-celebrity instant chat overlay
│   │   ├── ProtectedRoute.tsx # Route guarding for fans, admins, and super-admins
│   │   └── Toast.tsx          # Smooth toast notification overlay
│   ├── context/
│   │   └── AuthContext.tsx    # Firebase-backed state session manager
│   ├── pages/
│   │   ├── auth/              # Authenticative logins & profile creations
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   └── CelebrityRegisterPage.jsx
│   │   ├── user/              # User-facing VIP modules
│   │   │   ├── BookingPage.tsx
│   │   │   ├── ContactCelebrityPage.tsx
│   │   │   ├── DonationPage.tsx
│   │   │   ├── FanCardPage.tsx
│   │   │   └── UserDashboard.tsx
│   │   ├── admin/             # Developer & Celebrity admin controls
│   │   │   └── CelebrityDashboard.tsx
│   │   ├── super-admin/       # Platform manager configuration tools
│   │   │   └── SuperAdminDashboard.tsx
│   │   ├── LandingPage.tsx    # Premium guest entry page
│   │   └── ReferralHandler.tsx# Referral tracking link logic
│   ├── index.css              # Font declarations & global Tailwind CSS imports
│   ├── App.tsx                # Central Router & Screen mapping
│   └── main.tsx               # Entry application root
├── firebase-blueprint.json    # Firestore schema design definition
├── firestore.rules            # Security rules preventing cross-user data leakage
├── package.json               # Scripts, modules, and engine versions
├── server.ts                  # Multi-stage dev/production server wrapper
└── vite.config.ts             # Vite compiler configurations

---

### Sync & Diagnostics
- Git repository database and pack indices fully reconstructed and validated.

