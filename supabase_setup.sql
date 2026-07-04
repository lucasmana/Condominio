-- ============================================
-- SETUP DO SUPABASE PARA PROJETO CONDOMÍNIO
-- ============================================
-- Execute este SQL no SQL Editor do Supabase

-- 1. CRIAR TABELA DE CONDOMÍNIOS
CREATE TABLE condominios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  descricao TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CRIAR TABELA DE COMUNICADOS
CREATE TABLE comunicados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  image_url TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CRIAR TABELA DE TAREFAS
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  urgente BOOLEAN DEFAULT FALSE,
  data_limite DATE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CRIAR TABELA DE ORÇAMENTOS
CREATE TABLE orcamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) DEFAULT 0,
  image_url TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. CRIAR TABELA DE RELATÓRIOS
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) - SEGURANÇA
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS PARA CONDOMÍNIOS
CREATE POLICY "Usuários podem ver seus próprios condomínios"
  ON condominios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios condomínios"
  ON condominios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios condomínios"
  ON condominios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios condomínios"
  ON condominios FOR DELETE
  USING (auth.uid() = user_id);

-- POLÍTICAS PARA COMUNICADOS
CREATE POLICY "Usuários podem ver seus próprios comunicados"
  ON comunicados FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios comunicados"
  ON comunicados FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios comunicados"
  ON comunicados FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios comunicados"
  ON comunicados FOR DELETE
  USING (auth.uid() = user_id);

-- POLÍTICAS PARA TAREFAS
CREATE POLICY "Usuários podem ver suas próprias tarefas"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias tarefas"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias tarefas"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias tarefas"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- POLÍTICAS PARA ORÇAMENTOS
CREATE POLICY "Usuários podem ver seus próprios orçamentos"
  ON orcamentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios orçamentos"
  ON orcamentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios orçamentos"
  ON orcamentos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios orçamentos"
  ON orcamentos FOR DELETE
  USING (auth.uid() = user_id);

-- POLÍTICAS PARA RELATÓRIOS
CREATE POLICY "Usuários podem ver seus próprios relatórios"
  ON reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios relatórios"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios relatórios"
  ON reports FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS PARA IMAGENS
-- ============================================

-- Criar bucket para comunicados
INSERT INTO storage.buckets (id, name, public)
VALUES ('comunicados', 'comunicados', true)
ON CONFLICT (id) DO NOTHING;

-- Criar bucket para orçamentos
INSERT INTO storage.buckets (id, name, public)
VALUES ('orcamentos', 'orcamentos', true)
ON CONFLICT (id) DO NOTHING;

-- POLÍTICAS DE STORAGE
CREATE POLICY "Usuários podem fazer upload de comunicados"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'comunicados' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários podem ver comunicados"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'comunicados');

CREATE POLICY "Usuários podem deletar seus comunicados"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'comunicados' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários podem fazer upload de orçamentos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'orcamentos' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários podem ver orçamentos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'orcamentos');

CREATE POLICY "Usuários podem deletar seus orçamentos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'orcamentos' AND auth.role() = 'authenticated');

-- ============================================
-- ÍNDICES PARA MELHORAR PERFORMANCE
-- ============================================

CREATE INDEX idx_condominios_user_id ON condominios(user_id);
CREATE INDEX idx_comunicados_user_id ON comunicados(user_id);
CREATE INDEX idx_comunicados_condominio_id ON comunicados(condominio_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_condominio_id ON tasks(condominio_id);
CREATE INDEX idx_orcamentos_user_id ON orcamentos(user_id);
CREATE INDEX idx_orcamentos_condominio_id ON orcamentos(condominio_id);
CREATE INDEX idx_reports_user_id ON reports(user_id);
