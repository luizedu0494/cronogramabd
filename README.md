# CronoLab — Sistema de Gestão de Cronogramas de Laboratórios

> Plataforma inteligente e moderna para gestão descentralizada de agendamentos, cronogramas e uso de laboratórios acadêmicos em **Universidades e Instituições de Ensino Superior (IES)**.

![Banner](./imgbanner.png)

<p align="center">
  <a href="#sobre">Sobre</a> •
  <a href="#modo-visitante-acesso-publico">Modo Visitante</a> •
  <a href="#perfis-de-acesso">Perfis de Acesso</a> •
  <a href="#funcionalidades">Funcionalidades</a> •
  <a href="#novidades-recentes">Novidades Recentes</a> •
  <a href="#identidade-visual-e-design">Identidade & Design</a> •
  <a href="#tecnologias">Tecnologias</a> •
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

O **CronoLab** é uma solução completa desenvolvida para resolver um desafio crítico no ambiente acadêmico: a **gestão descentralizada de laboratórios de aulas e pesquisas**.

O sistema centraliza a agenda de múltiplos espaços físicos em uma única interface inteligente, atendendo às necessidades de **Coordenadores**, **Técnicos de Laboratório**, **Professores** e **Alunos (Visitantes)**. Ele substitui planilhas manuais e conflitos de horários por um banco de dados relacional Supabase (PostgreSQL) com verificação automática de choques de agenda, análise preditiva de ocupação e atualizações em tempo real.

**Destaques:**
- 🏫 **Pronto para Instituições de Ensino**: Adequado para universidades, faculdades e centros tecnológicos com múltiplos laboratórios
- 🎓 **Modo Visitante sem Necessidade de Cadastro**: Acesso direto e instantâneo para Alunos e Professores consultarem os horários
- ⚡ **Arquitetura 100% Supabase (PostgreSQL)**: Consultas relacionais de alta velocidade e atualizações em tempo real via WebSockets (`postgres_changes`)
- 🔐 **Autenticação Flexível & Segura**: Login por E-mail + Senha (com suporte a redefinição) ou **Login Social com Google OAuth**
- 📱 **PWA Responsivo**: Instalável em smartphones e desktops (Android/iOS/Windows) com suporte a Web Push
- 🌙 **Design de Alto Padrão**: Dark mode nativo com paleta de cores harmoniosa, legibilidade refinada e animações fluidas
- 📥 **Importação e Exportação Completa**: Reconhecimento automático em arquivos Excel, CSV, JSON e Word (.docx), além de exportação em Excel, PDF e .ics (Google/Outlook Calendar)
- 🔔 **Notificações em Tempo Real**: Alertas via Telegram e Web Push em mudanças na grade

---

## Modo Visitante (Acesso Público)

Para facilitar a consulta dos horários de aulas e disponibilidade de laboratórios, o sistema conta com o botão **"Visualizar Calendário (Acesso Público)"** diretamente na tela inicial:

- 🔓 **Sem Cadastro Nem Aprovação**: Alunos e professores entram instantaneamente sem precisar criar conta ou aguardar aprovação de coordenador.
- 📅 **Direto ao Calendário**: O visitante vai direto para a grade semanal do calendário.
- 📥 **Exportação de Dados**: Permite exportar a agenda do semestre/mês em Excel (.xlsx), PDF e calendário iCal (.ics).
- ❓ **Dúvidas do Visitante**: Central de perguntas frequentes simplificada e focada apenas na consulta aos laboratórios.
- 🛡️ **Segurança Reforçada**: O visitante tem acesso puramente de leitura (somente visualização). Funcionalidades administrativas, alteração de perfil e Assistente de IA são restritas à equipe autorizada.

---

## Perfis de Acesso

O acesso restrito da equipe é controlado por um fluxo de aprovação. Ao se cadastrar via **E-mail + Senha** ou **Google**, a conta fica com o status **Pendente** até que a coordenação aprove o perfil adequado:

### 👨‍💼 Coordenador
Visão estratégica e administrativa completa:
- **Painel de Indicadores (KPIs)**: métricas de ocupação em tempo real, total de aulas, eventos e propostas pendentes
- **Agendamento Direto**: inclusão imediata de aulas e bloqueios de manutenção
- **Central de Aprovações**: aprovação, rejeição e designação de técnicos responsáveis por propostas enviadas
- **Gestão de Usuários**: aprovação de cadastros de técnicos/coordenadores, atribuição de cargos e remoção de acessos
- **Importação de Cronogramas**: conversão em lote de documentos externos em agendamentos oficiais
- **Avisos e Comunicados**: publicação de murais informativos categorizados por prioridade (Normal, Importante, Urgente)

