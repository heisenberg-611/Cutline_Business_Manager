-- Records who marked a task done, which is not always its assignee.
ALTER TABLE "tasks" ADD COLUMN "completedById" TEXT;

-- SET NULL rather than CASCADE: the task outlives the person who finished it,
-- and losing the row because someone left would be worse than losing the name.
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_completedById_fkey"
  FOREIGN KEY ("completedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
