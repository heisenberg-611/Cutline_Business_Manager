# Team Collaboration — Working Notes

Status of the internal team-collaboration feature on branch `feat/team-collaboration`.
Written as a handoff so work can resume without re-deriving context.

**Last updated:** 2026-08-03 (all phases done; see §5 for what remains)
**Branch:** `feat/team-collaboration` (off `main` @ `847aa3d`)
**Scope decided:** internal team collaboration, gated to **BUSINESS** tier
**Hosted database:** *untouched* — all migrations so far applied only to local Docker

---

## 1. Current state

| Phase | What | Commit | Status |
|---|---|---|---|
| 1 | Collaboration schema + Docker test harness | `0ab52c4` | done |
| 2 | Centralized project authorization | `50d95d2` | done |
| 2a | Reassignment demotes instead of revoking | `4c88e76` | done |
| 3 | Threaded comments + @mentions | `3f2746c` | done |
| 0 | Ably token scoping (security fix) | `14372d4` | done |
| 4 | Tasks on projects | `e6fa0df` | done |
| 6 | Broadcast audience + plan rows | `b6d3e7d` | done |
| 5 | Live board, presence, activity feed | `2d8e01c` | done |

**All planned phases are complete.** Phase 0 was originally sequenced first but was
done after Phase 3, since comments shipped without realtime and did not depend on it.

What remains is in §5 — none of it was in the original plan, but the first item
materially limits how usable the feature is.

Checks at time of writing: **78 tests passing** (6 files), `tsc` clean, `next build`
succeeds, `npm run lint` identical to the `main` baseline (456 problems — see §7).

---

## 2. Running the local environment

Everything below targets Docker. The hosted Supabase database is never contacted.

```bash
npm run db:up        # start Postgres 16 on localhost:55432 (waits for healthy)
npm run db:deploy    # apply all migrations
npm run db:seed      # load the BUSINESS-tier fixture
npm run dev:local    # Next.js against the local DB

npm run db:studio    # Prisma Studio
npm run db:psql      # psql shell
npm run db:migrate   # create + apply a NEW migration
npm run db:down      # stop        db:nuke = stop + wipe volume
```

**Connection string** — `postgresql://cutline:cutline_local_dev@localhost:55432/cutline_dev`
(a throwaway credential for a container bound to localhost; it is not a secret)

`.env` currently has `DATABASE_URL`/`DIRECT_URL` pointed at Docker, with the Supabase
strings commented out directly below under a `# --- HOSTED ---` header. Because real
environment variables take precedence over `.env` in Prisma, `scripts/local-db.sh` is
what guarantees the `db:*` scripts stay local even if `.env` is switched back.

### Signing in

Auth is Clerk, not the database — swapping `DATABASE_URL` does not change that.
`Business.id` must equal a real Clerk `orgId` and `User.id` a real Clerk `userId`
(`src/app/api/webhooks/clerk/route.ts:57`), or the app redirects to
`/dashboard/select-business`. There are no app passwords in the database to look up.

To sign in against seeded data, map the fixture onto a real Clerk organization that
has one admin and at least two members:

```bash
SEED_ORG_ID=org_xxx \
SEED_ADMIN_USER_ID=user_xxx \
SEED_EDITOR_USER_ID=user_yyy \
SEED_MEMBER_USER_ID=user_zzz \
npm run db:seed
```

Look the ids up against your own Clerk instance rather than hard-coding them here —
this repository is public, and organization ids, user ids and teammates' email
addresses do not belong in it:

```bash
KEY=$(grep '^CLERK_SECRET_KEY=' .env | cut -d= -f2-)
curl -s -H "Authorization: Bearer $KEY" "https://api.clerk.com/v1/organizations?limit=10"
curl -s -H "Authorization: Bearer $KEY" "https://api.clerk.com/v1/users?limit=20"
curl -s -H "Authorization: Bearer $KEY" "https://api.clerk.com/v1/organizations/<orgId>/memberships"
```

Clerk roles must already match what `middleware.ts:53` expects (`org:admin` /
`org:member`); the seed writes matching `BusinessMembership` rows but does not
change Clerk. `svix listen` is not needed for this path — the seed writes the rows
the webhook would have. It *is* needed if you change membership in Clerk and want
that reflected locally.

