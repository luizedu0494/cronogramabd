# Setup Rápido - Notificações Telegram

## ⚡ 5 Minutos para Configurar

### 1️⃣ Criar Bot no Telegram (2 min)

```
Telegram → Procure @BotFather → /newbot
```

**Respostas esperadas:**
- Nome: `Sistema de Aulas Bot`
- Username: `sistema_aulas_bot` (único, termina em "bot")

**Copie o token gerado:**
```
123456789:ABCdefGHIjklmnoPQRstuvWXYZ-1234567890
```

### 2️⃣ Obter seu Chat ID (1 min)

```
Telegram → Procure @userinfobot → Clique Start
```

**Copie seu User ID:**
```
987654321
```

### 3️⃣ Configurar Projeto (2 min)

**Na raiz do projeto, crie `.env.local`:**

```bash
VITE_TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklmnoPQRstuvWXYZ-1234567890
```

**No Supabase:**
1. Tabela `users` → Seu usuário
2. Adicione ou atualize a coluna: `telegram_chat_id` = `987654321` (ou conecte diretamente pela tela de Perfil via Código de Vinculação)

### 4️⃣ Testar (1 min)

```bash
npm run dev
```

Adicione uma aula → Verifique notificação no Telegram ✅

---

## 📋 Checklist

- [ ] Bot criado (@BotFather)
- [ ] Token copiado
- [ ] Chat ID obtido (@userinfobot)
- [ ] `.env` criado
- [ ] Token adicionado em `.env`
- [ ] Chat ID ou vinculo cadastrado no Supabase
- [ ] Servidor iniciado (`npm run dev`)
- [ ] Notificação recebida no Telegram

---

## 🆘 Problemas?

| Problema | Solução |
|----------|---------|
| Notificação não chega | Verifique `.env` e Supabase |
| Erro "Unauthorized" | Token inválido - copie novamente de @BotFather |
| Erro "Chat not found" | Chat ID inválido - copie novamente de @userinfobot |
| Variável não carregada | Reinicie servidor (`npm start`) |

---

## 📚 Documentação Completa

Leia `GUIA_NOTIFICACOES_TELEGRAM.md` para:
- Instruções detalhadas
- Troubleshooting completo
- Exemplos de mensagens
- Boas práticas de segurança

---

**Pronto! Suas notificações estão configuradas.** 🎉
