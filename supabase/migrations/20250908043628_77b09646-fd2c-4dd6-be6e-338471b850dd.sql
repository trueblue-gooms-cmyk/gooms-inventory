-- Fix Security Definer View Issue
-- Remove the problematic locations_public view that uses SECURITY DEFINER
DROP VIEW IF EXISTS public.locations_public;

-- Instead, we'll handle PII filtering at the application level using the RLS policies