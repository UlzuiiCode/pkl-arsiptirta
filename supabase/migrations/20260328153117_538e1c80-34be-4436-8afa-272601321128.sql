-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Vouchers table
CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  file_url TEXT,
  file_name TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Activity logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
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

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile and assign default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles
CREATE POLICY "Anyone authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles
CREATE POLICY "Authenticated can view roles"
  ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Categories
CREATE POLICY "Authenticated can view categories"
  ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Vouchers
CREATE POLICY "Authenticated can view vouchers"
  ON public.vouchers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert vouchers"
  ON public.vouchers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated can update vouchers"
  ON public.vouchers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete vouchers"
  ON public.vouchers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Activity logs
CREATE POLICY "Authenticated can view logs"
  ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert logs"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket for voucher files
INSERT INTO storage.buckets (id, name, public) VALUES ('voucher-files', 'voucher-files', true);

CREATE POLICY "Authenticated can upload voucher files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voucher-files');
CREATE POLICY "Anyone can view voucher files"
  ON storage.objects FOR SELECT USING (bucket_id = 'voucher-files');
CREATE POLICY "Authenticated can update voucher files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'voucher-files');
CREATE POLICY "Admins can delete voucher files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'voucher-files' AND public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_vouchers_date ON public.vouchers (voucher_date);
CREATE INDEX idx_vouchers_month_year ON public.vouchers (month, year);
CREATE INDEX idx_vouchers_category ON public.vouchers (category_id);
CREATE INDEX idx_vouchers_number ON public.vouchers (voucher_number);
CREATE INDEX idx_activity_logs_user ON public.activity_logs (user_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs (created_at DESC);

-- Seed default categories
INSERT INTO public.categories (name, description) VALUES
  ('Penerimaan', 'Voucher penerimaan kas/bank'),
  ('Pengeluaran', 'Voucher pengeluaran kas/bank'),
  ('Jurnal Umum', 'Voucher jurnal umum/memorial'),
  ('Operasional', 'Voucher biaya operasional'),
  ('Investasi', 'Voucher belanja modal/investasi');