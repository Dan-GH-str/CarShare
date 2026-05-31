ALTER TABLE "User"
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "middleName" TEXT;

WITH split_names AS (
  SELECT
    "id",
    regexp_split_to_array(trim("fullName"), '\s+') AS parts
  FROM "User"
)
UPDATE "User" AS users
SET
  "lastName" = COALESCE(NULLIF(split_names.parts[1], ''), 'Пользователь'),
  "firstName" = COALESCE(NULLIF(split_names.parts[2], ''), COALESCE(NULLIF(split_names.parts[1], ''), 'CarShare')),
  "middleName" = NULLIF(array_to_string(split_names.parts[3:array_length(split_names.parts, 1)], ' '), '')
FROM split_names
WHERE users."id" = split_names."id";

ALTER TABLE "User"
  ALTER COLUMN "lastName" SET NOT NULL,
  ALTER COLUMN "firstName" SET NOT NULL,
  DROP COLUMN "fullName";
