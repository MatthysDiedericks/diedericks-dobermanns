-- Waiting list CRM module: list types, extended columns, history audit, triggers.

-- List types -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waiting_list_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  colour text,
  sort_order int NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.waiting_list_types (name, slug, colour, sort_order, is_system)
VALUES
  ('Standard Puppy', 'standard-puppy', '#C4A35A', 1, true),
  ('Elite Developed', 'elite-developed', '#C4A35A', 2, true),
  ('Protection Dog', 'protection-dog', '#C4A35A', 3, true),
  ('Training Clients', 'training-clients', '#C4A35A', 4, true),
  ('Do Not Sell', 'do-not-sell', '#EF4444', 99, true)
ON CONFLICT (slug) DO NOTHING;

-- Extended waiting_list columns ----------------------------------------------
ALTER TABLE public.waiting_list ALTER COLUMN client_id DROP NOT NULL;

ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS list_type_id uuid REFERENCES public.waiting_list_types (id) ON DELETE SET NULL;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.applications (id) ON DELETE SET NULL;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS enquirer_name text;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS enquirer_email text;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS enquirer_phone text;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS enquirer_country text;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS preferred_category text DEFAULT 'any';
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS preferred_sex text DEFAULT 'any';
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS preferred_colour text;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS ear_preference text DEFAULT 'no_preference';
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS tail_preference text DEFAULT 'no_preference';
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS registration_preference text;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal'
  CHECK (priority IN ('high', 'normal', 'low'));
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_paid'
  CHECK (payment_status IN ('not_paid', 'deposit_paid', 'paid_in_full'));
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS deposit_amount numeric(12, 2);
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS quoted_price numeric(12, 2);
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS quote_expires_at date;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS deposit_invoice_id uuid REFERENCES public.invoices (id) ON DELETE SET NULL;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS assigned_dog_id uuid REFERENCES public.dogs (id) ON DELETE SET NULL;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS assigned_litter_id uuid REFERENCES public.litters (id) ON DELETE SET NULL;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS last_contact_date date;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS client_visible_note text;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS internal_flags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS do_not_sell_reason text;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS stage_change_note text;
ALTER TABLE public.waiting_list ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.waiting_list
  ALTER COLUMN pipeline_stage SET DEFAULT 'enquiry';

CREATE INDEX IF NOT EXISTS idx_waiting_list_type ON public.waiting_list (list_type_id);
CREATE INDEX IF NOT EXISTS idx_waiting_list_stage ON public.waiting_list (pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_waiting_list_follow_up ON public.waiting_list (follow_up_date);

-- Stage history --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waiting_list_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waiting_list_id uuid NOT NULL REFERENCES public.waiting_list (id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  changed_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waiting_list_history_entry ON public.waiting_list_history (waiting_list_id, created_at DESC);

ALTER TABLE public.waiting_list_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waiting_list_history admin read" ON public.waiting_list_history
  FOR SELECT USING (public.is_admin());

-- Triggers -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_waiting_list_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    INSERT INTO public.waiting_list_history (waiting_list_id, from_stage, to_stage, changed_by, notes)
    VALUES (NEW.id, OLD.pipeline_stage, NEW.pipeline_stage, auth.uid(), NEW.stage_change_note);
    NEW.stage_change_note := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_waiting_list_stage_log ON public.waiting_list;
CREATE TRIGGER trigger_waiting_list_stage_log
  BEFORE UPDATE ON public.waiting_list
  FOR EACH ROW
  EXECUTE FUNCTION public.log_waiting_list_stage_change();

CREATE OR REPLACE FUNCTION public.sync_waitlist_from_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.waiting_list
    SET pipeline_stage = 'deposit_paid',
        payment_status = 'deposit_paid',
        deposit_amount = COALESCE(deposit_amount, NEW.amount_paid)
    WHERE deposit_invoice_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_waitlist_from_invoice ON public.invoices;
CREATE TRIGGER trigger_sync_waitlist_from_invoice
  AFTER UPDATE OF status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_waitlist_from_invoice();

DROP TRIGGER IF EXISTS trg_waiting_list_updated ON public.waiting_list;
CREATE TRIGGER trg_waiting_list_updated
  BEFORE UPDATE ON public.waiting_list
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS for list types ---------------------------------------------------------
ALTER TABLE public.waiting_list_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waiting_list_types read admin" ON public.waiting_list_types
  FOR SELECT USING (public.is_admin());
CREATE POLICY "waiting_list_types admin write" ON public.waiting_list_types
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