Run with no env vars and you get a mock org (`org_local_mock_agency`) that is
inspectable in the database but cannot be signed into, because those user ids do
not exist in Clerk.

### The fixture

| Project | Members | Purpose |
|---|---|---|
| PR-001 Brand Launch Film | Kai `OWNER`, Juno `COLLABORATOR` | multi-member case |
| PR-002 Q3 Social Cutdowns | Juno `OWNER` | single owner |
| PR-003 Packaging Photography | none | unassigned |

Plus 3 tasks on PR-001 and a comment thread (root + reply + 1 mention).
The seed is idempotent; re-running does not duplicate.

---

## 3. What was built

### Phase 1 — schema (`0ab52c4`)

New models in `prisma/schema.prisma`: `ProjectMember`, `Task`, `Comment`, `Mention`,
plus `Note.createdBy` and an `AuditLog` index on `[businessId, createdAt DESC]`.
Enums `ProjectMemberRole` (OWNER/COLLABORATOR/WATCHER) and `TaskStatus`.

Two migrations:
- `20260802062143_add_team_collaboration` — purely additive, no drops
- `20260802062211_backfill_project_members` — hand-written; copies every existing
  `assigneeId` into `ProjectMember` as `OWNER`

The backfill is a **separate** migration because editing an already-applied migration
breaks Prisma's checksum. It is the migration that matters most on production: without
it, Phase 2 makes every pre-existing project invisible to its current assignee.

Harness: `docker-compose.yml`, `scripts/local-db.sh`, `scripts/seed-local.ts`
(guarded — refuses any non-local `DATABASE_URL`).

### Phase 2 — authorization (`50d95d2`, `4c88e76`)

`src/modules/projects/authz.ts` replaces the
`orgRole !== 'org:admin' && project.assigneeId !== userId` check that was duplicated
across **seven** call sites (the plan estimated six; `submitMemberDelivery` surfaced
during typecheck).

```
authorizeProjectAccess(projectId, 'read' | 'write' | 'manage')
authorizeProjectsAccess(projectIds[], level)   // batch, for the pipeline board
syncAssigneeMembership(projectId, newAssignee, prevAssignee, actor)
```

| Role | read | write | manage |
|---|---|---|---|
| OWNER | Y | Y | Y |
| COLLABORATOR | Y | Y | – |
| WATCHER | Y | – | – |

`org:admin` bypasses membership entirely, as before.

### Phase 3 — comments + @mentions (`3f2746c`)

`src/modules/collaboration/` — `mentions.ts` (pure), `authz.ts` (entity dispatch +
plan gate), `actions/comments.ts`, and three components.

Mentions are stored as `@[Display Name](userId)`, not `@handle`.

### Phase 4 — tasks (`e6fa0df`)

`src/modules/collaboration/actions/tasks.ts` and `components/TaskPanel.tsx`. The
`Task` model shipped in Phase 1 but nothing read it. Drag to reorder; status and
assignee inline.

Every action authorizes through the parent project via `authorizeEntityAccess`, so
task access can never exceed project access and inherits the plan gate. Assignee
ids and reorder payloads are both checked against the tenant before writing.
Status/assignee changes write an `AuditLog` row with `entityType: 'Task'` — that is
what the Phase 5 activity feed will read.

`TaskPanel` uses `useOptimistic` rather than mirroring the server list into state,
so a failed action needs no manual rollback and a successful one cannot drift from
what was persisted.

### Phase 6 — broadcasts + plan rows (`b6d3e7d`)

`broadcastNotification` skipped every non-admin, contradicting all three call sites'
"notify business members" comments. Audience is now an explicit
`'all' | 'admins'` parameter defaulting to `'all'`:

- client revision notes, new client feedback → **all** members
- new project request → **admins** (copy asks for approval; only admins can approve)

"Team Collaboration" added to the three `PLAN_FEATURES` arrays.

### Phase 5 — live board, presence, activity (`2d8e01c`)

