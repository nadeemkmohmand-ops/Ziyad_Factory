-- 1. show_price on marble_categories
ALTER TABLE public.marble_categories
  ADD COLUMN IF NOT EXISTS show_price boolean NOT NULL DEFAULT true;

-- 2. app_settings singleton
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  low_stock_threshold_tons numeric NOT NULL DEFAULT 5,
  default_currency text NOT NULL DEFAULT 'PKR',
  default_unit text NOT NULL DEFAULT 'sqft',
  working_days_per_week integer NOT NULL DEFAULT 6,
  overtime_multiplier numeric NOT NULL DEFAULT 1.5,
  working_hours_per_day numeric NOT NULL DEFAULT 8,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read app_settings" ON public.app_settings
  FOR SELECT USING (public.can_read(auth.uid()));

CREATE POLICY "admin manage app_settings" ON public.app_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- seed one row if empty
INSERT INTO public.app_settings (id) SELECT gen_random_uuid()
  WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- 3. marble price history + trigger
CREATE TABLE IF NOT EXISTS public.marble_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  old_price_per_sqft numeric,
  new_price_per_sqft numeric,
  old_price_per_slab numeric,
  new_price_per_slab numeric,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid
);

ALTER TABLE public.marble_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read price history" ON public.marble_price_history
  FOR SELECT USING (public.can_read(auth.uid()));

CREATE POLICY "admin manage price history" ON public.marble_price_history
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_marble_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.price_per_sqft IS DISTINCT FROM OLD.price_per_sqft
     OR NEW.price_per_slab IS DISTINCT FROM OLD.price_per_slab THEN
    INSERT INTO public.marble_price_history
      (category_id, old_price_per_sqft, new_price_per_sqft, old_price_per_slab, new_price_per_slab, changed_by)
    VALUES (NEW.id, OLD.price_per_sqft, NEW.price_per_sqft, OLD.price_per_slab, NEW.price_per_slab, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_marble_price ON public.marble_categories;
CREATE TRIGGER trg_log_marble_price
AFTER UPDATE ON public.marble_categories
FOR EACH ROW EXECUTE FUNCTION public.log_marble_price_change();