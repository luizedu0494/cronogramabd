# CronoLab — Sistema de Gestão de Cronogramas de Laboratórios

> Plataforma inteligente e moderna para gestão descentralizada de agendamentos, cronogramas e uso de laboratórios acadêmicos em **Universidades e Instituições de Ensino Superior (IES)**.

![Banner](./imgbanner.png)

<p align="center">
  <a href="#sobre">Sobre</a> •
  <a href="#modo-visitante-acesso-publico">Modo Visitante</a> •
  <a href="#perfis-de-acesso">Perfis de Acesso</a> •
  <a href="#funcionalidades">Funcionalidades</a> •
  <a href="#identidade-visual-e-design">Identidade & Design</a> •
  <a href="#tecnologias">Tecnologias</a> •
  <a href="#configuracao-e-instalacao">Instalação & Setup</a> •
  <a href="#status-do-projeto">Status do Projeto</a>
</p>

<p align="center">
  <img alt="Deploy" src="https://img.shields.io/badge/Deploy-Vercel-000000?style=flat&logo=vercel&logoColor=white"/>
  <img alt="Database" src="https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=flat&logo=supabase&logoColor=white"/>
  <img alt="Auth" src="https://img.shields.io/badge/Auth-Supabase%20Auth%20%2B%20Google-3ECF8E?style=flat&logo=supabase&logoColor=white"/>
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black"/>
  <img alt="MUI" src="https://img.shields.io/badge/MUI-v7-1E7EC8?style=flat&logo=mui&logoColor=white"/>
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?style=flat&logo=vite&logoColor=white"/>
  <img alt="License" src="https://img.shields.io/badge/Licen%C3%A7a-Propriet%C3%A1ria-red?style=flat"/>
</p>

<p align="center">
  <a href="https://cronogramabd.vercel.app"><strong>🌐 Ver demonstração ao vivo →</strong></a>
</p>

---

## Sobre

O **CronoLab** é uma solução completa desenvolvida para resolver um desafio crítico no ambiente acadêmico: a **gestão descentralizada de laboratórios de aulas e pesquisas**.

O sistema centraliza a agenda de múltiplos espaços físicos em uma única interface inteligente, atendendo às necessidades de **Coordenadores**, **Técnicos de Laboratório**, **Professores** e **Alunos (Visitantes)**. Ele substitui planilhas manuais e conflitos de horários por um banco de dados relacional **Supabase (PostgreSQL)** com verificação automática de choques de agenda, análise preditiva de ocupação e atualizações em tempo real.

### ✨ Destaques:
- 🏫 **Pronto para Instituições de Ensino**: Adequado para universidades, faculdades e centros tecnológicos com múltiplos laboratórios.
- 🎓 **Modo Visitante sem Necessidade de Cadastro**: Acesso direto e instantâneo para Alunos e Professores consultarem os horários.
- ⚡ **Arquitetura 100% Supabase (PostgreSQL)**: Consultas relacionais de alta velocidade e atualizações em tempo real via WebSockets (`postgres_changes`).
- 🔐 **Autenticação Flexível & Segura**: Login por E-mail + Senha ou **Login Social com Google OAuth** via Supabase Auth (PKCE Flow).
- 🤖 **Assistente com Inteligência Artificial**: Motor de IA alimentado por Groq API (`llama-3.3-70b-versatile` / `groq/compound`) para interpretação de comandos e análises.
- 📱 **PWA Responsivo**: Instalável em smartphones e desktops (Android/iOS/Windows) com suporte a Web Push nativo VAPID.
- 💬 **Integração Nativa com Telegram Bot**: Alertas em tempo real e vinculação de conta em 1 clique via deep link (`t.me/bot?start=CRN-XXXX`).
- 🌙 **Design de Alto Padrão**: Dark mode nativo com paleta de cores harmoniosa e animações fluidas.
- 📥 **Importação e Exportação Completa**: Reconhecimento automático em Excel, CSV, JSON e Word (.docx), exportação em Excel (.xlsx), PDF e iCal (.ics).

---

## Modo Visitante (Acesso Público)

Para facilitar a consulta dos horários de aulas e disponibilidade de laboratórios, o sistema conta com um modo de acesso público direto na tela inicial:

- 🔓 **Sem Cadastro Nem Aprovação**: Alunos e professores entram instantaneamente.
- 📅 **Direto ao Calendário**: O visitante vai direto para a grade semanal e filtros por laboratório.
- 📥 **Exportação de Dados**: Agenda do semestre/mês em Excel (.xlsx), PDF e iCal (.ics).
- 🛡️ **Segurança Reforçada**: Acesso puramente de leitura; funcionalidades administrativas e Assistente de IA são restritas à equipe autorizada.

---

## Perfis de Acesso

O acesso restrito da equipe é controlado por um fluxo de aprovação via Supabase Auth. Ao se cadastrar via **E-mail + Senha** ou **Google**, a conta fica com o status **Pendente** até que a coordenação aprove o perfil adequado:

