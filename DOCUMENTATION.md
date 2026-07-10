# Cutline OS Documentation Suite

Welcome to the comprehensive documentation for **Cutline OS**. This guide provides developers, architects, and stakeholders with a deep understanding of the system's design, database structure, API conventions, and setup instructions.

---

## 1. Architecture: System Design & Structure

### High-Level Architecture: The Modular Monolith
Cutline OS is built as a **Modular Monolith** using Next.js 14+ (App Router). 

* **Why not Microservices?** For an MVP phase, a microservices architecture introduces unnecessary operational overhead, complex network latency, and deployment friction. 
* **The Monolithic Advantage:** A modular monolith allows us to keep all business logic in a single deployable unit (Vercel) while maintaining strict logical boundaries between features (e.g., `financials`, `projects`, `clients`). 
* **Benefits:** 
  - Ensures rapid iteration speed.
  - Guarantees end-to-end type safety across the entire stack via TypeScript and Prisma.
  - Keeps the codebase highly organized, making it trivial to extract into microservices later if scaling demands it.

### Multi-Tenancy Strategy
Cutline OS is a B2B SaaS application requiring strict data isolation between different studios, agencies, and freelancers.
* **Strict `businessId` Partitioning:** Every single tenant-specific table in the database includes a `businessId` column. This prevents cross-tenant data leakage at the database query level.
* **Clerk Organizations Integration:** We heavily leverage Clerk's "Organization" feature to represent a Cutline OS "Business":
  - When a user creates an account and an organization in Clerk, an asynchronous webhook (`organization.created`) fires.
  - This webhook securely communicates with our backend to create a corresponding `Business` record in our Postgres database with a matching ID.
* **Security Enforcement:** 
  - **Edge Protection:** Next.js Middleware protects routes at the edge, ensuring unauthenticated users cannot access dashboard layouts.
  - **Server-side Gating:** Data access is strictly gated by a `requireBusiness()` helper method. This method verifies the user's active Clerk `orgId`.
  - **Query Filtering:** Every single Prisma database query enforces `where: { businessId: orgId }`, meaning the database layer acts as a final firewall against data leakage.

### Folder Structure
We utilize a feature-based folder structure inside the Next.js `src/` directory to keep related code tightly coupled by domain rather than by file type.

```text
src/
├── app/                  # Next.js App Router (Routing, Pages, Layouts)
│   ├── (auth)/           # Clerk Auth pages
│   ├── api/              # Route Handlers (Webhooks, public APIs)
│   └── dashboard/        # Main authenticated application routes
├── components/           # Global shared UI components (shadcn/ui, layout shells)
├── lib/                  # Global utilities (formatting, constants)
└── modules/              # Feature modules (The core logic)
    ├── core/             # DB instance, global auth helpers
    ├── clients/          # Client CRM logic, actions, and specific components
    ├── projects/         # Pipeline, tasks, and project specific UI
    ├── financials/       # Invoicing, payments, and PDF generation
    ├── prodp/            # Production Hub (Intake & Post-Production reviews)
    ├── feedback/         # Client feedback forms, scoring, and testimonials
    └── settings/         # Business configuration and preferences
```
* **Why this structure?** Keeping Server Actions, specialized UI components, and data fetching logic co-located within `src/modules/<feature>/` prevents the `app/` router from becoming bloated. It enforces domain-driven design, ensuring that the "Financials" team doesn't accidentally entangle code with the "Clients" team.

### Design System & UI
* **shadcn/ui & Tailwind CSS:** We use Tailwind for utility-first, rapid styling and shadcn/ui for accessible, unstyled component primitives that we heavily customize to fit our brand identity.
* **Design Inspiration:** 
  - *Linear:* We aimed for extreme speed, deep keyboard accessibility, and a premium dark mode.
  - *Stripe:* We drew from Stripe's financial clarity, beautiful typography, and exact currency formatting logic.
  - *Notion:* We utilized Notion's flexibility and clean information hierarchy for our project pipelines.
* **UI Tokens:** We utilize a refined color palette (zinc/slate scales), minimal borders, and subtle glassmorphism to achieve a premium "Operating System" feel.

---

## 2. Database Schema & Data Model

### Core Principles

#### Strict Multi-Tenancy
* Every tenant-specific table contains a `businessId` column. 
* This is an absolute requirement for B2B SaaS isolation, ensuring compliance and data privacy. 
* The `businessId` maps exactly to the Clerk Organization ID.

