
-- 1. Extend the app_role enum with new branch-aware roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'global_super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'branch_super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'branch_admin';
