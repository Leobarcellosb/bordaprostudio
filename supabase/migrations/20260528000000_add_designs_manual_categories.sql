-- Override manual de pastas para a view "Por Tema".
--
-- Pastas derivadas automaticamente das tags (lib/folderRules.ts). Quando
-- o admin define manual_categories explicitamente, esse array substitui
-- a derivação automática inteira (não soma, sobrescreve). Vazio = auto.
--
-- Tipo TEXT[] de IDs do folderRules (slugs tipo "animais", "infantil",
-- "molduras-bordas"). Sem FK porque os IDs vivem no código frontend.

ALTER TABLE public.designs
  ADD COLUMN IF NOT EXISTS manual_categories TEXT[] NOT NULL DEFAULT '{}';

-- Índice GIN pra filtros tipo `manual_categories @> ARRAY['animais']`
CREATE INDEX IF NOT EXISTS designs_manual_categories_idx
  ON public.designs USING GIN (manual_categories);

COMMENT ON COLUMN public.designs.manual_categories IS
  'IDs (slugs) de pastas atribuídas manualmente pelo admin. Quando não vazio, substitui a derivação automática por tags. Slugs definidos em src/lib/folderRules.ts.';
