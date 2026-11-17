ALTER TABLE campus_presence ADD COLUMN slot SMALLINT;
WITH numbered AS (
    SELECT id, row_number() OVER (ORDER BY updated_at DESC) AS position FROM campus_presence
)
UPDATE campus_presence p SET slot = numbered.position FROM numbered WHERE p.id = numbered.id;
DELETE FROM campus_presence WHERE slot > 10;
ALTER TABLE campus_presence ALTER COLUMN slot SET NOT NULL;
ALTER TABLE campus_presence ADD CONSTRAINT campus_presence_slot_range CHECK (slot BETWEEN 1 AND 10);
ALTER TABLE campus_presence ADD CONSTRAINT campus_presence_slot_unique UNIQUE (slot);
