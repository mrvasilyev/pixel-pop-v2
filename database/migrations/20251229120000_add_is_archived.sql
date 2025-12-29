ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Optional: Add index for performance on filtering
CREATE INDEX IF NOT EXISTS idx_generations_is_archived ON public.generations (is_archived);
