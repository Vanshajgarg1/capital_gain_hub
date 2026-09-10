-- Add UNIQUE constraint to lessons table to prevent order duplication within a module
ALTER TABLE public.lessons
ADD CONSTRAINT lessons_module_id_order_index_key UNIQUE (module_id, order_index);
