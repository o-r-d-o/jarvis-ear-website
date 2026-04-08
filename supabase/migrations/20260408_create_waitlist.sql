CREATE TABLE IF NOT EXISTS waitlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  paid boolean DEFAULT false,
  stripe_session_id text,
  amount_paid integer DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (from the frontend)
CREATE POLICY "Allow public inserts" ON waitlist
  FOR INSERT TO anon
  WITH CHECK (true);

-- Block reads from anon (only you can see data via dashboard/service_role)
CREATE POLICY "Block public reads" ON waitlist
  FOR SELECT TO anon
  USING (false);
