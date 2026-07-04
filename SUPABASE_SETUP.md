# Guia de Configuração do Supabase

Siga estes passos para configurar o Supabase para o projeto Condomínio:

## 1. Criar conta e projeto no Supabase

1. Acesse https://supabase.com
2. Crie uma conta ou faça login
3. Clique em "New Project"
4. Preencha:
   - **Name**: `condominio-app` (ou o nome que preferir)
   - **Database Password**: Escolha uma senha forte e salve-a
   - **Region**: Escolha a região mais próxima de você (ex: South America)
5. Aguarde o projeto ser criado (pode levar alguns minutos)

## 2. Executar o script SQL

1. No painel do Supabase, clique em **SQL Editor** no menu lateral
2. Clique em **New Query**
3. Abra o arquivo `supabase_setup.sql` que foi criado na raiz do projeto
4. Copie todo o conteúdo do arquivo SQL
5. Cole no SQL Editor do Supabase
6. Clique em **Run** (ou pressione Ctrl+Enter)
7. Aguarde a execução completa (deve mostrar "Success" no final)

## 3. Obter credenciais

1. No painel do Supabase, clique em **Settings** > **API**
2. Copie os seguintes valores:
   - **Project URL**: algo como `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public**: algo como `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 4. Configurar o projeto

1. Abra o arquivo `app/src/config/supabase.js`
2. Substitua as linhas 16-17:
   ```javascript
   const supabaseUrl = 'YOUR_SUPABASE_URL';
   const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
   ```
   Por:
   ```javascript
   const supabaseUrl = 'https://SEU_PROJECT_ID.supabase.co';
   const supabaseAnonKey = 'SUA_CHAVE_ANON';
   ```
3. Salve o arquivo

## 5. Configurar autenticação (Email)

1. No painel do Supabase, clique em **Authentication** > **Providers**
2. Certifique-se de que **Email** esteja habilitado
3. Em **Email Auth**, você pode configurar:
   - **Confirm email**: Desabilite para desenvolvimento (habilite em produção)
   - **Secure email change**: Mantenha habilitado

## 6. Testar a aplicação

1. Reinicie o servidor Expo:
   ```bash
   cd app
   npx expo start
   ```
2. Acesse o app no seu dispositivo ou emulador
3. Tente criar uma conta na tela de registro
4. Faça login com a conta criada
5. Crie seu primeiro condomínio

## Estrutura das Tabelas Criadas

### condominios
- `id` (UUID): Identificador único
- `nome` (TEXT): Nome do condomínio
- `endereco` (TEXT): Endereço
- `descricao` (TEXT): Descrição
- `user_id` (UUID): ID do usuário proprietário
- `created_at` (TIMESTAMP): Data de criação

### comunicados
- `id` (UUID): Identificador único
- `condominio_id` (UUID): ID do condomínio relacionado
- `descricao` (TEXT): Descrição do comunicado
- `image_url` (TEXT): URL da imagem (opcional)
- `user_id` (UUID): ID do usuário proprietário
- `created_at` (TIMESTAMP): Data de criação

### tasks
- `id` (UUID): Identificador único
- `condominio_id` (UUID): ID do condomínio relacionado
- `descricao` (TEXT): Descrição da tarefa
- `urgente` (BOOLEAN): Se é urgente
- `data_limite` (DATE): Data limite
- `user_id` (UUID): ID do usuário proprietário
- `created_at` (TIMESTAMP): Data de criação

### orcamentos
- `id` (UUID): Identificador único
- `condominio_id` (UUID): ID do condomínio relacionado
- `descricao` (TEXT): Descrição do orçamento
- `valor` (DECIMAL): Valor do orçamento
- `image_url` (TEXT): URL da imagem (opcional)
- `user_id` (UUID): ID do usuário proprietário
- `created_at` (TIMESTAMP): Data de criação

### reports
- `id` (UUID): Identificador único
- `content` (TEXT): Conteúdo do relatório
- `user_id` (UUID): ID do usuário proprietário
- `created_at` (TIMESTAMP): Data de criação

## Buckets de Storage

### comunicados
- Armazena imagens dos comunicados
- Público: Sim

### orcamentos
- Armazena imagens dos orçamentos
- Público: Sim

## Segurança (Row Level Security)

Todas as tabelas têm RLS habilitado, garantindo que:
- Cada usuário só pode ver seus próprios dados
- Cada usuário só pode modificar seus próprios dados
- Dados são protegidos contra acesso não autorizado

## Solução de Problemas

### Tela branca após configuração
- Verifique se as credenciais estão corretas em `supabase.js`
- Reinicie o servidor Expo
- Verifique o console para erros

### Erro de autenticação
- Verifique se o provedor de Email está habilitado
- Verifique se a confirmação de email está desabilitada para desenvolvimento

### Erro ao fazer upload de imagens
- Verifique se os buckets foram criados corretamente
- Verifique as políticas de storage no painel do Supabase
