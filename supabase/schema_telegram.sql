-- Script DDL para criar a tabela de Vinculação Telegram no Supabase
-- Execute este script no SQL Editor do seu painel Supabase (https://supabase.com/dashboard)

CREATE TABLE IF NOT EXISTS public.telegram_vinculos_pendentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_uid TEXT NOT NULL,
    codigo TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida do código
CREATE INDEX IF NOT EXISTS idx_telegram_cod ON public.telegram_vinculos_pendentes (codigo);

-- Habilitar RLS
ALTER TABLE public.telegram_vinculos_pendentes ENABLE ROW LEVEL SECURITY;

-- Política de Acesso Total
CREATE POLICY "Acesso total telegram_vinculos" 
ON public.telegram_vinculos_pendentes 
FOR ALL USING (true);
