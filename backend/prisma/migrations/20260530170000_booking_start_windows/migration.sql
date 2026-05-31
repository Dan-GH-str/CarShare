ALTER TABLE "Booking" ADD COLUMN "freeWaitUntil" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "waitAmount" INTEGER NOT NULL DEFAULT 0;

UPDATE "Booking"
SET
  "freeWaitUntil" = "startAt" + INTERVAL '15 minutes',
  "expiresAt" = "startAt" + INTERVAL '30 minutes'
WHERE "freeWaitUntil" IS NULL OR "expiresAt" IS NULL;

ALTER TABLE "Booking" ALTER COLUMN "freeWaitUntil" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "expiresAt" SET NOT NULL;

CREATE INDEX "Booking_status_expiresAt_idx" ON "Booking"("status", "expiresAt");