#### Financial Math Rule
Floating-point arithmetic introduces microscopic rounding errors that are entirely unacceptable in financial applications (e.g., $0.10 + $0.20 = $0.30000000000000004).
* **Cents/Minor Units:** All monetary values are strictly stored as `Int` representing minor units (e.g., cents). An invoice for $100.50 is stored in the database as `10050`.
* **Explicit Currencies:** Currency codes (e.g., 'USD', 'EUR') are stored explicitly at the `Business` level (as a default) and can be overridden at the `Invoice` level if billing international clients.
* **Display Formatting:** All database integer amounts are divided by 100 on the frontend right before being formatted by `Intl.NumberFormat`.

#### Auditability & Integrity
* **Soft Deletes:** Financial records (Invoices, Payments) should rarely be hard-deleted. We rely on statuses (e.g., `VOID`, `DRAFT`) to filter records, ensuring historical financial ledgers remain intact.
* **Cascading:** We use `onDelete: Cascade` carefully. Deleting a `Business` wipes all associated data for GDPR compliance, but deleting a `Client` might require re-assigning or voiding invoices rather than deleting them, depending on the strict business rules.

#### Sequential Custom IDs
* While all tables use standard `cuid()` for primary keys to ensure global uniqueness and prevent enumeration attacks, we generate human-readable sequential IDs (`displayId`) for client-facing entities like Projects (`PRJ-001`) and Clients (`CL-001`).
* This requires counting existing records scoped to the `businessId` during creation to increment the ID properly, ensuring each tenant has their own clean sequence.

### Core Entities Overview

| Entity | Description | Key Relationships |
|--------|-------------|-------------------|
| **Business** | The root tenant (Clerk Organization). | Has many Clients, Projects, Invoices, Assets. |
| **Client** | A customer of the Business. | Belongs to Business. Has many Projects, Invoices. |
| **Project** | A unit of work moving through the pipeline. | Belongs to Business, Client. Has one WorkflowStage. |
| **WorkflowStage** | Customizable Kanban columns/stages. | Belongs to Business. Has many Projects. |
| **Invoice** | A financial record billing a Client. | Belongs to Business, Client. Has many LineItems, Payments. |
| **Asset** | Licenses, fonts, or stock footage. | Belongs to Business. Linked to many Projects (M:N). |
| **FeedbackRequest** | A secure tokenized request sent to clients. | Belongs to Business, Client, Project. Has one FeedbackResponse. |
| **FeedbackResponse** | The submitted client feedback and scores. | Belongs to Business, FeedbackRequest. Has one Testimonial. |
| **ReviewRequest** | A Post-Production revision request. | Belongs to Business, Client, Project. |

### Indexing & Performance
* **Multi-tenant Indexing:** Since almost all queries filter by `businessId`, composite indexes starting with `businessId` (e.g., `@@index([businessId, clientId])`) are heavily utilized to ensure extremely fast tenant-scoped lookups.
* **Foreign Keys:** Indexes are placed on all foreign keys to speed up relational joins under the hood.
* **Pagination:** For high-volume tables (like communication logs or system audits), we use cursor-based pagination (using the `id` or `createdAt` field) rather than offset-based pagination to maintain performance at scale.

---

## 3. API Conventions & Server Actions

### Server Actions vs. Route Handlers
Cutline OS relies heavily on Next.js Server Actions to bridge the client and server seamlessly without writing boilerplate REST APIs.

#### When to use Server Actions
* **Mutations:** Form submissions and data mutations (e.g., `createInvoice`, `updateClient`).
* **UI Triggers:** Actions triggered directly from UI interactions (e.g., a button click to `deleteAsset`).
* **Location:** Server Actions are defined in `actions.ts` files inside the respective `src/modules/<feature>/` directories and run securely and exclusively on the server.

#### When to use Route Handlers (`src/app/api/`)
* **Webhooks:** Receiving asynchronous events from third-party services (Clerk, Stripe, Resend).
* **External API Integrations:** When we need to expose a public or semi-public endpoint (e.g., a client viewing a public invoice PDF via a `GET` request).
* **Cron Jobs:** Scheduled tasks triggered by external schedulers (e.g., Vercel Cron).

### Authentication & Authorization
Authentication is handled entirely by Clerk.
* **Edge Protection:** `middleware.ts` ensures no unauthenticated user can access the `/dashboard` routes, redirecting them to the sign-in page instantly.
* **Data Authorization:** Inside every Server Action or data-fetching function, we call a helper like `requireBusiness()`. 
  - This helper extracts the `orgId` from Clerk's `auth()` object. 
  - If the user does not have an active organization, it throws a critical error. 
  - This guarantees that operations are securely scoped to the correct tenant at all times.

