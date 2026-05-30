-- Pastas "Por Tema" da biblioteca, gerenciáveis pelo admin.
--
-- Antes vivia em src/lib/folderRules.ts (estático, deploy pra mudar).
-- Agora é tabela no DB pra admin criar/renomear/reordenar/editar keywords
-- pela UI. Slug imutável após criação porque designs.manual_categories
-- referencia por slug (sem FK porque manual_categories é TEXT[]).
--
-- RLS: leitura pública, escrita só admin (borda_is_admin()).
--
-- Auto-match: keyword_rules disparam folderRules.deriveFoldersForDesign()
-- contra designs.tags_text. Lógica de match (token-level, ≥3 letras)
-- continua em src/lib/folderRules.ts — só o catálogo de pastas migrou.

CREATE TABLE IF NOT EXISTS public.folders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  keyword_rules text[] NOT NULL DEFAULT '{}',
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS folders_sort_order_idx ON public.folders (sort_order);
CREATE INDEX IF NOT EXISTS folders_is_active_idx  ON public.folders (is_active);

-- updated_at trigger (cria função se não existir — algumas migrations antigas
-- já criaram essa helper; CREATE OR REPLACE é idempotente)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS folders_set_updated_at ON public.folders;
CREATE TRIGGER folders_set_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "folders_select_all"    ON public.folders;
DROP POLICY IF EXISTS "folders_admin_insert"  ON public.folders;
DROP POLICY IF EXISTS "folders_admin_update"  ON public.folders;
DROP POLICY IF EXISTS "folders_admin_delete"  ON public.folders;

CREATE POLICY "folders_select_all" ON public.folders
  FOR SELECT USING (true);

CREATE POLICY "folders_admin_insert" ON public.folders
  FOR INSERT WITH CHECK (public.borda_is_admin());

CREATE POLICY "folders_admin_update" ON public.folders
  FOR UPDATE USING (public.borda_is_admin());

CREATE POLICY "folders_admin_delete" ON public.folders
  FOR DELETE USING (public.borda_is_admin());

COMMENT ON TABLE public.folders IS
  'Pastas "Por Tema" da biblioteca. Slug imutável (designs.manual_categories referencia por slug). keyword_rules dispara auto-match contra tags_text dos designs em src/lib/folderRules.ts. is_active=false esconde só no cliente; admin continua atribuindo e auto-match roda.';

-- Seed com as 11 pastas atuais. ON CONFLICT (slug) DO NOTHING preserva
-- qualquer edição do admin se a migration for rodada de novo por acidente.
INSERT INTO public.folders (slug, name, keyword_rules, sort_order, is_active) VALUES
  ('infantil', 'Infantil',
    ARRAY['infantil','bebê','bebe','criança','crianca','menina','menino','brinquedo','baby','kids'],
    10, true),
  ('animais', 'Animais',
    ARRAY['animal','animais','bicho','bichinho','fauna','selva',
          'urso','ursinho','coelho','coelhinho','gato','gatinho','cachorro','cachorrinho','cão','cao',
          'cavalo','cavalinho','ovelha','ovelhinha','dinossauro','dino','leão','leao','tigre','raposa',
          'vaca','pato','borboleta','peixe','ave','pássaro','passaro','coruja','baleia','flamingo',
          'panda','elefante','macaco','jacaré','jacare','tartaruga'],
    20, true),
  ('florais', 'Florais',
    ARRAY['flor','flores','floral','rosa','rosas','margarida','girassol',
          'folha','folhas','folhagem','jardim','botânico','botanico',
          'buquê','buque','ramo','pétala','petala','tulipa','orquídea','orquidea'],
    30, true),
  ('datas-comemorativas', 'Datas Comemorativas',
    ARRAY['natal','natalino','páscoa','pascoa','dia das mães','dia das maes','dia dos pais',
          'halloween','aniversário','aniversario','festa junina','junina','ano novo',
          'valentine','namorado','namorada','festivo','carnaval','comemorativa','festa'],
    40, true),
  ('religioso', 'Religioso',
    ARRAY['santo','santa','bíblia','biblia','católico','catolico','cristão','cristao',
          'cruz','anjo','oração','oracao','terço','terco','jesus','maria','deus',
          'espiritual','religioso','orando','menina orando','menino orando'],
    50, true),
  ('frases-letras', 'Frases & Letras',
    ARRAY['frase','palavra','lettering','citação','citacao','motivacional','texto','escrito'],
    60, true),
  ('monogramas', 'Monogramas',
    ARRAY['monograma','monogramas','letra','letras','inicial','iniciais','alfabeto','fonte decorativa'],
    70, true),
  ('profissoes', 'Profissões',
    ARRAY['médico','medico','médica','medica','enfermeiro','enfermeira',
          'advogado','advogada','professor','professora','engenheiro','engenheira',
          'veterinário','veterinaria','dentista','chef','profissão','profissao'],
    80, true),
  ('molduras-bordas', 'Molduras e Bordas',
    ARRAY['moldura','molduras','borda','bordas','ornamental','arabesco','arabescos','geométrico','geometrico','barra'],
    90, true),
  ('espaco-aventura', 'Espaço & Aventura',
    ARRAY['astronauta','foguete','espaço','espaco','lua','estrela','estrelas','planeta','aventura','espacial','celestial','noturno','balão','balao'],
    100, true),
  ('esportes-hobbies', 'Esportes & Hobbies',
    ARRAY['bicicleta','ciclista','troféu','trofeu','esporte','jogo','futebol','basquete','skate','surf'],
    110, true)
ON CONFLICT (slug) DO NOTHING;
