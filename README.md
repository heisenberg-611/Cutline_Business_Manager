<div align="center">
  <img src="public/cutline-logo.JPG" alt="Cutline OS Logo" width="600" style="border-radius: 8px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);" />

  <h1>Cutline OS</h1>

  <p><strong>A highly optimized, multi-tenant B2B SaaS platform for creative agencies.</strong></p>

  <p>
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.2-black?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://neon.tech/"><img src="https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License: MIT" /></a>
  </p>

  <p>
    <a href="https://www.cutlin.tech"><b>View Live Demo</b></a> &nbsp;·&nbsp;
    <a href="https://github.com/heisenberg-611/Cutline_Business_manager/wiki"><b>Documentation</b></a> &nbsp;·&nbsp;
    <a href="CUTLINE_FOR_DUMMIES.md"><b>User Guide</b></a> &nbsp;·&nbsp;
    <a href="system_diagrams.md"><b>System Diagrams</b></a>
  </p>
</div>

<hr />

## 📖 Overview

Cutline OS is an enterprise-grade business management system designed specifically for creative professionals—designers, photographers, video editors, and agencies. It bridges the gap between creative workflows and business administration by providing a unified platform for project pipelining, client CRM, financial management, and asset tracking.

The architecture emphasizes strict data isolation (multi-tenancy), rigorous performance optimizations, and a premium, accessible user interface inspired by industry leaders like Linear and Stripe.

## 🏗 Architecture & Tech Stack

The application is built as a Modular Monolith, leveraging Server Components and Edge Middleware for security and performance.

