-- Supabase Database Schema Setup for Vellari Restaurant
-- Copy and paste this script directly into the Supabase SQL Editor to set up the database tables and real-time triggers.

-- 1. Create Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    phone TEXT PRIMARY KEY,
    name TEXT,
    status TEXT DEFAULT 'pending_verification' CHECK (status IN ('verified', 'blocked', 'pending_verification')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create Policies (Allow public read/write for now, or restrict appropriately)
CREATE POLICY "Allow public read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Allow public insert customers" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update customers" ON public.customers FOR UPDATE USING (true);

-- 2. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone TEXT REFERENCES public.customers(phone) ON DELETE SET NULL,
    items JSONB NOT NULL,
    total NUMERIC NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('delivery', 'takeaway', 'dine-in')),
    address_gps TEXT,
    address_details TEXT,
    status TEXT DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'pending_accept', 'accepted', 'completed', 'cancelled')),
    is_ai_parsed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Allow public read orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update orders" ON public.orders FOR UPDATE USING (true);

-- 3. Create Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Allow public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow public write settings" ON public.settings FOR ALL USING (true);

-- Insert default maintenance setting
INSERT INTO public.settings (key, value)
VALUES ('maintenanceMode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. Enable Real-Time for Orders & Settings
-- This is critical for the Staff and Admin Screens to receive live updates!
alter publication supabase_realtime drop table if exists public.orders, public.settings;
alter publication supabase_realtime add table public.orders, public.settings;
