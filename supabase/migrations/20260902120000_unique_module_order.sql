-- Add unique constraint for course_id and order_index
ALTER TABLE public.modules
ADD CONSTRAINT modules_course_id_order_index_key UNIQUE (course_id, order_index);
