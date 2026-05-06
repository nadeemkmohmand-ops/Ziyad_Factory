
-- Drop interest columns
ALTER TABLE public.lending_borrowing DROP COLUMN IF EXISTS interest_rate;
ALTER TABLE public.lending_borrowing DROP COLUMN IF EXISTS interest_type;

-- Add new columns to lending_borrowing
ALTER TABLE public.lending_borrowing
  ADD COLUMN IF NOT EXISTS supplier_id uuid,
  ADD COLUMN IF NOT EXISTS customer_id uuid,
  ADD COLUMN IF NOT EXISTS item_kind text,           -- 'raw_rock' or 'marble'
  ADD COLUMN IF NOT EXISTS rock_type text,
  ADD COLUMN IF NOT EXISTS marble_type text,
  ADD COLUMN IF NOT EXISTS marble_size text,
  ADD COLUMN IF NOT EXISTS quantity numeric,
  ADD COLUMN IF NOT EXISTS unit text,                -- 'tons' or 'pieces'
  ADD COLUMN IF NOT EXISTS price_per_unit numeric,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_address text,
  ADD COLUMN IF NOT EXISTS contact_email text;

-- Suppliers extra fields
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS rock_type text,
  ADD COLUMN IF NOT EXISTS quantity_tons numeric,
  ADD COLUMN IF NOT EXISTS price_per_ton numeric;

-- Customers extra fields
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS marble_type text,
  ADD COLUMN IF NOT EXISTS marble_size text,
  ADD COLUMN IF NOT EXISTS pieces numeric,
  ADD COLUMN IF NOT EXISTS price_per_piece numeric;

-- Expenses product field
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS expense_product text;

-- Marble sizes lookup
CREATE TABLE IF NOT EXISTS public.marble_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marble_sizes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read marble_sizes" ON public.marble_sizes;
CREATE POLICY "auth read marble_sizes" ON public.marble_sizes FOR SELECT USING (can_read(auth.uid()));
DROP POLICY IF EXISTS "admin manage marble_sizes" ON public.marble_sizes;
CREATE POLICY "admin manage marble_sizes" ON public.marble_sizes FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "manager insert marble_sizes" ON public.marble_sizes;
CREATE POLICY "manager insert marble_sizes" ON public.marble_sizes FOR INSERT
  WITH CHECK (is_admin_or_manager(auth.uid()));

INSERT INTO public.marble_sizes (label, display_order) VALUES
  ('12 x 12', 1),('16 x 16', 2),('18 x 18', 3),('24 x 12', 4),
  ('24 x 24', 5),('30 x 30', 6),('36 x 18', 7),('48 x 24', 8)
ON CONFLICT (label) DO NOTHING;

-- Expense products lookup
CREATE TABLE IF NOT EXISTS public.expense_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read expense_products" ON public.expense_products;
CREATE POLICY "auth read expense_products" ON public.expense_products FOR SELECT USING (can_read(auth.uid()));
DROP POLICY IF EXISTS "admin manage expense_products" ON public.expense_products;
CREATE POLICY "admin manage expense_products" ON public.expense_products FOR ALL
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "manager insert expense_products" ON public.expense_products;
CREATE POLICY "manager insert expense_products" ON public.expense_products FOR INSERT
  WITH CHECK (is_admin_or_manager(auth.uid()));

INSERT INTO public.expense_products (label, display_order) VALUES
  ('چائے / Tea', 1),('کھانا / Meal', 2),('ناشتہ / Breakfast', 3),
  ('پانی / Water', 4),('تیل / Fuel', 5),('بجلی / Electricity', 6),
  ('مرمت / Maintenance', 7),('ٹرانسپورٹ / Transport', 8),('متفرق / Misc', 9)
ON CONFLICT (label) DO NOTHING;