### Webhooks
We use webhooks to synchronize Clerk's user/organization state with our PostgreSQL database.
* **`organization.created`:** Automatically creates a new `Business` record in our DB.
* **`organization.updated` / `deleted`:** Keeps the `Business` profile in sync with our DB.
* **Security:** All webhooks in `src/app/api/webhooks/clerk/route.ts` are heavily verified using the `svix` package. This ensures the payload actually came from Clerk and wasn't spoofed by an attacker.

### Validation
*Rule of thumb: Never trust client input.*
* **Zod Schemas:** We use **Zod** for all schema validation.
* **Execution:** Every Server Action must validate the incoming payload against a Zod schema before executing database queries. This prevents malformed data, unexpected nulls, and malicious SQL injection attempts from reaching Prisma.

### Data Export Architecture
* To allow seamless data portability, we utilize client-side CSV generation for exporting table data (e.g., Projects, Invoices). 
* This offloads the computational cost of generating large Blobs to the user's browser, preventing server memory spikes, and allows immediate downloads without needing temporary cloud storage or presigned URLs.

---

## 4. Performance & Latency Optimizations

Cutline OS implements strict performance patterns to ensure near-instant navigation and snappy UI updates, particularly crucial for the dense data dashboards.

### 1. Database Query Optimization
* **Selective Fetching:** We avoid massive relational payloads (like pulling `lineItems` for every invoice in a list, or `assets` for archived projects). Queries are strictly scoped to minimize payload size and parsing overhead.
* **Prisma Accelerate Caching:** Heavy analytical queries (like `getStudioHealth` or `getRevenueTrend`) utilize Prisma's edge caching (`cacheStrategy: { ttl: 30 }`). 
* **Targeted Cache Invalidation:** Caching is explicitly **disabled** on highly interactive CRUD lists (like Kanban boards or Client lists) to prevent "snapback" issues during optimistic drag-and-drop UI updates.

### 2. Next.js App Router Architecture
* **Suspense Boundaries:** Pages are wrapped in native Next.js `<Suspense>` boundaries via the `loading.tsx` file. This ensures that route transitions happen instantly on click, and the heavy database fetching streams into the page asynchronously rather than blocking the layout.
* **Perceived Performance:** While data streams in, users are presented with a highly polished CSS "Shimmer Sweep" skeleton loader (inspired by Vercel/Linear), requiring zero JavaScript to render.

### 3. Authentication Bottleneck Prevention
* **Zero Network Latency Auth:** Server components strictly use the `auth()` helper to decrypt the JWT locally (2-5ms). We strictly prohibit the use of `currentUser()` in blocking server components, as it makes a round-trip network request to Clerk's API, causing 150-300ms of unnecessary latency on every render.
* **Client-Side Offloading:** Non-critical user profile data (like rendering a first-name greeting) is offloaded to Client Components using the `useUser()` hook to keep the Server Component completely unblocked.

---

## 5. Developer Onboarding & Setup

Welcome to the Cutline OS repository! Follow this guide to get your local development environment up and running smoothly.

### Prerequisites
Before you begin, ensure you have the following installed and set up on your machine:
* **Node.js** (v18 or newer)
* **PostgreSQL** (Running via a Local instance, Docker, or a cloud provider like Aiven/Supabase)
* **Clerk Account** (For Authentication & Organizations functionality)
* **Resend Account** (For Email sending integrations)

### Environment Variables
Create a `.env.local` file in the root of the project. Use the following template to wire up the integrations:

```env
# Database Connection (Replace with your actual Postgres URL)
DATABASE_URL="postgresql://user:password@localhost:5432/cutline_db"

# Clerk Auth (Development Keys - Get these from your Clerk Dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk Webhook Secret (Generate via Svix in Clerk Dashboard Webhooks section)
CLERK_WEBHOOK_SECRET=whsec_...

# Resend API Key (For transactional emails)
RESEND_API_KEY=re_...
```
*Note: Never commit your `.env.local` file to version control. Only use "Development" keys for local testing to avoid polluting production data.*

### Installation Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/cutline-os.git
   cd cutline-os
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Run Prisma Migrations:**
   This will apply the schema to your Postgres database and generate the Prisma Client, giving you full TypeScript autocomplete for the database.
   ```bash
   npx prisma migrate dev
   ```
4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.



### Deployment
Cutline OS is optimized for zero-config deployment on Vercel.
1. Connect your GitHub repository to your Vercel account.
2. Add all the environment variables in the Vercel dashboard. **CRITICAL: Make sure to use Production keys** for Clerk and Resend, and your production Database URL.
3. Ensure your `build` command is set to: `prisma generate && next build`.
4. Vercel will automatically deploy the `main` branch on every push.
