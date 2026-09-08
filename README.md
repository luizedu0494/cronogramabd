# CronoLab — Cronograma de Laboratórios

> Sistema de gestão de cronogramas e agendamentos para os laboratórios do **Centro Universitário CESMAC**, Maceió — AL.

![Banner](./imgbanner.png)

<p align="center">
  <img src="./src/assets/images/cesmac-logo.png" alt="CESMAC" height="48"/>
</p>

<p align="center">
  <a href="#sobre">Sobre</a> •
  <a href="#perfis-de-acesso">Perfis de Acesso</a> •
  <a href="#funcionalidades">Funcionalidades</a> •
  <a href="#novidades-recentes">Novidades Recentes</a> •
  <a href="#identidade-visual-cesmac">Identidade Visual</a> •
  <a href="#arquitetura-e-ia">Arquitetura & IA</a> •
  <a href="#tecnologias">Tecnologias</a> •
  <a href="#estrutura-do-projeto">Estrutura do Projeto</a> •
  <a href="#variaveis-de-ambiente">Variáveis de Ambiente</a> •
  <a href="#instalacao">Instalação</a> •
  <a href="#licenca">Licença</a>
</p>

<p align="center">
  <img alt="Deploy" src="https://img.shields.io/badge/Deploy-Vercel-000000?style=flat&logo=vercel&logoColor=white"/>
  <img alt="Database" src="https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=flat&logo=supabase&logoColor=white"/>
  <img alt="Auth" src="https://img.shields.io/badge/Auth-Supabase%20Auth%20%2B%20Google-3ECF8E?style=flat&logo=supabase&logoColor=white"/>
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black"/>
  <img alt="MUI" src="https://img.shields.io/badge/MUI-v7-1E7EC8?style=flat&logo=mui&logoColor=white"/>
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-646CFF?style=flat&logo=vite&logoColor=white"/>
  <img alt="License" src="https://img.shields.io/badge/Licen%C3%A7a-MIT-green?style=flat"/>
</p>

<p align="center">
  <a href="https://cronogramabd.vercel.app"><strong>🌐 Ver sistema online na Vercel →</strong></a>
</p>

---

## Sobre

O **CronoLab** é um sistema web desenvolvido para resolver um problema real do dia a dia dos laboratórios do CESMAC: a gestão manual e descentralizada de agendamentos.

O sistema centraliza o cronograma de todos os laboratórios em uma única plataforma, com perfis distintos para coordenadores, técnicos e alunos. Substitui planilhas e processos manuais por um painel inteligente com verificação automática de conflitos, análise de ocupação e notificações em tempo real.

**Destaques:**
- 🏫 Desenvolvido para uso real no CESMAC — não é um projeto de demonstração
- ⚡ **Nova Arquitetura Supabase (PostgreSQL)** — alta velocidade relacional com assinaturas `postgres_changes` em tempo real
- 🔐 **Autenticação Flexível & Segura**: Login com E-mail + Senha (com redefinição por e-mail) ou **Login com Google OAuth**
- 📱 Responsivo, instalável como PWA (Android/iOS/Desktop) e com notificações push
- 🌙 Dark mode com identidade visual da instituição
- 🤖 Assistente de IA híbrido (motor local + Groq/Llama-3.3-70b na Vercel Functions) para consultas em linguagem natural sobre o cronograma
- 📥 Importação inteligente de cronogramas externos (Excel, CSV, JSON e Word) com reconhecimento automático de colunas
- 🔔 Notificações via Telegram e Web Push para alterações no cronograma
- 🛡️ Infraestrutura segura hospedada na Vercel com banco PostgreSQL no Supabase (Zero Custo)

---

## Perfis de Acesso

O acesso é realizado através de **E-mail + Senha** ou **Login com Google**. No primeiro login, o cadastro fica com status **Pendente** até que um coordenador aprove o usuário e defina seu cargo. Existem três perfis:

