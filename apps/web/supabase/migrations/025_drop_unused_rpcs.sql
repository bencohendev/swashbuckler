-- Security audit: remove unused SECURITY DEFINER functions that accept
-- client-controllable user_id parameter (IDOR vulnerability).
-- These functions are not called by the application — the client uses
-- RLS-protected direct table queries instead.

DROP FUNCTION IF EXISTS search_objects(TEXT, UUID, INT);
DROP FUNCTION IF EXISTS get_graph_data(UUID);
