# CronoLab — Sistema de Gestão de Cronogramas de Laboratórios

> Plataforma inteligente e moderna desenhada sob medida para a **jornada do usuário** e a gestão descentralizada de agendamentos e cronogramas de laboratórios acadêmicos em **Universidades e Instituições de Ensino Superior (IES)**.

![Banner](./imgbanner.png)

<p align="center">
  <a href="#sobre">Sobre</a> •
  <a href="#design--experiencia-do-usuario-ux">Design & UX</a> •
  <a href="#jornada-dos-stakeholders">Jornada dos Stakeholders</a> •
  <a href="#novidades">Novidades</a> •
  <a href="#funcionalidades">Funcionalidades</a> •
  <a href="#tecnologias">Tecnologias</a> •
  <a href="#configuracao-e-instalacao">Instalação & Setup</a>
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

O **CronoLab** foi concebido a partir de um princípio fundamental: **colocar as necessidades dos usuários reais no centro de cada decisão**. No ambiente acadêmico, a alocação de laboratórios frequentemente envolve conflitos de horários, burocracia excessiva e desinformação entre diferentes setores.

A plataforma resolve esse problema conectando de forma harmoniosa e intuitiva cada perfil da instituição — de alunos a coordenadores —, oferecendo dados em tempo real, verificação automática de choques de grade, análises com Inteligência Artificial e sistema unificado de notificações Web Push e nativas no sistema.

---

## Design & Experiência do Usuário (UX)

O design do **CronoLab** foi cuidadosamente planejado para proporcionar uma navegação fluida, ergonômica e inclusiva:

- 🎨 **Foco na Jornada do Usuário**: Interfaces simplificadas e objetivas que reduzem o número de cliques necessários para realizar qualquer tarefa.
- 🔤 **Tipografia Cuidadosamente Selecionada**: Utilização combinada das fontes **Sora** (para títulos modernos e hierarquia marcante) e **Inter** (para máxima legibilidade e conforto visual em listas e tabelas).
- 🧩 **Arquitetura Baseada em Tokens de Design**: Sistema centralizado de tokens de estilo (`src/theme/tokens.ts`) que permite adaptar rapidamente a paleta de cores para a identidade de qualquer instituição de ensino.
- 🌓 **Modo Claro e Escuro Nativo**: Alternância instantânea de tema com persistência de preferência e alto contraste (WCAG 2.1 AA) para uso diurno ou noturno.
- ♿ **Acessibilidade Universal**: Foco visível destacado (`:focus-visible`), suporte completo a leitores de tela (`aria-label`) e rótulos claros em selects e chips sem truncamentos indesejados.

---

## Jornada dos Stakeholders

O sistema foi desenhado respeitando as particularidades e responsabilidades de cada papel na instituição:

### 🎓 Alunos e Professores (Modo Visitante / Acesso Público)
- **Zero Burocracia**: Acesso instantâneo aos horários dos laboratórios diretamente da tela inicial, sem necessidade de cadastro ou aprovação.
- **Foco na Informação**: Visualização límpida do calendário semanal, filtros por curso/laboratório e exportação prática em Excel, PDF e iCal (.ics).

### 🧑‍🔬 Técnicos de Laboratório
- **Rotina Simplificada**: Seleção de laboratórios favoritos no dashboard inicial para acompanhamento diário.
- **Eficiência Operacional**: Envio rápido de propostas de aulas/atividades, controle de revisões/monitorias e preparação antecipada de bancadas.

### 👨‍💼 Coordenadores
- **Governança & Visão Global**: Central de Aprovações unificada com indicadores de pendências em tempo real.
- **Gestão Inteligente**: Controle de manutenções preventivas, cadastro de avisos institucionais, verificação automática de integridade de dados e relatórios analíticos de ocupação.

---

## Novidades

- ⚡ **Centralização e Responsividade Mobile**: Redesenho completo dos cards do dashboard e menus sanfona (`Collapse` inline) ajustados ergonomicamente para dispositivos móveis.
- 🔑 **Login Google Universal**: Suporte a autenticação instantânea com qualquer conta Google, além do login tradicional por e-mail e senha.
- 🤖 **Assistente de IA Integrado**: Análise de conflitos de grade em tempo real diretamente na página inicial com IA (`llama-3.3-70b-versatile`).
- 📱 **PWA & Web Push Nativo**: Instalável diretamente no celular ou desktop com notificações push instantâneas.

---

## Funcionalidades Detalhadas

### 📅 Agendamento e Grade Relacional
- Blocos padronizados de horários (Matutino, Vespertino, Noturno).
- Verificação instantânea de conflitos e colisão de turmas no Supabase (PostgreSQL).
- Suporte a múltiplas turmas e disciplinas simultâneas com cálculo dinâmico de ocupação.

### 🔔 Notificações Unificadas (Web Push VAPID & In-App)
- **Web Push (VAPID)**: Notificações nativas diretamente no navegador para desktop e dispositivos móveis sem dependência de serviços externos legados.
- **Central de Notificações Interna**: Alertas de aprovação, alteração de grade e avisos institucionais integrados ao sistema.

### 📥 Importação e Exportação Flexível
- Suporte a importação automática via planilhas Excel, CSV, JSON e documentos Word (.docx).
- Exportação completa em Excel (.xlsx), PDF e arquivos iCal (.ics).

---

## Tecnologias & Arquitetura

- **Frontend**: React 19, Vite 7, Material UI (MUI v7), Lucide Icons, Emotion
- **Backend & Banco de Dados**: Supabase PostgreSQL, Supabase Auth (PKCE Flow), Supabase Realtime, Supabase Storage (`cronolab-media`)
- **Hospedagem & CDN**: Vercel Serverless
- **Inteligência Artificial**: LangChain.js & Groq API (`llama-3.3-70b-versatile` / `groq/compound`)
- **Notificações**: Web Push VAPID API e Notificações In-App
- **Documentos & OCR**: ExcelJS, SheetJS (`xlsx`), Tesseract.js (OCR), jsPDF

---

## Configuração e Instalação

### 1. Pré-requisitos
- Node.js (v18 ou superior)
- Gerenciador de pacotes `npm` ou `yarn`
- Conta no [Supabase](https://supabase.com)

### 2. Configurar o Banco de Dados (Supabase)
Execute os scripts SQL disponibilizados no **SQL Editor** do seu projeto Supabase:
- [`supabase/full_schema.sql`](./supabase/full_schema.sql) — Schemas completos de tabelas, RLS e constraints.

### 3. Variáveis de Ambiente (`.env`)
Crie um arquivo `.env` na raiz do projeto com base no modelo:

```env
# Supabase PostgreSQL & Storage
VITE_SUPABASE_URL=https://seu_projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_supabase

# Web Push Notifications (VAPID)
VITE_VAPID_PUBLIC_KEY=sua_chave_publica_vapid
VAPID_PRIVATE_KEY=sua_chave_privada_vapid

# Groq IA API
VITE_GROQ_API_KEY=sua_chave_groq
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
