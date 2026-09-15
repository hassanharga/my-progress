-- PostgreSQL requires a newly added enum value to be committed before it can
-- be used by later data updates. Keep this migration enum-only.
ALTER TYPE "TaskStatus" ADD VALUE 'READY' BEFORE 'IN_PROGRESS';
