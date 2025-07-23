-- Inventory & Sales Management App - Database Schema (FIXED)
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- Create profiles table for user roles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  role TEXT CHECK (role IN ('owner', 'staff')) DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create items table for inventory
CREATE TABLE IF NOT EXISTS items (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  quantity INTEGER DEFAULT 0,
  supplier TEXT,
  price DECIMAL(10,2) DEFAULT 0.00,
  cost_price DECIMAL(10,2) DEFAULT 0.00,
  category TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id BIGSERIAL PRIMARY KEY,
  sale_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  customer_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sale_items table (junction table for sales and items)
CREATE TABLE IF NOT EXISTS sale_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stock_movements table for audit trail
CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGSERIAL PRIMARY KEY,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  type TEXT CHECK (type IN ('intake', 'sale', 'adjustment')) NOT NULL,
  movement_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shop_settings table
CREATE TABLE IF NOT EXISTS shop_settings (
  id BIGSERIAL PRIMARY KEY,
  shop_name TEXT DEFAULT 'My Shop',
  location TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  low_stock_threshold INTEGER DEFAULT 5,
  currency TEXT DEFAULT 'GBP',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode);
CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON sales(sale_timestamp);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_timestamp ON stock_movements(movement_timestamp);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow authenticated users to access their data
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow all authenticated users to manage items (for multi-user shops)
CREATE POLICY "Authenticated users can manage items" ON items FOR ALL USING (auth.role() = 'authenticated');

-- Allow all authenticated users to manage sales
CREATE POLICY "Authenticated users can manage sales" ON sales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage sale_items" ON sale_items FOR ALL USING (auth.role() = 'authenticated');

-- Allow all authenticated users to manage stock movements
CREATE POLICY "Authenticated users can manage stock_movements" ON stock_movements FOR ALL USING (auth.role() = 'authenticated');

-- Allow all authenticated users to manage shop settings
CREATE POLICY "Authenticated users can manage shop_settings" ON shop_settings FOR ALL USING (auth.role() = 'authenticated');

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample data (optional)
INSERT INTO items (name, sku, barcode, quantity, price, supplier, category) VALUES
('Sample Product 1', 'SKU001', '1234567890123', 50, 9.99, 'Sample Supplier', 'Electronics'),
('Sample Product 2', 'SKU002', '1234567890124', 25, 19.99, 'Sample Supplier', 'Electronics'),
('Sample Product 3', 'SKU003', '1234567890125', 0, 5.99, 'Another Supplier', 'Accessories')
ON CONFLICT (sku) DO NOTHING; 