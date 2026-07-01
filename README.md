# SENAI MoldStock

Sistema web para catalogo e controle de estoque de moldes/pecas do setor de Plastico do SENAI.

## Stack

- React + Vite
- Firebase Authentication
- Firebase Realtime Database
- Firebase Storage
- React Router
- QR Code com exportacao PNG/JPEG

## Rodar localmente

```bash
npm install
npm run dev
```

No Windows PowerShell, se scripts `.ps1` estiverem bloqueados, use:

```bash
npm.cmd run dev
```

## Configurar Firebase

1. Crie um projeto no Firebase.
2. Ative Authentication com provedor E-mail/Senha.
3. Crie o Realtime Database.
4. Ative o Storage.
5. Copie `.env.example` para `.env` e preencha as chaves:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Primeiro Super Admin

O cadastro publico cria somente professores com role `admin` e exige e-mail `@docente.senai.br`.

Para criar o primeiro Super Admin:

1. Cadastre um professor pela tela `/cadastro`.
2. No Realtime Database, abra o caminho `admins`.
3. Encontre o documento do usuario.
4. Troque `role` de `admin` para `superadmin`.

Depois disso, esse professor consegue cadastrar outros professores pelo painel `/admin/professores`, inclusive com e-mails fora do dominio docente.

## Regras Firebase

Os arquivos `database.rules.json` e `storage.rules` ja estao no projeto.

Resumo:

- Publico pode ler `pecas`.
- Apenas admins podem criar/editar/excluir pecas e ocorrencias.
- Apenas Super Admin pode gerenciar professores.
- Uploads em `pecas/**` ficam publicamente legiveis e gravaveis apenas por admin.

## Funcionalidades

- Catalogo publico sem login.
- Pesquisa por nome ou codigo.
- Filtros por status e localizacao.
- Detalhe publico da peca.
- Login e cadastro de professores.
- Dashboard admin com cards de resumo.
- CRUD de pecas com upload de fotos.
- Historico de ocorrencias por peca.
- Modal de justificativa ao alterar status para manutencao/quebrado.
- Geracao de QR Code para a URL publica da peca.
- Download do QR Code em PNG ou JPEG.
- Gestao de professores por Super Admin.
