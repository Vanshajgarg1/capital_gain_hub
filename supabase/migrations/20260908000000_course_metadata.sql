ALTER TABLE courses
ADD COLUMN overview_heading TEXT,
ADD COLUMN overview_description TEXT,
ADD COLUMN learning_outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN features JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN instructor_details JSONB;
