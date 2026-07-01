# SENAI MoldStock

Sistema web para catalogo, estoque, auditoria e backup interno de moldes/pecas do setor de Plasticos do SENAI.

## Stack

- React + Vite
- TailwindCSS + componentes shadcn-style
- Framer Motion
- Lucide Icons
- Firebase Authentication
- Firebase Realtime Database
- Firebase Storage preparado
- QR Code com exportacao PNG/JPEG
- jsPDF + autoTable para auditoria em PDF

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
4. Copie `.env.example` para `.env` e preencha as chaves.
5. No Vercel, cadastre as mesmas variaveis `VITE_FIREBASE_*` em Production.
6. Publique as regras:

```bash
firebase deploy --only database
```

## Primeiro Super Admin

O cadastro publico cria somente professores `admin` e exige e-mail `@docente.senai.br`.

Para criar o primeiro Super Admin:

1. Cadastre um professor pela tela `/cadastro`.
2. No Realtime Database, abra `admins/{uid}`.
3. Troque `role` de `admin` para `superadmin`.
4. Confirme `active: true`.

Depois disso, todo professor deve ser criado em `/admin/professores` pelo Super Admin. Professores criados por ali entram com `mustChangePassword: true` e precisam trocar a senha no primeiro acesso.

## Roles

Super Admin:

- cria, edita, desativa e remove perfis administrativos;
- promove/rebaixa roles;
- cria, edita e exclui pecas;
- cria, baixa e restaura backups;
- visualiza e exporta logs.

Admin:

- cria e edita pecas;
- altera status;
- registra ocorrencias;
- visualiza o painel administrativo.

Publico:

- visualiza catalogo e detalhes publicos das pecas;
- nao escreve dados.

## Auditoria

A tela `/admin/auditoria` registra acoes como login, logout, criacao/edicao/exclusao de peca, alteracao de status, ocorrencias, QR Code, usuarios, backup, restore, exportacao e tentativas negadas.

Logs sao gravados em `logs/{logId}` e as regras impedem edicao/delecao por sobrescrita. Apenas Super Admin consegue visualizar todos os logs pela UI.

## Backups

A tela `/admin/backups` cria snapshots internos no proprio Realtime Database:

- `pecas`
- `ocorrencias`
- `admins`
- `logs`

O backup nao duplica imagens. Ele guarda os campos atuais da peca, incluindo URLs/base64 de imagem.

Rotacao: sempre ficam apenas os 2 backups mais recentes. Antes de restaurar, o sistema cria automaticamente um backup `pre_restore`.

Limite recomendado: o backup interno foi pensado para bases pequenas, perto de 500 pecas. Para bases maiores, migre para exportacao nativa do Google Cloud.

## Cloud Functions

A pasta `functions/` foi criada como base profissional para a proxima etapa com Firebase Admin SDK:

- `createProfessor`
- `setProfessorRole`
- `setProfessorActive`

Hoje o app continua funcional no Realtime Database pelo front-end, porque o projeto atual ja esta em producao assim. Para producao mais forte, ative Cloud Functions no Firebase, rode `npm install` dentro de `functions/` e publique:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Backup automatico pode ser ligado depois com Cloud Scheduler nos dias 1 e 15, chamando a mesma politica de snapshot e rotacao. Sem Blaze/Cloud Scheduler, mantenha o backup manual pelo painel.

## Seguranca

- Publico le apenas `pecas`.
- Admin ativo escreve pecas e ocorrencias.
- Super Admin ativo gerencia `admins`, `logs` e `backups`.
- Professor desativado nao entra no painel.
- Logs sao append-only nas regras do Realtime Database.
- Restauracao exige confirmacao textual `RESTAURAR`.

## Funcionalidades

- Catalogo publico sem login.
- Pesquisa por nome, codigo, categoria e localizacao.
- Filtros por status e localizacao.
- Detalhe publico da peca.
- Login, cadastro docente e recuperacao de senha.
- Troca obrigatoria de senha temporaria.
- Dashboard admin com cards de resumo.
- CRUD de pecas com duas fotos por peca.
- Historico de ocorrencias.
- Justificativa obrigatoria para status sensivel.
- QR Code publico por peca.
- Gestao de professores.
- Auditoria com filtros e exportacao PDF.
- Backup interno com download JSON e restauracao.
