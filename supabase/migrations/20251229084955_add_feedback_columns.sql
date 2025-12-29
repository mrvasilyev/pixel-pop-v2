-- Add feedback columns to generations table
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS feedback TEXT,
ADD COLUMN IF NOT EXISTS feedback_score INT;

-- Add check constraint for feedback values (optional but good practice)
-- ALTER TABLE public.generations
-- ADD CONSTRAINT check_feedback_value CHECK (feedback IN ('thumbs_up', 'thumbs_down'));
