-- Fix handle_new_user_space() trigger referencing dropped is_built_in column

CREATE OR REPLACE FUNCTION handle_new_user_space()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_space_id UUID;
BEGIN
  INSERT INTO public.spaces (name, owner_id) VALUES ('My Space', NEW.id) RETURNING id INTO new_space_id;
  INSERT INTO public.object_types (name, plural_name, slug, icon, fields, owner_id, space_id, sort_order)
  VALUES ('Page', 'Pages', 'page', 'file-text', '[]', NEW.id, new_space_id, 0);
  RETURN NEW;
END;
$$;
