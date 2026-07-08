# 🎬 Cutline Business Manager

> A premium, full-stack SaaS application for creative studios and freelancers. Manage projects, clients, invoicing, and assets in one beautiful, intuitive platform.

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Aiven-336791?logo=postgresql&logoColor=white)](https://aiven.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#-license)

[View Demo](#-screenshots) • [Get Started](#-getting-started) • [Features](#-features) • [Tech Stack](#-tech-stack)

</div>

---

## 📸 Screenshots

Experience the elegant, professional interface of Cutline Business Manager:

<div align="center">

| Dashboard | Clients Management |
|-----------|-------------------|
| [![Dashboard View](https://imgur.com/WLuuGat.jpg)](https://imgur.com/WLuuGat) | [![Clients View](https://imgur.com/t5FmvqD.jpg)](https://imgur.com/t5FmvqD) |

| Projects Pipeline | Invoicing System |
|------------------|-----------------|
| [![Pipeline View](https://imgur.com/lmOMILg.jpg)](https://imgur.com/lmOMILg) | [![Invoicing View](https://imgur.com/lBXfGzd.jpg)](https://imgur.com/lBXfGzd) |

</div>

---

## ✨ Features

### 🏢 **Multi-Tenant Architecture**
Complete business isolation with Clerk-powered multi-organization support. Each organization's data is completely partitioned using `businessId`.

### 💼 **Professional Dashboard**
- **Studio Health Dashboard**: Real-time insights into MTD Revenue, Days Sales Outstanding (DSO), Overdue Invoices, and At-Risk Deadlines
- **Global Command Palette** (Cmd+K): Instantly search and navigate across projects, clients, invoices, and assets
- **Calm, Professional UI**: Inspired by Linear and Stripe with a true-gray aesthetic

### 👥 **CRM & Client Management**
- Comprehensive client directory with full contact information
- Track preferred communication channels (Email, Slack, WhatsApp)
- **5-Star Rating System**: Rate clients for lifetime value analysis
- Client performance insights and project history

### 📊 **Advanced Financials Engine**
- **Invoice Management**: Draft, Sent, Paid, Partially Paid, Overdue, and Void statuses
- **Payment Tracking**: Record payments via multiple methods (Bank Transfer, Credit Card, Cash, Check)
- **Credit Notes & Reminders**: Manage refunds and automatic payment reminders
- **Auto-Billing Assets**: Attached studio assets are automatically included as billable line items
- **Professional PDF Invoices**: Generated client-side or server-side with full customization
- **1-Click Email Delivery**: Send beautiful React-based emails via Resend API

### 📹 **Project & Pipeline Management**
- **Kanban Pipeline**: Visual drag-and-drop workflow with customizable stages
- **Stage Tracking**: Monitor project progression from concept to final delivery
- **Time Tracking**: Billable and non-billable hours per project
- **Project Notes**: Capture shots, client feedback, ideas, and todos
- **Deadline Tracking**: Never miss a deadline with visual priority indicators

### 🎵 **Asset & License Vault**
- Manage studio assets (Music, Fonts, LUTs, Plugins, Stock Footage, SFX)
- Track license types and expiration dates
- Cost allocation by asset and project
- 1-click asset deletion and project linking

### ⚙️ **Customizable Settings**
- Set default currency for your business
- Fully customize pipeline stages to match your workflow
- Configure team members and roles

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router & Turbopack) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) via [Aiven](https://aiven.io/) |
| **ORM** | [Prisma](https://www.prisma.io/) |
| **Auth** | [Clerk](https://clerk.com/) |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS v4](https://tailwindcss.com/) |
| **Emails** | [Resend](https://resend.com/) + [@react-email](https://react.email/) |
| **PDF Generation** | [@react-pdf/renderer](https://react-pdf.org/) |
| **Drag & Drop** | [@hello-pangea/dnd](https://react-beautiful-dnd.org/) |
| **Database Seeding** | [Prisma Seed Scripts](https://www.prisma.io/docs/orm/more/recipes/seed-database) |

---

## 🚀 Getting Started

### Prerequisites

Before you begin, make sure you have the following:

- **Node.js** 18+ and npm/yarn
- **PostgreSQL Database**: [Aiven](https://aiven.io/) or any PostgreSQL provider
- **Clerk Account**: For authentication and webhooks
- **Resend API Key**: For transactional emails

### Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/heisenberg-611/Cutline_Business_manager.git
cd Cutline_Business_manager

# Install dependencies
npm install
```

### Step 2: Environment Configuration

Create a `.env` file in the root directory:

```env
# 🔒 Database
DATABASE_URL="postgresql://username:password@host:port/dbname?sslmode=require"

# 🔑 Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# 🔗 Clerk Redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard/select-business"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard/select-business"

# 🌐 Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 📧 Resend Email Service
RESEND_API_KEY="re_..."
```

### Step 3: Database Setup

Initialize your database schema:

```bash
# Create database tables
npx prisma migrate dev

# Or push schema directly
npx prisma db push

# (Optional) Seed with demo data
npm run seed
```

**Note**: Clerk webhooks are required to sync Business and User data. During local development, use [Svix CLI](https://docs.svix.com/cli) to forward webhooks:

```bash
svix listen http://localhost:3000/api/webhooks/clerk
```

### Step 4: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Database Seeding

Quickly populate your database with realistic demo data:

```bash
# Seed with demo data (4 clients, 4 projects, 5 invoices, etc.)
npm run seed

# Reset database and start fresh
npm run reset-db

# Reset and reseed
npm run reset-db && npm run seed
```

See [scripts/SEED_README.md](scripts/SEED_README.md) for detailed seeding documentation.

---

## 🔧 Available Scripts

```bash
# Development
npm run dev           # Start dev server with Turbopack

# Production
npm run build        # Build for production
npm start            # Run production build

# Database
npm run seed         # Seed database with demo data
npm run reset-db     # Clear all data from database

# Code Quality
npm run lint         # Run ESLint
```

---

## 📁 Project Structure

```
cutline-business-manager/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes & webhooks
│   │   └── dashboard/          # Dashboard pages
│   ├── components/
│   │   └── ui/                 # shadcn/ui components
│   ├── modules/                # Feature modules
│   │   ├── clients/            # Client management
│   │   ├── projects/           # Project management
│   │   ├── financials/         # Invoicing & payments
│   │   ├── assets/             # Asset management
│   │   ├── workflow/           # Pipeline & stages
│   │   └── core/               # Database & auth
│   ├── emails/                 # React email templates
│   └── lib/                    # Utilities & helpers
├── prisma/
│   └── schema.prisma           # Database schema
├── scripts/
│   ├── seed.ts                 # Seed script
│   ├── reset-db.ts             # Reset script
│   └── SEED_README.md          # Seed documentation
└── public/                     # Static assets
```

---

## 🤝 Contributing

This is a proprietary project. Internal contributions only.

---

## 📄 License

Proprietary Software. All rights reserved. © 2026 Cutline Studios.