| Domain | Technology | Description |
|---|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) | App Router architecture utilizing React Server Components (RSC) and Server Actions. |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict type safety across the entire stack, from database schema to UI components. |
| **Database** | [PostgreSQL](https://www.postgresql.org/) | Hosted on [Neon](https://neon.tech/) (with [Aiven](https://aiven.io/) as a redundancy fallback). |
| **ORM** | [Prisma](https://www.prisma.io/) | Schema management, migrations, and direct database querying (with Prisma Accelerate as an edge-caching backup). |
| **Auth & Identity** | [Clerk](https://clerk.com/) | B2B multi-tenant organization management and secure Role-Based Access Control (RBAC). |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first styling paired with unstyled [shadcn/ui](https://ui.shadcn.com/) primitives. |
| **Email Delivery** | [Resend](https://resend.com/) | Transactional email delivery via React-based email templates (`@react-email`). |

### Core Architectural Decisions

- **Strict Multi-Tenancy:** Data is rigidly partitioned using `businessId` at the database level. Server-side data access layers actively assert the active tenant ID before executing queries.
- **Financial Precision:** All monetary values are strictly stored as `Int` (cents/minor units) to eliminate floating-point arithmetic errors.
- **Webhook Synchronization:** Real-time data synchronization between the authentication provider (Clerk) and the PostgreSQL database using Svix webhooks.
- **Edge Routing Security:** Next.js Middleware acts as the first line of defense, validating authentication states and RBAC claims before rendering layouts.

## 🚀 Key Capabilities

### 1. Multi-Tenant CRM & Access Control
- Isolated business environments utilizing Clerk Organizations.
- Granular Role-Based Access Control (RBAC) separating `org:admin` (Full access) from `org:member` (Pipeline-only read access).
- Smart client directory with sequential ID generation (`CL-XXX`) and dynamic 5-star rating algorithms for sorting high-value accounts.

### 2. Intelligent Financial Engine
- End-to-end invoice lifecycle management (Draft, Sent, Partially Paid, Paid, Void).
- Automatic cost-allocation for business assets linked to projects.
- Client-side and server-side PDF generation featuring multi-currency support and exact payment timestamps.
- Public, client-facing payment portals (`/invoices/[id]/pay`) to streamline receivables.

### 3. Project & Pipeline Workflow
- Interactive Drag-and-Drop Kanban boards with customizable stage progression.
- Built-in time tracking, deadline indicators, and client feedback integration.
- Automated creation of pipeline projects via external Client Intake Forms.

### 4. Advanced Analytics & Dashboarding
- Real-time aggregation of MTD Revenue, Days Sales Outstanding (DSO), and Overdue ledgers.
- Interactive data visualizations utilizing Recharts.
- Unified notification hub for tracking unread alerts and workflow updates.
- Instantly exportable CSV reporting for external accounting integrations.

### 5. Internal Team Messaging
- **Direct & Group Chats:** Seamlessly communicate with team members in 1-on-1 direct messages or multi-participant group chats.
- **Admin Broadcasts:** Dedicated announcement channels where admins can blast updates to the entire organization (read-only for members).
- **Smart Chat Management:** Features include mute notifications, soft-deletion for members (hides history until new message), and hard-deletion capabilities for admins.

## ⚡ Performance & Benchmarks

Performance is treated as a core feature. We rely on React Server Components to offload computational weight from the client, ensuring near-instant page transitions even with dense data tables. 

<div align="center">
  <img src="public/LighthouseScore.JPG" alt="Lighthouse Performance Score" width="800" style="border-radius: 8px; margin: 20px 0;" />
  <p><i>Achieving near-perfect Lighthouse scores across Performance, Accessibility, Best Practices, and SEO.</i></p>
</div>

**Optimizations Include:**
- **Database Aggregation:** Replaced in-memory JavaScript `.reduce()` calculations with Prisma `.aggregate()`, offloading heavy math to Postgres and minimizing memory overhead.
- **Optimized Data Pagination:** Replaced massive unpaginated queries with targeted, database-level filtering (`take`, `orderBy`) to prevent over-fetching on dashboards.
- **Concurrent Execution:** Eliminated query waterfalls by wrapping independent database reads in `Promise.all`.
- **Database Indexing:** Maintained strict relational integrity and fast lookups through optimized foreign keys and indexes (e.g., user-based time tracking).
- Direct database connection pooling (with Prisma Accelerate maintained as an optional backup caching layer).
- Optimistic UI updates during drag-and-drop operations.
- Server-side JWT decryption to prevent blocking network requests to the Auth provider.

## 🖥 Application Interface

<details>
<summary><b>Click to expand screenshots</b></summary>

| Dashboard | Messages |
|:---:|:---:|
| <img src="public/SS1.JPG" width="100%" alt="Dashboard" /> | <img src="public/SS2.JPG" width="100%" alt="Messages" /> |

| Project Pipeline | Projects Management |
|:---:|:---:|
| <img src="public/SS3.JPG" width="100%" alt="Pipeline" /> | <img src="public/SS4.JPG" width="100%" alt="Projects" /> |

| Pre-Post Production | Clients Management |
|:---:|:---:|
| <img src="public/SS5.JPG" width="100%" alt="Pre-Post Production" /> | <img src="public/SS6.JPG" width="100%" alt="Clients" /> |

| Financials | Analytics |
|:---:|:---:|
| <img src="public/SS7.JPG" width="100%" alt="Financials" /> | <img src="public/SS8.JPG" width="100%" alt="Analytics" /> |

| Assets Library | Feedback |
|:---:|:---:|
| <img src="public/SS9.JPG" width="100%" alt="Assets Library" /> | <img src="public/SS10.JPG" width="100%" alt="Feedback" /> |

| Archived Projects |
|:---:|
| <img src="public/SS11.JPG" width="50%" alt="Invoices" />

</details>

## ⚙️ Local Development Guide

### Prerequisites
- Node.js 18+ and npm/yarn
- A PostgreSQL Database instance (e.g., Neon or Aiven)
- Clerk Application keys
- Resend API key

### 1. Repository Setup

```bash
git clone https://github.com/heisenberg-611/Cutline_Business_manager.git
cd Cutline_Business_manager
npm install
```

### 2. Environment Configuration

Create a `.env` file based on the required secrets:

```env
# Database Connection
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
# Optional backup Prisma Accelerate connection
# DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=..."
DIRECT_URL="postgresql://user:pass@host:port/db?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Routing Defaults
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/dashboard"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL="/sign-in"

# Resend Mailer
RESEND_API_KEY="re_..."
```

### 3. Database Initialization

```bash
# Push the schema and apply migrations
npx prisma migrate dev

# (Optional) Seed the database for testing
npm run seed
```

*Note: You must route Clerk webhooks locally to sync Organization data. Use the [Svix CLI](https://docs.svix.com/cli):*
```bash
svix listen http://localhost:3000/api/webhooks/clerk
```

### 4. Start the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 📁 Repository Structure

The codebase follows a Domain-Driven Design approach within the Next.js `app` directory context:

```text
src/
├── app/                  # Next.js App Router (Layouts & Routes)
├── components/           # Global UI components (shadcn/ui primitives)
├── lib/                  # Shared utilities (PDF gen, email services)
└── modules/              # Core Domain Modules
    ├── assets/           # Asset & licensing tracking
    ├── clients/          # Client CRM operations
    ├── core/             # Auth helpers & database configuration
    ├── financials/       # Invoicing & payment ledgers
    ├── projects/         # Kanban pipeline & task management
    └── settings/         # Tenant configurations & RBAC
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Please review the [Architecture & API Documentation](https://github.com/heisenberg-611/Cutline_Business_manager/wiki) in our Wiki before submitting pull requests to ensure alignment with existing patterns.

## 📄 License

This software is released under the [MIT License](LICENSE).

---
<p align="center">
  Developed by <a href="https://github.com/heisenberg-611">Dhrubojyoti</a>
</p>
