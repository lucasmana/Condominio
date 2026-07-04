# App de Gestão de Condomínios

Aplicativo mobile desenvolvido com React Native e Expo para gestão de condomínios.

## Funcionalidades

- Autenticação (login/cadastro) com Supabase
- CRUD de Condomínios
- Dashboard com estatísticas
- Comunicados com upload de fotos
- Tarefas com indicação de urgência
- Orçamentos
- Relatórios periódicos

## Instalação

1. Instale as dependências:
```bash
cd app
npm install
```

2. Configure o Supabase:
   - Crie uma conta no [Supabase](https://supabase.com)
   - Crie um novo projeto
   - Vá para Settings > API para obter sua URL e chave anon
   - Atualize o arquivo `src/config/supabase.js` com suas credenciais

3. Crie as tabelas no Supabase:

Execute este SQL no Editor SQL do Supabase:

```sql
-- Tabela de Condomínios
CREATE TABLE condominios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  nome TEXT,
  endereco TEXT,
  descricao TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabela de Comunicados
CREATE TABLE comunicados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  descricao TEXT,
  image_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabela de Tarefas
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  descricao TEXT,
  urgente BOOLEAN DEFAULT false,
  data_limite DATE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabela de Orçamentos
CREATE TABLE orcamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  descricao TEXT,
  valor NUMERIC,
  image_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabela de Relatórios
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  content TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Habilite RLS (Row Level Security) para todas as tabelas
ALTER TABLE condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Crie políticas de segurança (permite que usuários vejam apenas seus próprios dados)
CREATE POLICY "Usuários podem ver seus próprios condominios" ON condominios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios condominios" ON condominios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem editar seus próprios condominios" ON condominios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem apagar seus próprios condominios" ON condominios
  FOR DELETE USING (auth.uid() = user_id);

-- Repita as políticas acima para as outras tabelas (comunicados, tasks, orcamentos, reports)
```

4. Crie buckets de storage no Supabase para armazenar imagens:
   - Vá para Storage > New bucket
   - Crie buckets chamados `comunicados` e `orcamentos`
   - Configure as políticas de acesso para permitir upload e visualização

## Execução

Para rodar o app no modo desenvolvimento:
```bash
npm start
```

## Gerar APK (Android)

Para buildar o APK para Android:
```bash
eas build --platform android --profile apk
```

Mais informações em: https://docs.expo.dev/build/introduction/

## Estrutura do Projeto

```
app/
├── src/
│   ├── config/
│   │   └── supabase.js       # Configuração do Supabase
│   ├── context/
│   │   └── AuthContext.js    # Contexto de autenticação
│   ├── navigation/
│   │   └── AppNavigator.js   # Navegação principal
│   └── screens/
│       ├── LoginScreen.js    # Tela de login
│       ├── RegisterScreen.js # Tela de cadastro
│       ├── HomeScreen.js     # Dashboard
│       ├── CondominioScreen.js # Gestão de condomínios
│       ├── ComunicadosScreen.js # Comunicados
│       ├── TasksScreen.js    # Tarefas
│       └── OrcamentosScreen.js # Orçamentos
├── App.js
├── app.json
├── babel.config.js
└── package.json
```
