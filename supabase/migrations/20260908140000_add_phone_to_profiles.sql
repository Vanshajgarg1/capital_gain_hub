-- 1. Add phone column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT NULL;

-- 2. Update the auth trigger to capture phone from user metadata
-- Preserving existing full_name handling, role assignment, search_path, and SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'),
    'STUDENT',
    new.raw_user_meta_data->>'phone'
  );
  RETURN new;
END;
$$;
