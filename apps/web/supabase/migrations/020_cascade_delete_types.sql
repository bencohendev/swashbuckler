-- Add ON DELETE CASCADE to objects.type_id and templates.type_id
-- so deleting an object type also deletes its entries and templates.

ALTER TABLE objects DROP CONSTRAINT objects_type_id_fkey;
ALTER TABLE objects ADD CONSTRAINT objects_type_id_fkey
  FOREIGN KEY (type_id) REFERENCES object_types(id) ON DELETE CASCADE;

ALTER TABLE templates DROP CONSTRAINT templates_type_id_fkey;
ALTER TABLE templates ADD CONSTRAINT templates_type_id_fkey
  FOREIGN KEY (type_id) REFERENCES object_types(id) ON DELETE CASCADE;
