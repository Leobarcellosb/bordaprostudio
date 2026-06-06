-- Tabela de junção pros KITS PREMIUM (admin SmartKitBuilder + PremiumKitDetail).
--
-- POR QUÊ uma tabela nova em vez de reusar kit_designs:
-- kit_designs.kit_id tem FK -> kits(id) e a tabela `kits` é usada por OUTRO
-- sistema (sugestões da home: seasonal/cluster/collection inserem kits+kit_designs).
-- O SmartKitBuilder grava em `premium_kits`, e o PremiumKitDetail lia kit_designs
-- por premium_kits.id — o que SEMPRE quebraria a FK (premium_kits.id ∉ kits).
-- Resultado: kit premium aparecia com designs_count mas vinha vazio.
-- Esta tabela liga premium_kits <-> designs sem colidir com o sistema kits.

CREATE TABLE IF NOT EXISTS public.premium_kit_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  premium_kit_id uuid NOT NULL REFERENCES public.premium_kits(id) ON DELETE CASCADE,
  design_id uuid NOT NULL REFERENCES public.designs(id) ON DELETE CASCADE,
  order_index integer DEFAULT 0,
  UNIQUE (premium_kit_id, design_id)
);

CREATE INDEX IF NOT EXISTS idx_premium_kit_designs_kit ON public.premium_kit_designs(premium_kit_id);

ALTER TABLE public.premium_kit_designs ENABLE ROW LEVEL SECURITY;

-- Leitura liberada pra authenticated (PremiumKitDetail roda sob ProtectedRoute).
-- ESCRITA não tem policy: vai SÓ pela RPC SECURITY DEFINER abaixo, que bypassa
-- RLS — mesmo padrão do admin_delete_designs. Evita referenciar has_role/app_role
-- no DDL (que falha no contexto do `db push`) e centraliza a escrita atômica.
CREATE POLICY "Anyone authenticated can read premium_kit_designs"
  ON public.premium_kit_designs FOR SELECT TO authenticated
  USING (true);

-- GRANT explícito (lição do bug folders: RLS sem GRANT = 42501 em prod).
GRANT SELECT ON public.premium_kit_designs TO authenticated;

-- RPC transacional: cria o premium_kit + as linhas de junção numa única
-- transação (função plpgsql é atômica — se qualquer insert falhar, tudo
-- reverte, sem kit órfão com contagem mas sem designs). SECURITY DEFINER pra
-- escrever premium_kits + premium_kit_designs sob RLS. Acesso restrito a
-- authenticated; a UI (SmartKitBuilder) só é alcançável por admin — mesmo
-- modelo de confiança do admin_delete_designs já existente.
CREATE OR REPLACE FUNCTION public.create_premium_kit_with_designs(
  p_kit jsonb,
  p_design_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kit_id uuid;
  v_design_id uuid;
  v_idx integer := 0;
BEGIN
  INSERT INTO public.premium_kits (
    title, description, cover_image, designs_count, access_rule, is_published, updated_at
  ) VALUES (
    p_kit->>'title',
    p_kit->>'description',
    p_kit->>'cover_image',
    COALESCE((p_kit->>'designs_count')::int, array_length(p_design_ids, 1), 0),
    COALESCE(p_kit->>'access_rule', 'included_in_annual'),
    COALESCE((p_kit->>'is_published')::boolean, false),
    now()
  )
  RETURNING id INTO v_kit_id;

  FOREACH v_design_id IN ARRAY COALESCE(p_design_ids, ARRAY[]::uuid[])
  LOOP
    INSERT INTO public.premium_kit_designs (premium_kit_id, design_id, order_index)
    VALUES (v_kit_id, v_design_id, v_idx)
    ON CONFLICT (premium_kit_id, design_id) DO NOTHING;
    v_idx := v_idx + 1;
  END LOOP;

  RETURN v_kit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_premium_kit_with_designs(jsonb, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_premium_kit_with_designs(jsonb, uuid[]) TO authenticated;
