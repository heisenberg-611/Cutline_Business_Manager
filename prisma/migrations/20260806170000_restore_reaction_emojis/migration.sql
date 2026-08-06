-- Restores businesses.reactionEmojis, which 20260806121252_reactionemoji dropped.
--
-- That drop was `migrate dev` doing its job: the column had just been added by
-- 20260806160000_reactions, but schema.prisma was missing the field, so Prisma
-- saw an unmodelled column and removed it to match. The schema was the thing
-- that was wrong; this puts the column back.
--
-- IF NOT EXISTS so it is safe against a database in either state.
ALTER TABLE "businesses"
  ADD COLUMN IF NOT EXISTS "reactionEmojis" TEXT[] DEFAULT ARRAY['👍', '✅', '🎉', '👀', '❤️', '🙏']::TEXT[];

-- Rows written while the column was absent would otherwise sit at NULL, which
-- reads as "configured to nothing" rather than "never configured".
UPDATE "businesses"
  SET "reactionEmojis" = ARRAY['👍', '✅', '🎉', '👀', '❤️', '🙏']::TEXT[]
  WHERE "reactionEmojis" IS NULL;
