
-- =========================================
-- ROLES
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'viewer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','manager')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto profile + first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_first boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO _is_first;

  IF _is_first THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- FACTORY INFO
-- =========================================
CREATE TABLE public.factory_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_urdu text,
  name_english text,
  address text,
  logo_url text,
  established_year int,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.factory_info ENABLE ROW LEVEL SECURITY;

-- =========================================
-- FOUNDERS
-- =========================================
CREATE TABLE public.founders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_urdu text,
  name_english text,
  designation_urdu text,
  designation_english text,
  photo_url text,
  display_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.founders ENABLE ROW LEVEL SECURITY;

-- =========================================
-- MARBLE CATEGORIES
-- =========================================
CREATE TABLE public.marble_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_urdu text NOT NULL,
  name_english text,
  description_urdu text,
  price_per_sqft numeric(10,2),
  price_per_slab numeric(10,2),
  unit text NOT NULL DEFAULT 'sqft' CHECK (unit IN ('sqft','slab','ton','piece')),
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marble_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.marble_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.marble_categories(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption_urdu text,
  display_order int DEFAULT 0,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marble_photos ENABLE ROW LEVEL SECURITY;

-- =========================================
-- INVENTORY
-- =========================================
CREATE TABLE public.raw_rock_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rock_name_urdu text,
  supplier_name text,
  purchase_date date,
  quantity_tons numeric(10,2),
  purchase_price_per_ton numeric(10,2),
  total_cost numeric(12,2) GENERATED ALWAYS AS (quantity_tons * purchase_price_per_ton) STORED,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.raw_rock_inventory ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.finished_marble_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.marble_categories(id) ON DELETE SET NULL,
  batch_number text,
  quantity numeric(10,2),
  unit text,
  production_date date,
  cost_per_unit numeric(10,2),
  selling_price_per_unit numeric(10,2),
  stock_status text DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock','reserved','sold_out')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finished_marble_inventory ENABLE ROW LEVEL SECURITY;

-- =========================================
-- CUSTOMERS / SUPPLIERS
-- =========================================
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  address text,
  customer_type text DEFAULT 'retail' CHECK (customer_type IN ('retail','wholesale','contractor')),
  credit_limit numeric(12,2) DEFAULT 0,
  current_balance numeric(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  address text,
  supply_type text CHECK (supply_type IN ('raw_rock','equipment','chemicals','other')),
  current_balance numeric(12,2) DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- =========================================
-- SALES
-- =========================================
CREATE TABLE public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_date date,
  delivery_date date,
  payment_type text CHECK (payment_type IN ('cash','credit','partial','lend')),
  total_amount numeric(12,2) DEFAULT 0,
  paid_amount numeric(12,2) DEFAULT 0,
  remaining_amount numeric(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  status text DEFAULT 'pending' CHECK (status IN ('pending','processing','delivered','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.marble_categories(id) ON DELETE SET NULL,
  inventory_id uuid REFERENCES public.finished_marble_inventory(id) ON DELETE SET NULL,
  quantity numeric(10,2),
  unit text,
  unit_price numeric(10,2),
  total_price numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

-- =========================================
-- PAYMENTS
-- =========================================
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type text CHECK (payment_type IN ('received','paid','lending','borrowing','repayment')),
  related_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  amount numeric(12,2),
  payment_method text CHECK (payment_method IN ('cash','bank_transfer','cheque','online')),
  payment_date date,
  due_date date,
  is_settled boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =========================================
-- LABOUR
-- =========================================
CREATE TABLE public.labour (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnic text,
  phone text,
  job_role text,
  daily_wage numeric(8,2),
  monthly_salary numeric(10,2),
  salary_type text CHECK (salary_type IN ('daily','monthly')),
  join_date date,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.labour ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  labour_id uuid REFERENCES public.labour(id) ON DELETE CASCADE,
  date date,
  status text CHECK (status IN ('present','absent','half_day','overtime')),
  overtime_hours numeric(4,2) DEFAULT 0,
  notes text
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  labour_id uuid REFERENCES public.labour(id) ON DELETE CASCADE,
  month int,
  year int,
  days_present int,
  half_days int,
  overtime_hours numeric(6,2),
  base_salary numeric(10,2),
  overtime_pay numeric(10,2),
  deductions numeric(10,2) DEFAULT 0,
  net_salary numeric(10,2),
  paid_date date,
  payment_method text CHECK (payment_method IN ('cash','bank')),
  is_paid boolean DEFAULT false,
  notes text
);
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

-- =========================================
-- EXPENSES / LENDING / MACHINES / PRODUCTION
-- =========================================
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text,
  description text,
  amount numeric(10,2),
  expense_date date,
  paid_to text,
  receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.lending_borrowing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text CHECK (transaction_type IN ('lend','borrow')),
  party_name text NOT NULL,
  party_type text CHECK (party_type IN ('customer','supplier','person','bank')),
  amount numeric(12,2),
  transaction_date date,
  due_date date,
  interest_rate numeric(5,2) DEFAULT 0,
  interest_type text CHECK (interest_type IN ('simple','compound','none')) DEFAULT 'none',
  amount_returned numeric(12,2) DEFAULT 0,
  is_settled boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lending_borrowing ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.machine_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_name text,
  purchase_date date,
  purchase_price numeric(12,2),
  current_status text CHECK (current_status IN ('working','repair','retired')),
  last_maintenance_date date,
  notes text
);
ALTER TABLE public.machine_equipment ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.production_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date,
  raw_rock_used_tons numeric(8,2),
  slabs_produced int,
  sqft_produced numeric(10,2),
  category_id uuid REFERENCES public.marble_categories(id) ON DELETE SET NULL,
  operator_name text,
  machine_id uuid REFERENCES public.machine_equipment(id) ON DELETE SET NULL,
  wastage_percent numeric(5,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;

-- =========================================
-- RLS POLICIES
-- =========================================

-- user_roles
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- profiles
CREATE POLICY "auth read profiles" ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "user updates own profile" ON public.profiles FOR UPDATE
  USING (id = auth.uid());
CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Helper macro: public read tables (factory_info, founders, marble_categories, marble_photos)
CREATE POLICY "public read factory_info" ON public.factory_info FOR SELECT USING (true);
CREATE POLICY "admin manage factory_info" ON public.factory_info FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "public read founders" ON public.founders FOR SELECT USING (true);
CREATE POLICY "admin manage founders" ON public.founders FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "public read marble_categories" ON public.marble_categories FOR SELECT USING (true);
CREATE POLICY "admin manage marble_categories" ON public.marble_categories FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "manager update marble_categories" ON public.marble_categories FOR UPDATE
  USING (public.has_role(auth.uid(),'manager'));

CREATE POLICY "public read marble_photos" ON public.marble_photos FOR SELECT USING (true);
CREATE POLICY "admin manage marble_photos" ON public.marble_photos FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Auth-only tables: read for any authenticated; write rules per role
-- Standard pattern function
CREATE OR REPLACE FUNCTION public.can_read(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid)
$$;

-- Tables managers can write to
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'raw_rock_inventory','finished_marble_inventory','customers','suppliers',
    'sales_orders','sales_order_items','payments','labour','attendance',
    'salary_payments','expenses','lending_borrowing','machine_equipment','production_logs'
  ]) LOOP
    EXECUTE format('CREATE POLICY "auth read %1$s" ON public.%1$I FOR SELECT USING (public.can_read(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "manager insert %1$s" ON public.%1$I FOR INSERT WITH CHECK (public.is_admin_or_manager(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "manager update %1$s" ON public.%1$I FOR UPDATE USING (public.is_admin_or_manager(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "admin delete %1$s" ON public.%1$I FOR DELETE USING (public.has_role(auth.uid(),''admin''))', t);
  END LOOP;
END $$;

-- =========================================
-- STORAGE BUCKETS
-- =========================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('marble-photos','marble-photos', true),
  ('founder-photos','founder-photos', true),
  ('receipts','receipts', true),
  ('factory-assets','factory-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read; admin/manager upload; admin delete
CREATE POLICY "public read marble bucket" ON storage.objects FOR SELECT
  USING (bucket_id IN ('marble-photos','founder-photos','receipts','factory-assets'));

CREATE POLICY "auth upload buckets" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('marble-photos','founder-photos','receipts','factory-assets')
    AND public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "auth update buckets" ON storage.objects FOR UPDATE
  USING (
    bucket_id IN ('marble-photos','founder-photos','receipts','factory-assets')
    AND public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "admin delete buckets" ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('marble-photos','founder-photos','receipts','factory-assets')
    AND public.has_role(auth.uid(),'admin')
  );
