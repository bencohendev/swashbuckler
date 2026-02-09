-- Add plural_name column to object_types
ALTER TABLE object_types ADD COLUMN plural_name TEXT NOT NULL DEFAULT '';

-- Populate built-in types
UPDATE object_types SET plural_name = 'Pages' WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE object_types SET plural_name = 'Notes' WHERE id = '00000000-0000-0000-0000-000000000002';

-- For any existing custom types, default plural to name + 's'
UPDATE object_types SET plural_name = name || 's' WHERE plural_name = '' AND is_built_in = false;
