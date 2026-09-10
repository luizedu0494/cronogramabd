import React, { useState, useEffect } from 'react';
import {
    Container, Typography, TextField, Button, Grid, MenuItem, FormControl, InputLabel,
    Select, Box, Paper, Snackbar, Alert, CircularProgress, OutlinedInput, Chip, IconButton, Tooltip,
    List, ListItem, ListItemText, FormHelperText, Dialog, DialogTitle, DialogContent, DialogActions,
    Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { ArrowBack, Delete as DeleteIcon, Add as AddIcon, Lock as LockIcon, ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { DatePicker } from '@mui/x-date-pickers';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from './supabaseConfig';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
// IMPORTANTE: Plugin para verificar intervalos
import isBetween from 'dayjs/plugin/isBetween';

import { LISTA_LABORATORIOS, TIPOS_LABORATORIO } from './constants/laboratorios';
import PropTypes from 'prop-types';
import DialogConfirmacao from './components/DialogConfirmacao';
import GradeDisponibilidade from './components/GradeDisponibilidade';
import { useDisponibilidade } from './hooks/useDisponibilidade';
import { autoRejeitarPendentesConflitantes } from './utils/conflitoUtils';

dayjs.locale('pt-br');
dayjs.extend(isBetween);

const EVENT_TYPES = ['Manutenção', 'Feriado', 'Evento', 'Giro', 'Outro'];
const BLOCOS_HORARIO = [
    { "value": "07:00-09:10", "label": "07:00 - 09:10", "turno": "Matutino" },
    { "value": "09:30-12:00", "label": "09:30 - 12:00", "turno": "Matutino" },
    { "value": "13:00-15:10", "label": "13:00 - 15:10", "turno": "Vespertino" },
    { "value": "15:30-18:00", "label": "15:30 - 18:00", "turno": "Vespertino" },
    { "value": "18:30-20:10", "label": "18:30 - 20:10", "turno": "Noturno" },
    { "value": "20:30-22:00", "label": "20:30 - 22:00", "turno": "Noturno" },
];


const safeDayjs = (val) => {
    if (!val) return null;
    if (dayjs.isDayjs(val)) return val;
    if (val.toDate && typeof val.toDate === 'function') return dayjs(val.toDate());
    const parsed = dayjs(val);
    return parsed.isValid() ? parsed : null;
};

function ProporEventoForm({ userInfo, currentUser, initialDate, onSuccess, onCancel, isModal, formTitle, eventoId: propEventoId }) {
    const [formData, setFormData] = useState({
        titulo: '', descricao: '', tipo: EVENT_TYPES[0],
        dataInicio: safeDayjs(initialDate) || null, horarioSlotString: [], dynamicLabs: [{ tipo: '', laboratorios: [] }],
    });
    const [errors, setErrors] = useState({});
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [openDuplicateDialog, setOpenDuplicateDialog] = useState(false);
    const [conflitos, setConflitos] = useState([]);
    
    const [openConfirmModal, setOpenConfirmModal] = useState(false);
    const [eventosParaConfirmar, setEventosParaConfirmar] = useState([]);
    const [horariosOcupados, setHorariosOcupados] = useState([]);
    const { consultarDisponibilidade, loading: verificandoDisp } = useDisponibilidade();
    const [ocupacaoDoDia, setOcupacaoDoDia] = useState({ aulas: [], eventos: [] });
    const [openKeepDataDialog, setOpenKeepDataDialog] = useState(false);
    const [gradeAberta, setGradeAberta] = useState(false);

    // Mapeia horários ocupados para exibir título das aulas/eventos no Select
    const infoOcupacao = React.useMemo(() => {
        const map = {};
        const laboratoriosParaVerificar = formData.dynamicLabs.flatMap(lab => lab.laboratorios).filter(Boolean);

        // Se nenhum laboratório foi selecionado ainda na Seção 3, não bloqueia horários prematuramente no dropdown
        if (laboratoriosParaVerificar.length === 0) return map;

        const todosConflitos = [...(ocupacaoDoDia.aulas || []), ...(ocupacaoDoDia.eventos || [])];

        todosConflitos.forEach(c => {
            const labMatch = c.laboratorio === 'Todos' || laboratoriosParaVerificar.includes(c.laboratorio);
            if (labMatch) {
                map[c.horario] = c.titulo || c.assunto || 'Ocupado';
            }
        });
        return map;
    }, [ocupacaoDoDia, formData.dynamicLabs]);
    
    // Estados visuais do calendário
    const [diasTotalmenteOcupados, setDiasTotalmenteOcupados] = useState([]);
    const [diasParcialmenteOcupados, setDiasParcialmenteOcupados] = useState([]);
    const [periodosBloqueados, setPeriodosBloqueados] = useState([]); // Feriados/Recessos

    const [mesVisivel, setMesVisivel] = useState(dayjs());
    const [loadingCalendario, setLoadingCalendario] = useState(false);

    const [secao1Completa, setSecao1Completa] = useState(false);
    const [secaoDataCompleta, setSecaoDataCompleta] = useState(false);
    const [secao2Completa, setSecao2Completa] = useState(false);

    const navigate = useNavigate();
    const { eventoId: paramEventoId } = useParams();
    const eventoId = propEventoId || paramEventoId;

    useEffect(() => {
        if (eventoId) {
            setSecao1Completa(true);
            return;
        }
        const completa = formData.titulo.trim() !== '' && formData.tipo !== '';
        setSecao1Completa(completa);
    }, [formData.titulo, formData.tipo, eventoId]);

    useEffect(() => {
        if (eventoId) {
            setSecaoDataCompleta(true);
            return;
        }
        // Liberação da Seção 3 (Laboratórios) depende SOMENTE da escolha da Data na Seção 2
        const dataCompleta = Boolean(formData.dataInicio);
        setSecaoDataCompleta(dataCompleta && secao1Completa);
    }, [formData.dataInicio, secao1Completa, eventoId]);

    useEffect(() => {
        if (eventoId) {
            setSecao2Completa(true);
            return;
        }
        const labsCompletos = formData.dynamicLabs.every(lab => lab && lab.tipo !== '' && lab.laboratorios.length > 0);
        setSecao2Completa(labsCompletos && secaoDataCompleta);
    }, [formData.dynamicLabs, secaoDataCompleta, eventoId]);

    // Reseta APENAS os horários selecionados ao trocar a data no modo de inclusão (PRESERVA os laboratórios selecionados)
    useEffect(() => {
        if (isEditMode || !formData.dataInicio) return;
        setFormData(prev => ({
            ...prev,
            horarioSlotString: [],
        }));
        setHorariosOcupados([]);
    }, [formData.dataInicio, isEditMode]);

    // Busca ocupação E BLOQUEIOS do mês
    useEffect(() => {
        const fetchOcupacaoDoMes = async () => {
            setLoadingCalendario(true);
            const inicioDoMes = mesVisivel.startOf('month').toISOString();
            const fimDoMes = mesVisivel.endOf('month').toISOString();
            try {
                const { data: aulasData } = await supabase
                    .from('aulas')
                    .select('*')
                    .gte('data_inicio', inicioDoMes)
                    .lte('data_inicio', fimDoMes);

                const { data: eventosData } = await supabase
                    .from('eventos_manutencao')
                    .select('*')
                    .gte('data_inicio', inicioDoMes)
                    .lte('data_inicio', fimDoMes);

                const { data: periodosData } = await supabase
                    .from('periodos_sem_atividade')
                    .select('*')
                    .gte('data_fim', inicioDoMes);

                const periodosList = (periodosData || []).map(p => ({
                    id: p.id,
                    ...p,
                    start: dayjs(p.data_inicio),
                    end: dayjs(p.data_fim)
                }));
                setPeriodosBloqueados(periodosList);

                // Processa bolinhas de ocupação
                const ocupacaoPorDia = {};
                (aulasData || []).forEach(aula => {
                    const dia = dayjs(aula.data_inicio).format('YYYY-MM-DD');
                    if (!ocupacaoPorDia[dia]) ocupacaoPorDia[dia] = new Set();
                    ocupacaoPorDia[dia].add(`${aula.laboratorio}-${aula.horario_slot}`);
                });

                (eventosData || []).forEach(evento => {
                    const dia = dayjs(evento.data_inicio).format('YYYY-MM-DD');
                    if (!ocupacaoPorDia[dia]) ocupacaoPorDia[dia] = new Set();
                    if (evento.laboratorio === 'Todos') {
                        LISTA_LABORATORIOS.forEach(lab => {
                            BLOCOS_HORARIO.forEach(bloco => {
                                ocupacaoPorDia[dia].add(`${lab.name}-${bloco.value}`);
                            });
                        });
                    } else {
                        ocupacaoPorDia[dia].add(`${evento.laboratorio}-${evento.horario_slot}`);
                    }
                });

                const totalSlotsPossiveis = LISTA_LABORATORIOS.length * BLOCOS_HORARIO.length;
                const diasTotalmenteLotados = [];
                const diasComAlgumaOcupacao = [];
                for (const dia in ocupacaoPorDia) {
                    diasComAlgumaOcupacao.push(dia);
                    if (ocupacaoPorDia[dia].size >= totalSlotsPossiveis) diasTotalmenteLotados.push(dia);
                }
                setDiasTotalmenteOcupados(diasTotalmenteLotados);
                setDiasParcialmenteOcupados(diasComAlgumaOcupacao);
            } catch (error) {
                console.error("Erro ao buscar ocupação do mês:", error);
            } finally {
                setLoadingCalendario(false);
            }
        };
        fetchOcupacaoDoMes();
    }, [mesVisivel]);

    useEffect(() => {
        if (!formData.dataInicio) {
            setOcupacaoDoDia({ aulas: [], eventos: [] });
            setHorariosOcupados([]);
            return;
        }

        const labsConsulta = LISTA_LABORATORIOS.map(l => l.name);

        consultarDisponibilidade({
            dataInicio: formData.dataInicio,
            dataFim: formData.dataInicio,
            diasSemana: [dayjs(formData.dataInicio).day()],
            horarios: BLOCOS_HORARIO.map(b => b.value),
            laboratorios: labsConsulta,
        }).then(resultados => {
            const conflitos = resultados[0]?.conflitos ?? [];

            const adaptarConflito = (c) => ({
                ...c,
                dataInicio: typeof formData.dataInicio?.toDate === 'function' ? formData.dataInicio.toDate() : formData.dataInicio,
                horarioSlotString: c.horario,
                laboratorioSelecionado: c.laboratorio,
            });

            const conflitosAulas = conflitos.filter(c => c.tipo === 'aula').map(adaptarConflito);
            const conflitosEventos = conflitos
                .filter(c => c.tipo === 'evento' && c.id !== eventoId)
                .map(adaptarConflito);

            setOcupacaoDoDia({
                aulas: conflitosAulas,
                eventos: conflitosEventos,
            });
            const slotsOcupados = [...new Set([...conflitosAulas, ...conflitosEventos].map(c => c.horario))];
            setHorariosOcupados(slotsOcupados);
            setGradeAberta(true);
        });
    }, [formData.dataInicio, formData.dynamicLabs, eventoId, consultarDisponibilidade]);

    // Função auxiliar para calcular o status do laboratório com base na data e horários selecionados
    const statusLab = (labParam) => {
        if (!formData.dataInicio) return 'indefinido';
        const targetLab = typeof labParam === 'object' ? labParam : LISTA_LABORATORIOS.find(l => l.id === labParam || l.name === labParam);
        const targetName = targetLab?.name || labParam;

        const conflitosDoLab = (ocupacaoDoDia.aulas || []).concat(ocupacaoDoDia.eventos || []).filter(c => {
            return c.laboratorio === targetName || c.laboratorio === 'Todos';
        });

        if (conflitosDoLab.length === 0) return 'livre';

        const horariosOcupadosLab = conflitosDoLab.map(c => c.horario);

        if (formData.horarioSlotString.length === 0) {
            return 'parcial';
        }

        const temConflito = formData.horarioSlotString.some(h => horariosOcupadosLab.includes(h));
        return temConflito ? 'ocupado' : 'livre';
    };

    // Função auxiliar para bloquear o dia
    const isDayBlocked = (day) => {
        return periodosBloqueados.some(p => day.isBetween(p.start, p.end, 'day', '[]'));
    };

    useEffect(() => {
        const loadInitialData = async () => {
            if (eventoId) {
                setIsEditMode(true);
                try {
                    const { data, error } = await supabase
                        .from('eventos_manutencao')
                        .select('*')
                        .eq('id', eventoId)
                        .single();

                    if (data && !error) {
                        let tipoLab = '';
                        if (data.laboratorio !== 'Todos') {
                            const labObj = LISTA_LABORATORIOS.find(l => l.name === data.laboratorio);
                            if (labObj) tipoLab = labObj.tipo;
                        }
                        setFormData({
                            titulo: data.titulo || '', 
                            descricao: data.descricao || '',
                            tipo: data.tipo || EVENT_TYPES[0],
                            dataInicio: safeDayjs(data.data_inicio), 
                            horarioSlotString: Array.isArray(data.horario_slot) ? data.horario_slot : [data.horario_slot],
                            dynamicLabs: [{ tipo: tipoLab, laboratorios: data.laboratorio === 'Todos' ? [] : [data.laboratorio] }]
                        });
                    }
                } catch (error) { console.error("Erro ao carregar:", error); }
            }
        };
        loadInitialData();
    }, [eventoId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleLabTipoChange = (index, tipo) => {
        const newLabs = [...formData.dynamicLabs];
        newLabs[index] = { ...newLabs[index], tipo, laboratorios: [] };
        setFormData(prev => ({ ...prev, dynamicLabs: newLabs }));
    };

    const handleLabSelectionChange = (index, laboratorios) => {
        const newLabs = [...formData.dynamicLabs];
        newLabs[index] = { ...newLabs[index], laboratorios };
        setFormData(prev => ({ ...prev, dynamicLabs: newLabs }));
    };

    const handleAddLabField = () => {
        setFormData(prev => ({ ...prev, dynamicLabs: [...prev.dynamicLabs, { tipo: '', laboratorios: [] }] }));
    };

    const handleRemoveLabField = (index) => {
        const newLabs = formData.dynamicLabs.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, dynamicLabs: newLabs.length ? newLabs : [{ tipo: '', laboratorios: [] }] }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.titulo.trim()) newErrors.titulo = 'Obrigatório';
        if (!formData.dataInicio) newErrors.dataInicio = 'Selecione a data';
        if (formData.horarioSlotString.length === 0) newErrors.horarioSlotString = 'Selecione o horário';
        const labsValidos = formData.dynamicLabs.every(lab => lab.tipo && lab.laboratorios.length > 0);
        if (!labsValidos) newErrors.dynamicLabs = 'Preencha todos os campos de laboratório';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const prepareAndConfirm = async () => {
        if (!validate()) return;
        setLoadingSubmit(true);
        try {
            const eventosParaAgendar = [];
            const dataBase = dayjs(formData.dataInicio);

            for (const slot of formData.horarioSlotString) {
                const [inicioStr, fimStr] = slot.split('-');
                const dataHoraInicio = dataBase.hour(parseInt(inicioStr.split(':')[0])).minute(parseInt(inicioStr.split(':')[1])).second(0).millisecond(0);
                const dataHoraFim = dataBase.hour(parseInt(fimStr.split(':')[0])).minute(parseInt(fimStr.split(':')[1])).second(0).millisecond(0);

                for (const labGroup of formData.dynamicLabs) {
                    for (const labName of labGroup.laboratorios) {
                        eventosParaAgendar.push({
                            titulo: formData.titulo,
                            descricao: formData.descricao,
                            tipo: formData.tipo,
                            laboratorio: labName,
                            dataInicio: dataHoraInicio,
                            dataFim: dataHoraFim,
                            horarioSlotString: slot,
                            criadoPorUid: currentUser?.uid || currentUser?.id || userInfo?.uid || null,
                            criadoPorNome: userInfo?.name || currentUser?.displayName || currentUser?.email || "Usuário"
                        });
                    }
                }
            }

            const conflitosEncontrados = [];
            const todosConflitos = [...ocupacaoDoDia.aulas, ...ocupacaoDoDia.eventos];

            for (const novo of eventosParaAgendar) {
                const conflitosDoItem = todosConflitos.filter(c => 
                    c.horario === novo.horarioSlotString && 
                    (c.laboratorio === novo.laboratorio || c.laboratorio === 'Todos')
                );
                conflitosDoItem.forEach(c => {
                    conflitosEncontrados.push({
                        novo,
                        conflito: {
                            id: c.id,
                            assunto: c.titulo,
                            titulo: c.titulo,
                            tipoConflito: c.tipo === 'aula' ? 'Aula' : 'Evento'
                        }
                    });
                });
            }

            if (conflitosEncontrados.length > 0) {
                setConflitos(conflitosEncontrados);
                setEventosParaConfirmar(eventosParaAgendar);
                setOpenDuplicateDialog(true);
            } else {
                setEventosParaConfirmar(eventosParaAgendar);
                setOpenConfirmModal(true);
            }
        } catch (error) { console.error(error); }
        finally { setLoadingSubmit(false); }
    };

    const handleConflitos = async (substituir) => {
        setOpenDuplicateDialog(false);
        if (substituir) {
            setLoadingSubmit(true);
            try {
                for (const c of conflitos) {
                    const table = c.conflito.tipoConflito === 'Aula' ? 'aulas' : 'eventos_manutencao';
                    await supabase.from(table).delete().eq('id', c.conflito.id);
                }
                setOpenConfirmModal(true);
            } catch (error) { console.error(error); }
            finally { setLoadingSubmit(false); }
        } else {
            setOpenConfirmModal(true);
        }
    };

    const handleConfirmSave = async () => {
        setOpenConfirmModal(false);
        setLoadingSubmit(true);
        try {
            const finalizadas = [];
            if (isEditMode && eventoId) {
                const ev = eventosParaConfirmar[0];
                const finalData = {
                    titulo: ev.titulo,
                    descricao: ev.descricao,
                    tipo: ev.tipo,
                    laboratorio: ev.laboratorio,
                    data_inicio: ev.dataInicio.toISOString(),
                    data_fim: ev.dataFim.toISOString(),
                    horario_slot: ev.horarioSlotString,
                    updated_at: new Date().toISOString()
                };
                const { error: updateErr } = await supabase
                    .from('eventos_manutencao')
                    .update(finalData)
                    .eq('id', eventoId);

                if (updateErr) throw updateErr;
                finalizadas.push({ ...ev, id: eventoId });
            } else {
                for (const ev of eventosParaConfirmar) {
                    const finalData = {
                        titulo: ev.titulo,
                        descricao: ev.descricao,
                        tipo: ev.tipo,
                        laboratorio: ev.laboratorio,
                        data_inicio: ev.dataInicio.toISOString(),
                        data_fim: ev.dataFim.toISOString(),
                        horario_slot: ev.horarioSlotString,
                        criado_por_uid: ev.criadoPorUid,
                        criado_por_nome: ev.criadoPorNome,
                        created_at: new Date().toISOString()
                    };
                    const { data: inserted, error: insertErr } = await supabase
                        .from('eventos_manutencao')
                        .insert([finalData])
                        .select()
                        .single();

                    if (insertErr) throw insertErr;
                    finalizadas.push({ ...ev, id: inserted?.id });
                }
            }

            // Auto-rejeita propostas pendentes atingidas pelos eventos criados
            for (const ev of finalizadas) {
                await autoRejeitarPendentesConflitantes({
                    laboratorioSelecionado: ev.laboratorio,
                    dataInicio: ev.dataInicio,
                    dataFim: ev.dataFim,
                    horarioSlotString: ev.horarioSlotString,
                    assuntoAgendamento: `${ev.tipo}: ${ev.titulo}`,
                });
            }

            // Atualiza ocupação local imediatamente para refletir o novo agendamento como ocupado sem recarregar a tela
            const novosConflitosEventos = finalizadas.map(ev => ({
                id: ev.id,
                tipo: 'evento',
                laboratorio: ev.laboratorio,
                horario: ev.horarioSlotString,
                titulo: ev.titulo,
                detalhe: `${ev.tipo}: ${ev.descricao || ''}`
            }));

            setOcupacaoDoDia(prev => ({
                ...prev,
                eventos: [...prev.eventos, ...novosConflitosEventos]
            }));

            setSnackbarMessage(isEditMode ? 'Evento atualizado!' : 'Evento(s) criado(s) com sucesso!');
            setSnackbarSeverity('success');
            setOpenSnackbar(true);
            if (onSuccess) onSuccess();
            else if (!isEditMode) setOpenKeepDataDialog(true);
        } catch (error) {
            setSnackbarMessage('Erro ao salvar.');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
        } finally {
            setLoadingSubmit(false);
        }
    };

    const handleKeepData = (keep) => {
        setOpenKeepDataDialog(false);
        if (!keep) {
            navigate('/calendario');
        } else {
            // Limpa apenas os horários selecionados, mantendo a data e os laboratórios selecionados para outro agendamento
            setFormData(prev => ({
                ...prev,
                horarioSlotString: []
            }));
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
            <Container maxWidth="md">
                <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4, color: '#3f51b5', fontWeight: 'bold', mt: isModal ? 0 : 4 }}>
                    {formTitle || (isEditMode ? "Editar Evento" : "Propor Novo Evento")}
                </Typography>
                <form onSubmit={(e) => { e.preventDefault(); prepareAndConfirm(); }}>
                    <Grid container spacing={3} justifyContent="center">
                        {/* ── SEÇÃO 1: Detalhes do Evento ── */}
                        <Grid item xs={12} md={6}>
                            <Paper elevation={3} sx={{ p: 3, borderLeft: '5px solid #1976d2', height: '100%' }}>
                                <Typography variant="h6" gutterBottom>1. Detalhes do Evento</Typography>
                                <FormControl sx={{ minWidth: 120, mb: 2 }}>
                                    <InputLabel shrink>Tipo *</InputLabel>
                                    <Select name="tipo" value={formData.tipo} label="Tipo *" onChange={handleChange}>
                                        {EVENT_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <TextField fullWidth label="Título do Evento *" name="titulo" value={formData.titulo} onChange={handleChange} error={!!errors.titulo} helperText={errors.titulo} sx={{ mb: 2 }} />
                                <TextField fullWidth label="Descrição/Observações" name="descricao" value={formData.descricao} onChange={handleChange} multiline rows={3} />
                            </Paper>
                        </Grid>

                        {/* ── SEÇÃO 2: Data e Horário ── */}
                        <Grid item xs={12} md={6}>
                            <Paper elevation={3} sx={{ p: 3, borderLeft: '5px solid #4caf50', height: '100%', opacity: (!secao1Completa && !isEditMode) ? 0.8 : 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>2. Data e Horário</Typography>
                                    {!secao1Completa && !isEditMode && <LockIcon color="warning" />}
                                </Box>
                                {!secao1Completa && !isEditMode && (
                                    <Alert severity="warning" sx={{ mb: 2 }}>
                                        <strong>Seção bloqueada!</strong> Complete a Seção 1 para desbloquear.
                                    </Alert>
                                )}
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={6}>
                                        <DatePicker
                                            label="Data do Evento *"
                                            value={formData.dataInicio}
                                            onChange={(newValue) => {
                                                setFormData(prev => ({ ...prev, dataInicio: newValue }));
                                                if (errors.dataInicio) setErrors(prev => ({ ...prev, dataInicio: null }));
                                            }}
                                            disabled={!secao1Completa && !isEditMode}
                                            shouldDisableDate={isDayBlocked}
                                            slotProps={{
                                                textField: { fullWidth: true, error: !!errors.dataInicio, helperText: errors.dataInicio },
                                                day: {
                                                    sx: (day) => {
                                                        const dateObj = dayjs(day);
                                                        if (!dateObj.isValid()) return {};
                                                        if (isDayBlocked(dateObj)) return { backgroundColor: 'rgba(0, 0, 0, 0.1)', color: '#999', pointerEvents: 'none', borderRadius: '50%' };
                                                        const dateStr = dateObj.format('YYYY-MM-DD');
                                                        if (diasTotalmenteOcupados.includes(dateStr)) return { backgroundColor: 'rgba(244, 67, 54, 0.2)', borderRadius: '50%' };
                                                        if (diasParcialmenteOcupados.includes(dateStr)) return { border: '1px solid #1976d2', borderRadius: '50%' };
                                                        return {};
                                                    }
                                                }
                                            }}
                                            onMonthChange={(newMonth) => setMesVisivel(newMonth)}
                                            loading={loadingCalendario}
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth size="small" error={!!errors.horarioSlotString} disabled={!formData.dataInicio || (!secao1Completa && !isEditMode)} sx={{ minWidth: { xs: '100%', sm: 160 } }}>
                                            <InputLabel shrink notched>{isEditMode ? 'Horário *' : 'Horário(s) *'}</InputLabel>
                                            {isEditMode ? (
                                                <Select
                                                    name="horarioSlotString"
                                                    value={formData.horarioSlotString[0] || ''}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, horarioSlotString: [e.target.value] }))}
                                                    input={<OutlinedInput notched label="Horário *" />}
                                                >
                                                    {BLOCOS_HORARIO.map((bloco) => {
                                                        const isOccupied = infoOcupacao.hasOwnProperty(bloco.value);
                                                        const tituloQueOcupa = infoOcupacao[bloco.value];
                                                        return (
                                                            <MenuItem key={bloco.value} value={bloco.value} disabled={isOccupied} sx={isOccupied ? { opacity: 0.9 } : {}}>
                                                                <Box display="flex" justifyContent="space-between" alignItems="center" width="100%" gap={1}>
                                                                    <Typography variant="body2">{bloco.label}</Typography>
                                                                    {isOccupied && (
                                                                        <Typography variant="caption" color="error" fontWeight="bold">
                                                                            🚫 Ocupado: {tituloQueOcupa}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </MenuItem>
                                                        );
                                                    })}
                                                </Select>
                                            ) : (
                                                <Select
                                                     multiple
                                                     name="horarioSlotString"
                                                     value={formData.horarioSlotString}
                                                     onChange={handleChange}
                                                     input={<OutlinedInput notched label="Horário(s) *" />}
                                                     renderValue={(selected) => {
                                                         if (!selected || selected.length === 0) return <span style={{ opacity: 0.7 }}>Selecione o(s) horário(s)</span>;
                                                         return (
                                                             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                 {selected.map((value) => (
                                                                     <Chip key={value} label={BLOCOS_HORARIO.find(b => b.value === value)?.label || value} size="small" color="primary" />
                                                                 ))}
                                                             </Box>
                                                         );
                                                     }}
                                                 >
                                                    {BLOCOS_HORARIO.map((bloco) => {
                                                        const isOccupied = infoOcupacao.hasOwnProperty(bloco.value);
                                                        const tituloQueOcupa = infoOcupacao[bloco.value];
                                                        return (
                                                            <MenuItem key={bloco.value} value={bloco.value} disabled={isOccupied} sx={isOccupied ? { opacity: 0.9 } : {}}>
                                                                <Box display="flex" justifyContent="space-between" alignItems="center" width="100%" gap={1}>
                                                                    <Typography variant="body2">{bloco.label}</Typography>
                                                                    {isOccupied && (
                                                                        <Typography variant="caption" color="error" fontWeight="bold">
                                                                            🚫 Ocupado: {tituloQueOcupa}
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </MenuItem>
                                                        );
                                                    })}
                                                </Select>
                                            )}
                                            {errors.horarioSlotString && <FormHelperText error>{errors.horarioSlotString}</FormHelperText>}
                                            {verificandoDisp && <CircularProgress size={20} sx={{ mt: 1 }} />}
                                        </FormControl>
                                    </Grid>
                                </Grid>

                                {/* Resumo de Ocupação do Dia */}
                                {formData.dataInicio && dayjs(formData.dataInicio).isValid() && (
                                    <Alert
                                        severity={
                                            (ocupacaoDoDia.aulas.length + ocupacaoDoDia.eventos.length) === 0
                                                ? 'success'
                                                : horariosOcupados.length >= BLOCOS_HORARIO.length
                                                ? 'error'
                                                : 'warning'
                                        }
                                        sx={{ mt: 2 }}
                                    >
                                        {(ocupacaoDoDia.aulas.length + ocupacaoDoDia.eventos.length) === 0
                                            ? `✅ Nenhuma ocupação encontrada em ${formData.dataInicio.format('DD/MM/YYYY')} para os laboratórios selecionados.`
                                            : `⚠️ ${horariosOcupados.length} bloco(s) ocupado(s) em ${formData.dataInicio.format('DD/MM/YYYY')}. Consulte a grade abaixo.`
                                        }
                                    </Alert>
                                )}

                                {/* Grade de Disponibilidade Informativa / Auxiliar */}
                                {formData.dataInicio && dayjs(formData.dataInicio).isValid() && (
                                    <Accordion sx={{ mt: 3 }} expanded={gradeAberta} onChange={() => setGradeAberta(!gradeAberta)}>
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            <Typography variant="subtitle2" color="primary" fontWeight="bold">
                                                📊 Consulta de Grade de Disponibilidade ({dayjs(formData.dataInicio).format('DD/MM/YYYY')})
                                            </Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            {verificandoDisp ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                                                    <CircularProgress size={20} />
                                                    <Typography variant="body2" color="text.secondary">Carregando disponibilidades...</Typography>
                                                </Box>
                                            ) : (
                                                <GradeDisponibilidade
                                                    aulas={ocupacaoDoDia.aulas}
                                                    eventos={ocupacaoDoDia.eventos}
                                                    dataFoco={formData.dataInicio?.format('YYYY-MM-DD')}
                                                    tiposLab={formData.dynamicLabs.map(l => l.tipo).filter(Boolean)}
                                                    horariosDestacados={formData.horarioSlotString}
                                                    onCelulaClick={({ horario, ocupado }) => {
                                                        if (ocupado) return;
                                                        setFormData(prev => {
                                                            const jaTem = prev.horarioSlotString.includes(horario);
                                                            return {
                                                                ...prev,
                                                                horarioSlotString: jaTem
                                                                    ? prev.horarioSlotString.filter(h => h !== horario)
                                                                    : [...prev.horarioSlotString, horario],
                                                            };
                                                        });
                                                    }}
                                                />
                                            )}
                                        </AccordionDetails>
                                    </Accordion>
                                )}
                            </Paper>
                        </Grid>

                        {/* ── SEÇÃO 3: Seleção Múltipla de Laboratórios ── */}
                        <Grid item xs={12}>
                            <Paper elevation={3} sx={{ p: 3, borderLeft: '5px solid #ff9800', opacity: (!secaoDataCompleta && !isEditMode) ? 0.8 : 1 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>3. Laboratório(s)</Typography>
                                        {!secaoDataCompleta && !isEditMode && <LockIcon color="warning" />}
                                    </Box>
                                    <Tooltip title="Adicionar outro tipo de laboratório">
                                        <span>
                                            <IconButton onClick={handleAddLabField} color="primary" disabled={formData.dynamicLabs.length >= 5 || (!secaoDataCompleta && !isEditMode)}>
                                                <AddIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </Box>
                                {!secaoDataCompleta && !isEditMode && (
                                    <Alert severity="warning" sx={{ mb: 2, mt: 1 }}>
                                        <strong>Seção bloqueada!</strong> Selecione uma data na Seção 2 para desbloquear a escolha de laboratórios.
                                    </Alert>
                                )}
                                {formData.dynamicLabs.map((labSelection, index) => {
                                    if (!labSelection) return null;
                                    return (
                                        <Grid container spacing={1} key={index} sx={{ mt: index > 0 ? 1 : 0, alignItems: 'center' }}>
                                            <Grid item xs={5}>
                                                <FormControl sx={{ minWidth: 120 }} size="small" fullWidth disabled={!secaoDataCompleta && !isEditMode}>
                                                    <InputLabel shrink notched>Tipo *</InputLabel>
                                                    <Select value={labSelection.tipo || ''} onChange={(e) => handleLabTipoChange(index, e.target.value)} input={<OutlinedInput notched label="Tipo *" />}>
                                                        {TIPOS_LABORATORIO.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <FormControl sx={{ minWidth: 160 }} size="small" fullWidth disabled={!labSelection.tipo || (!secaoDataCompleta && !isEditMode)}>
                                                    <InputLabel shrink notched>Laboratório(s) *</InputLabel>
                                                    <Select
                                                        multiple
                                                        value={labSelection.laboratorios || []}
                                                        onChange={(e) => handleLabSelectionChange(index, e.target.value)}
                                                        input={<OutlinedInput notched label="Laboratório(s) *" />}
                                                        renderValue={(selected) => (
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                {selected.map((value) => <Chip key={value} label={value} size="small" />)}
                                                            </Box>
                                                        )}
                                                    >
                                                        {LISTA_LABORATORIOS.filter(l => l.tipo === labSelection.tipo).map(l => {
                                                            const st = statusLab(l.name);
                                                            const isBlocked = st === 'ocupado';
                                                            const chipInfo = {
                                                                livre:     { label: 'Livre',    color: 'success' },
                                                                parcial:   { label: 'Parcial',  color: 'warning' },
                                                                ocupado:   { label: 'Ocupado',  color: 'error'   },
                                                                indefinido:{ label: '—',        color: 'default'  },
                                                            }[st];
                                                            return (
                                                                <MenuItem key={l.id} value={l.name} disabled={isBlocked}>
                                                                    <Box display="flex" justifyContent="space-between" alignItems="center" width="100%" gap={1}>
                                                                        <Typography variant="body2" color={isBlocked ? 'text.disabled' : 'text.primary'}>{l.name}</Typography>
                                                                        <Chip label={chipInfo.label} color={chipInfo.color} size="small" variant={st === 'livre' ? 'filled' : 'outlined'} sx={{ fontSize: '0.65rem', minWidth: 62 }} />
                                                                    </Box>
                                                                </MenuItem>
                                                            );
                                                        })}
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                            <Grid item xs={1}>
                                                <IconButton size="small" onClick={() => handleRemoveLabField(index)} disabled={formData.dynamicLabs.length === 1 || (!secaoDataCompleta && !isEditMode)}><DeleteIcon fontSize="small" /></IconButton>
                                            </Grid>
                                        </Grid>
                                    );
                                })}
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2, mb: 4 }}>
                            <Button variant="outlined" startIcon={<ArrowBack />} onClick={onCancel || (() => navigate('/calendario'))}>Voltar</Button>
                            <Button type="submit" variant="contained" color="primary" size="large" disabled={loadingSubmit}>{loadingSubmit ? <CircularProgress size={24} /> : (isEditMode ? "Salvar Alterações" : "Agendar Evento")}</Button>
                        </Grid>
                    </Grid>
                </form>
                <DialogConfirmacao open={openConfirmModal} onClose={() => setOpenConfirmModal(false)} onConfirm={handleConfirmSave} title="Confirmar Agendamento" message={`Deseja confirmar o agendamento de ${eventosParaConfirmar.length} evento(s)?`} loading={loadingSubmit} />
                <Dialog open={openDuplicateDialog} onClose={() => setOpenDuplicateDialog(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Conflito de Horário</DialogTitle>
                    <DialogContent>
                        <Typography>Alguns horários selecionados já possuem agendamentos. O que deseja fazer?</Typography>
                        <List>{conflitos.map((c, i) => <ListItem key={i} divider><ListItemText primary={`Conflito em ${c.novo.laboratorio} às ${c.novo.horarioSlotString}`} secondary={`Existente: ${c.conflito.assunto || c.conflito.titulo}`} /></ListItem>)}</List>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDuplicateDialog(false)}>Cancelar</Button>
                        <Button onClick={() => handleConflitos(false)} color="primary">Ignorar Conflitos</Button>
                        <Button onClick={() => handleConflitos(true)} color="error" variant="contained">Substituir Existentes</Button>
                    </DialogActions>
                </Dialog>
                <Dialog open={openKeepDataDialog} onClose={() => handleKeepData(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>Agendamento Realizado!</DialogTitle>
                    <DialogContent>
                        <Typography>Deseja manter os dados do formulário para realizar outro agendamento similar?</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => handleKeepData(false)}>Não, ir para o calendário</Button>
                        <Button onClick={() => handleKeepData(true)} variant="contained" color="primary">Sim, manter dados</Button>
                    </DialogActions>
                </Dialog>
                <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={() => setOpenSnackbar(false)}><Alert onClose={() => setOpenSnackbar(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>{snackbarMessage}</Alert></Snackbar>
            </Container>
        </LocalizationProvider>
    );
}

ProporEventoForm.propTypes = { userInfo: PropTypes.object, currentUser: PropTypes.object, initialDate: PropTypes.object, onSuccess: PropTypes.func, onCancel: PropTypes.func, isModal: PropTypes.bool, formTitle: PropTypes.string, eventoId: PropTypes.string };
export default ProporEventoForm;