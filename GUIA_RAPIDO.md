# Guia Rápido para Rodar o Projeto

## Pré-requisitos

- Docker e Docker Compose instalados
- Node.js (para o app Expo)
- Conta no Supabase (gratuita)

## Passo 1: Configurar o Supabase

1. Crie uma conta no [Supabase](https://supabase.com)
2. Crie um novo projeto
3. Vá para **Settings > API** e anote:
   - `Project URL` (ex: `https://seu-projeto.supabase.co`)
   - `anon public` key
4. Vá para **SQL Editor** e execute o arquivo `supabase_setup.sql`
5. Vá para **Storage** e crie dois buckets:
   - `comunicados`
   - `orcamentos`
6. Atualize o arquivo `app/src/config/supabase.js` com suas credenciais!

## Passo 2: Rodar o Backend (com Docker)

Na raiz do projeto:

```bash
# Build e inicie o container do backend
docker-compose up --build -d
```

O backend estará disponível em `http://localhost:3000`

## Passo 3: Rodar o App Expo

Primeiro, instale as dependências do app:

```bash
cd app
npm install
```

Para rodar o app (para desenvolvimento):

```bash
npm start
```

Isso abrirá o Expo DevTools no navegador! Você pode:
- Rodar na web (clicando em "Run in web browser")
- Rodar em um dispositivo Android/iOS usando o app Expo Go
- Buildar um APK usando EAS Build (veja app/README.md)

## Comandos Úteis

### Parar o backend:
```bash
docker-compose down
```

### Ver logs do backend:
```bash
docker-compose logs -f backend
```

### Reiniciar tudo:
```bash
docker-compose down
docker-compose up --build -d
```

## Estrutura do Projeto

```
Condominio/
├── app/                    # App mobile (Expo/React Native)
│   ├── src/
│   │   ├── config/        # Configuração do Supabase
│   │   ├── context/       # Auth Context
│   │   ├── navigation/    # Navegação
│   │   └── screens/       # Telas do app
│   └── ...
├── backend/                # Backend Node.js/Express
│   ├── src/
│   └── Dockerfile
├── docker-compose.yml
├── supabase_setup.sql
└── SUPABASE_SETUP.md
```
