-- Complete notifications table and remaining RLS fixes
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('stock_low', 'expiring', 'purchase_approval', 'general')),
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only admins and operators can create notifications
CREATE POLICY "Admins and operators can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

-- Add updated_at trigger
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update RLS policies to allow proper operations
-- Fix inventory_movements to allow INSERT/UPDATE for admins and operators
DROP POLICY IF EXISTS "Admin and operators can view movements" ON inventory_movements;
DROP POLICY IF EXISTS "Admin and operators can manage movements" ON inventory_movements;

CREATE POLICY "Admin and operators can view movements" 
ON inventory_movements 
FOR SELECT 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

CREATE POLICY "Admin and operators can manage movements" 
ON inventory_movements 
FOR ALL 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

-- Fix inventory_current to allow updates
DROP POLICY IF EXISTS "All authenticated users can view" ON inventory_current;
DROP POLICY IF EXISTS "Admin and operators can manage inventory" ON inventory_current;

CREATE POLICY "All authenticated users can view" 
ON inventory_current 
FOR SELECT 
USING (true);

CREATE POLICY "Admin and operators can manage inventory" 
ON inventory_current 
FOR ALL 
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));