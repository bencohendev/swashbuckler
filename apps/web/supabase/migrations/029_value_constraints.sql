-- Database Audit: Low-value fixes — value-level CHECK constraints
-- Findings: S10, S11

-- ============================================================
-- S10: Enforce title max length at DB level (matches Zod)
-- ============================================================

ALTER TABLE objects
  ADD CONSTRAINT objects_title_length_check
  CHECK (char_length(title) <= 255);

-- ============================================================
-- S11: Enforce cover_image max length at DB level
-- ============================================================

ALTER TABLE objects
  ADD CONSTRAINT objects_cover_image_length_check
  CHECK (cover_image IS NULL OR char_length(cover_image) <= 2048);
