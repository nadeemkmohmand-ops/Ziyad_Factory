-- Supplier FK on raw rock inventory
ALTER TABLE public.raw_rock_inventory
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Atomic decrement helpers
CREATE OR REPLACE FUNCTION public.decrement_raw_rock(rock_id uuid, used_tons numeric)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.raw_rock_inventory
  SET quantity_tons = GREATEST(COALESCE(quantity_tons,0) - COALESCE(used_tons,0), 0)
  WHERE id = rock_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_finished_inventory(inv_id uuid, sold_qty numeric)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.finished_marble_inventory
  SET quantity = GREATEST(COALESCE(quantity,0) - COALESCE(sold_qty,0), 0),
      stock_status = CASE
        WHEN COALESCE(quantity,0) - COALESCE(sold_qty,0) <= 0 THEN 'out_of_stock'
        WHEN COALESCE(quantity,0) - COALESCE(sold_qty,0) <= 10 THEN 'low_stock'
        ELSE 'in_stock'
      END
  WHERE id = inv_id;
$$;

-- Realtime
ALTER TABLE public.sales_orders REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER TABLE public.raw_rock_inventory REPLICA IDENTITY FULL;
ALTER TABLE public.finished_marble_inventory REPLICA IDENTITY FULL;
ALTER TABLE public.attendance REPLICA IDENTITY FULL;
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.suppliers REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.raw_rock_inventory; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.finished_marble_inventory; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.customers; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;