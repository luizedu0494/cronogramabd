import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../supabaseConfig';
import {
    Container, Typography, Box, Paper, CircularProgress, Alert,
    List, ListItem, ListItemText, ListItemSecondaryAction, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid,
    TextField, MenuItem, Select, FormControl, InputLabel, Snackbar, Chip,
    Autocomplete, ToggleButtonGroup, ToggleButton, FormControlLabel, Switch,
    Card, CardContent, Divider, Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BlockIcon from '@mui/icons-material/Block';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { getHolidays } from '../../utils/holiday-api';
import { HolidayIcon } from '../../utils/custom-icons';
import { LISTA_LABORATORIOS } from '../../constants/laboratorios';

function GerenciarPeriodos() {
    const [periodos, setPeriodos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPeriodoDesc, setNewPeriodoDesc] = useState('');
    const [newPeriodoStart, setNewPeriodoStart] = useState(null);
    const [newPeriodoEnd, setNewPeriodoEnd] = useState(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [periodoToDelete, setPeriodoToDelete] = useState(null);
    const [importLoading, setImportLoading] = useState(false);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'info' });

    // ── Estados do Localizador de Datas Livres para Manutenção / Períodos ──
    const [buscaDataInicio, setBuscaDataInicio] = useState(dayjs());
    const [buscaDiasQtd, setBuscaDiasQtd] = useState(15);
    const [todosLabs, setTodosLabs] = useState(true);
    const [labsSelecionados, setLabsSelecionados] = useState([]);
    const [carregandoBusca, setCarregandoBusca] = useState(false);
    const [resultadosBusca, setResultadosBusca] = useState(null);
    const [filtroResultado, setFiltroResultado] = useState('todos'); // 'todos', 'livres', 'parciais'
    const formManualRef = useRef(null);

    useEffect(() => {
        const fetchPeriodos = async () => {
            setLoading(true);
            try {
                const limitDate = dayjs().subtract(1, 'year').toISOString();
                const { data, error } = await supabase
                    .from('periodos_sem_atividade')
                    .select('*')
                    .gte('data_fim', limitDate)
                    .order('data_inicio', { ascending: true });

                if (error) throw error;

                const periodosList = (data || []).map(p => ({
                    ...p,
                    dataInicio: dayjs(p.data_inicio),
                    dataFim: dayjs(p.data_fim),
                }));
                setPeriodos(periodosList);
            } catch (err) {
                console.error("Erro ao buscar períodos inativos:", err);
                setError("Não foi possível carregar os períodos. Tente novamente.");
            } finally {
                setLoading(false);
            }
        };
        fetchPeriodos();
    }, []);

    // ── Executar Busca de Janelas Livres de Aulas ──
    const handleBuscarJanelasLivres = async () => {
        if (!buscaDataInicio || !buscaDataInicio.isValid()) {
            setFeedback({ open: true, message: "Selecione uma data inicial válida para a busca.", severity: 'warning' });
            return;
        }

        setCarregandoBusca(true);
        try {
            const dtInicio = buscaDataInicio.startOf('day');
            const dtFim = dtInicio.add(buscaDiasQtd, 'day').endOf('day');

            // 1. Buscar Aulas no intervalo
            const { data: aulasData, error: aulasErr } = await supabase
                .from('aulas')
                .select('id, data_inicio, data_fim, laboratorio, horario_slot, status, assunto')
                .gte('data_inicio', dtInicio.toISOString())
                .lte('data_inicio', dtFim.toISOString())
                .neq('status', 'rejeitada');

            if (aulasErr) throw aulasErr;

            // 2. Buscar Eventos no intervalo
            const { data: eventosData, error: eventosErr } = await supabase
                .from('eventos_manutencao')
                .select('id, data_inicio, data_fim, laboratorio, horario_slot, status, titulo')
                .gte('data_inicio', dtInicio.toISOString())
                .lte('data_inicio', dtFim.toISOString())
                .neq('status', 'cancelado');

            if (eventosErr) throw eventosErr;

            // Labs a analisar
            const labsAlvo = todosLabs
                ? LISTA_LABORATORIOS.map(l => l.name)
                : (labsSelecionados.length > 0 ? labsSelecionados.map(l => l.name || l) : LISTA_LABORATORIOS.map(l => l.name));

            const diasAnalisados = [];

            for (let i = 0; i < buscaDiasQtd; i++) {
                const diaAtual = dtInicio.add(i, 'day');
                const diaIso = diaAtual.format('YYYY-MM-DD');

                // Checa se já é período inativo
                const periodoExistente = periodos.find(p => {
                    const pStart = dayjs(p.data_inicio).startOf('day');
                    const pEnd = dayjs(p.data_fim).endOf('day');
                    return diaAtual.isBetween(pStart, pEnd, 'day', '[]');
                });

                // Filtra aulas e eventos do dia nos labs selecionados
                const aulasDoDia = (aulasData || []).filter(a => {
                    const dt = dayjs(a.data_inicio).format('YYYY-MM-DD');
                    const labMatch = labsAlvo.includes(a.laboratorio) || a.laboratorio === 'Todos';
                    return dt === diaIso && labMatch;
                });

                const eventosDoDia = (eventosData || []).filter(e => {
                    const dt = dayjs(e.data_inicio).format('YYYY-MM-DD');
                    const labMatch = labsAlvo.includes(e.laboratorio) || e.laboratorio === 'Todos';
                    return dt === diaIso && labMatch;
                });

                const itensConflitantes = [...aulasDoDia, ...eventosDoDia];

                // Turnos: Manhã (07:00 - 12:00), Tarde (13:00 - 18:00), Noite (18:30 - 22:00)
                const temManha = itensConflitantes.some(item => {
                    const slot = item.horario_slot || '';
                    const h = dayjs(item.data_inicio).hour();
                    return slot.includes('07:00') || slot.includes('09:30') || (h >= 7 && h < 12);
                });

                const temTarde = itensConflitantes.some(item => {
                    const slot = item.horario_slot || '';
                    const h = dayjs(item.data_inicio).hour();
                    return slot.includes('13:00') || slot.includes('15:30') || (h >= 12 && h < 18);
                });

                const temNoite = itensConflitantes.some(item => {
                    const slot = item.horario_slot || '';
                    const h = dayjs(item.data_inicio).hour();
                    return slot.includes('18:30') || slot.includes('20:30') || (h >= 18);
                });

                const totalTurnosLivres = (!temManha ? 1 : 0) + (!temTarde ? 1 : 0) + (!temNoite ? 1 : 0);
                const is100Livre = !periodoExistente && itensConflitantes.length === 0;
                const isParcialLivre = !periodoExistente && !is100Livre && totalTurnosLivres > 0;

                diasAnalisados.push({
                    data: diaAtual,
                    dataIso: diaIso,
                    diaIso,
                    diaSemana: diaAtual.format('dddd'),
                    dataFormatada: diaAtual.format('DD/MM/YYYY'),
                    periodoExistente,
                    totalItens: itensConflitantes.length,
                    is100Livre,
                    isParcialLivre,
                    totalTurnosLivres,
                    manhaLivre: !temManha,
                    tardeLivre: !temTarde,
                    noiteLivre: !temNoite,
                    labsAlvoQtd: labsAlvo.length
                });
            }

            setResultadosBusca(diasAnalisados);
        } catch (err) {
            console.error("Erro na busca de datas livres:", err);
            setFeedback({ open: true, message: "Erro ao consultar disponibilidade das datas.", severity: 'error' });
        } finally {
            setCarregandoBusca(false);
        }
    };

    // ── Aplicar data livre encontrada direto no formulário manual ──
    const handleAplicarDataNoFormulario = (itemData) => {
        setNewPeriodoStart(itemData.data);
        setNewPeriodoEnd(itemData.data);
        if (!newPeriodoDesc.trim()) {
            setNewPeriodoDesc('Manutenção Geral / Período sem Atividades');
        }
        setFeedback({ 
            open: true, 
            message: `Data ${itemData.dataFormatada} preenchida no formulário manual abaixo!`, 
            severity: 'success' 
        });

        // Scroll suave até o formulário de cadastro
        if (formManualRef.current) {
            formManualRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleAddPeriodo = async () => {
        if (!newPeriodoDesc || !newPeriodoStart || !newPeriodoEnd) {
            setFeedback({ open: true, message: "Preencha todos os campos do período.", severity: 'warning' });
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.from('periodos_sem_atividade').insert([{
                descricao: newPeriodoDesc,
                data_inicio: newPeriodoStart.toISOString(),
                data_fim: newPeriodoEnd.toISOString(),
                tipo: 'manual'
            }]);

            if (error) throw error;

            setNewPeriodoDesc('');
            setNewPeriodoStart(null);
            setNewPeriodoEnd(null);
            setError(null);
            setFeedback({ open: true, message: "Período adicionado com sucesso!", severity: 'success' });
            
            // Recarrega lista de períodos
            const limitDate = dayjs().subtract(1, 'year').toISOString();
            const { data } = await supabase
                .from('periodos_sem_atividade')
                .select('*')
                .gte('data_fim', limitDate)
                .order('data_inicio', { ascending: true });

            if (data) {
                setPeriodos(data.map(p => ({
                    ...p,
                    dataInicio: dayjs(p.data_inicio),
                    dataFim: dayjs(p.data_fim),
                })));
            }
        } catch (err) {
            console.error("Erro ao adicionar período:", err);
            setFeedback({ open: true, message: "Erro ao adicionar período. Tente novamente.", severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePeriodo = async () => {
        if (!periodoToDelete) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('periodos_sem_atividade')
                .delete()
                .eq('id', periodoToDelete.id);

            if (error) throw error;

            setPeriodos(periodos.filter(p => p.id !== periodoToDelete.id));
            setFeedback({ open: true, message: "Período excluído com sucesso!", severity: 'success' });
        } catch (err) {
            console.error("Erro ao excluir período:", err);
            setFeedback({ open: true, message: "Erro ao excluir período. Tente novamente.", severity: 'error' });
        } finally {
            setLoading(false);
            setOpenDeleteDialog(false);
            setPeriodoToDelete(null);
        }
    };

    const handleOpenDeleteDialog = (periodo) => {
        setPeriodoToDelete(periodo);
        setOpenDeleteDialog(true);
    };

    const handleImportHolidays = async () => {
        setImportLoading(true);
        setError(null);
        try {
            const currentYear = dayjs().year();
            const holidays = await getHolidays(currentYear, 'AL', 'Maceió');
            
            if (holidays.length > 0) {
                const existingDates = periodos.map(p => dayjs(p.data_inicio).format('YYYY-MM-DD'));
                let newHolidaysCount = 0;
                
                for (const holiday of holidays) {
                    const holidayDate = dayjs(holiday.date);
                    if (!existingDates.includes(holidayDate.format('YYYY-MM-DD'))) {
                        await supabase.from('periodos_sem_atividade').insert([{
                            descricao: holiday.name,
                            data_inicio: holidayDate.startOf('day').toISOString(),
                            data_fim: holidayDate.endOf('day').toISOString(),
                            tipo: holiday.type,
                            fonte: holiday.source || ''
                        }]);
                        newHolidaysCount++;
                    }
                }
                
                setFeedback({ open: true, message: `Importação concluída. ${newHolidaysCount} feriados adicionados.`, severity: 'success' });
            } else {
                setFeedback({ open: true, message: "Nenhum feriado encontrado para importar.", severity: 'warning' });
            }
        } catch (err) {
            console.error("Erro ao importar feriados:", err);
            setFeedback({ open: true, message: "Erro ao importar feriados. Verifique a API ou tente novamente.", severity: 'error' });
        } finally {
            setImportLoading(false);
        }
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setFeedback(prev => ({ ...prev, open: false }));
    };

    // Filtro dos resultados da busca
    const listaResultadosFiltrada = useMemo(() => {
        if (!resultadosBusca) return [];
        if (filtroResultado === 'livres') return resultadosBusca.filter(r => r.is100Livre);
        if (filtroResultado === 'parciais') return resultadosBusca.filter(r => r.isParcialLivre);
        return resultadosBusca;
    }, [resultadosBusca, filtroResultado]);

    const statsBusca = useMemo(() => {
        if (!resultadosBusca) return { livres: 0, parciais: 0, total: 0 };
        return {
            livres: resultadosBusca.filter(r => r.is100Livre).length,
            parciais: resultadosBusca.filter(r => r.isParcialLivre).length,
            total: resultadosBusca.length
        };
    }, [resultadosBusca]);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
                <Typography variant="h5" component="h1" gutterBottom align="center" fontWeight={700}>
                    Gerenciar Períodos Inativos & Manutenções
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                    Cadastre feriados, recessos acadêmicos e encontre datas sem aulas para manutenções preventivas gerais.
                </Typography>

                {/* ── CARD 1: LOCALIZADOR DE DATAS LIVRES PARA MANUTENÇÃO / PERÍODOS ── */}
                <Paper 
                    elevation={4} 
                    sx={{ 
                        p: { xs: 2.5, md: 3.5 }, 
                        mb: 4, 
                        borderRadius: 3, 
                        border: '2px solid #1976d2',
                        background: 'linear-gradient(180deg, rgba(25, 118, 210, 0.03) 0%, rgba(255, 255, 255, 1) 100%)'
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'primary.main', color: '#fff', display: 'flex' }}>
                            <SearchIcon fontSize="medium" />
                        </Box>
                        <Box>
                            <Typography variant="h6" fontWeight={700} color="primary.main">
                                Localizador de Janelas Livres para Manutenção
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Procura dias e turnos sem aulas agendadas para facilitar o bloqueio de manutenção ou recesso geral.
                            </Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2.5} alignItems="center">
                        <Grid item xs={12} sm={4}>
                            <DesktopDatePicker
                                label="Data Inicial de Busca"
                                value={buscaDataInicio}
                                onChange={setBuscaDataInicio}
                                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Intervalo de Busca</InputLabel>
                                <Select
                                    value={buscaDiasQtd}
                                    label="Intervalo de Busca"
                                    onChange={(e) => setBuscaDiasQtd(Number(e.target.value))}
                                >
                                    <MenuItem value={7}>Próximos 7 dias (1 semana)</MenuItem>
                                    <MenuItem value={15}>Próximos 15 dias (2 semanas)</MenuItem>
                                    <MenuItem value={30}>Próximos 30 dias (1 mês)</MenuItem>
                                    <MenuItem value={60}>Próximos 60 dias (2 meses)</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={handleBuscarJanelasLivres}
                                disabled={carregandoBusca}
                                startIcon={carregandoBusca ? <CircularProgress size={20} color="inherit" /> : <EventAvailableIcon />}
                                sx={{ height: 40, fontWeight: 700, borderRadius: 2 }}
                            >
                                {carregandoBusca ? "Analisando..." : "Buscar Datas Livres"}
                            </Button>
                        </Grid>

                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={todosLabs}
                                            onChange={(e) => setTodosLabs(e.target.checked)}
                                            color="primary"
                                        />
                                    }
                                    label={
                                        <Typography variant="body2" fontWeight={600}>
                                            Analisar Todos os Laboratórios ({LISTA_LABORATORIOS.length} labs)
                                        </Typography>
                                    }
                                />
                                {!todosLabs && (
                                    <Box sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: 260 }}>
                                        <Autocomplete
                                            multiple
                                            size="small"
                                            options={LISTA_LABORATORIOS}
                                            getOptionLabel={(option) => option.name}
                                            value={labsSelecionados}
                                            onChange={(_, val) => setLabsSelecionados(val)}
                                            renderInput={(params) => (
                                                <TextField {...params} placeholder="Selecione laboratórios..." />
                                            )}
                                        />
                                    </Box>
                                )}
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Exibição dos Resultados da Busca */}
                    {resultadosBusca && (
                        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                            {/* Barra de estatísticas e filtros rápidos */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Chip 
                                        icon={<CheckCircleIcon />} 
                                        label={`${statsBusca.livres} dias 100% livres`} 
                                        color="success" 
                                        size="small" 
                                        sx={{ fontWeight: 700 }}
                                    />
                                    <Chip 
                                        icon={<WarningAmberIcon />} 
                                        label={`${statsBusca.parciais} dias com turnos livres`} 
                                        color="warning" 
                                        size="small" 
                                        sx={{ fontWeight: 700 }}
                                    />
                                </Box>

                                <ToggleButtonGroup
                                    value={filtroResultado}
                                    exclusive
                                    onChange={(_, val) => val && setFiltroResultado(val)}
                                    size="small"
                                >
                                    <ToggleButton value="todos" sx={{ px: 1.5, py: 0.3, fontSize: '0.75rem' }}>Todos ({statsBusca.total})</ToggleButton>
                                    <ToggleButton value="livres" sx={{ px: 1.5, py: 0.3, fontSize: '0.75rem' }}>100% Livres ({statsBusca.livres})</ToggleButton>
                                    <ToggleButton value="parciais" sx={{ px: 1.5, py: 0.3, fontSize: '0.75rem' }}>Turnos Parciais ({statsBusca.parciais})</ToggleButton>
                                </ToggleButtonGroup>
                            </Box>

                            {listaResultadosFiltrada.length === 0 ? (
                                <Alert severity="info" sx={{ borderRadius: 2 }}>
                                    Nenhum dia encontrado com os critérios selecionados neste período. Tente ampliar o intervalo de busca.
                                </Alert>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2, maxHeight: 380, overflowY: 'auto', pr: 0.5 }}>
                                    {listaResultadosFiltrada.map((item) => {
                                        return (
                                            <Paper
                                                key={item.dataIso}
                                                variant="outlined"
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    flexWrap: 'wrap',
                                                    gap: 1.5,
                                                    bgcolor: item.periodoExistente 
                                                        ? 'rgba(0,0,0,0.03)' 
                                                        : item.is100Livre 
                                                            ? 'rgba(76, 175, 80, 0.08)' 
                                                            : item.isParcialLivre 
                                                                ? 'rgba(255, 152, 0, 0.08)' 
                                                                : 'background.paper',
                                                    borderColor: item.is100Livre 
                                                        ? 'success.light' 
                                                        : item.isParcialLivre 
                                                            ? 'warning.light' 
                                                            : 'divider'
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Box sx={{ textAlign: 'center', minWidth: 80, bgcolor: 'background.paper', p: 0.5, borderRadius: 1.5, border: '1px solid divider' }}>
                                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
                                                            {item.diaSemana.slice(0, 3)}
                                                        </Typography>
                                                        <Typography variant="subtitle2" fontWeight={700}>
                                                            {item.dataFormatada.slice(0, 5)}
                                                        </Typography>
                                                    </Box>

                                                    <Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                            <Typography variant="body2" fontWeight={700}>
                                                                {item.dataFormatada} — {item.diaSemana}
                                                            </Typography>
                                                            {item.periodoExistente ? (
                                                                <Chip 
                                                                    label={`Já bloqueado: ${item.periodoExistente.descricao}`} 
                                                                    size="small" 
                                                                    color="default" 
                                                                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                                                                />
                                                            ) : item.is100Livre ? (
                                                                <Chip 
                                                                    label="🌟 100% Livre (Sem Aulas)" 
                                                                    size="small" 
                                                                    color="success" 
                                                                    sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                                                                />
                                                            ) : (
                                                                <Chip 
                                                                    label={`${item.totalItens} aula(s) agendada(s)`} 
                                                                    size="small" 
                                                                    color="warning" 
                                                                    sx={{ height: 20, fontSize: '0.68rem' }}
                                                                />
                                                            )}
                                                        </Box>

                                                        {/* Status dos Turnos */}
                                                        <Box sx={{ display: 'flex', gap: 0.6, mt: 0.5 }}>
                                                            <Chip 
                                                                label={item.manhaLivre ? "Manhã: Livre" : "Manhã: Ocupada"} 
                                                                size="small" 
                                                                color={item.manhaLivre ? "success" : "default"} 
                                                                variant={item.manhaLivre ? "filled" : "outlined"}
                                                                sx={{ height: 18, fontSize: '0.62rem' }}
                                                            />
                                                            <Chip 
                                                                label={item.tardeLivre ? "Tarde: Livre" : "Tarde: Ocupada"} 
                                                                size="small" 
                                                                color={item.tardeLivre ? "success" : "default"} 
                                                                variant={item.tardeLivre ? "filled" : "outlined"}
                                                                sx={{ height: 18, fontSize: '0.62rem' }}
                                                            />
                                                            <Chip 
                                                                label={item.noiteLivre ? "Noite: Livre" : "Noite: Ocupada"} 
                                                                size="small" 
                                                                color={item.noiteLivre ? "success" : "default"} 
                                                                variant={item.noiteLivre ? "filled" : "outlined"}
                                                                sx={{ height: 18, fontSize: '0.62rem' }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </Box>

                                                {!item.periodoExistente && (
                                                    <Button
                                                        size="small"
                                                        variant={item.is100Livre ? "contained" : "outlined"}
                                                        color={item.is100Livre ? "primary" : "inherit"}
                                                        startIcon={<BuildIcon sx={{ fontSize: '0.9rem !important' }} />}
                                                        onClick={() => handleAplicarDataNoFormulario(item)}
                                                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderRadius: 1.5 }}
                                                    >
                                                        Preencher no Formulário
                                                    </Button>
                                                )}
                                            </Paper>
                                        );
                                    })}
                                </Box>
                            )}
                        </Box>
                    )}
                </Paper>

                {/* ── CARD 2: ADICIONAR PERÍODO MANUALMENTE ── */}
                <Paper 
                    ref={formManualRef} 
                    id="form-adicionar-periodo" 
                    elevation={3} 
                    sx={{ p: { xs: 2, md: 4 }, mt: 3, borderLeft: '5px solid #2196f3', borderRadius: 2 }}
                >
                    <Typography variant="h6" gutterBottom fontWeight={700}>Adicionar Período Manualmente</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                        Defina um nome e o intervalo de datas para bloquear todos os agendamentos durante esse período.
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField 
                                fullWidth 
                                label="Descrição do Período (ex.: Reforma Elétrica / Recesso)" 
                                value={newPeriodoDesc} 
                                onChange={(e) => setNewPeriodoDesc(e.target.value)} 
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <DesktopDatePicker 
                                label="Data Início" 
                                value={newPeriodoStart} 
                                onChange={setNewPeriodoStart} 
                                slotProps={{ textField: { fullWidth: true } }} 
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <DesktopDatePicker 
                                label="Data Fim" 
                                value={newPeriodoEnd} 
                                onChange={setNewPeriodoEnd} 
                                slotProps={{ textField: { fullWidth: true } }} 
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Button 
                                variant="contained" 
                                onClick={handleAddPeriodo} 
                                disabled={loading} 
                                fullWidth
                                sx={{ py: 1.2, fontWeight: 700 }}
                            >
                                {loading ? <CircularProgress size={24} /> : "Adicionar Período"}
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>

                {/* ── CARD 3: IMPORTAR FERIADOS ── */}
                <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, mt: 3, borderLeft: '5px solid #d32f2f', borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom fontWeight={700}>Importar Feriados Automáticos</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Importa a lista oficial de feriados nacionais e municipais de Maceió/AL para o ano corrente.
                    </Typography>
                    <Button 
                        variant="contained" 
                        onClick={handleImportHolidays} 
                        disabled={importLoading} 
                        fullWidth 
                        startIcon={importLoading ? <CircularProgress size={24} color="inherit" /> : <FileDownloadIcon />}
                        sx={{ py: 1.2, fontWeight: 700, bgcolor: '#d32f2f', '&:hover': { bgcolor: '#b71c1c' } }}
                    >
                        {importLoading ? "Importando..." : "Importar Feriados de Maceió"}
                    </Button>
                </Paper>

                {/* ── CARD 4: LISTA DE PERÍODOS EXISTENTES ── */}
                <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, mt: 3, borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom fontWeight={700}>Períodos Inativos Existentes</Typography>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}><CircularProgress /></Box>
                    ) : error ? (
                        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
                    ) : periodos.length === 0 ? (
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>Nenhum período inativo adicionado.</Typography>
                    ) : (
                        <List dense>
                            {periodos.map(p => (
                                <ListItem key={p.id} sx={{ pr: 12 }}>
                                    <ListItemText
                                        primary={p.descricao}
                                        secondary={`${dayjs(p.dataInicio.toDate()).format('DD/MM/YYYY')} a ${dayjs(p.dataFim.toDate()).format('DD/MM/YYYY')}`}
                                    />
                                    <Chip label={p.tipo || 'Manual'} size="small" icon={<HolidayIcon type={p.tipo} />} sx={{ position: 'absolute', right: 50 }} />
                                    <ListItemSecondaryAction>
                                        <IconButton edge="end" onClick={() => handleOpenDeleteDialog(p)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Paper>

                <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                    <DialogTitle>Confirmar Exclusão</DialogTitle>
                    <DialogContent><Typography>Tem certeza que deseja excluir o período "{periodoToDelete?.descricao}"?</Typography></DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDeleteDialog(false)}>Cancelar</Button>
                        <Button onClick={handleDeletePeriodo} color="error" autoFocus>Excluir</Button>
                    </DialogActions>
                </Dialog>

                <Snackbar 
                    open={feedback.open} 
                    autoHideDuration={6000} 
                    onClose={handleCloseSnackbar} 
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    {feedback.open && (
                        <Alert onClose={handleCloseSnackbar} severity={feedback.severity} sx={{ width: '100%' }}>
                            {feedback.message}
                        </Alert>
                    )}
                </Snackbar>
            </Container>
        </LocalizationProvider>
    );
}

export default GerenciarPeriodos;