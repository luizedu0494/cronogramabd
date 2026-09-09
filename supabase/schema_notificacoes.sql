-- Script SQL para criação da tabela 'notificacoes' no Supabase PostgreSQL
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard/project/_/sql)

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

-- Índices para otimizar busca por destinatário e ordenação por data
CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario ON public.notificacoes (destinatario_uid, criada_em DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON public.notificacoes (destinatario_uid, lida);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para permitir leitura e escrita pública/autenticada
CREATE POLICY "Permitir leitura de notificacoes pelo destinatario"
    ON public.notificacoes FOR SELECT
    USING (true);

CREATE POLICY "Permitir insercao de notificacoes"
    ON public.notificacoes FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir atualizacao de notificacoes pelo destinatario"
    ON public.notificacoes FOR UPDATE
    USING (true);
