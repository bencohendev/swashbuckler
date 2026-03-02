-- Enforce case-insensitive uniqueness for spaces, object types, and templates.

-- 1. Spaces: unique name per owner (case-insensitive)

-- Deduplicate existing space names per owner
DO $$
DECLARE
  dup RECORD;
  suffix INT;
  new_name TEXT;
BEGIN
  FOR dup IN
    SELECT s.id, s.name, s.owner_id,
           ROW_NUMBER() OVER (PARTITION BY s.owner_id, LOWER(s.name) ORDER BY s.created_at) AS rn
    FROM spaces s
  LOOP
    IF dup.rn > 1 THEN
      suffix := dup.rn;
      new_name := dup.name || ' (' || suffix || ')';
      -- Ensure the new name itself isn't a duplicate
      WHILE EXISTS (
        SELECT 1 FROM spaces
        WHERE owner_id = dup.owner_id AND LOWER(name) = LOWER(new_name) AND id != dup.id
      ) LOOP
        suffix := suffix + 1;
        new_name := dup.name || ' (' || suffix || ')';
      END LOOP;
      UPDATE spaces SET name = new_name WHERE id = dup.id;
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX spaces_owner_name_idx ON spaces(owner_id, LOWER(name));

-- 2. Object types: unique slug per space (case-insensitive)
-- Replace the existing case-sensitive index from migration 012

DROP INDEX IF EXISTS object_types_space_slug_idx;
CREATE UNIQUE INDEX object_types_space_slug_idx
  ON object_types(COALESCE(space_id, '00000000-0000-0000-0000-000000000000'), LOWER(slug));

-- 3. Templates: unique name per type+space (case-insensitive)

-- Deduplicate existing template names per type+space
DO $$
DECLARE
  dup RECORD;
  suffix INT;
  new_name TEXT;
BEGIN
  FOR dup IN
    SELECT t.id, t.name, t.type_id, t.space_id,
           ROW_NUMBER() OVER (PARTITION BY t.type_id, t.space_id, LOWER(t.name) ORDER BY t.created_at) AS rn
    FROM templates t
  LOOP
    IF dup.rn > 1 THEN
      suffix := dup.rn;
      new_name := dup.name || ' (' || suffix || ')';
      WHILE EXISTS (
        SELECT 1 FROM templates
        WHERE type_id = dup.type_id AND space_id = dup.space_id
          AND LOWER(name) = LOWER(new_name) AND id != dup.id
      ) LOOP
        suffix := suffix + 1;
        new_name := dup.name || ' (' || suffix || ')';
      END LOOP;
      UPDATE templates SET name = new_name WHERE id = dup.id;
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX templates_type_space_name_idx ON templates(type_id, space_id, LOWER(name));
