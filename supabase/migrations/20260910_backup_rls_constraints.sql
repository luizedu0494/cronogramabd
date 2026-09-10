-- Script SQL para Reforço de Segurança (RLS) e Constraints de Unicidade de Backup
-- Executar no Editor SQL do console do Supabase

-- 1. Função Auxiliar: Verifica se o usuário autenticado possui role de 'coordenador'
CREATE OR REPLACE FUNCTION public.is_coordenador()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE uid = auth.uid()::text AND role = 'coordenador'
  );
$$;

-- 2. Políticas RLS para Coordenadores
DROP POLICY IF EXISTS "coordenador pode exportar aulas" ON public.aulas;
CREATE POLICY "coordenador pode exportar aulas"
  ON public.aulas FOR SELECT
  USING (is_coordenador());

DROP POLICY IF EXISTS "coordenador pode exportar eventos" ON public.eventos_manutencao;
CREATE POLICY "coordenador pode exportar eventos"
  ON public.eventos_manutencao FOR SELECT
  USING (is_coordenador());

DROP POLICY IF EXISTS "coordenador pode exportar periodos" ON public.periodos_sem_atividade;
CREATE POLICY "coordenador pode exportar periodos"
  ON public.periodos_sem_atividade FOR SELECT
  USING (is_coordenador());

DROP POLICY IF EXISTS "coordenador pode exportar grupos" ON public.grupos;
CREATE POLICY "coordenador pode exportar grupos"
  ON public.grupos FOR SELECT
  USING (is_coordenador());

DROP POLICY IF EXISTS "coordenador pode exportar avisos" ON public.avisos;
CREATE POLICY "coordenador pode exportar avisos"
  ON public.avisos FOR SELECT
  USING (is_coordenador());

-- 3. Limpeza preventiva de duplicatas existentes antes de criar as restrições UNIQUE
DELETE FROM public.aulas a1
USING public.aulas a2
WHERE a1.id > a2.id
  AND a1.laboratorio = a2.laboratorio
  AND a1.data_inicio = a2.data_inicio
  AND a1.assunto = a2.assunto;

DELETE FROM public.eventos_manutencao e1
USING public.eventos_manutencao e2
WHERE e1.id > e2.id
  AND e1.laboratorio = e2.laboratorio
  AND e1.data_inicio = e2.data_inicio
  AND e1.data_fim = e2.data_fim
  AND e1.titulo = e2.titulo;

DELETE FROM public.periodos_sem_atividade p1
USING public.periodos_sem_atividade p2
WHERE p1.id > p2.id
  AND p1.data_inicio = p2.data_inicio
  AND p1.data_fim = p2.data_fim
  AND p1.descricao = p2.descricao;

DELETE FROM public.grupos g1
USING public.grupos g2
WHERE g1.id > g2.id
  AND lower(trim(g1.nome)) = lower(trim(g2.nome));

-- 4. Constraints UNIQUE Compostas (Chaves Naturais para Idempotência)
ALTER TABLE public.aulas 
  DROP CONSTRAINT IF EXISTS uq_aulas_chave_natural,
  ADD CONSTRAINT uq_aulas_chave_natural UNIQUE (laboratorio, data_inicio, assunto);

ALTER TABLE public.eventos_manutencao 
  DROP CONSTRAINT IF EXISTS uq_eventos_chave_natural,
  ADD CONSTRAINT uq_eventos_chave_natural UNIQUE (laboratorio, data_inicio, data_fim, titulo);

ALTER TABLE public.periodos_sem_atividade 
  DROP CONSTRAINT IF EXISTS uq_periodos_chave_natural,
  ADD CONSTRAINT uq_periodos_chave_natural UNIQUE (data_inicio, data_fim, descricao);

ALTER TABLE public.grupos 
  DROP CONSTRAINT IF EXISTS uq_grupos_nome,
  ADD CONSTRAINT uq_grupos_nome UNIQUE (nome);
