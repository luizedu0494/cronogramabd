// src/GerenciarAvisos.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseConfig';
import { useAuth } from '../../AuthContext';
import {
  Container, Typography, Paper, Box, CircularProgress, Alert,
  List, ListItem, ListItemText, IconButton,
  TextField, Button, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Tooltip, Snackbar
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');
dayjs.extend(relativeTime);

function GerenciarAvisos() {
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [tituloForm, setTituloForm] = useState('');
  const [mensagemForm, setMensagemForm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avisoEmEdicao, setAvisoEmEdicao] = useState(null);

  const [openConfirmDeleteDialog, setOpenConfirmDeleteDialog] = useState(false);
  const [avisoParaExcluir, setAvisoParaExcluir] = useState(null);

  // Modal de Leituras
  const [openLeiturasDialog, setOpenLeiturasDialog] = useState(false);
  const [avisoSelecionadoParaLeituras, setAvisoSelecionadoParaLeituras] = useState(null);
  const [listaDeLeituras, setListaDeLeituras] = useState([]);
  const [loadingLeituras, setLoadingLeituras] = useState(false);

  const { currentUser, userProfile } = useAuth();
  const isCoordenador = userProfile?.role === 'coordenador';

  const fetchAvisos = async () => {
    try {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from('avisos')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      const avisosData = (data || []).map(item => ({
        id: item.id,
        titulo: item.titulo,
        mensagem: item.mensagem,
        autorNome: item.autor_nome,
        autorUid: item.autor_uid,
        dataCriacao: item.created_at ? dayjs(item.created_at) : null,
        dataUltimaModificacao: item.updated_at ? dayjs(item.updated_at) : null
      }));

      setAvisos(avisosData);
      setError('');
    } catch (err) {
      console.error("Erro ao buscar avisos:", err);
      setError("Falha ao carregar os avisos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isCoordenador) {
      setLoading(false);
      setError("Acesso negado. Apenas coordenadores podem gerenciar avisos.");
      return;
    }
    fetchAvisos();
  }, [isCoordenador]);

  const handleOpenFormDialogParaAdicionar = () => {
    setAvisoEmEdicao(null);
    setTituloForm('');
    setMensagemForm('');
    setOpenFormDialog(true);
  };

  const handleOpenFormDialogParaEditar = (aviso) => {
    setAvisoEmEdicao(aviso);
    setTituloForm(aviso.titulo);
    setMensagemForm(aviso.mensagem);
    setOpenFormDialog(true);
  };

  const handleCloseFormDialog = () => {
    setOpenFormDialog(false);
    setAvisoEmEdicao(null);
    setTituloForm('');
    setMensagemForm('');
  };

  const handleSalvarAviso = async () => {
    if (!tituloForm.trim() || !mensagemForm.trim()) {
      setSnackbarMessage("Título e mensagem são obrigatórios.");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      return;
    }
    setIsSubmitting(true);
    try {
      if (avisoEmEdicao) {
        const { error: err } = await supabase
          .from('avisos')
          .update({
            titulo: tituloForm.trim(),
            mensagem: mensagemForm.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', avisoEmEdicao.id);

        if (err) throw err;
        setSnackbarMessage("Aviso atualizado!");
      } else {
        const { error: err } = await supabase
          .from('avisos')
          .insert([{
            titulo: tituloForm.trim(),
            mensagem: mensagemForm.trim(),
            autor_nome: userProfile?.name || currentUser?.displayName || "Coordenador",
            autor_uid: currentUser?.id || currentUser?.uid || "N/A",
            created_at: new Date().toISOString()
          }]);

        if (err) throw err;
        setSnackbarMessage("Aviso adicionado!");
      }
      setSnackbarSeverity("success");
      handleCloseFormDialog();
      fetchAvisos();
    } catch (err) {
      console.error("Erro ao salvar aviso:", err);
      setSnackbarMessage(`Erro ao salvar: ${err.message}`);
      setSnackbarSeverity("error");
    } finally {
      setIsSubmitting(false);
      setOpenSnackbar(true);
    }
  };

  const handleAbrirConfirmacaoExcluir = (aviso) => {
    setAvisoParaExcluir(aviso);
    setOpenConfirmDeleteDialog(true);
  };

  const handleFecharConfirmacaoExcluir = () => {
    setAvisoParaExcluir(null);
    setOpenConfirmDeleteDialog(false);
  };

  const handleConfirmarExcluirAviso = async () => {
    if (!avisoParaExcluir) return;
    try {
      const { error: err } = await supabase
        .from('avisos')
        .delete()
        .eq('id', avisoParaExcluir.id);

      if (err) throw err;

      setSnackbarMessage("Aviso excluído!");
      setSnackbarSeverity("success");
      fetchAvisos();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      setSnackbarMessage("Erro ao excluir.");
      setSnackbarSeverity("error");
    } finally {
      handleFecharConfirmacaoExcluir();
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setOpenSnackbar(false);
  };

  const handleAbrirModalLeituras = async (aviso) => {
    setAvisoSelecionadoParaLeituras(aviso);
    setOpenLeiturasDialog(true);
    setLoadingLeituras(true);
    setListaDeLeituras([]);

    try {
      const { data, error: err } = await supabase
        .from('avisos_leituras')
        .select('*')
        .eq('aviso_id', aviso.id)
        .order('created_at', { ascending: false });

      if (err) throw err;

      const leiturasData = (data || []).map(item => ({
        id: item.id,
        userName: item.user_name || item.user_id,
        dataLeitura: item.created_at ? dayjs(item.created_at) : null
      }));
      setListaDeLeituras(leiturasData);
    } catch (error) {
      console.error("Erro ao buscar leituras do aviso:", error);
      setSnackbarMessage("Erro ao carregar quem leu o aviso.");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    } finally {
      setLoadingLeituras(false);
    }
  };

  const handleFecharModalLeituras = () => {
    setOpenLeiturasDialog(false);
    setAvisoSelecionadoParaLeituras(null);
    setListaDeLeituras([]);
  };

  if (loading && avisos.length === 0) return (<Container sx={{ textAlign: 'center', mt: 4 }}><CircularProgress /></Container>);
  if (error && !isCoordenador) return (<Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">Gerenciar Avisos</Typography>
          {isCoordenador && ( <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={handleOpenFormDialogParaAdicionar}>Novo Aviso</Button> )}
        </Box>
        {error && isCoordenador && (<Alert severity="error" sx={{mb: 2}}>{error}</Alert>)}
        {!isCoordenador && !loading && <Alert severity="warning">Acesso negado.</Alert>}
        {isCoordenador && avisos.length === 0 && !loading && ( <Typography variant="body1" color="text.secondary" align="center">Nenhum aviso. Clique em "Novo Aviso".</Typography> )}
        {isCoordenador && avisos.length > 0 && (
          <List>
            {avisos.map((aviso) => (
              <Paper key={aviso.id} elevation={1} sx={{ mb: 2, p: 2 }}>
                <ListItem alignItems="flex-start" disableGutters
                  secondaryAction={
                    <Box sx={{display: 'flex', alignItems: 'center'}}>
                      <Tooltip title="Ver quem leu">
                        <IconButton edge="end" aria-label="view readers" sx={{mr:0.5}} onClick={() => handleAbrirModalLeituras(aviso)}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar Aviso">
                        <IconButton edge="end" aria-label="edit" sx={{mr:0.5}} onClick={() => handleOpenFormDialogParaEditar(aviso)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir Aviso">
                        <IconButton edge="end" aria-label="delete" onClick={() => handleAbrirConfirmacaoExcluir(aviso)}>
                          <DeleteIcon color="error" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={<Typography variant="h6" component="div" gutterBottom>{aviso.titulo}</Typography>}
                    secondary={
                      <>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mb:1 }}>{aviso.mensagem}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {aviso.dataCriacao ? `Criado em ${aviso.dataCriacao.format('DD/MM/YY HH:mm')} (${aviso.dataCriacao.fromNow()})` : 'Data desconhecida'}
                          {aviso.autorNome && ` por ${aviso.autorNome}`}
                          {aviso.dataUltimaModificacao && (
                            <em> (Editado {aviso.dataUltimaModificacao.fromNow()})</em>
                          )}
                        </Typography>
                      </>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                </ListItem>
              </Paper>
            ))}
          </List>
        )}
      </Paper>

      {/* Dialog para Adicionar/Editar Aviso */}
      <Dialog open={openFormDialog} onClose={handleCloseFormDialog} fullWidth maxWidth="sm">
        <DialogTitle>{avisoEmEdicao ? "Editar Aviso" : "Adicionar Novo Aviso"}</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" id="titulo" label="Título" type="text" fullWidth variant="outlined" value={tituloForm} onChange={(e) => setTituloForm(e.target.value)} sx={{ mb: 2 }}/>
          <TextField margin="dense" id="mensagem" label="Mensagem" type="text" fullWidth multiline rows={4} variant="outlined" value={mensagemForm} onChange={(e) => setMensagemForm(e.target.value)}/>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFormDialog}>Cancelar</Button>
          <Button onClick={handleSalvarAviso} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} /> : (avisoEmEdicao ? "Salvar" : "Adicionar")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Confirmar Exclusão */}
      <Dialog open={openConfirmDeleteDialog} onClose={handleFecharConfirmacaoExcluir}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>Excluir aviso: "{avisoParaExcluir?.titulo}"?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFecharConfirmacaoExcluir}>Cancelar</Button>
          <Button onClick={handleConfirmarExcluirAviso} color="error">Excluir</Button>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO PARA EXIBIR LEITURAS */}
      <Dialog open={openLeiturasDialog} onClose={handleFecharModalLeituras} fullWidth maxWidth="sm">
        <DialogTitle>
          Visualizações do Aviso: "{avisoSelecionadoParaLeituras?.titulo}"
          <IconButton aria-label="close" onClick={handleFecharModalLeituras} sx={{position: 'absolute', right: 8, top: 8}} >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loadingLeituras && <Box sx={{display: 'flex', justifyContent: 'center', my: 2}}><CircularProgress /></Box>}
          {!loadingLeituras && listaDeLeituras.length === 0 && (
            <Typography>Ninguém marcou este aviso como lido ainda.</Typography>
          )}
          {!loadingLeituras && listaDeLeituras.length > 0 && (
            <List dense>
              {listaDeLeituras.map(leitura => (
                <ListItem key={leitura.id} divider>
                  <ListItemText 
                    primary={leitura.userName} 
                    secondary={leitura.dataLeitura ? `Lido em: ${leitura.dataLeitura.format('DD/MM/YYYY HH:mm')}` : 'Data de leitura não registrada'}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFecharModalLeituras}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>{snackbarMessage}</Alert>
      </Snackbar>
    </Container>
  );
}

export default GerenciarAvisos;