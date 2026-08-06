-- Per-organisation reaction set, editable by admins.
ALTER TABLE "businesses"
  ADD COLUMN "reactionEmojis" TEXT[] DEFAULT ARRAY['👍', '✅', '🎉', '👀', '❤️', '🙏']::TEXT[];

-- One emoji from one person on one message or comment. Polymorphic on
-- targetType/targetId, following the comments table: no foreign key, so one
-- table serves both surfaces.
CREATE TABLE "reactions" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- The toggle depends on this to be idempotent: several emoji per person per
-- target, but only one of each.
CREATE UNIQUE INDEX "reactions_targetType_targetId_userId_emoji_key"
  ON "reactions"("targetType", "targetId", "userId", "emoji");

-- Reading a thread fetches every reaction for a page of targets at once.
CREATE INDEX "reactions_targetType_targetId_idx" ON "reactions"("targetType", "targetId");
CREATE INDEX "reactions_businessId_idx" ON "reactions"("businessId");

ALTER TABLE "reactions" ADD CONSTRAINT "reactions_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
