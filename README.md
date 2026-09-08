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

> 💼 **Projeto proprietário em desenvolvimento comercial.**
> Este repositório é uma vitrine do produto, com descrição de arquitetura, funcionalidades e decisões técnicas. O código-fonte completo não é público. Para parcerias, licenciamento ou acesso a uma demo guiada, entre em contato.

---

## Sobre

O **CronoLab** é uma solução completa desenvolvida para resolver um desafio crítico no ambiente acadêmico: a **gestão descentralizada de laboratórios de aulas e pesquisas**.

O sistema centraliza a agenda de múltiplos espaços físicos em uma única interface inteligente, atendendo às necessidades de **Coordenadores**, **Técnicos de Laboratório**, **Professores** e **Alunos (Visitantes)**. Ele substitui planilhas manuais e conflitos de horários por um banco de dados relacional Supabase (PostgreSQL) com verificação automática de choques de agenda, análise preditiva de ocupação e atualizações em tempo real.

**Destaques:**
- 🏫 **Pronto para Instituições de Ensino**: adequado para universidades, faculdades e centros tecnológicos com múltiplos laboratórios
- 🎓 **Modo Visitante sem Necessidade de Cadastro**: acesso direto e instantâneo para Alunos e Professores consultarem os horários
- ⚡ **Arquitetura 100% Supabase (PostgreSQL)**: consultas relacionais de alta velocidade e atualizações em tempo real via WebSockets (`postgres_changes`)
- 🔐 **Autenticação Flexível & Segura**: Login por E-mail + Senha ou **Login Social com Google OAuth**
- 📱 **PWA Responsivo**: instalável em smartphones e desktops (Android/iOS/Windows) com suporte a Web Push
- 🌙 **Design de Alto Padrão**: Dark mode nativo com paleta de cores harmoniosa e animações fluidas
- 📥 **Importação e Exportação Completa**: reconhecimento automático em Excel, CSV, JSON e Word (.docx), exportação em Excel, PDF e .ics
- 🔔 **Notificações em Tempo Real**: alertas via Telegram e Web Push em mudanças na grade

---

## Modo Visitante (Acesso Público)

Para facilitar a consulta dos horários de aulas e disponibilidade de laboratórios, o sistema conta com um modo de acesso público direto na tela inicial:

- 🔓 **Sem Cadastro Nem Aprovação**: alunos e professores entram instantaneamente
- 📅 **Direto ao Calendário**: o visitante vai direto para a grade semanal
- 📥 **Exportação de Dados**: agenda do semestre/mês em Excel (.xlsx), PDF e iCal (.ics)
- 🛡️ **Segurança Reforçada**: acesso puramente de leitura; funcionalidades administrativas e Assistente de IA são restritas à equipe autorizada

---

## Perfis de Acesso

O acesso restrito da equipe é controlado por um fluxo de aprovação. Ao se cadastrar via **E-mail + Senha** ou **Google**, a conta fica com o status **Pendente** até que a coordenação aprove o perfil adequado:

### 👨‍💼 Coordenador
- Painel de Indicadores (KPIs) em tempo real
- Agendamento direto de aulas e bloqueios de manutenção
- Central de Aprovações de propostas enviadas
- Gestão de usuários e cargos
- Importação de cronogramas em lote
- Avisos e comunicados por prioridade

### 🧑‍🔬 Técnico de Laboratório
- Seleção de laboratórios favoritos
- Envio de propostas de reserva de horário
- Painel de designações e agenda pessoal
- Reserva de revisões/monitorias e manutenção preventiva

### 🎓 Visitante (Aluno / Professor)
- Visualização do Cronograma de Aulas e Calendário Acadêmico
- Exportação de horários em Excel, PDF e .ics
- Guia prático de dúvidas

---

## Funcionalidades

### 📅 Agendamento e Grade Relacional
- Blocos padronizados de horários (Manhã, Tarde, Noite)
- Verificação instantânea de conflitos e colisão de turmas
- Auditoria e histórico completo de alterações

### 🔐 Autenticação & Recuperação de Conta
- Formulário de acesso com validação estrita
- Fluxo de "Esqueceu sua senha?" via Supabase Auth
- Login social com Google (conforme diretrizes visuais)

### 📥 Importação e Exportação de Dados
- Leitura automática de Excel, CSV, JSON e Word
- Exportação em Excel (.xlsx), iCalendar (.ics) e PDF

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

- **Frontend**: React 19, Vite 7, Material UI (MUI v7), Lucide Icons
- **Backend & Database**: Supabase PostgreSQL, Supabase Realtime, Supabase Auth
- **Serverless Functions**: Vercel Serverless API
- **Inteligência Artificial**: LangChain.js & Groq API (`llama-3.3-70b-versatile`)
- **Documentos & Mídia**: ExcelJS, SheetJS (`xlsx`), Tesseract.js (OCR), jsPDF

---

## Status do Projeto

🚧 Em desenvolvimento ativo, com deploy contínuo em produção.
Interessado em uma demonstração guiada, parceria ou licenciamento para sua instituição? Entre em contato pelo perfil do GitHub.

---

## Licença

Este projeto é proprietário. Todos os direitos reservados. Consulte a seção de contato para informações sobre licenciamento comercial.
