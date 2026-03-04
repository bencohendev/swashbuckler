-- Seed a "Getting Started" welcome page when creating a new user's space

CREATE OR REPLACE FUNCTION handle_new_user_space()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_space_id UUID;
  page_type_id UUID;
BEGIN
  INSERT INTO public.spaces (name, owner_id) VALUES ('My Space', NEW.id) RETURNING id INTO new_space_id;
  INSERT INTO public.object_types (name, plural_name, slug, icon, fields, owner_id, space_id, sort_order)
  VALUES ('Page', 'Pages', 'page', 'file-text', '[]', NEW.id, new_space_id, 0)
  RETURNING id INTO page_type_id;

  INSERT INTO public.objects (title, type_id, owner_id, space_id, properties, content, sort_order)
  VALUES (
    'Getting Started',
    page_type_id,
    NEW.id,
    new_space_id,
    '{}',
    '[{"type":"h1","children":[{"text":"Welcome to Swashbuckler"}]},{"type":"p","children":[{"text":"Swashbuckler is your personal knowledge base — a place to capture ideas, organize information, and connect your thinking."}]},{"type":"h2","children":[{"text":"Types"}]},{"type":"p","children":[{"text":"Everything you create is an entry, and every entry has a type. You start with a \"Page\" type, but you can create your own — like Projects, People, or Recipes. Each type can have custom fields and its own icon."}]},{"type":"h2","children":[{"text":"The Editor"}]},{"type":"p","children":[{"text":"Type "},{"text":"/","bold":true},{"text":" to open the command menu — add headings, lists, callouts, and more. Use "},{"text":"@","bold":true},{"text":" to mention and link to other entries."}]},{"type":"h2","children":[{"text":"Keyboard Shortcuts"}]},{"type":"ul","children":[{"type":"li","children":[{"type":"lic","children":[{"text":"⌘K","bold":true},{"text":" — Search for anything"}]}]},{"type":"li","children":[{"type":"lic","children":[{"text":"⌘E","bold":true},{"text":" — Quick capture a thought without leaving the page"}]}]}]},{"type":"h2","children":[{"text":"Explore"}]},{"type":"p","children":[{"text":"Use the Graph view to see how your entries connect. Add tags for flexible organization. Share a space to collaborate in real-time."}]},{"type":"p","children":[{"text":"Delete this page whenever you''re ready — it''s here to help you get started."}]}]'::jsonb,
    0
  );

  RETURN NEW;
END;
$$;
