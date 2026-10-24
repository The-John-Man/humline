CREATE TABLE IF NOT EXISTS accounts (
  clerk_user_id text PRIMARY KEY,
  deleting boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS melodies (
  id uuid PRIMARY KEY,
  owner_clerk_user_id text NOT NULL REFERENCES accounts(clerk_user_id),
  project jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS melodies_owner_modified ON melodies(owner_clerk_user_id, updated_at DESC, id);
