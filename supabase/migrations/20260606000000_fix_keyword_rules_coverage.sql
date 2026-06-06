-- Fix C: keyword_rules vazias ou incompletas para pastas com zero designs.
--
-- NOTA DE SINTAXE: keyword_rules é text[] no Postgres.
-- Em SQL puro sempre usar ARRAY['...','...'] ou '{...}' — NUNCA '[...]' (JSON).
-- Via supabase-js no frontend: passar JS array normal continua correto.

UPDATE folders SET keyword_rules = ARRAY['heroi','herois','super-heroi','super heroi','batman','superman','homem aranha','homem de ferro','capitao america']
WHERE slug = 'herois';

UPDATE folders SET keyword_rules = ARRAY['urso','ursinho','ursa','ursao','panda']
WHERE slug = 'urso';

UPDATE folders SET keyword_rules = ARRAY['nome','nomes']
WHERE slug = 'nomes';

UPDATE folders SET keyword_rules = ARRAY['alfabeto','alfabetos','letra','letras','monograma','monogramas']
WHERE slug = 'alfabetos';

UPDATE folders SET keyword_rules = ARRAY['moldura','molduras','frame','borda','bordas']
WHERE slug = 'moldura';

UPDATE folders SET keyword_rules = ARRAY['crianca','crianças','criancas','bebe','bebes','kids']
WHERE slug = 'criancas';

UPDATE folders SET keyword_rules = ARRAY['rosa','rosas']
WHERE slug = 'rosas';

UPDATE folders SET keyword_rules = ARRAY['aviador','aviadores','urso aviador','piloto']
WHERE slug = 'urso-aviador';