- **Optimistic concurrency on drags.** `updateProjectOrder` takes the dragged
  project's `updatedAt` as a precondition. Only that project is guarded — its stage
  change is the meaningful edit, sibling reindexing is cosmetic, and guarding every
  row would make any unrelated concurrent edit fail the whole drag. The client
  distinguishes `CONFLICT:` from other errors and refreshes.
- **Realtime board.** Changes publish to `business:{orgId}:pipeline`. Clients ignore
  the echo of their own move, and only patch projects already on their board — a
  member's board is filtered to their own work.
- **Presence.** `BoardViewers` shows who else is on the board, keyed by clientId so
  one person in three tabs appears once. Required widening the Ably capability to
  `['subscribe','presence']`; publish is still denied to browser tokens.
- **Activity feed.** Reads `AuditLog` for the project *and* its tasks. Unknown
  actions render as humanized text rather than disappearing.

### Where the UI lives (`dde92fc`)

Collaboration is its own sidebar item under **Work**, not part of the project
detail page — that page is byte-identical to its pre-collaboration state.

- `/dashboard/collaboration` — projects the caller can collaborate on, with open
  task, comment and member counts. Scoped exactly as `authorizeProjectAccess`
  resolves access, so it cannot list a project the detail page would refuse to open.
- `/dashboard/collaboration/[id]` — Tasks, Discussion and Activity.

Non-Business plans see an upgrade notice rather than a redirect, so the nav item
does not look broken. No nav-preference migration was needed: AppLayout treats an
href with no saved preference as visible. The route is deliberately *not* in the
member-restricted prefixes in either AppLayout or `middleware.ts`.

### Phase 0 — Ably scoping (`14372d4`)

`/api/ably/auth` previously minted tokens with **no `capability`**, so they inherited
the API key's full rights — any signed-in user could subscribe to any tenant's
channels. `/api/ably/auth-guest` was the same for any valid guest link.

Now: member tokens scoped to `business:{orgId}:*`, guest tokens to a single
conversation, both **subscribe-only** (publishing is all server-side REST).
Channel names centralized in `src/lib/ably/channels.ts`.

---

## 4. Decisions worth not relitigating

- **`Project.assigneeId` was kept**, not dropped. It is the "primary owner" pointer
  that `dashboard/page.tsx:29` and `prodp/page.tsx:22,31` filter on. `ProjectMember`
  is the authorization source of truth; the two are kept in sync by
  `syncAssigneeMembership`.
- **Authorizer falls back to `assigneeId`** when no membership row exists, so any
  missed write path degrades to the old rule rather than denying access.
- **Reassignment demotes** OWNER → COLLABORATOR rather than removing. A handover
  should not strip someone of work in flight.
- **`AuditLog` is reused** for the activity feed rather than a new `ActivityEvent`
  model — it is already polymorphic and is what the invoice trail uses.
- **Comments are polymorphic** (`entityType`/`entityId`, no FK), following the
  `AuditLog` precedent. `COMMENTABLE_TYPES` is currently `['Project']` only; each new
  type needs an authorization rule in `collaboration/authz.ts`.
- **Mentions are structural**, not `@handle`. Handles are ambiguous when two people
  share a first name and break on rename.
- **Comment bodies never use `dangerouslySetInnerHTML`** — `segmentBody()` returns
  typed segments the renderer maps to React nodes.
- **Browser Ably tokens are subscribe-only.** Nothing client-side publishes.
- **`canUseTeamCollaboration` is separate from `canInviteMembers`.** A business
  downgraded from BUSINESS keeps its Clerk org members, so inferring the entitlement
  from "has teammates" would leave collaboration on after downgrade.

---

## 5. Remaining work

All planned phases are complete, and the member-management gap that was flagged as
the biggest limitation is closed (`af731a0`). What follows is ordered by whether it
is actually wrong versus merely missing.

### A. Correctness — board drags do not write stage history
`updateProjectStage` (the dropdown) closes and opens a `ProjectStageHistory` row.
`updateProjectOrder` (a drag) changes `statusStageId` without touching history.

This is not cosmetic. Three places read that history:
- `financials/dashboard-queries.ts:218` — "at risk" detection
- `api/webhooks/qstash/analytics/route.ts:121` — the nightly snapshot
- `projects/components/StageProgressPipeline.tsx:39` — time-in-stage display

