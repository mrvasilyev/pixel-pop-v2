ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '{}'::jsonb;
