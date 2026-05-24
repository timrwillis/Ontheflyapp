-- Add missing enum values to worker_role
-- ALTER TYPE ADD VALUE cannot run inside a transaction on PG < 12.
-- Neon runs PG17 so a transaction is fine, but each ADD VALUE must be its own statement.
ALTER TYPE "worker_role" ADD VALUE IF NOT EXISTS 'line_cook';
ALTER TYPE "worker_role" ADD VALUE IF NOT EXISTS 'catering';
