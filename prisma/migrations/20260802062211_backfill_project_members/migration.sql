-- Backfill project_members from the legacy single-assignee column.
--
-- Authorization moves from `project.assigneeId == userId` to a ProjectMember
-- lookup. Without this, every project that predates the collaboration feature
-- would become invisible to the person already assigned to it.
--
-- The existing assignee becomes OWNER: they held full access under the old
-- rule, so anything less would be a silent downgrade.
--
-- Idempotent via ON CONFLICT, so re-running is safe.

INSERT INTO "project_members" ("id", "projectId", "userId", "role", "addedBy", "createdAt")
SELECT
  gen_random_uuid()::text,
  p."id",
  p."assigneeId",
  'OWNER'::"ProjectMemberRole",
  NULL,
  COALESCE(p."createdAt", NOW())
FROM "projects" p
WHERE p."assigneeId" IS NOT NULL
ON CONFLICT ("projectId", "userId") DO NOTHING;
