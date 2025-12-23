CREATE TABLE IF NOT EXISTS public.generations (
    id TEXT PRIMARY KEY,
    user_id BIGINT,
    prompt TEXT,
    status TEXT,
    image_url TEXT,
    cost FLOAT,
    error TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