### 👨‍💼 Coordenador
- Painel de Indicadores (KPIs) e estatísticas em tempo real.
- Agendamento direto de aulas, revisões e provas.
- Gestão de bloqueios de manutenção preventiva.
- Central de Aprovações de propostas enviadas pela equipe.
- Gestão de usuários, alteração de cargos e aprovação de cadastros.
- Importação de cronogramas em lote por planilhas ou documentos.
- Painel de Avisos e comunicados com controle de prioridade.
- Ferramenta de **Verificação de Integridade de Dados** e auditoria.

### 🧑‍🔬 Técnico de Laboratório
- Seleção de laboratórios favoritos no painel inicial.
- Envio de propostas de reserva de horário para aprovação.
- Painel de designações e agenda pessoal por técnico.
- Reserva de revisões/monitorias e preparação de bancadas.

### 🎓 Visitante (Aluno / Professor)
- Visualização do Cronograma de Aulas e Calendário Acadêmico.
- Filtro inteligente por curso, laboratório e turno.
- Exportação de horários em Excel, PDF e .ics.
- Guia prático de dúvidas (FAQ).

---

## Funcionalidades Detalhadas

### 📅 Agendamento e Grade Relacional
- Blocos padronizados de horários (Matutino, Vespertino, Noturno).
- Verificação instantânea de conflitos e colisão de turmas em tempo real.
- Suporte a múltiplas turmas e disciplinas simultâneas com cálculo de ocupação.
- Histórico completo de auditoria e exclusões na tabela de `logs`.

### 🤖 Assistente de IA Técnico
- Interpretação de comandos de voz ou texto em linguagem natural.
- Análise automática de conflitos na grade e sugestões de horários vagos.
- Extração estruturada de parâmetros de agendamentos.

### 🔔 Notificações Unificadas (Telegram & Web Push VAPID)
- **Bot do Telegram**: Vinculação em 1 clique com geração de código temporário e redirecionamento deep-link. Alertas instantâneos de alteração de grade no grupo ou privado.
- **Web Push Naitvo (VAPID)**: Notificações no navegador para desktop e dispositivos móveis sem dependência de serviços legados.

---

## Identidade Visual e Design

| Token | Cor | Aplicação no Sistema |
| :--- | :--- | :--- |
| **Azul Principal** | `#1E7EC8` | Botões primários, cabeçalhos e elementos ativos |
| **Azul Destaque** | `#4AADE8` | Detalhes no modo escuro, ícones e estados hover |
| **Dourado Acadêmico**| `#F5C518` | Alertas de revisões, eventos e avisos importantes |
| **Verde Sucesso** | `#00C853` / `#3ECF8E` | Indicadores de disponibilidade, status aprovado |
| **Fundo Dark Mode** | `#0B0F18` | Interface elegante e confortável para uso noturno |

---

## Arquitetura & Tecnologias

- **Frontend**: React 19, Vite 7, Material UI (MUI v7), Lucide Icons, Emotion
- **Backend & Database**: Supabase PostgreSQL, Supabase Auth (PKCE), Supabase Realtime
- **Hospedagem & CDN**: Vercel Serverless
- **Inteligência Artificial**: LangChain.js & Groq API (`llama-3.3-70b-versatile` / `groq/compound`)
- **Notificações**: Telegram Bot API (`node-telegram-bot-api`), Web Push VAPID API
- **Documentos & Mídia**: ExcelJS, SheetJS (`xlsx`), Tesseract.js (OCR), jsPDF, Cloudinary

---

## Configuração e Instalação

### 1. Pré-requisitos
- Node.js (v18 ou superior)
- Gerenciador de pacotes `npm` ou `yarn`
- Conta no [Supabase](https://supabase.com)

### 2. Configurar o Banco de Dados (Supabase)
Execute os scripts SQL disponibilizados no **SQL Editor** do seu projeto Supabase:
- [`supabase/full_schema.sql`](./supabase/full_schema.sql) — Tabela `users`, `aulas`, `eventos_manutencao`, `avisos`, `notificacoes`, `logs`, `config`, `telegram_vinculos_pendentes`, `push_subscriptions`, etc.

### 3. Variáveis de Ambiente (`.env`)
Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:

```env
# Supabase PostgreSQL
VITE_SUPABASE_URL=https://seu_projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_supabase

# Telegram Bot
VITE_TELEGRAM_BOT_TOKEN=seu_bot_token
VITE_TELEGRAM_CHAT_ID=seu_chat_id
VITE_TELEGRAM_BOT_USERNAME=seu_bot_username

# Web Push Notifications (VAPID)
VITE_VAPID_PUBLIC_KEY=sua_chave_publica_vapid
VAPID_PRIVATE_KEY=sua_chave_privada_vapid

# Groq IA API
VITE_GROQ_API_KEY=sua_chave_groq

# Cloudinary (Imagens)
VITE_CLOUDINARY_CLOUD_NAME=seu_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=seu_upload_preset
```

### 4. Executar Localmente
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Gerar build de produção
npm run build
```

---

## Status do Projeto

🚧 Em desenvolvimento ativo, com deploy contínuo em produção via Vercel.
Interessado em uma demonstração guiada, parceria ou licenciamento para sua instituição? Entre em contato pelo perfil do GitHub.

---

## Licença

Este projeto é proprietário. Todos os direitos reservados. Consulte a seção de contato para informações sobre licenciamento comercial.