### 👨‍💼 Coordenador
Visão estratégica e administrative completa do sistema:
- Painel com KPIs (aulas hoje, revisões hoje, total de aulas/revisões do semestre, propostas pendentes, eventos de manutenção)
- Agendar Aula / Agendar Evento diretamente (sem passar pelo fluxo de proposta)
- **Aprovações**: aprovar, rejeitar e designar técnicos para propostas enviadas
- **Usuários**: aprovar novos cadastros, alterar cargos e remover usuários
- **Importar Cronograma Externo**: subir planilhas/documentos de outras fontes e converter em aulas
- **Eventos**: cadastrar períodos acadêmicos (provas, feriados, recessos) e eventos de manutenção/bloqueio de laboratório
- **Gerenciar Avisos**: publicar comunicados (normal, importante, urgente)
- **Análise de Aulas e Eventos**: gráficos de ocupação por laboratório, curso, turno, evolução mensal e taxa de aprovação
- **Verificar Integridade dos Dados**: detecta aulas com dados faltando, conflitos de horário e tipos de atividade inválidos
- Ativa/desativa a visualização do Calendário Acadêmico para os alunos

### 🧑‍🔬 Técnico
Visão operacional do dia a dia do laboratório:
- Onboarding inicial para selecionar os laboratórios monitorados (seleção salva por dispositivo)
- Painel com cronograma oficial filtrado pelos laboratórios favoritos e agenda privada do dia
- **Propor Aula / Propor Atividade**: envia propostas de aula para aprovação do coordenador
- **Minhas Propostas**: acompanha status (pendente, aprovada, rejeitada)
- **Minhas Designações**: lista as aulas em que foi designado como responsável
- **Revisões**: agenda privada (Agenda do Técnico) para revisões de conteúdo, pré-provas, monitorias e preparações de material
- Acesso ao Assistente de IA, Download do Cronograma, Avisos e Ajuda/FAQ

### 🎓 Aluno
Perfil de leitura, liberado pelo coordenador:
- Visualização do Calendário Acadêmico (quando habilitado pela coordenação)
- Consulta ao cronograma público de aulas dos laboratórios

---

## Funcionalidades

### 📅 Cronograma e Agendamento Relacional
- Calendário com blocos de horário fixos (07:00–09:10, 09:30–12:00, 13:00–15:10, 15:30–18:00, 18:30–20:10, 20:30–22:00) para padronizar agendamentos
- Verificação automática de conflitos de horário via queries relacionais no PostgreSQL
- Histórico de Aulas com auditoria de inclusões/exclusões em tempo real
- Grade de disponibilidade por laboratório

### 🔐 Autenticação & Segurança de Conta
- Login com **E-mail e Senha** com validação de expressão regular (Regex)
- Opção **"Esqueceu e-mail ou senha?"** enviando link de redefinição direta por e-mail pelo Supabase Auth
- **Botão "Continuar com o Google"** com branding oficial Google SVG
- Cadastro de novos usuários com pendência de aprovação automática

### ✅ Fluxo de Propostas e Aprovações
- Técnicos propõem aulas/eventos; coordenadores aprovam, rejeitam ou designam responsáveis
- Designação de múltiplos técnicos por aula (`DesignarTecnicosModal`)
- Contador de propostas pendentes em tempo real no menu do coordenador

### 📥 Importação Inteligente de Cronogramas
- Upload de cronogramas externos em **Excel, CSV, JSON e Word (.docx)**
- Reconhecimento automático de colunas, datas, cursos, disciplinas, docentes e turnos

### 🤖 Assistente de IA
- Orquestração híbrida: motor de regras locais + Vercel Serverless Function `/api/groq.js` (`llama-3.3-70b-versatile`)
- Consultas estruturadas sobre aulas do dia, professores, disponibilidade e análises de ocupação

### 🔔 Avisos e Notificações
- Mural de Avisos com três níveis (normal, importante, urgente) e controle de leitura
- Notificações via **Bot do Telegram** e Web Push (FCM) para atualizações de agendamentos

---

## Novidades Recentes

