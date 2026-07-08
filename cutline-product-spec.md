# Cutline — The Business Operating System for Professional Video Editors

*(Working name — swap freely. "Cutline" plays on the editor's timeline cut and the idea of a lifeline for the business side of editing.)*

---

## 0. Why This Document Exists

Every existing tool a freelance/professional video editor uses today was built for someone else first:

- Frame.io / Trello / Asana — built for generic creative review or generic PM, not editing-specific pipelines.
- QuickBooks / Wave / FreshBooks — built for accountants, not for someone who bills per-delivery-format and eats revision cycles.
- Notion — infinitely flexible, but the editor has to *build* their own system from scratch, and it never talks to invoices or footage metadata.

None of them understand that a video editor's actual unit of work is not a "task" — it's a **shot-to-delivery pipeline** with footage, proxies, versions, client rounds, licenses, and money all tangled together. Cutline is built around that unit of work.

---

## 1. Understanding the Real Workflow (Before Designing Anything)

### 1.1 A day in the life — composite persona

**Maya, freelance YouTube/branded-content editor, solo + occasional 1 collaborator.**

| Time | What actually happens | What tool she reaches for today | The friction |
|---|---|---|---|
| 8:40 AM | Checks WhatsApp/Email/Slack across 6 active clients for overnight footage drops or feedback | 3 different apps | No single "what needs me right now" view |
| 9:15 AM | Downloads 80GB raw footage from a client's Drive, starts proxy generation | Finder + Premiere | No record of where footage lives, no backup checklist |
| 10:00 AM | Opens rough cut for Client B, realizes revision request contradicts brief | Email thread scroll | No scope-change flag, risks working for free |
| 11:30 AM | Client A approves invoice from 3 weeks ago — finally pays | Bank app | No auto-reconciliation against outstanding invoices |
| 1:00 PM | Starts color-grading Client C's project, uses 2 LUTs she isn't sure are licensed for commercial use | Memory | No asset/license registry |
| 3:00 PM | Client D sends "just one small change" — 4th time this week | Text | No pattern tracking of scope creep or revision counts |
| 5:00 PM | Needs to quote a new prospect for a 10-minute doc-style video | Gut feeling | No historical data on how long similar projects actually took |
| 8:00 PM | Tries to figure out if this month was actually profitable after software subscriptions, stock licenses, and a new SSD | Spreadsheet, abandoned | No real-time profit view |

### 1.2 The core insight

A professional editor's business has **three interlocking spines**, and today's tools only ever handle one at a time:

1. **The Pipeline Spine** — footage → cut → grade → mix → export → review → revise → deliver → archive.
2. **The Relationship Spine** — who is this client, what do they expect, how happy are they, will they pay on time, will they come back.
3. **The Money Spine** — what was quoted, what was scoped, what changed, what's owed, what's overdue, what's actually profitable per hour.

Every feature in Cutline is designed to keep these three spines **cross-referenced**, not siloed. A revision isn't just a task — it's a pipeline event, a relationship signal, and potentially a billable line item, all at once. That cross-referencing is the actual product.

---

## 2. Product Vision & Differentiation

**Cutline is not a project manager with a video skin. It's a vertical business OS** where the atomic object is a **Project**, and every other module (money, time, files, notes, calendar) is a lens on that same Project and its related Client.

Design principles:

- **Editing-native language.** Statuses are "Rough Cut," "Color," "Client Review" — not "To Do / Doing / Done."
- **Money is never a separate app.** Every pipeline stage can trigger a financial event (deposit due, milestone invoice, final invoice).
- **The client relationship compounds.** Every project feeds a client's history, rating, and lifetime value — repeat clients should visibly get easier to manage over time.
- **AI is contextual, not bolted on.** AI features only appear where they save a real decision (a quote, a risk flag, a draft message) — never as a gimmick chat window floating disconnected from data.

---

## 3. Information Architecture (Module Map)

```
Workspace (Business)
 ├─ Clients
 │   └─ Contacts, Communication Log, Rating, Lifetime Value
 ├─ Projects
 │   ├─ Pipeline (Workflow Engine)
 │   ├─ Milestones & Revisions
 │   ├─ Assets & Files
 │   ├─ Notes (shot/client/idea/voice)
 │   └─ Budget (linked to Financials)
 ├─ Financials
 │   ├─ Invoices, Payments, Expenses
 │   ├─ Tax Ledger
 │   └─ Profitability Reports
 ├─ Time Tracking
 ├─ Asset Library (licenses, LUTs, fonts, plugins, SFX, stock)
 ├─ Content Calendar (creator-focused clients)
 ├─ Analytics & Reports
 ├─ Notifications Engine
 ├─ AI Layer (cross-cutting)
 └─ Settings (Business, Team, Roles, Themes)
```

Every module below follows the same format the brief asked for: **why it exists → core features → data model → API surface → frontend pages/components → scalability notes.**

*(Note: per your instruction, no actual code, SQL, or implementation syntax below — data models are described as structured tables, and API surfaces are described as endpoint contracts, not code.)*

---

## 4. Client Management

**Why it exists:** Repeat clients are the actual profit engine of a freelance editing business — acquiring a new client costs 3-5x more (in unpaid pitching/negotiation time) than retaining one. Yet most editors track clients in their head. Making the client — not the project — a first-class, persistent entity is what allows rating, LTV, and communication-pattern features to exist at all.

**Core features**
- Client database with company/individual distinction, multiple contacts per client
- Preferred contact channel and preferred delivery method (Drive link vs. WeTransfer vs. direct upload) stored once, reused everywhere
- Full communication history log (manually logged or synced from email/Slack)
- 1–5 star internal client rating (private, never shown to client) covering payment reliability, clarity of briefs, respectfulness of scope
- Repeat-client detection and lifetime value tracking
- Client-specific rate card overrides

**Data model**

| Table | Key Fields | Relationships |
|---|---|---|
| `clients` | id, business_id, display_name, company_name, industry, preferred_channel, preferred_delivery_method, internal_rating, tags, created_at | belongs to `businesses`; has many `projects`, `contacts`, `communication_logs` |
| `client_contacts` | id, client_id, name, role, email, phone, is_primary | belongs to `clients` |
| `communication_logs` | id, client_id, project_id (nullable), channel, summary, sentiment_score, logged_at | belongs to `clients`, optionally `projects` |
| `client_rate_overrides` | id, client_id, service_type, rate, currency | belongs to `clients` |

**API surface**

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /clients | List clients with filters (rating, tags, active projects) |
| POST | /clients | Create client |
| GET | /clients/{id} | Client profile incl. LTV, project history |
| POST | /clients/{id}/communications | Log a communication event |
| GET | /clients/{id}/lifetime-value | Computed LTV summary |
| PATCH | /clients/{id}/rating | Update internal rating |

**Frontend pages/components:** Client Directory (table + card view toggle), Client Profile page (tabs: Overview, Projects, Communications, Financials), Quick-Add Client modal, Rating widget, "Repeat Client" badge component.

**Scalability notes:** Client table is the natural tenant-partition key alongside `business_id`; communication log will grow fastest — plan for it to be the first table needing archiving/pagination cursors rather than offset pagination.

---

## 5. Project Management

**Why it exists:** The Project is the atomic unit that ties pipeline, money, files, and communication together. Generic Kanban tools treat a "card" as disposable; here a Project is closer to a persistent case file.

**Core features**
- Status derived from the workflow engine (see §10) rather than a separate hand-maintained status field
- Timeline with milestone dates, computed dependencies
- Revision counter with type (minor/major) and billing flag
- Deadline and priority (with priority auto-suggested from deadline proximity × client rating × deal size)
- Deliverables checklist (per platform/format)
- Team member assignment (for editors with a second editor, colorist, or VA)
- Asset organization (linked footage/proxy/LUT/font references)

**Data model**

| Table | Key Fields | Relationships |
|---|---|---|
| `projects` | id, business_id, client_id, title, type, priority, deadline, status_stage_id, budget_id, created_at | belongs to `clients`; has many `milestones`, `revisions`, `deliverables`, `project_members` |
| `milestones` | id, project_id, name, due_date, completed_at, invoice_trigger (bool) | belongs to `projects` |
| `revisions` | id, project_id, round_number, type (minor/major), is_billable, requested_at, resolved_at, notes | belongs to `projects` |
| `deliverables` | id, project_id, platform, spec_profile, file_ref, delivered_at | belongs to `projects` |
| `project_members` | id, project_id, user_id, role (editor/colorist/assistant) | belongs to `projects`, `users` |

**API surface**

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /projects | List/filter projects (by stage, client, deadline risk) |
| POST | /projects | Create project (optionally from a template) |
| GET | /projects/{id} | Full project detail |
| POST | /projects/{id}/revisions | Log a new revision round |
| POST | /projects/{id}/milestones/{id}/complete | Mark milestone complete, optionally trigger invoice |
| GET | /projects/{id}/timeline | Computed Gantt-style timeline |

**Frontend pages/components:** Project List (table/Kanban/timeline view switch), Project Detail page (tabs: Pipeline, Files, Notes, Revisions, Budget, Communications), Milestone timeline component, Revision counter badge, Priority indicator.

**Scalability notes:** `status_stage_id` should reference the workflow engine's stage table rather than a hardcoded enum, so custom templates don't require schema migrations.

---

## 6. The Workflow / Pipeline Engine — Deep Dive

This is the single most important module in the product, because it's the thing that makes Cutline feel *built by editors, for editors* rather than a re-skinned Trello.

**Why it exists:** Editors already think in stages — raw footage, sync, cut, grade, mix, export, review, revise, deliver, archive. Forcing that into generic "To Do / In Progress / Done" columns throws away real signal (a project stuck in "Client Review" for 9 days is a different risk than one stuck in "Color Grading" for 9 days).

**Default stage template (fully editable):**

1. Raw Footage Received
2. Proxy Generated
3. Sync Completed
4. Rough Cut
5. Fine Cut
6. Color Grading
7. Audio Mixing
8. Motion Graphics
9. Subtitles/Captions
10. Export
11. Uploaded for Review
12. Client Review
13. Revision Round(s) — repeatable
14. Final Delivery
15. Archived

**Key design decisions:**
- Templates are **per-project-type**, not global — a "Wedding Film" template, a "YouTube Long-Form" template, and a "Corporate Ad" template can each have a different stage list.
- Each stage can optionally carry: an estimated duration (used for deadline-risk prediction), an auto-notification rule, and a billing trigger (e.g., "Fine Cut approved" fires a 50% milestone invoice).
- Stages support **branching** for revision loops — "Client Review" can loop back to "Fine Cut" or "Color Grading" depending on what the revision note tags.
- A visual **Pipeline Board** (Kanban-like, but stages are the editor's actual vocabulary) is the default project view, with an optional **Timeline/Gantt** view for deadline-sensitive work.

**Data model**

| Table | Key Fields | Relationships |
|---|---|---|
| `workflow_templates` | id, business_id, name, project_type | has many `workflow_stages` |
| `workflow_stages` | id, template_id, name, order_index, estimated_hours, billing_trigger (bool) | belongs to `workflow_templates` |
| `project_stage_history` | id, project_id, stage_id, entered_at, exited_at | tracks actual time-in-stage per project, feeds analytics |

**API surface**

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /workflow-templates | List available templates |
| POST | /workflow-templates | Create a custom template |
| POST | /projects/{id}/advance-stage | Move project to next/specific stage |
| GET | /projects/{id}/stage-history | Time-in-stage breakdown |

**Frontend pages/components:** Pipeline Board (drag-and-drop stage columns), Template Builder (drag-to-reorder stage list with per-stage settings drawer), Stage History mini-chart on project detail.

**Scalability notes:** Because stages are data, not code, adding entirely new editing disciplines (e.g., a template for podcast editing or 3D/VFX pipelines) never requires an app update — this is the extensibility backbone the whole product's future depends on.

---

## 7. Financial Management

**Why it exists:** Freelance editors lose real money not from bad rates but from **invisible leakage** — unbilled revisions, forgotten expense deductions, and invoices nobody followed up on. This module's job is to make leakage visible and automatic to plug.

**Core features**
- Income/expense ledger with categorization (subscriptions, hardware, stock licenses, contractor payouts)
- Invoice generation tied directly to project milestones and billable revisions
- Payment reminders with configurable cadence and tone (gentle → firm)
- Outstanding payments dashboard, aging buckets (0-30/31-60/60+)
- Tax ledger with quarterly estimate tracking (jurisdiction-configurable, not filing itself)
- Per-project budget vs. actual spend/time
- Multi-currency support with historical FX-rate-aware reporting

**Data model**

| Table | Key Fields | Relationships |
|---|---|---|
| `invoices` | id, client_id, project_id, currency, subtotal, tax_amount, total, status, due_date, issued_at, paid_at | belongs to `clients`, `projects` |
| `invoice_line_items` | id, invoice_id, description, amount, source_type (milestone/revision/manual) | belongs to `invoices` |
| `payments` | id, invoice_id, amount, method, received_at | belongs to `invoices` |
| `expenses` | id, business_id, category, amount, currency, vendor, project_id (nullable), incurred_at, receipt_ref | belongs to `businesses`, optionally `projects` |
| `tax_estimates` | id, business_id, period, estimated_liability, jurisdiction | belongs to `businesses` |

**API surface**

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /invoices | Generate invoice (manual or auto from milestone) |
| GET | /invoices?status=overdue | Aging/outstanding view |
| POST | /invoices/{id}/remind | Send configured reminder |
| POST | /expenses | Log expense (with optional receipt upload) |
| GET | /reports/profitability?project_id= | Per-project profit after time+expense allocation |

**Frontend pages/components:** Invoice Builder (pulls milestones/revisions in automatically), Outstanding Payments table with aging color-coding, Expense Quick-Add (with receipt photo capture), Profit-per-Project card, Currency switcher.

**Scalability notes:** Store all monetary amounts in minor units (cents) with an explicit currency column, and snapshot the FX rate at transaction time rather than converting live later — this is the detail that prevents historical reports from silently changing after the fact.

---

## 8. Time Tracking

**Why it exists:** Editors chronically undercharge because they don't actually know how long tasks take. Time data is also the raw material for the AI estimation features later.

**Core features:** stopwatch per task/stage, manual entry with backfill, billable vs. non-billable toggle, time-per-client and time-per-project rollups, productivity report (hours by stage type, by time-of-day).

**Data model**

| Table | Key Fields | Relationships |
|---|---|---|
| `time_entries` | id, project_id, stage_id (nullable), user_id, started_at, ended_at, is_billable, source (stopwatch/manual) | belongs to `projects`, `users` |

**API surface:** `POST /time-entries/start`, `POST /time-entries/{id}/stop`, `GET /time-entries?project_id=`, `GET /reports/time-by-client`.

**Frontend pages/components:** Global floating stopwatch widget (persists across pages), Time-entry table with inline edit, Productivity heatmap (hour-of-day × day-of-week).

**Scalability notes:** Keep `time_entries` append-only (no destructive edits, only corrective entries) so productivity analytics and future payroll/contractor-payout features stay auditable.

---

## 9. File & Storage Management

**Why it exists:** Footage lives everywhere (local NAS, Drive, Dropbox, LTO tape) and "where is this project's footage" is a constant support-ticket-to-self. Cutline doesn't need to *host* the footage — it needs to be the **index** of where everything lives.

**Core features:** storage location registry per project (Drive link, Dropbox, NAS path, external drive label), backup status flag, file size tracking, archive location, "storage almost full" awareness (as a manual/estimated field or connector-based, depending on integration tier).

**Data model**

| Table | Key Fields | Relationships |
|---|---|---|
| `storage_locations` | id, project_id, provider (drive/dropbox/nas/physical), reference (link or path), size_estimate_gb, is_backed_up, is_archived | belongs to `projects` |

**API surface:** `POST /projects/{id}/storage-locations`, `PATCH /storage-locations/{id}` (mark backed up/archived), `GET /storage-locations?is_backed_up=false` (backup risk view).

**Frontend pages/components:** Storage tab on Project Detail (list of linked locations with provider icons), Backup Status badge, "At-Risk Projects" widget on dashboard (no backup flagged).

**Scalability notes:** Model this as a registry/index, not a file store, in v1 — actual cloud-storage API integrations (Drive/Dropbox connectors for live size/quota data) are a clean v2 add-on without touching the core schema.

---

## 10. Editor Notes

**Why it exists:** Ideas and shot notes happen mid-edit, not at a desk — this needs to be frictionless capture, not a form.

**Core features:** shot notes (timestamp-taggable), client notes, freeform editing ideas, todos, voice note capture with transcription.

**Data model**

| Table | Key Fields | Relationships |
|---|---|---|
| `notes` | id, project_id, type (shot/client/idea/todo), content, timestamp_ref (nullable), audio_ref (nullable), transcribed_text (nullable), created_at | belongs to `projects` |

**API surface:** `POST /projects/{id}/notes`, `GET /projects/{id}/notes?type=`, `POST /notes/{id}/transcribe`.

**Frontend pages/components:** Notes panel (sidebar on Project Detail), Voice Note recorder widget, Todo checklist view filtered from notes of type "todo."

**Scalability notes:** Treat notes as a generic append-only stream keyed by type — this is what later powers the "Second Brain Idea Bank" innovative feature (§13) as a cross-project search index on top of the same table.

---

## 11. Asset Management (Licenses & Resources)

**Why it exists:** Commercial license violations (music, stock footage, fonts) are a real legal/financial risk editors rarely track systematically until something expires mid-project.

**Core features:** registry of music licenses, fonts, LUTs, plugins, stock footage, SFX, motion graphics packs; expiry dates; which projects use which asset.

**Data model**

| Table | Key Fields | Relationships |
|---|---|---|
| `assets` | id, business_id, type (music/font/lut/plugin/stock/sfx/mogrt), name, vendor, license_type, expires_at, cost | belongs to `businesses` |
| `project_assets` | id, project_id, asset_id | join table between `projects` and `assets` |

**API surface:** `POST /assets`, `GET /assets?expiring_within=30d`, `POST /projects/{id}/assets/{asset_id}` (link usage).

**Frontend pages/components:** Asset Library (filterable table), Expiry timeline widget, "Used In" panel showing linked projects per asset.

**Scalability notes:** `project_assets` is the join table that later powers the "License Expiry Chain-Reaction Checker" innovative feature — flagging *delivered* projects whose licenses lapse is a query against this same table, no new schema needed.

---

## 12. Content Calendar (Creator/YouTube Clients)

**Why it exists:** Editors serving YouTubers/creators aren't just delivering a file — they're part of a publishing operation with SEO and cross-platform cut-downs.

**Core features:** upload/publish schedule, thumbnail tracking (with A/B variant notes), SEO checklist (title/description/tags), Shorts/Reels/TikTok cross-post tracking.

**Data model**

| Table | Key Fields | Relationships |
|---|---|---|
| `calendar_items` | id, project_id, platform, publish_at, thumbnail_ref, seo_checklist_json, status | belongs to `projects` |

**API surface:** `POST /projects/{id}/calendar-items`, `GET /calendar?range=`, `PATCH /calendar-items/{id}`.

**Frontend pages/components:** Calendar view (month/week), Platform-tagged chips, SEO Checklist inline component, Thumbnail preview grid.

**Scalability notes:** Keep `platform` as an open enum/tag rather than hardcoded list — new platforms appear faster than app release cycles.

---

## 13. Performance Analytics & Reports

**Why it exists:** Editors need the equivalent of a small-business dashboard: not vanity metrics, but the handful of numbers that predict whether next quarter is healthy.

**Core dashboard metrics:** monthly revenue, active clients, projects completed, average project duration, average revision count, revenue per client, revenue per category/project-type, editing hours logged, utilization rate (billable ÷ available hours).

**Reports generated:** monthly, annual, per-client, tax-period, revenue, expense — each exportable as PDF.

**Data model:** Analytics are computed views over existing tables (`invoices`, `time_entries`, `projects`, `project_stage_history`) rather than separate stored tables, with a materialized summary table for fast dashboard loads.

| Table | Key Fields | Purpose |
|---|---|---|
| `analytics_snapshots` | id, business_id, period, metric_key, value | periodic pre-computed rollups for fast dashboard rendering |

**API surface:** `GET /analytics/overview?period=`, `GET /reports/generate?type=&range=` (returns a generated PDF reference).

**Frontend pages/components:** Dashboard summary cards, Revenue trend chart, Utilization gauge, Report Generator page with template picker.

**Scalability notes:** Precompute nightly snapshots rather than aggregating live once the projects table grows past a few thousand rows per business — keeps the dashboard fast regardless of history depth.

---

## 14. Notifications Engine

**Why it exists:** The entire value of tracking deadlines/payments/licenses evaporates if nobody is nudged at the right moment.

**Triggers:** deadline approaching, payment overdue, revision pending response, backup missing, license expiring soon, storage nearing capacity (where integrated).

**Data model**

| Table | Key Fields | Relationships |
|---|---|---|
| `notification_rules` | id, business_id, trigger_type, threshold, channel (email/push/in-app) | belongs to `businesses` |
| `notifications` | id, user_id, rule_id, payload, read_at, sent_at | belongs to `users` |

**API surface:** `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notification-rules`.

**Frontend pages/components:** Notification bell/drawer, Notification Preferences page (per-trigger channel toggles).

**Scalability notes:** Route all triggers through a single rules table rather than hardcoding each notification type in application code — new trigger types (e.g., a future "client mood" alert) become a config row, not a deploy.

---

## 15. AI Features — Product Rationale

AI here should behave like a **quiet second-brain**, not a chatbot bolted onto the sidebar. Each feature below only exists because it removes a specific, real decision-fatigue point identified in §1.

| Feature | What it does | Why it's worth building |
|---|---|---|
| Automatic Project Estimation | Suggests a time/price estimate for a new project by comparing footage volume and project type against the editor's own historical data | Replaces gut-feel quoting, which is the #1 source of underpricing |
| Editing Time Prediction | Predicts remaining hours to completion mid-project based on stage history | Powers deadline-risk warnings before it's too late to renegotiate |
| Smart Invoice Generation | Auto-drafts an invoice from completed milestones/billable revisions, editable before sending | Removes the "forgot to bill for that extra revision" leakage |
| Revision Prediction | Flags clients/project-types with historically high revision counts at project creation | Lets the editor price in buffer time upfront |
| Expense Categorization | Auto-suggests a category from vendor name/description on manual expense entry | Makes tax-time categorization near-instant |
| AI Assistant | Contextual Q&A scoped to the editor's own data ("which client owes me the most?") | Faster than digging through tables manually |
| AI Project Summary | One-paragraph status summary per project, generated from stage history + notes | Useful for quick client check-ins and handoffs to assistants/collaborators |
| Client Communication Draft | Drafts a reply/update message from project status, in the editor's own established tone | Saves the daily grind of writing near-identical status updates |
| Deadline Risk Prediction | Cross-references stage velocity, revision count, and client responsiveness to flag at-risk deadlines | Turns three weak signals into one actionable warning |

**Cross-cutting technical note:** every AI feature should be explicitly *editable-before-committed* (drafts, not auto-sent messages/invoices) — professional trust in an editor-facing tool depends on the human staying the final approver, especially for anything client-facing or financial.

---

## 16. Modern Dashboard & Design System

**Inspiration synthesis, not just "look like X":**

- **From Linear:** speed and keyboard-first navigation; command palette (⌘K) for jumping to any client/project/invoice instantly.
- **From Notion:** flexible block-like project pages where notes, files, and pipeline sit together without feeling like separate "apps."
- **From Stripe:** the calm, data-dense but never cluttered financial dashboard language — clear hierarchy between the one big number and the supporting detail.
- **From Framer:** motion used purposefully (stage transitions, drag-and-drop feedback) rather than decoratively.

**Core dashboard layout (home screen):**
- Top: one "Studio Health" style summary strip (revenue this month, active projects, overdue invoices, at-risk deadlines)
- Left: persistent navigation (Clients, Projects, Financials, Calendar, Assets, Reports, Settings)
- Center: customizable widget grid — user can add/remove/reorder: Kanban snapshot, upcoming deadlines, revenue chart, recent communications, storage/backup risk
- Right (optional): quick actions panel (New Project, Log Time, Log Expense, Send Reminder)
- Command palette accessible from anywhere for power users

**View types available per module:** Table, Kanban/Pipeline board, Calendar, Timeline/Gantt, Card grid — user picks default per module.

**Theming:** light/dark, plus a small set of accent palettes; all components token-based (spacing/radius/type scale defined once) so future white-labeling for agencies with multiple in-house editors is a palette swap, not a redesign.

---

## 17. Settings, Teams & Multi-Tenancy

**Core features:** multiple businesses under one login (useful for editors running a personal brand + an agency), multiple editors/seats per business, roles (Owner, Editor, Colorist, Assistant, Client-limited-viewer), granular permissions (e.g., Assistant can log time but not see financials), keyboard shortcut map, theme preference per user.

**Data model**

| Table | Key Fields | Relationships |
|---|---|---|
| `businesses` | id, owner_user_id, name, default_currency | has many `users` (via membership), `clients`, `projects` |
| `business_memberships` | id, business_id, user_id, role, permissions_json | join table |
| `users` | id, name, email, theme_pref, shortcut_map_json | has many `business_memberships` |

**API surface:** `POST /businesses`, `POST /businesses/{id}/invite`, `PATCH /business-memberships/{id}/role`.

**Frontend pages/components:** Business Switcher (top-left, Linear-style), Team & Roles page, Permission matrix editor, Shortcut cheat-sheet overlay (triggered by `?`).

**Scalability notes:** `business_id` should be the tenant-partition key on every table in the system from day one — retrofitting multi-tenancy later is one of the most expensive mistakes to make post-launch.

---

## 18. Cross-Cutting Technical Architecture

**Recommended stack shape (architecture-level, not code):**

- **Frontend:** React/Next.js SPA with server-rendered marketing/auth pages; component library built on the design tokens in §16.
- **Backend:** A modular monolith to start (not microservices) — the modules in §4–§17 map naturally to internal service boundaries that *can* be split out later, but a solo-to-small-team SaaS does not need microservice overhead on day one.
- **Database:** A single relational database (Postgres-class) with `business_id` tenant partitioning as described above; this supports the strong relational integrity the financial and pipeline modules need.
- **Async/background jobs:** A job queue for notification triggers, nightly analytics snapshots, and AI-generation calls (these should never block the request/response cycle).
- **AI layer:** A thin internal service that mediates all LLM calls (estimation, drafts, summaries) so prompt/version changes don't require touching every feature that uses AI.
- **File/storage integrations:** Treated as connectors (Drive, Dropbox, NAS-agent) behind a common "storage provider" interface, so adding a new provider doesn't touch the core schema (as noted in §9).

**Scalability path:**
1. **MVP (single-tenant-feel, multi-tenant-schema):** Clients, Projects, Workflow Engine, basic Financials, Time Tracking, Notes.
2. **Growth phase:** Asset/License registry, Content Calendar, full Analytics, Notification rules engine, first AI features (estimation, invoice drafting).
3. **Scale phase:** Team roles/permissions maturity, storage-provider live integrations, full AI suite, white-label theming for agencies, benchmarking features that require cross-tenant anonymized aggregation (with an explicit opt-in and a separate anonymized analytics store, never querying live tenant data directly).

**Security/compliance notes worth flagging early (not solving here, just noting):** financial data implies basic invoicing/tax compliance research per target market; any cross-tenant benchmarking feature (§19.30) requires a genuinely anonymized, aggregated data pipeline — never a live cross-tenant query — to avoid leaking one client's financial data into another's benchmark view.

---

## 19. Thirty Innovative Features No Competitor Currently Offers

Grouped by the problem they solve, since "innovative" only means something in contrast to a real pain point.

**Client-relationship intelligence**
1. **Revision Fatigue Score** — analyzes tone across a client's revision requests over time to flag relationships trending toward burnout *before* the editor feels it themselves.
2. **Scope Creep Detector** — diffs revision requests against the original brief and auto-suggests a change-order line item when a request falls outside agreed scope.
3. **Client Response SLA / Silence Timer** — flags when a client has gone quiet past a configurable threshold and auto-drafts a polite nudge.
4. **Client Mood/Sentiment Tracker** — surfaces a rising-frustration signal from communication logs, distinct from the fatigue score above (this one is per-message, that one is pattern-over-time).
5. **Ghost Client Risk Score** — predicts likelihood a client will vanish mid-project based on historical payment and communication-response patterns.
6. **Referral Network Graph** — visualizes which past clients referred which new ones, quantifying the real dollar value of word-of-mouth.
7. **Client Lifetime Value Forecasting** — projects a client's future value from their project frequency/size trend, to prioritize account nurturing.

**Pipeline & quality-of-life**
8. **Deadline Domino Effect Visualizer** — shows how a delay on one project's milestone risks cascading into other clients' deadlines given shared editor/team bandwidth.
9. **Editor Twin Estimation Simulator** — simulates expected turnaround for a new quote by matching it against the closest historically similar past projects (by footage volume + revision pattern), not just a flat average.
10. **Voice-Note-to-Task Converter** — transcribes a spoken shot/idea note and auto-generates a timestamped checklist item.
11. **Delivery Format Compliance Matrix** — maintains a living spec sheet per platform/client and auto-checks exported file specs before allowing a project to be marked "Delivered."
12. **Second Brain Cross-Project Idea Bank** — a searchable, tag-indexed archive of editing ideas/techniques from every past project, resurfaced contextually in new projects of a similar type.
13. **Editing Style Fingerprint** — analyzes pacing, cut frequency, and color tendencies across past delivered work to build a reusable "house style" reference sheet — useful in onboarding a second editor or writing pitch decks.

**Money & risk**
14. **Studio Health Score** — one composite number (cashflow + utilization + client satisfaction + backlog risk) surfaced like a credit score for the business at a glance.
15. **Smart Rate Card Adjustor** — recommends rate increases based on realized profitability per project type, not just "raise rates once a year" guesswork.
16. **Multi-Currency Profitability Normalizer** — reports true profitability in home currency using the FX rate at time-of-transaction, not today's rate, so historical reports never silently shift.
17. **AI Contract Risk Reader** — scans a client-supplied contract/brief for one-sided clauses (unlimited revisions, unclear ownership) and flags them before signing.
18. **Auto-Negotiated Payment Plans** — for a client falling behind, drafts a reasonable installment-plan offer instead of a blunt overdue notice.
19. **License Expiry Chain-Reaction Checker** — flags *already-delivered* projects whose embedded stock/music licenses are about to lapse, surfacing legal exposure the editor would otherwise never notice.
20. **Smart Archive Tiering** — recommends moving old project files to cheaper cold storage based on last-access date and license status, with an estimated cost saving shown before the move.

**Team & capacity**
21. **Burnout/Capacity Guardrail** — warns before accepting a new project if it would push weekly billable hours above a self-set sustainable threshold.
22. **Team Skill-Matching Engine** — for editors with collaborators, matches incoming projects to the available teammate whose skill tags (color, motion graphics, audio) and current utilization best fit.

**Marketing & portfolio**
23. **Auto-Generated Case Study Pages** — after delivery, assembles a shareable portfolio case study from time-tracked highlights and before/after snippets.
24. **Passive Portfolio Analytics** — tracks which portfolio/case-study pages are actually driving new inbound inquiries, so marketing effort follows evidence, not guesswork.
25. **Proof-of-Work Timelapse (opt-in)** — lightweight periodic capture during editing sessions auto-compiled into a process reel usable for marketing, entirely opt-in per session.

**Ecosystem & benchmarking**
26. **Anonymized Peer Benchmarking** — opt-in comparison of your rates/utilization/revision counts against aggregated, anonymized peers in the same niche, to negotiate rates with real data instead of forum anecdotes.
27. **Editing-Software Status Webhook** — a lightweight companion hook that detects an export finishing in the NLE and auto-advances the project's pipeline stage, closing the loop between the edit bay and the business dashboard without manual status updates.
28. **Footage-to-Delivery Ratio Analytics** — tracks how much raw footage historically produces a minute of finished content, refining future quotes with real ratios instead of instinct.
29. **Client Portal with Time-Boxed Revision Windows** — a client-facing view where revisions must land within a countdown tied to the contract; late or extra requests are automatically flagged as billable rather than argued about after the fact.
30. **"What Changed" Diff Notes on Revisions** — auto-summarizes, in plain language, what actually changed between two delivered cuts (based on linked notes/timestamps), so both editor and client have a shared, unambiguous record of each round — useful for disputes and for onboarding a second editor mid-project.

---

## 20. Suggested Build Order (MVP → V2 → V3)

**MVP (prove the core loop):** Clients, Projects + Workflow Engine (with 2-3 default templates), basic Invoicing tied to milestones, Time Tracking, Notes, a simple dashboard. This alone already beats generic tools because pipeline + money + client are cross-referenced from day one.

**V2 (retention & daily-use depth):** Asset/License registry, Content Calendar, full Financial reporting, Notification engine, Client Portal, first 2-3 AI features (Estimation, Smart Invoice Drafting, Communication Drafts).

**V3 (moat-building):** Full AI suite, Team roles/multi-editor support, storage-provider live integrations, the differentiator features in §19 that require historical data maturity (Rate Adjustor, Studio Health Score, Benchmarking).

---

## Closing Note

The generic-tool trap is building "another Asana." The moat here is narrow-and-deep: every module assumes the user is specifically a video editor, so the vocabulary, the default templates, the risk signals, and the AI features all encode real editing-business knowledge that a horizontal tool never will. That specificity is the product.
