-- Fix overly permissive update policy on vouchers
DROP POLICY "Authenticated can update vouchers" ON public.vouchers;
CREATE POLICY "Creator or admin can update vouchers"
  ON public.vouchers FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));