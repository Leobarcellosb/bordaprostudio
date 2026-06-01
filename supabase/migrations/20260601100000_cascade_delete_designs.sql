-- Adiciona ON DELETE CASCADE nas FKs que referenciam designs.id
-- Assim deletar um design remove automaticamente os registros filhos.

ALTER TABLE product_ideas
  DROP CONSTRAINT IF EXISTS product_ideas_design_id_fkey,
  ADD CONSTRAINT product_ideas_design_id_fkey
    FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE;

ALTER TABLE kit_arquivos
  DROP CONSTRAINT IF EXISTS kit_arquivos_design_id_fkey,
  ADD CONSTRAINT kit_arquivos_design_id_fkey
    FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE;

ALTER TABLE kit_designs
  DROP CONSTRAINT IF EXISTS kit_designs_design_id_fkey,
  ADD CONSTRAINT kit_designs_design_id_fkey
    FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE CASCADE;
