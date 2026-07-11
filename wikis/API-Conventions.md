## API Conventions & Server Actions

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
