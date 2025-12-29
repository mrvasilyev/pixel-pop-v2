import psycopg2
import sys

# Connection Details
# Derived from CLI error message and user input
DB_HOST = "aws-0-ap-south-1.pooler.supabase.com" # Should verify host index (0 or 1)
# Error said aws-1-ap-south-1 in Step 215? 
# "host=aws-1-ap-south-1.pooler.supabase.com" -> OK I will use aws-1.
DB_HOST = "aws-0-ap-south-1.pooler.supabase.com" # Defaulting to generic? No, used specific.
# Actually, the error message in Step 215 said: "host=aws-1-ap-south-1.pooler.supabase.com"
# But Step 226 output didn't show host.
# I will try aws-0-ap-south-1 first as it is common, or better:
# TRY BOTH or use the "postgres.iatagwwkyojuufbsyfmi" part to infer? 
# No, let's trust the error message "aws-1...".
DB_HOST = "aws-1-ap-south-1.pooler.supabase.com"
DB_NAME = "postgres"
DB_USER = "postgres.iatagwwkyojuufbsyfmi"
DB_PASS = "JobToBeDone.2023"
DB_PORT = 5432 # Direct connection

SQL_MIGRATION = """
ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_generations_is_archived ON public.generations (is_archived);
"""

def apply():
    print(f"Connecting to {DB_HOST}...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            port=DB_PORT
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Executing SQL...")
        cur.execute(SQL_MIGRATION)
        
        print("✅ Migration Applied Successfully!")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")
        # Try Port 6543 if 5432 fails
        if DB_PORT == 5432:
             print("Retrying on Port 6543 (Pooler)...")
             try:
                conn = psycopg2.connect(
                    host=DB_HOST,
                    database=DB_NAME,
                    user=DB_USER,
                    password=DB_PASS,
                    port=6543
                )
                conn.autocommit = True
                cur = conn.cursor()
                cur.execute(SQL_MIGRATION)
                print("✅ Migration Applied Successfully (via Pooler)!")
                cur.close()
                conn.close()
             except Exception as e2:
                 print(f"❌ Error on Retry: {e2}")
                 sys.exit(1)
        else:
             sys.exit(1)

if __name__ == "__main__":
    apply()
