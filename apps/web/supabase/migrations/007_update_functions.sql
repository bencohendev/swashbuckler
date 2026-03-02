-- Update search_objects to use type_id instead of type
-- Must drop first: PG cannot change return type via CREATE OR REPLACE
DROP FUNCTION IF EXISTS search_objects(TEXT, UUID, INT);
CREATE OR REPLACE FUNCTION search_objects(
  search_query TEXT,
  user_id UUID,
  result_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  type_id UUID,
  icon TEXT,
  is_template BOOLEAN,
  updated_at TIMESTAMPTZ,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.title,
    o.type_id,
    o.icon,
    o.is_template,
    o.updated_at,
    similarity(o.title, search_query) AS similarity
  FROM objects o
  WHERE o.owner_id = user_id
    AND o.is_deleted = false
    AND (
      o.title ILIKE '%' || search_query || '%'
      OR similarity(o.title, search_query) > 0.1
    )
  ORDER BY
    similarity(o.title, search_query) DESC,
    o.updated_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_graph_data to use type_id instead of type
CREATE OR REPLACE FUNCTION get_graph_data(user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'nodes', (
      SELECT json_agg(json_build_object(
        'id', o.id,
        'title', o.title,
        'type_id', o.type_id,
        'icon', o.icon
      ))
      FROM objects o
      WHERE o.owner_id = user_id
        AND o.is_deleted = false
        AND o.is_template = false
    ),
    'edges', (
      SELECT json_agg(json_build_object(
        'source', r.source_id,
        'target', r.target_id,
        'type', r.relation_type
      ))
      FROM object_relations r
      JOIN objects src ON r.source_id = src.id
      WHERE src.owner_id = user_id
        AND src.is_deleted = false
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