> Resumo da migração de banco de dados e melhorias de segurança.

### 🐘 Migração completa para Supabase (PostgreSQL) + Vercel Hosting
- **Arquitetura Relacional**: Migração total de dados e schema de NoSQL para PostgreSQL relacional com tabelas (`users`, `aulas`, `aula_cursos`, `aula_tecnicos`, `eventos_manutencao`, `avisos`, `logs`).
- **Realtime nativo**: Transição de `onSnapshot` para inscrições WebSocket `postgres_changes` via Supabase Client.
- **Deploy Continuo na Vercel**: Hospedagem global sem custo, integrada com Vercel Functions para rotas de IA e autenticação.

### 🔐 Autenticação com Senha & Recuperação de Conta
- **Suporte a Senha e Cadastro**: Inclusão de campos para senha criptografada e opção de cadastro direto na tela de login.
- **Recuperação de Senha por E-mail**: Integração com Supabase Auth Reset para enviar instruções seguras de redefinição.
- **Validação Estrita de E-mail**: Expressão regular Regex impedindo entradas inválidas no formulário.
- **Identidade Google Atualizada**: Botão de login social estilizado com o vetor colorido oficial da Google.

---

## Identidade Visual CESMAC

O sistema usa as cores institucionais do CESMAC extraídas diretamente do logo oficial:

| Token | Cor | Uso |
| :--- | :--- | :--- |
| **Azul principal** | `#1E7EC8` | Botões, links, KPIs, navbar |
| **Azul claro** | `#4AADE8` | Destaques, chips, dark mode |
| **Dourado** | `#F5C518` / `#D4940A` | Revisões, alertas, avisos |
| **Verde Sucesso** | `#00C853` / `#3ECF8E` | Destaques de ação, Supabase |
| **Fundo dark** | `#0B0F18` | Background no modo escuro |

A fonte utilizada é **Sora** — legível no mobile e com personalidade acadêmica.

---

## Arquitetura e IA

O CronoLab combina uma **arquitetura de alto desempenho** sem custos de servidor:

- **Banco de Dados**: Supabase PostgreSQL com Realtime WebSockets (`src/supabaseConfig.js`).
- **Serverless API**: Vercel Serverless Functions (`/api/groq.js`, `/api/auth-validate.js`).
- **LangChain.js + Groq API**: Orquestração declarativa (`llama-3.3-70b-versatile`) com streaming em tempo real.
- **Hospedagem**: Vercel Platform (`https://cronogramabd.vercel.app`).

---

## Tecnologias

- **Frontend**: React 19, TypeScript 5, Vite 7, Material UI (MUI v7), DayJS, Lucide React
- **Banco de Dados & Auth**: Supabase PostgreSQL, Supabase Realtime, Supabase Auth
- **IA & RAG**: LangChain.js, Groq API (`llama-3.3-70b-versatile`)
- **Documentos & OCR**: Tesseract.js, jsPDF, ExcelJS, SheetJS (`xlsx`), PapaParse, Mammoth
- **Hospedagem / Serverless**: Vercel Platform & Vercel Functions (`/api`)
- **Notificações**: Bot do Telegram, FCM Web Push

---

## Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha as chaves:

| Variável | Descrição |
| :--- | :--- |
| `VITE_SUPABASE_URL` | URL do projeto Supabase (`https://...supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Chave Anônima do Supabase |
| `VITE_CLOUDINARY_CLOUD_NAME` | Nome da conta Cloudinary |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Preset de upload Cloudinary |
| `VITE_TELEGRAM_BOT_TOKEN` | Token do bot do Telegram |
| `VITE_GROQ_API_KEY` | Chave da API Groq (Assistente de IA) |

---

## Instalação

```bash
# 1. Clonar o repositório
git clone https://github.com/luizedu0494/cronogramabd.git
cd cronograma-lab-frontend

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env

# 4. Rodar servidor de desenvolvimento
npm run dev

# 5. Build para produção
npm run build
```

---

## Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
