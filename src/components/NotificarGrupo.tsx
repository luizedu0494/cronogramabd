import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper, Typography, Box, TextField, Button, Autocomplete,
  ToggleButtonGroup, ToggleButton, Alert, CircularProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { grupoService, Grupo } from '../services/grupoService';
import { notificationService } from '../services/notificationService';

export function NotificarGrupo() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<Grupo | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [tipo, setTipo] = useState<'aviso_normal' | 'aviso_importante' | 'aviso_urgente'>('aviso_normal');
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState<{ texto: string; tipo: 'success' | 'error' } | null>(null);

  const carregarGrupos = useCallback(async () => {
    try {
      const data = await grupoService.listarGrupos();
      setGrupos(data);
    } catch (err) {
      console.error('Erro ao carregar grupos para notificação:', err);
    }
  }, []);

  useEffect(() => {
    carregarGrupos();
  }, [carregarGrupos]);

  const handleEnviar = async () => {
    if (!grupoSelecionado || !mensagem.trim()) return;
    setEnviando(true);
    setFeedback(null);

    try {
      const destinatarios = grupoSelecionado.membros_uids || [];
      if (destinatarios.length === 0) {
        setFeedback({ texto: 'Este grupo não possui membros cadastrados para receber a mensagem.', tipo: 'error' });
        setEnviando(false);
        return;
      }

      const prefixo = tipo === 'aviso_urgente' ? '⚠️ URGENTE - ' : tipo === 'aviso_importante' ? '📌 ' : '📢 ';
      const titulo = `${prefixo}Grupo ${grupoSelecionado.nome}`;

      await notificationService.disparar(
        {
          tipo,
          titulo,
          corpo: mensagem.trim(),
        },
        destinatarios
      );

      setMensagem('');
      setFeedback({
        texto: `Notificação enviada com sucesso para ${destinatarios.length} membro(s) do grupo ${grupoSelecionado.nome}!`,
        tipo: 'success',
      });
    } catch (err: any) {
      console.error('Erro ao notificar grupo:', err);
      setFeedback({ texto: `Falha ao enviar mensagem: ${err.message}`, tipo: 'error' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
      <Typography variant="h6" fontWeight={700} gutterBottom>
        Notificar Grupo de Técnicos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Envie um comunicado direto in-app e push para todos os membros associados a um grupo.
      </Typography>

      {feedback && (
        <Alert severity={feedback.tipo} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.texto}
        </Alert>
      )}

      <Autocomplete
        options={grupos}
        getOptionLabel={(g) => g.nome}
        renderOption={(props, g) => (
          <li {...props} key={g.id}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: g.cor || '#1E7EC8', mr: 1.5 }} />
            <Box>
              <Typography variant="body2" fontWeight={600}>{g.nome}</Typography>
              <Typography variant="caption" color="text.secondary">
                {g.membros_count || 0} membro(s) · {g.labs_associados?.join(', ') || 'Todos os labs'}
              </Typography>
            </Box>
          </li>
        )}
        onChange={(_, val) => setGrupoSelecionado(val)}
        renderInput={(params) => <TextField {...params} label="Grupo Destinatário" sx={{ mb: 2 }} />}
      />

      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
          Nível de Urgência:
        </Typography>
        <ToggleButtonGroup
          value={tipo}
          exclusive
          onChange={(_, v) => v && setTipo(v)}
          size="small"
          color="primary"
        >
          <ToggleButton value="aviso_normal">Normal</ToggleButton>
          <ToggleButton value="aviso_importante">Importante</ToggleButton>
          <ToggleButton value="aviso_urgente" color="error">⚠️ Urgente</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <TextField
        label="Mensagem do Aviso"
        multiline
        rows={3}
        fullWidth
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        placeholder="Escreva a mensagem para a equipe deste laboratório..."
        sx={{ mb: 2 }}
      />

      {grupoSelecionado && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Esta mensagem será entregue para <strong>{grupoSelecionado.membros_count || 0} técnico(s)</strong> via notificação In-App e Web Push.
        </Alert>
      )}

      <Button
        variant="contained"
        endIcon={enviando ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        onClick={handleEnviar}
        disabled={!grupoSelecionado || !mensagem.trim() || enviando}
        fullWidth
        sx={{ py: 1.2, fontWeight: 700 }}
      >
        {enviando ? 'Enviando para o grupo...' : 'Enviar Comunicado'}
      </Button>
    </Paper>
  );
}

export default NotificarGrupo;