### 🧑‍🔬 Técnico de Laboratório
Gestão operacional e manutenção dos espaços:
- **Seleção de Laboratórios Favoritos**: acompanhamento focado dos espaços sob sua responsabilidade
- **Envio de Propostas**: solicitação de reserva de horário para aulas práticas ou atividades especiais
- **Minhas Designações & Agenda**: acompanhamento de horários atribuídos pela coordenação
- **Reserva de Revisões/Monitorias**: agendamento de sessões preparatórias e manutenção preventiva de equipamentos

### 🎓 Visitante (Aluno / Professor)
Perfil focado em consulta pública sem cadastro:
- Visualização do Cronograma de Aulas e Calendário Acadêmico institucional
- Exportação de arquivos de horário em Excel, PDF e .ics
- Guia prático de dúvidas do visitante

---

## Funcionalidades

### 📅 Agendamento e Grade Relacional
- Blocos padronizados de horários acadêmicos (Manhã, Tarde e Noite)
- Verificação instantânea de conflitos de horário e colisão de turmas via Supabase PostgreSQL
- Auditoria e histórico completo de alterações e exclusões

### 🔐 Autenticação & Recuperação de Conta
- Formulário de acesso com validação estrita de e-mail (Regex)
- Mecanismo integrado de **"Esqueceu sua senha?"** disparando links de redefinição via Supabase Auth
- Botão "Continuar com o Google" em conformidade com as diretrizes visuais da Google

### 📥 Importação e Exportação de Dados
- Leitura e mapeamento automático de dados provenientes de **Excel, CSV, JSON e Word**
- Exportação multi-formato em **Excel (.xlsx)** com abas detalhadas, **iCalendar (.ics)** para integração com Google/Apple Calendar e relatórios em **PDF**

---

## Novidades Recentes

### 🐘 Migração 100% Supabase PostgreSQL + Vercel
- Migração completa do banco de dados e autenticação para o Supabase (PostgreSQL), garantindo maior velocidade, integridade relacional e atualizações em tempo real.
- Hospedagem global rápida e sem custos no Vercel.

### 🎨 Experiência Adequada ao Visitante
- Fluxo público simplificado redirecionando direto ao calendário.
- Remoção de itens desnecessários (como perfil, histórico e assistente IA para visitantes), garantindo maior clareza e segurança na consulta dos horários.

---

## Identidade Visual e Design

O **CronoLab** adota um sistema de design moderno e acessível:

| Token | Cor | Aplicação no Sistema |
| :--- | :--- | :--- |
| **Azul Principal** | `#1E7EC8` | Botões primários, cabeçalhos e elementos ativos |
| **Azul Destaque** | `#4AADE8` | Detalhes no modo escuro, ícones e estados hover |
| **Dourado Acadêmico**| `#F5C518` | Alertas de revisões, eventos e avisos importantes |
| **Verde Sucesso** | `#00C853` / `#3ECF8E` | Indicadores de disponibilidade, status aprovado |
| **Fundo Dark Mode** | `#0B0F18` | Interface elegante e confortável para uso noturno |

---

## Arquitetura & Tecnologias

- **Frontend**: React 19, Vite 7, Material UI (MUI v7), Lucide Icons
- **Backend & Database**: Supabase PostgreSQL, Supabase Realtime, Supabase Auth
- **Serverless Functions**: Vercel Serverless API (`/api`)
- **Inteligência Artificial (Equipe)**: LangChain.js & Groq API (`llama-3.3-70b-versatile`)
- **Documentos & Mídia**: ExcelJS, SheetJS (`xlsx`), Tesseract.js (OCR), jsPDF

---

## Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha suas credenciais:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
VITE_CLOUDINARY_CLOUD_NAME=seu-cloud-name
VITE_TELEGRAM_BOT_TOKEN=seu-token-bot
VITE_GROQ_API_KEY=sua-chave-groq
```

---

## Instalação

```bash
# 1. Clonar o repositório
git clone https://github.com/luizedu0494/cronogramabd.git
cd cronograma-lab-frontend

# 2. Instalar dependências
npm install

# 3. Configurar ambiente
cp .env.example .env

# 4. Rodar em desenvolvimento
npm run dev

# 5. Build de produção
npm run build
```

---

## Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
