-- Enable Supabase Realtime for all data tables
ALTER PUBLICATION supabase_realtime ADD TABLE objects;
ALTER PUBLICATION supabase_realtime ADD TABLE object_types;
ALTER PUBLICATION supabase_realtime ADD TABLE templates;
ALTER PUBLICATION supabase_realtime ADD TABLE object_relations;
ALTER PUBLICATION supabase_realtime ADD TABLE spaces;
ALTER PUBLICATION supabase_realtime ADD TABLE space_shares;
ALTER PUBLICATION supabase_realtime ADD TABLE tags;
ALTER PUBLICATION supabase_realtime ADD TABLE object_tags;
ALTER PUBLICATION supabase_realtime ADD TABLE pins;
