-- Add sort_order column to objects for manual entry ordering
ALTER TABLE public.objects ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

-- Index for efficient sorting within a type
CREATE INDEX idx_objects_type_sort_order ON public.objects (type_id, sort_order ASC);
