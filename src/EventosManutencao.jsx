import { useState, useEffect } from 'react';
import { supabase } from './supabaseConfig';
import {
  Container, Typography, Box, Paper, CircularProgress, Alert,
  List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Tooltip, Snackbar, Grid, Select, MenuItem, FormControl, InputLabel, Divider, FormHelperText
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import EmptyState from './components/EmptyState';
import { LISTA_LABORATORIOS, TIPOS_LABORATORIO } from './constants/laboratorios';
import { CalendarOff } from 'lucide-react';
import DialogConfirmacao from './components/DialogConfirmacao';

dayjs.locale('pt-br');

const EVENT_TYPES = ['Manutenção', 'Feriado', 'Evento', 'Giro', 'Outro'];

const BLOCOS_HORARIO = [
    { "value": "07:00-09:10", "label": "07:00 - 09:10", "turno": "Matutino" },
    { "value": "09:30-12:00", "label": "09:30 - 12:00", "turno": "Matutino" },
    { "value": "13:00-15:10", "label": "13:00 - 15:10", "turno": "Vespertino" },
    { "value": "15:30-18:00", "label": "15:30 - 18:00", "turno": "Vespertino" },
    { "value": "18:30-20:10", "label": "18:30 - 20:10", "turno": "Noturno" },
    { "value": "20:30-22:00", "label": "20:30 - 22:00", "turno": "Noturno" },
];

function EventosManutencao() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [eventoParaEditar, setEventoParaEditar] = useState(null);
  const [eventoParaExcluir, setEventoParaExcluir] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });
  const [actionLoading, setActionLoading] = useState(false);

  // Formulário
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: EVENT_TYPES[0],
    tipoLaboratorio: 'Todos',
    laboratorio: 'Todos',
    dataInicio: dayjs(),
    horarios: []
  });
  const [errors, setErrors] = useState({});

  const carregarEventos = async () => {
    setLoading(true);
    try {
      const { data, error: sbError } = await supabase
        .from('eventos_manutencao')
        .select('*')
        .order('data_inicio', { ascending: false });

      if (sbError) throw sbError;

      const eventosList = (data || []).map(item => ({
        id: item.id,
        titulo: item.titulo,
        descricao: item.descricao,
        tipo: item.tipo,
        laboratorio: item.laboratorio || 'Todos',
        dataInicio: item.data_inicio ? new Date(item.data_inicio) : new Date(),
        dataFim: item.data_fim ? new Date(item.data_fim) : new Date(),
        horarioSlotString: item.horario_slot,
      }));

      setEventos(eventosList);
    } catch (err) {
      console.error("Erro ao carregar eventos:", err);
      setError("Não foi possível carregar os eventos de manutenção.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEventos();

    // Escuta em tempo real no Supabase
    const channel = supabase
      .channel('public:eventos_manutencao')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos_manutencao' }, () => {
        carregarEventos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);



  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      tipo: EVENT_TYPES[0],
      tipoLaboratorio: 'Todos',
      laboratorio: 'Todos',
      dataInicio: dayjs(),
      horarios: []
    });
    setErrors({});
    setEventoParaEditar(null);
  };

  const handleOpenDialog = (evento = null) => {
    if (evento) {
      setEventoParaEditar(evento);
      
      let tipoLab = 'Todos';
      if (evento.laboratorio !== 'Todos') {
        const labObj = LISTA_LABORATORIOS.find(l => l.name === evento.laboratorio);
        if (labObj) tipoLab = labObj.tipo;
      }

      const start = dayjs(evento.dataInicio);
      const end = dayjs(evento.dataFim);
      const slotString = `${start.format('HH:mm')}-${end.format('HH:mm')}`;
      
      setFormData({
        titulo: evento.titulo,
        descricao: evento.descricao || '',
        tipo: evento.tipo,
        tipoLaboratorio: tipoLab,
        laboratorio: evento.laboratorio,
        dataInicio: start,
        horarios: [slotString]
      });
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.titulo.trim()) newErrors.titulo = 'Obrigatório';
    if (!formData.dataInicio) newErrors.dataInicio = 'Obrigatório';
    if (formData.horarios.length === 0) newErrors.horarios = 'Selecione pelo menos um horário';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setActionLoading(true);
    try {
      for (const slot of formData.horarios) {
        const [inicioStr, fimStr] = slot.split('-');
        const finalStart = formData.dataInicio.hour(parseInt(inicioStr.split(':')[0])).minute(parseInt(inicioStr.split(':')[1])).second(0);
        const finalEnd = formData.dataInicio.hour(parseInt(fimStr.split(':')[0])).minute(parseInt(fimStr.split(':')[1])).second(0);

        const eventoData = {
          titulo: formData.titulo,
          descricao: formData.descricao || '',
          tipo: formData.tipo,
          laboratorio: formData.laboratorio || 'Todos',
          horario_slot: slot,
          data_inicio: finalStart.toISOString(),
          data_fim: finalEnd.toISOString(),
          criado_por_uid: currentUser?.uid || 'desconhecido',
          criado_por_nome: currentUser?.displayName || currentUser?.email || 'Técnico',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (eventoParaEditar) {
          const { error: updateErr } = await supabase
            .from('eventos_manutencao')
            .update(eventoData)
            .eq('id', eventoParaEditar.id);

          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await supabase
            .from('eventos_manutencao')
            .insert([eventoData]);

          if (insertErr) throw insertErr;
        }
      }

      setFeedback({ 
        open: true, 
        message: eventoParaEditar ? 'Evento atualizado com sucesso!' : 'Evento(s) adicionado(s) com sucesso!', 
        severity: 'success' 
      });
      handleCloseDialog();
      carregarEventos();
    } catch (err) {
      console.error("Erro ao salvar evento:", err);
      setFeedback({ open: true, message: `Erro ao salvar o evento: ${err.message}`, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDeleteDialog = (evento) => {
    setEventoParaExcluir(evento);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eventoParaExcluir) return;
    setActionLoading(true);
    try {
      const { error: deleteErr } = await supabase
        .from('eventos_manutencao')
        .delete()
        .eq('id', eventoParaExcluir.id);

      if (deleteErr) throw deleteErr;
      setFeedback({ open: true, message: 'Evento excluído com sucesso!', severity: 'success' });
      setOpenDeleteDialog(false);
      setEventoParaExcluir(null);
      carregarEventos();
    } catch (err) {
      console.error("Erro ao excluir evento:", err);
      setFeedback({ open: true, message: `Erro ao excluir o evento: ${err.message}`, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setFeedback(prev => ({ ...prev, open: false }));
  };

  const getChipColor = (tipo) => {
    switch (tipo) {
      case 'Manutenção': return 'error';
      case 'Feriado': return 'warning';
      case 'Evento': return 'primary';
      case 'Giro': return 'info';
      default: return 'default';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h5" component="h1" gutterBottom fontWeight="bold">
                Eventos e Manutenções
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerencie bloqueios de laboratórios por manutenção, feriados ou eventos especiais.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Novo Evento
            </Button>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
          ) : eventos.length === 0 ? (
            <EmptyState
              icon={<CalendarOff size={48} />}
              title="Nenhum Evento Cadastrado"
              description="Cadastre manutenções ou eventos para bloquear horários no cronograma."
            />
          ) : (
            <List>
              {eventos.map((evento) => (
                <ListItem key={evento.id} divider sx={{ py: 2 }}>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {evento.titulo}
                        </Typography>
                        <Chip
                          label={evento.tipo}
                          color={getChipColor(evento.tipo)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        {evento.descricao && (
                          <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                            {evento.descricao}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" display="block">
                          🏢 Laboratório: {evento.laboratorio}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          📅 {dayjs(evento.dataInicio).format('DD/MM/YYYY HH:mm')} até {dayjs(evento.dataFim).format('HH:mm')}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Editar">
                      <IconButton edge="end" onClick={() => handleOpenDialog(evento)} sx={{ mr: 1 }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton edge="end" onClick={() => handleOpenDeleteDialog(evento)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        {/* Dialog de Adicionar/Editar */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{eventoParaEditar ? 'Editar Evento' : 'Novo Evento / Bloqueio'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Título do Evento *"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  error={Boolean(errors.titulo)}
                  helperText={errors.titulo}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Evento</InputLabel>
                  <Select
                    value={formData.tipo}
                    label="Tipo de Evento"
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  >
                    {EVENT_TYPES.map(t => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Laboratório</InputLabel>
                  <Select
                    value={formData.tipoLaboratorio}
                    label="Tipo de Laboratório"
                    onChange={(e) => setFormData({ ...formData, tipoLaboratorio: e.target.value, laboratorio: 'Todos' })}
                  >
                    <MenuItem value="Todos">Todos os Tipos</MenuItem>
                    {TIPOS_LABORATORIO.map(t => (
                      <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Laboratório Afetado</InputLabel>
                  <Select
                    value={formData.laboratorio}
                    label="Laboratório Afetado"
                    onChange={(e) => setFormData({ ...formData, laboratorio: e.target.value })}
                  >
                    <MenuItem value="Todos">Todos os Laboratórios</MenuItem>
                    {LISTA_LABORATORIOS
                      .filter(l => formData.tipoLaboratorio === 'Todos' || l.tipo === formData.tipoLaboratorio)
                      .map(l => (
                        <MenuItem key={l.id} value={l.name}>{l.name}</MenuItem>
                      ))
                    }
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Data *"
                  value={formData.dataInicio}
                  onChange={(val) => setFormData({ ...formData, dataInicio: val })}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: Boolean(errors.dataInicio),
                      helperText: errors.dataInicio
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth error={Boolean(errors.horarios)}>
                  <InputLabel>Horários Afetados *</InputLabel>
                  <Select
                    multiple
                    value={formData.horarios}
                    label="Horários Afetados *"
                    onChange={(e) => setFormData({ ...formData, horarios: e.target.value })}
                    renderValue={(selected) => selected.join(', ')}
                  >
                    {BLOCOS_HORARIO.map(b => (
                      <MenuItem key={b.value} value={b.value}>
                        <Checkbox checked={formData.horarios.includes(b.value)} />
                        <ListItemText primary={`${b.label} (${b.turno})`} />
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.horarios && <FormHelperText>{errors.horarios}</FormHelperText>}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Descrição / Observações"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={actionLoading}
            >
              {actionLoading ? <CircularProgress size={24} /> : (eventoParaEditar ? 'Salvar' : 'Criar Evento')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de Exclusão */}
        <DialogConfirmacao
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
          onConfirm={handleDeleteConfirm}
          title="Confirmar Exclusão"
          message={`Tem certeza que deseja excluir o evento "${eventoParaExcluir?.titulo}"?`}
          confirmText="Excluir"
          confirmColor="error"
        />

        <Snackbar
          open={feedback.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
        >
          <Alert onClose={handleCloseSnackbar} severity={feedback.severity}>
            {feedback.message}
          </Alert>
        </Snackbar>
      </Container>
    </LocalizationProvider>
  );
}

export default EventosManutencao;
