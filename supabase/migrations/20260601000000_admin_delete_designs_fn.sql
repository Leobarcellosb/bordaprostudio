CREATE OR REPLACE FUNCTION public.admin_delete_designs(design_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- TRAVA DE AUTORIZAÇÃO: SECURITY DEFINER ignora o RLS, então a checagem
  -- de admin precisa estar AQUI DENTRO, não só na interface.
  -- Usamos borda_is_admin() (sem args, usa auth.uid() internamente — auth.uid()
  -- continua sendo o do chamador mesmo sob SECURITY DEFINER). É a MESMA função
  -- que as policies de RLS das folders usam como "é admin". NÃO usar is_admin():
  -- em prod ela exige argumento (is_admin(user_uuid uuid)), then is_admin() sem
  -- arg não existe.
  IF NOT public.borda_is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  -- designs já tem ON DELETE CASCADE p/ as 7 filhas; estes DELETEs
  -- explícitos são redundantes (defensivos), não prejudiciais.
  DELETE FROM product_ideas WHERE design_id = ANY(design_ids);
  DELETE FROM kit_arquivos  WHERE design_id = ANY(design_ids);
  DELETE FROM kit_designs   WHERE design_id = ANY(design_ids);
  DELETE FROM designs       WHERE id        = ANY(design_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_designs(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_designs(uuid[]) TO authenticated;
