-- Schema SQL Consolidado do CronoLab para Supabase PostgreSQL
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Tabela: users
CREATE TABLE IF NOT EXISTS public.users (
    uid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'visualizador',
    approval_pending BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'pendente',
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    telegram_chat_id TEXT,
    avisos_nao_lidos INT DEFAULT 0
);

-- 2. Tabela: aulas
CREATE TABLE IF NOT EXISTS public.aulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assunto TEXT NOT NULL,
    tipo_atividade TEXT,
    laboratorio TEXT NOT NULL,
    horario_slot TEXT,
    data_inicio TIMESTAMPTZ NOT NULL,
    data_fim TIMESTAMPTZ,
    status TEXT DEFAULT 'pendente',
    cursos TEXT[],
    proposto_por_uid TEXT REFERENCES public.users(uid) ON DELETE SET NULL,
    proposto_por_nome TEXT,
    tecnicos TEXT[],
    is_revisao BOOLEAN DEFAULT FALSE,
    tipo_revisao_label TEXT,
    is_prova BOOLEAN DEFAULT FALSE,
    observacoes TEXT,
    origem TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela: eventos_manutencao
CREATE TABLE IF NOT EXISTS public.eventos_manutencao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT NOT NULL DEFAULT 'Manutenção',
    laboratorio TEXT NOT NULL DEFAULT 'Todos',
    laboratorios TEXT[],
    data_inicio TIMESTAMPTZ NOT NULL,
    data_fim TIMESTAMPTZ NOT NULL,
    horario_slot TEXT,
    status TEXT DEFAULT 'aprovado',
    criado_por_uid TEXT REFERENCES public.users(uid) ON DELETE SET NULL,
    criado_por_nome TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela: avisos
CREATE TABLE IF NOT EXISTS public.avisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    prioridade TEXT DEFAULT 'normal',
    autor TEXT DEFAULT 'Coordenação',
    criado_por TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela: notificacoes
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destinatario_uid TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'sistema',
    titulo TEXT NOT NULL,
    corpo TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    aula_id TEXT,
    evento_id TEXT,
    aviso_id TEXT,
    criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lida_em TIMESTAMPTZ
);

-- 6. Tabela: logs
CREATE TABLE IF NOT EXISTS public.logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    payload JSONB,
    collection TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela: config
CREATE TABLE IF NOT EXISTS public.config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_aulas_data ON public.aulas (data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_aulas_status ON public.aulas (status);
CREATE INDEX IF NOT EXISTS idx_eventos_data ON public.eventos_manutencao (data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_notificacoes_dest ON public.notificacoes (destinatario_uid, criada_em DESC);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso livre/permissivo para desenvolvimento
CREATE POLICY "Acesso total users" ON public.users FOR ALL USING (true);
CREATE POLICY "Acesso total aulas" ON public.aulas FOR ALL USING (true);
CREATE POLICY "Acesso total eventos" ON public.eventos_manutencao FOR ALL USING (true);
CREATE POLICY "Acesso total avisos" ON public.avisos FOR ALL USING (true);
CREATE POLICY "Acesso total notificacoes" ON public.notificacoes FOR ALL USING (true);
CREATE POLICY "Acesso total logs" ON public.logs FOR ALL USING (true);
CREATE POLICY "Acesso total config" ON public.config FOR ALL USING (true);