Each guards on `stageHistory[0]`, so a project moved by dragging is silently skipped
rather than mis-measured: **drag-moved projects can never be flagged at risk**, and
the analytics snapshot under-counts them. Predates the collaboration work; the live
board makes dragging the normal path, so it matters more now.

`scripts/seed-local.ts` also creates projects with a `statusStageId` and no history
row, so the local fixture cannot exercise at-risk detection at all.

### B. Missing, known
- **Tasks have no due-date control.** `TaskPanel` renders `dueDate` with an overdue
  style and the server accepts it on create and update, but nothing sets it.
- **Comments and tasks are not realtime.** The pipeline board is. They could publish
  on `business:{orgId}:project:{projectId}` reusing the pattern in
  `workflow/hooks/usePipelineRealtime.ts`.
- **Comments are projects-only.** `COMMENTABLE_TYPES` is `['Project']`; each new type
  needs a rule in `collaboration/authz.ts` and a mention rule in `mentionable.ts`.
  Clients specifically collide with `middleware.ts:58`.

### C. Consequence of the membership change worth reviewing
Members now see every project they are a member of across Pipeline, Projects,
Dashboard and ProdP — not only Collaboration. That is the intended fix for the
split-brain described in `visibleProjectFilter`, but it does widen what a
non-admin sees compared with the single-assignee behaviour. Worth confirming that
matches how you want the workspace to feel before this reaches customers.

## 6. Before this reaches production

1. **Revert `.env`** — uncomment the Supabase `DATABASE_URL`/`DIRECT_URL` pair under
   `# --- HOSTED ---` and comment the Docker pair. Deploys read Vercel env vars, so
   production is unaffected either way, but local builds will read an empty DB.
2. **Apply migrations to Supabase.** Both are safe: the first is purely additive
   (no drops, no column rewrites), the second is an idempotent backfill with
   `ON CONFLICT DO NOTHING`. **Do not skip the backfill** — Phase 2 authorization
   depends on it.
3. **Channel rename is a live change.** Clients connected across the deploy keep
   subscribing to old channel names until they reload. Messages are persisted and the
   conversation list refetches, so the effect is a brief gap in live updates, not
   lost data. If zero gap is required, dual-publish to old and new names for one
   release, then strip the old.
4. **`ABLY_API_KEY` must be present in production** — the auth routes 500 without it.

---

## 7. Known gaps and caveats

- **The UI has never been seen running.** Signing in needs a Clerk password I do not
  have. Everything is verified server-side, by unit test, and by build. The `@` picker
  behaviour, the Discussion layout, and comment rendering are **unexercised visually**.
  Worth a look on the next `npm run dev:local`.
- **`npm run lint` fails on `main` already** — 456 problems (2 errors, 454 warnings)
  against a `--max-warnings=377` budget. The 2 errors are pre-existing in
  `scripts/test-publish.js`. This branch adds **zero** new problems; verified by
  stashing and re-running on clean `main`. CLAUDE.md says not to raise the budget.
- **Comments and tasks are not realtime.** They appear on revalidation. Phase 5 can
  add it now that Phase 0 has landed.
- **Tasks have no due-date editor.** `TaskPanel` renders `dueDate` (with an overdue
  style) and the server accepts it on create/update, but no control sets it.
- **`scripts/` utilities now point at Docker** while `.env` is switched —
  `prod-queries.ts`, `sync-clerk-db.ts`, `fetch-user-data.ts` will silently return
  nothing. Protective for `reset-db.ts`.
- **Threads are one level deep** by design; replying to a reply attaches to the root.

---

## 8. Useful verification commands

```bash
npm test                      # 78 tests, 6 files
npx tsc --noEmit -p tsconfig.json
npm run lint                  # expect 456 problems — same as main
npm run build

# Effective permissions per (user, project) against real data
npm run db:psql
  SELECT p."displayId", pm."userId", pm.role
  FROM project_members pm JOIN projects p ON p.id = pm."projectId"
  ORDER BY p."displayId", pm."userId";
```
