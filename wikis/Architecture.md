## Architecture: System Design & Structure

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
