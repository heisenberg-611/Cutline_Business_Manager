# Cutline Business Manager

Cutline Business Manager is a modern, full-stack B2B SaaS application designed to help creative studios, freelancers, and small businesses manage their entire workflow—from CRM and pipeline management to professional invoicing and asset tracking.

## 🚀 Features

- **Multi-Tenant Architecture**: Full multi-organization support powered by Clerk, ensuring completely isolated tenant data partitions (`businessId`).
- **Comprehensive Financials Engine (V2)**:
  - Create and manage invoices (Draft, Sent, Paid, Partially Paid, Overdue, Void).
  - Track payments, credit notes, and aging buckets.
  - Auto-generate professional **PDF Invoices** on the fly.
  - **1-Click Email Delivery**: Securely send beautiful React-based invoice emails directly to clients using the Resend API.
  - **Auto-Billing Assets**: When a project is invoiced, attached assets (stock footage, font licenses) are automatically pulled into the invoice as billable line items!
- **Studio Health Dashboard**: Get instant insights into MTD Revenue, Days Sales Outstanding (DSO), Overdue Invoices, and At-Risk Deadlines.
- **Client CRM**: Manage client directories, track preferred channels, and maintain internal 5-star lifetime value ratings.
- **Project Kanban Pipeline**: Visual drag-and-drop workflow stages to track active projects from lead to final delivery.
- **Asset & License Vault**: Store and manage studio assets (Music, Fonts, LUTs, SFX) including their costs and license expiration dates.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
- **Language**: TypeScript
- **Database**: PostgreSQL (hosted on Aiven) with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: [Clerk](https://clerk.com/) (Next.js server-side & webhook integrations)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Emails**: [Resend](https://resend.com/) & [@react-email](https://react.email/)
- **PDF Generation**: [@react-pdf/renderer](https://react-pdf.org/)

## 🏗️ Getting Started

### Prerequisites

You will need the following API keys and services to run this app locally:
- **Aiven / PostgreSQL**: A valid Postgres database connection string.
- **Clerk**: Publishable key, Secret key, and Webhook secret.
- **Resend**: API key for transactional emails.

### 1. Environment Variables

Create a `.env` file in the root directory and populate it with your keys:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/defaultdb?sslmode=require"

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
WEBHOOK_SECRET="whsec_..."

# Clerk Redirects
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard/select-business"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard/select-business"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Resend Emails
RESEND_API_KEY="re_..."
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup the Database

Push the Prisma schema to your database to create the necessary tables:

```bash
npx prisma db push
```

*Note: The system requires Clerk webhooks to sync Business and User data into the database. You must use `svix` or a similar tool to forward webhooks to `http://localhost:3000/api/webhooks/clerk` during local development.*

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 📝 License

Proprietary Software. All rights reserved.
