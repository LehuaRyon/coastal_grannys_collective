-- AddColumn: split name -> firstName/lastName, add phone + address fields
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "address" TEXT;
ALTER TABLE "User" ADD COLUMN "apt" TEXT;
ALTER TABLE "User" ADD COLUMN "city" TEXT;
ALTER TABLE "User" ADD COLUMN "state" TEXT;
ALTER TABLE "User" ADD COLUMN "zip" TEXT;
ALTER TABLE "User" ADD COLUMN "country" TEXT;

-- Backfill firstName/lastName from the existing "name" column before dropping it
UPDATE "User" SET
  "firstName" = CASE WHEN position(' ' in "name") > 0 THEN split_part("name", ' ', 1) ELSE "name" END,
  "lastName"  = CASE WHEN position(' ' in "name") > 0 THEN trim(substring("name" from position(' ' in "name") + 1)) ELSE NULL END
WHERE "name" IS NOT NULL AND "name" <> '';

ALTER TABLE "User" DROP COLUMN "name";
