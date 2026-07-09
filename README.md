<div align="center">
  <img src="public/cutline-logo.JPG" alt="Cutline OS" width="600" style="border-radius: 12px; margin-bottom: 20px;" />
</div>

# Cutline OS

> A premium, full-stack SaaS application built for **all creative professionals**—designers, photographers, video editors, copywriters, and creative agencies. Manage your projects, clients, invoicing, and assets in one beautiful, intuitive platform that lets you focus on what you do best: being creative.

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Aiven-336791?logo=postgresql&logoColor=white)](https://aiven.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


<a href="https://www.cutlin.tech">
  <img src="https://img.shields.io/badge/🚀_Visit_Cutline_OS-4F46E5?style=for-the-badge&logoColor=white" alt="Visit Cutline OS" />
</a>

---

[View Demo](#-screenshots) • [Get Started](#-getting-started) • [📖 Cutline for Dummies](CUTLINE_FOR_DUMMIES.md) • [Features](#-features) • [Tech Stack](#-tech-stack)

</div>

---

## 📸 Screenshots

Experience the elegant, professional interface of Cutline OS:

<table width="100%">
  <tr>
    <td width="50%" align="center">
      <img src="public/SS1.JPG" width="100%" />
      <br><b>Dashboard</b>
    </td>
    <td width="50%" align="center">
      <img src="public/SS2.JPG" width="100%" />
      <br><b>Project Pipeline</b>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="public/SS3.JPG" width="100%" />
      <br><b>Projects Management</b>
    </td>
    <td width="50%" align="center">
      <img src="public/SS4.JPG" width="100%" />
      <br><b>Clients Management</b>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="public/SS5.JPG" width="100%" />
      <br><b>Financials Management</b>
    </td>
    <td width="50%" align="center">
      <img src="public/SS6.JPG" width="100%" />
      <br><b>Reports and Analytics</b>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <img src="public/SS7.JPG" width="100%" />
      <br><b>Assets Management</b>
    </td>
    <td width="50%"></td>
  </tr>
</table>

---

## ✨ Features

### 🏢 **Multi-Tenant Architecture & RBAC**
- **Business Isolation**: Complete business isolation with Clerk-powered multi-organization support. Each organization's data is completely partitioned using `businessId`.
- **Role-Based Access Control (RBAC)**: Secure routing and layout logic for `org:admin` vs `org:member`. Admins have full control, while members are securely restricted to a read-only view of the project pipeline.

### 💼 **Professional Dashboard**
- **Business Health Dashboard**: Real-time insights into MTD Revenue, Days Sales Outstanding (DSO), Overdue Invoices, and At-Risk Deadlines
- **Global Command Palette** (Cmd+K): Instantly search and navigate across projects, clients, invoices, and assets
- **Calm, Professional UI**: Inspired by Linear and Stripe with a true-gray aesthetic

### 👥 **CRM & Client Management**
- Comprehensive client directory with full contact information
- Track preferred communication channels (Email, Slack, WhatsApp)
- **5-Star Rating System**: Rate clients for lifetime value analysis, with smart sorting bringing your top-rated clients to the top of the list instantly.
- Client performance insights and project history

### 📊 **Advanced Financials Engine**
- **Invoice Management**: Draft, Sent, Paid, Partially Paid, Overdue, and Void statuses
- **Payment Tracking**: Record payments via multiple methods (Bank Transfer, Credit Card, Cash, Check) with precise timestamping automatically reflected on the UI and generated PDFs.
- **Credit Notes & Reminders**: Manage refunds and automatic payment reminders
- **Auto-Billing Assets**: Attached business assets are automatically included as billable line items
- **Professional PDF Invoices**: Generated client-side or server-side with ISO code fallbacks for global currency safety
- **1-Click Email Delivery**: Send beautiful React-based emails via Resend API
- **Public Payment Portals**: Client-facing public invoice pages (`/invoices/[id]/pay`) with customizable payment instructions
- **Global Currency Support**: Native currency symbols ($, ₹, ৳, £) across all web dashboards and emails

### 📹 **Project & Pipeline Management**
- **Kanban Pipeline**: Visual drag-and-drop workflow with customizable stages
- **Stage Tracking**: Monitor project progression from concept to final delivery
- **Time Tracking**: Billable and non-billable hours per project
- **Project Notes**: Capture shots, client feedback, ideas, and todos
- **Deadline Tracking**: Never miss a deadline with visual priority indicators

### 🎵 **Asset & License Vault**
- Manage creative assets (Music, Fonts, LUTs, Plugins, Stock Footage, SFX, Vectors, Templates)
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
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router & Webpack) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) via [Aiven](https://aiven.io/) |
| **ORM** | [Prisma](https://www.prisma.io/) |
| **Auth** | [Clerk](https://clerk.com/) |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS v4](https://tailwindcss.com/) |
| **Emails** | [Resend](https://resend.com/) + [@react-email](https://react.email/) |
| **PDF Generation** | [@react-pdf/renderer](https://react-pdf.org/) |
| **Drag & Drop** | [@hello-pangea/dnd](https://react-beautiful-dnd.org/) |
| **Database Seeding** | [Prisma Seed Scripts](https://www.prisma.io/docs/orm/more/recipes/seed-database) |

### Important Considerations for Raw SQL vs. Prisma

- **@updatedAt Triggers**: Prisma handles `@updatedAt` automatically at the ORM level. In raw PostgreSQL, you must use a trigger to automatically update the timestamp on row modifications. I have included a reusable trigger function and applied it to all relevant tables.
- **@default(cuid())**: PostgreSQL does not have a native CUID generator. In raw SQL, the id columns are defined as `VARCHAR`, and your application layer (e.g., Node.js/Prisma client) must generate and insert the CUID string. (Alternatively, you can change the type to UUID and use `gen_random_uuid()` if you prefer native Postgres UUIDs).
- **Naming Conventions**: Prisma's camelCase fields have been converted to standard PostgreSQL snake_case columns, and table names match your `@@map()` directives.

<div align="center">
  <img src="public/Schema.webp" alt="Database Schema" width="100%" />
</div>

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
npm run dev           # Start dev server with Webpack

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
│   │   ├── dashboard/          # Internal Dashboard pages
│   │   └── invoices/           # Public client-facing invoice pages
│   ├── middleware.ts           # Centralized RBAC and routing security
│   ├── components/
│   │   └── ui/                 # shadcn/ui components
│   ├── modules/                # Feature modules (Domain Driven Design)
│   │   ├── clients/            # Client management
│   │   ├── projects/           # Project management
│   │   ├── financials/         # Invoicing, reporting & payments
│   │   ├── assets/             # Asset management
│   │   ├── workflow/           # Pipeline & stages
│   │   └── core/               # Database & auth
│   ├── emails/                 # React email templates (Resend)
│   └── lib/                    # Utilities & helpers
│       ├── pdf/                # PDF Generation logic & templates
│       └── emails/             # Email dispatch services
├── prisma/
│   └── schema.prisma           # Database schema
├── scripts/
│   ├── seed.ts                 # Seed script
│   ├── reset-db.ts             # Reset script
│   └── SEED_README.md          # Seed documentation
└── public/                     # Static assets
```

---

## 🧠 What I Learned

Building Cutline OS has been an incredible journey. Here are some of the key technical takeaways from this project:

- **Next.js App Router & Server Actions**: Deepened my understanding of React server components, data fetching, and handling secure database mutations efficiently.
- **Multi-Tenant Architecture**: Learned how to architect a robust multi-tenant system, partitioning data securely using Clerk Organizations and Prisma (`businessId`).
- **Webhook Synchronization**: Implemented real-time data syncing between Clerk (Authentication) and the PostgreSQL database using Svix.
- **Premium UI & Interactions**: Mastered crafting a professional, high-performance interface using Tailwind CSS v4, shadcn/ui, and implementing complex interactions like the global command palette (Cmd+K) and drag-and-drop Kanban boards.
- **PDF Generation & Email Delivery**: Gained hands-on experience generating dynamic PDF invoices and designing React-based transactional emails with Resend.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/heisenberg-611/Cutline_Business_manager/issues).

---

## 📄 License

This project is [MIT](LICENSE) licensed. © 2026 Dhrubojyoti

---

## 👨‍💻 Contributor

**Dhrubojyoti** - *Lead Developer & Architect*

---

## 📚 Documentation

For a deep dive into the system architecture, database schema, API conventions, and contributing guidelines, please refer to our comprehensive documentation suite:
- [Read the Cutline OS Documentation](DOCUMENTATION.md)
