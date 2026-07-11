## Database Schema & Data Model

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
