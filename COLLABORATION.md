# Team Collaboration — Working Notes

Status of the internal team-collaboration feature on branch `feat/team-collaboration`.
Written as a handoff so work can resume without re-deriving context.

**Last updated:** 2026-08-03
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
| 5 | Activity feed + live pipeline board | — | **not started — only phase left** |

Phase 0 was originally sequenced first but was done after Phase 3, because comments
shipped without realtime and therefore did not depend on it. It is now complete, so
Phase 5 is unblocked.

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

`.env` currently has `DATABASE_URL`/`DIRECT_URL` pointed at Docker, with the Supabase
strings commented out directly below under a `# --- HOSTED ---` header. Because real
environment variables take precedence over `.env` in Prisma, `scripts/local-db.sh` is
what guarantees the `db:*` scripts stay local even if `.env` is switched back.

### Signing in

Auth is Clerk, not the database — swapping `DATABASE_URL` does not change that.
`Business.id` must equal a real Clerk `orgId` and `User.id` a real Clerk `userId`
(`src/app/api/webhooks/clerk/route.ts:57`), or the app redirects to
`/dashboard/select-business`.

The Clerk dev instance (**your-clerk-instance**) already has a usable org:

```bash
SEED_ORG_ID=org_xxx \
SEED_ADMIN_USER_ID=user_xxx \
SEED_EDITOR_USER_ID=user_yyy \
SEED_MEMBER_USER_ID=user_zzz \
npm run db:seed
```

That is `your organization` — admin `admin@example.test`, members
`member-one@example.test` and `member-two@example.test`. Roles already match what
`middleware.ts:53` expects; nothing needs changing in the Clerk dashboard.
`svix listen` is not required for this path — the seed writes the rows the webhook
would have. It *is* required if you change membership in Clerk and want it reflected.

Run with no env vars and you get a mock org (`org_local_mock_agency`) that is
inspectable in the DB but cannot be signed into.

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
plan gate), `actions/comments.ts`, and three components. Rendered as a full-width
Discussion section on `/dashboard/projects/[id]`.

Mentions are stored as `@[Display Name](userId)`, not `@handle`.

### Phase 4 — tasks (`e6fa0df`)

`src/modules/collaboration/actions/tasks.ts` and `components/TaskPanel.tsx`. The
`Task` model shipped in Phase 1 but nothing read it. Full-width panel above
Discussion; drag to reorder; status and assignee inline.

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

### Phase 5 — Activity feed + live board (~2 days) — the only phase left
- Per-project Activity tab reading `AuditLog` by `entityId`. Task actions already
  write `entityType: 'Task'` rows, so there is data to render on day one.
- `PipelineBoard` subscribes to a `business:{orgId}:pipeline` channel.
- **Presence needs a capability change**: tokens are currently `['subscribe']` only.
  Add `'presence'` in `src/app/api/ably/auth/route.ts` when presence lands.
- **Drag conflict handling:** `updateProjectStage` (`workflow/actions.ts:85`) and
  `updateProjectOrder` (`:185`) are silent last-write-wins. Add an `updatedAt`
  precondition to the `where` clause so a stale drag fails loudly and refetches.
- Comments and tasks could also go live on `business:{orgId}:project:{projectId}`,
  reusing the optimistic + anti-jitter reconciliation already solved in
  `messaging/hooks.ts:125`.

### Not scheduled
- **No way to remove a project member, and no UI to add one.** Reassignment demotes
  rather than removes, so ownership churn accumulates collaborators. `ProjectMember`
  is currently written only by `syncAssigneeMembership` and the seed — there is no
  screen for managing the member list. This is the most visible remaining gap:
  `manage` is enforced but nothing exercises it.
- Client/invoice comments — needs a rule per entity type, and clients specifically
  collide with `middleware.ts:58` blocking members from `/dashboard/clients`.
- Asset commenting/versioning (audit gap #9) — untouched.

---

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
