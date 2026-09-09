import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Container, Typography, Box, Paper, Grid, CircularProgress, Button,
    Snackbar, Alert, FormControl, InputLabel, Select, MenuItem, Tooltip,
    Divider, Card, CardContent, CardActions, Chip, Tabs, Tab, Badge,
    TextField, InputAdornment, Collapse, Fade, Dialog, DialogTitle,
    DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FilterListIcon from '@mui/icons-material/FilterList';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { supabase } from '../../supabaseConfig';
import { LISTA_CURSOS } from '../../constants/cursos';
import { notificadorTelegram } from '../../services/NotificadorTelegram';
import { autoRejeitarPendentesConflitantes } from '../../utils/conflitoUtils';
import Checkbox from '@mui/material/Checkbox';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';

const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

dayjs.locale('pt-br');

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i, label: dayjs().month(i).format('MMMM') }));
const YEARS  = Array.from({ length: 5  }, (_, i) => dayjs().year() - 2 + i);

// ─── Card de Aula ─────────────────────────────────────────────────────────────
function AulaCard({ aula, onAction, processando, isSelected, onClick, temConflito, isCheckable, isChecked, onToggleCheck }) {
    const cursosLabel = useMemo(() => {
        if (!aula.cursos?.length) return '—';
        return aula.cursos.map(v => LISTA_CURSOS.find(c => c.value === v)?.label || v).join(', ');
    }, [aula.cursos]);

    const dataFormatada = useMemo(() => {
        try { return dayjs(aula.data_inicio || aula.dataInicio).format('ddd, DD/MM/YYYY [às] HH:mm'); }
        catch { return '—'; }
    }, [aula.data_inicio, aula.dataInicio]);

    const borderLeftColor = 
        temConflito ? '#ef4444' :
        aula.isRevisao || aula.is_revisao ? '#a855f7' :
        aula.isProva || aula.is_prova   ? '#f59e0b' :
        aula.status === 'aprovada'  ? '#22c55e' :
        aula.status === 'rejeitada' ? '#dc2626' : '#1E7EC8';

    return (
        <Paper 
            elevation={isSelected ? 4 : 1}
            onClick={onClick}
            sx={{
                mb: 2, 
                p: 2.5,
                cursor: 'pointer', 
                borderLeft: `6px solid ${borderLeftColor}`,
                borderRadius: 2.5,
                bgcolor: isSelected ? 'action.selected' : 'background.paper',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid',
                borderColor: isSelected ? 'primary.main' : 'divider',
                boxShadow: isSelected ? '0 8px 24px rgba(30,126,200,0.18)' : '0 2px 8px rgba(0,0,0,0.04)',
                '&:hover': { 
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
                }
            }}
        >
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5} flexWrap="wrap" gap={1}>
                <Box display="flex" alignItems="center" gap={1.5}>
                    {isCheckable && (
                        <Checkbox
                            size="medium"
                            checked={isChecked}
                            onChange={(e) => { e.stopPropagation(); onToggleCheck(aula.id); }}
                            onClick={(e) => e.stopPropagation()}
                            inputProps={{ 'aria-label': `Selecionar solicitação ${aula.assunto}` }}
                            sx={{ p: 0.5 }}
                        />
                    )}
                    <Typography variant="h6" fontWeight="bold" lineHeight={1.2} color="text.primary">
                        {aula.assunto || 'Sem Assunto'}
                    </Typography>
                </Box>
                <Chip
                    label={aula.status === 'pendente' ? (temConflito ? '⚠️ Conflito de Horário' : '⏳ Pendente') : aula.status === 'aprovada' ? '✅ Aprovada' : '❌ Rejeitada'}
                    color={aula.status === 'pendente' ? (temConflito ? 'error' : 'warning') : aula.status === 'aprovada' ? 'success' : 'error'}
                    size="small"
                    sx={{ fontWeight: 700, px: 1, py: 0.5, borderRadius: 1.5, height: 28 }}
                />
            </Box>
            <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                🏛️ <strong>{aula.laboratorio || aula.laboratorioSelecionado || '—'}</strong> &nbsp;|&nbsp; 🎓 {cursosLabel}
            </Typography>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    📅 {dataFormatada} &nbsp;•&nbsp; 👤 {aula.proposto_por_nome || aula.propostoPorNome || 'N/A'}
                </Typography>
            </Box>
        </Paper>
    );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
function GerenciarAprovacoes() {
    const [pendentesGlobal, setPendentesGlobal] = useState([]);
    const [aulasDoMes, setAulasDoMes]           = useState([]);
    const [loadingPendentes, setLoadingPendentes] = useState(true);
    const [loadingMes, setLoadingMes]             = useState(true);
    const [aulaSelecionada, setAulaSelecionada] = useState(null);

    const [processando, setProcessando] = useState(null);

    const [selectedIds, setSelectedIds]         = useState([]);
    const [loadingBatch, setLoadingBatch]       = useState(false);

    // Mapeia propostas que possuem conflito de horário com aulas aprovadas
    const conflitosMap = useMemo(() => {
        const mapa = {};
        pendentesGlobal.forEach(p => {
            const pStart = p.data_inicio || p.dataInicio;
            const pLab = p.laboratorio || p.laboratorioSelecionado;
            if (!pStart || !pLab) return;
            const dateStr = dayjs(pStart).format('YYYY-MM-DD');
            const hSlots = Array.isArray(p.horario_slot || p.horarioSlotString) ? (p.horario_slot || p.horarioSlotString) : [(p.horario_slot || p.horarioSlotString)];

            const temConflito = aulasDoMes.some(aprov => {
                if (aprov.status !== 'aprovada') return false;
                const aStart = aprov.data_inicio || aprov.dataInicio;
                const aLab = aprov.laboratorio || aprov.laboratorioSelecionado;
                const aDate = dayjs(aStart).format('YYYY-MM-DD');
                if (aDate !== dateStr) return false;
                if (aLab !== pLab) return false;
                const aSlots = Array.isArray(aprov.horario_slot || aprov.horarioSlotString) ? (aprov.horario_slot || aprov.horarioSlotString) : [(aprov.horario_slot || aprov.horarioSlotString)];
                return hSlots.some(h => aSlots.includes(h));
            });

            if (temConflito) mapa[p.id] = true;
        });
        return mapa;
    }, [pendentesGlobal, aulasDoMes]);

    const toggleSelectId = useCallback((id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }, []);

    const handleSelectTodasSemConflito = () => {
        const semConflito = pendentesGlobal.filter(p => !conflitosMap[p.id]).map(p => p.id);
        setSelectedIds(semConflito);
    };

    const handleAprovarEmLote = async () => {
        if (selectedIds.length === 0 || loadingBatch) return;
        setLoadingBatch(true);
        try {
            await supabase.from('aulas').update({ status: 'aprovada' }).in('id', selectedIds);

            setSnackbar({
                open: true,
                severity: 'success',
                message: `✅ ${selectedIds.length} proposta(s) aprovada(s) em lote!`
            });
            setSelectedIds([]);
            fetchPendentes();
        } catch (err) {
            console.error('Erro na aprovação em lote:', err);
            setSnackbar({ open: true, severity: 'error', message: 'Erro ao aprovar em lote.' });
        } finally {
            setLoadingBatch(false);
        }
    };

    // Confirmação antes de aprovar/rejeitar + Motivo de rejeição
    const [confirmDialog, setConfirmDialog] = useState({ open: false, aula: null, acao: null });
    const [motivoRejeicao, setMotivoRejeicao] = useState('');
    const [motivoErro, setMotivoErro] = useState(false);

    const [currentTab, setCurrentTab] = useState('pendente');
    const [busca, setBusca]           = useState('');
    const [filtrosVisiveis, setFiltrosVisiveis] = useState(false);

    const now = dayjs();
    const [selectedMonth, setSelectedMonth] = useState(now.month());
    const [selectedYear,  setSelectedYear]  = useState(now.year());

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // ── Pendentes: query Supabase ───────────────────────────────────────────
    const fetchPendentes = useCallback(async () => {
        setLoadingPendentes(true);
        try {
            const { data, error } = await supabase
                .from('aulas')
                .select('*')
                .eq('status', 'pendente')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setPendentesGlobal((data || []).map(a => ({
                ...a,
                laboratorioSelecionado: a.laboratorio,
                horarioSlotString: a.horario_slot,
                propostoPorNome: a.proposto_por_nome
            })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingPendentes(false);
        }
    }, []);

    useEffect(() => {
        fetchPendentes();
        const channel = supabase
            .channel('public:aulas')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'aulas' }, () => {
                fetchPendentes();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchPendentes]);

    // ── Aprovadas/Rejeitadas: filtradas por mês/ano ───────────────────────
    useEffect(() => {
        const fetchMes = async () => {
            setLoadingMes(true);
            try {
                const start = dayjs().year(selectedYear).month(selectedMonth).startOf('month').toISOString();
                const end   = dayjs().year(selectedYear).month(selectedMonth).endOf('month').toISOString();
                const { data, error } = await supabase
                    .from('aulas')
                    .select('*')
                    .gte('data_inicio', start)
                    .lte('data_inicio', end)
                    .in('status', ['aprovada', 'rejeitada'])
                    .order('data_inicio', { ascending: true });

                if (error) throw error;
                setAulasDoMes((data || []).map(a => ({
                    ...a,
                    laboratorioSelecionado: a.laboratorio,
                    horarioSlotString: a.horario_slot,
                    propostoPorNome: a.proposto_por_nome
                })));
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingMes(false);
            }
        };
        fetchMes();
    }, [selectedMonth, selectedYear]);


    // Seleciona automaticamente o primeiro item ao mudar a lista
    const listaAtiva = useMemo(() => {
        const base = currentTab === 'pendente'
            ? pendentesGlobal
            : aulasDoMes.filter(a => a.status === currentTab);
        if (!busca.trim()) return base;
        const b = busca.toLowerCase();
        return base.filter(a =>
            a.assunto?.toLowerCase().includes(b) ||
            (a.propostoPorNome || a.professorNome || '').toLowerCase().includes(b) ||
            a.laboratorioSelecionado?.toLowerCase().includes(b)
        );
    }, [currentTab, pendentesGlobal, aulasDoMes, busca]);

    useEffect(() => {
        if (listaAtiva.length > 0) {
            if (!aulaSelecionada || !listaAtiva.some(a => a.id === aulaSelecionada.id)) {
                setAulaSelecionada(listaAtiva[0]);
            }
        } else {
            setAulaSelecionada(null);
        }
    }, [listaAtiva]);

    const handleActionClick = (aula, acao) => {
        setMotivoRejeicao('');
        setMotivoErro(false);
        setConfirmDialog({ open: true, aula, acao });
    };

    const handleConfirmarAcao = async () => {
        const { aula, acao } = confirmDialog;
        if (acao === 'rejeitada' && !motivoRejeicao.trim()) {
            setMotivoErro(true);
            return;
        }

        setConfirmDialog({ open: false, aula: null, acao: null });
        setProcessando(aula.id);
        try {
            const updatePayload = { status: acao, updated_at: new Date().toISOString() };
            if (acao === 'rejeitada') {
                updatePayload.observacoes = aula.observacoes
                    ? `${aula.observacoes}\n[MOTIVO REJEIÇÃO]: ${motivoRejeicao.trim()}`
                    : `[MOTIVO REJEIÇÃO]: ${motivoRejeicao.trim()}`;
            }

            await supabase.from('aulas').update(updatePayload).eq('id', aula.id);


            if (acao === 'aprovada') {
                await autoRejeitarPendentesConflitantes({
                    laboratorioSelecionado: aula.laboratorioSelecionado,
                    dataInicio: aula.dataInicio,
                    dataFim: aula.dataFim,
                    horarioSlotString: aula.horarioSlotString,
                    assuntoAgendamento: aula.assunto,
                    idAgendamentoIgnorar: aula.id,
                });
            }

            if (TELEGRAM_CHAT_ID) {
                const dataObj = aula.dataInicio?.toDate ? dayjs(aula.dataInicio.toDate()) : dayjs(aula.dataInicio);
                const dadosNotif = {
                    assunto:        aula.assunto,
                    data:           dataObj.isValid() ? dataObj.format('DD/MM/YYYY') : 'N/A',
                    dataISO:        dataObj.isValid() ? dataObj.format('YYYY-MM-DD') : null,
                    horario:        aula.horarioSlotString,
                    laboratorio:    aula.laboratorioSelecionado,
                    cursos:         aula.cursos,
                    observacoes:    aula.observacoes,
                    propostoPorNome: aula.propostoPorNome || aula.professorNome || '',
                    isRevisao:      aula.isRevisao || false,
                    tipoRevisaoLabel: aula.tipoRevisaoLabel || '',
                    isProva:        aula.isProva || false,
                    motivoRejeicao: acao === 'rejeitada' ? motivoRejeicao.trim() : null
                };
                await notificadorTelegram.enviarNotificacao(
                    TELEGRAM_CHAT_ID,
                    dadosNotif,
                    acao === 'aprovada' ? 'aprovada' : 'rejeitada'
                );
            }

            setSnackbar({
                open: true,
                severity: 'success',
                message: acao === 'aprovada'
                    ? `✅ Aula "${aula.assunto}" aprovada com sucesso!`
                    : `❌ Aula "${aula.assunto}" rejeitada.`
            });
        } catch (err) {
            console.error(err);
            setSnackbar({ open: true, severity: 'error', message: 'Erro ao atualizar. Tente novamente.' });
        } finally {
            setProcessando(null);
        }
    };

    const isLoading = currentTab === 'pendente' ? loadingPendentes : loadingMes;

    return (
        <Container maxWidth="xl">
            <Typography variant="h4" component="h1" gutterBottom align="center"
                sx={{ mb: 2, mt: 4, color: '#1E7EC8', fontWeight: 'bold' }}>
                Gerenciar Aprovações de Aulas
            </Typography>

            {/* Banner de alerta quando há pendentes */}
            <Fade in={pendentesGlobal.length > 0}>
                <Paper elevation={0} sx={{
                    mb: 3, p: 2, display: 'flex', alignItems: 'center', gap: 2,
                    bgcolor: 'warning.light', borderRadius: 2,
                    border: '1px solid', borderColor: 'warning.main'
                }}>
                    <WarningAmberIcon color="warning" />
                    <Typography variant="body1" fontWeight="bold" color="warning.dark">
                        {pendentesGlobal.length} proposta{pendentesGlobal.length !== 1 ? 's' : ''} aguardando sua aprovação
                    </Typography>
                    <Button size="small" variant="contained" color="warning"
                        onClick={() => setCurrentTab('pendente')} sx={{ ml: 'auto' }}>
                        Ver pendentes
                    </Button>
                </Paper>
            </Fade>

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} centered>
                    <Tab
                        value="pendente"
                        label={
                            <Badge badgeContent={pendentesGlobal.length} color="error" max={99}>
                                <Box sx={{ pr: pendentesGlobal.length > 0 ? 2 : 0 }}>Pendentes</Box>
                            </Badge>
                        }
                    />
                    <Tab label="Aprovadas" value="aprovada" />
                    <Tab label="Rejeitadas" value="rejeitada" />
                </Tabs>
            </Box>

            {/* Controles */}
            <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                        size="small" placeholder="Buscar por assunto, técnico ou laboratório..."
                        value={busca} onChange={e => setBusca(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                        sx={{ flex: 1, minWidth: 220 }}
                    />

                    {currentTab === 'pendente' && (
                        <Box display="flex" gap={1} flexWrap="wrap">
                            <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<PlaylistAddCheckIcon />}
                                onClick={handleSelectTodasSemConflito}
                            >
                                Selecionar sem conflito
                            </Button>
                            {selectedIds.length > 0 && (
                                <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    startIcon={<CheckCircleIcon />}
                                    onClick={handleAprovarEmLote}
                                    disabled={loadingBatch}
                                >
                                    {loadingBatch ? 'Aprovando...' : `Aprovar Selecionadas (${selectedIds.length})`}
                                </Button>
                            )}
                        </Box>
                    )}

                    {currentTab !== 'pendente' && (
                        <>
                            <Button variant={filtrosVisiveis ? 'contained' : 'outlined'} size="small"
                                startIcon={<FilterListIcon />} onClick={() => setFiltrosVisiveis(v => !v)}>
                                Período
                            </Button>
                            <Collapse in={filtrosVisiveis} orientation="horizontal">
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <FormControl sx={{ minWidth: 140 }} size="small">
                                        <InputLabel>Mês</InputLabel>
                                        <Select value={selectedMonth} label="Mês" onChange={e => setSelectedMonth(e.target.value)}>
                                            {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                    <FormControl sx={{ minWidth: 100 }} size="small">
                                        <InputLabel>Ano</InputLabel>
                                        <Select value={selectedYear} label="Ano" onChange={e => setSelectedYear(e.target.value)}>
                                            {YEARS.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                    <Tooltip title="Voltar para o mês atual">
                                        <Button variant="outlined" size="small"
                                            onClick={() => { setSelectedMonth(now.month()); setSelectedYear(now.year()); }}
                                            startIcon={<ClearIcon />}>
                                            Limpar
                                        </Button>
                                    </Tooltip>
                                </Box>
                            </Collapse>
                        </>
                    )}
                </Box>
            </Paper>

            {/* Layout Master-Detail (2 Colunas) */}
            {isLoading ? (
                <Box sx={{ textAlign: 'center', mt: 6 }}><CircularProgress /></Box>
            ) : listaAtiva.length > 0 ? (
                <Grid container spacing={3}>
                    {/* Coluna Esquerda: Lista de Propostas (Master) */}
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            Propostas ({listaAtiva.length})
                        </Typography>
                        <Box sx={{ maxHeight: '70vh', overflowY: 'auto', pr: 1 }}>
                            {listaAtiva.map(aula => (
                                <AulaCard
                                    key={aula.id}
                                    aula={aula}
                                    isSelected={aulaSelecionada?.id === aula.id}
                                    onClick={() => setAulaSelecionada(aula)}
                                    processando={processando}
                                    temConflito={Boolean(conflitosMap[aula.id])}
                                    isCheckable={currentTab === 'pendente'}
                                    isChecked={selectedIds.includes(aula.id)}
                                    onToggleCheck={toggleSelectId}
                                />
                            ))}
                        </Box>
                    </Grid>

                    {/* Coluna Direita: Detalhes e Ações (Detail) */}
                    <Grid size={{ xs: 12, md: 7 }}>
                        {aulaSelecionada ? (
                            <Paper elevation={3} sx={{ p: 3, borderRadius: 3, sticky: true, top: 20 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                    <Box>
                                        <Typography variant="h5" fontWeight="bold" color="primary.main">
                                            {aulaSelecionada.assunto}
                                        </Typography>
                                        <Box display="flex" gap={1} mt={0.5}>
                                            {aulaSelecionada.isRevisao && <Chip label="Revisão" color="secondary" size="small" />}
                                            {aulaSelecionada.isProva && <Chip label="Prova" color="warning" size="small" />}
                                            {conflitosMap[aulaSelecionada.id] && (
                                                <Chip label="⚠️ Conflito de Horário Mapeado" color="error" size="small" sx={{ fontWeight: 'bold' }} />
                                            )}
                                            <Chip
                                                label={aulaSelecionada.status === 'pendente' ? 'Aguardando aprovação' : aulaSelecionada.status === 'aprovada' ? 'Aprovada' : 'Rejeitada'}
                                                color={aulaSelecionada.status === 'pendente' ? (conflitosMap[aulaSelecionada.id] ? 'error' : 'warning') : aulaSelecionada.status === 'aprovada' ? 'success' : 'error'}
                                                size="small"
                                            />
                                        </Box>
                                    </Box>
                                </Box>

                                {conflitosMap[aulaSelecionada.id] && (
                                    <Alert severity="error" sx={{ mb: 2 }}>
                                        <strong>Alerta de Conflito Preventivo:</strong> Já existe uma aula <em>aprovada</em> neste mesmo laboratório e horário. Aprovar esta proposta pode gerar sobreposição.
                                    </Alert>
                                )}

                                <Divider sx={{ my: 2 }} />

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="body2" color="text.secondary">Laboratório</Typography>
                                        <Typography variant="body1" fontWeight="bold">🏛️ {aulaSelecionada.laboratorioSelecionado || '—'}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="body2" color="text.secondary">Solicitado por</Typography>
                                        <Typography variant="body1" fontWeight="bold">👤 {aulaSelecionada.propostoPorNome || aulaSelecionada.professorNome || 'N/A'}</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="body2" color="text.secondary">Data e Horário</Typography>
                                        <Typography variant="body1" fontWeight="bold">
                                            📅 {(() => { try { return dayjs(aulaSelecionada.dataInicio.toDate()).format('DD/MM/YYYY [às] HH:mm'); } catch { return '—'; } })()}
                                        </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="body2" color="text.secondary">Cursos Atendidos</Typography>
                                        <Typography variant="body1" fontWeight="bold">
                                            🎓 {aulaSelecionada.cursos?.map(v => LISTA_CURSOS.find(c => c.value === v)?.label || v).join(', ') || '—'}
                                        </Typography>
                                    </Grid>
                                </Grid>

                                {aulaSelecionada.observacoes && (
                                    <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                                        <Typography variant="body2" fontWeight="bold">Observações:</Typography>
                                        <Typography variant="body2" color="text.secondary">{aulaSelecionada.observacoes}</Typography>
                                    </Box>
                                )}

                                {aulaSelecionada.status === 'rejeitada' && aulaSelecionada.motivoRejeicao && (
                                    <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 2 }}>
                                        <Typography variant="body2" fontWeight="bold">Motivo da Rejeição:</Typography>
                                        <Typography variant="body2">{aulaSelecionada.motivoRejeicao}</Typography>
                                    </Box>
                                )}

                                {aulaSelecionada.status === 'pendente' && (
                                    <Box display="flex" justifyContent="flex-end" gap={2} mt={4}>
                                        <Button
                                            variant="outlined" color="error" size="large" startIcon={<CancelIcon />}
                                            onClick={() => handleActionClick(aulaSelecionada, 'rejeitada')}
                                        >
                                            Rejeitar Proposta
                                        </Button>
                                        <Button
                                            variant="contained" color="success" size="large" startIcon={<CheckCircleIcon />}
                                            onClick={() => handleActionClick(aulaSelecionada, 'aprovada')}
                                        >
                                            Aprovar Proposta
                                        </Button>
                                    </Box>
                                )}
                            </Paper>
                        ) : (
                            <Paper elevation={1} sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                                <Typography color="text.secondary">Selecione uma proposta à esquerda para ver os detalhes.</Typography>
                            </Paper>
                        )}
                    </Grid>
                </Grid>
            ) : (
                <Box sx={{ textAlign: 'center', mt: 8 }}>
                    <TaskAltIcon sx={{ fontSize: 64, color: 'success.main', mb: 1 }} />
                    <Typography color="success.main" variant="h6" fontWeight="bold">Tudo em dia!</Typography>
                    <Typography color="text.secondary">Nenhuma proposta nesta aba.</Typography>
                </Box>
            )}

            {/* Diálogo de confirmação com Motivo Obrigatório de Rejeição */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, aula: null, acao: null })} maxWidth="xs" fullWidth>
                <DialogTitle sx={{
                    bgcolor: confirmDialog.acao === 'aprovada' ? 'success.main' : 'error.main',
                    color: 'white'
                }}>
                    {confirmDialog.acao === 'aprovada' ? '✅ Confirmar Aprovação' : '❌ Confirmar Rejeição'}
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <DialogContentText>
                        {confirmDialog.acao === 'aprovada'
                            ? <>Você está aprovando a aula <strong>"{confirmDialog.aula?.assunto}"</strong>. Ela será incluída no cronograma oficial.</>
                            : <>Você está rejeitando a aula <strong>"{confirmDialog.aula?.assunto}"</strong>. Informe abaixo o motivo obrigatório.</>
                        }
                    </DialogContentText>

                    {confirmDialog.acao === 'rejeitada' && (
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Motivo da Rejeição *"
                            placeholder="Ex: Laboratório indisponível para manutenção."
                            value={motivoRejeicao}
                            onChange={e => {
                                setMotivoRejeicao(e.target.value);
                                if (e.target.value.trim()) setMotivoErro(false);
                            }}
                            error={motivoErro}
                            helperText={motivoErro ? 'O motivo é obrigatório para rejeitar.' : ''}
                            sx={{ mt: 2 }}
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmDialog({ open: false, aula: null, acao: null })}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color={confirmDialog.acao === 'aprovada' ? 'success' : 'error'}
                        onClick={handleConfirmarAcao}
                        startIcon={confirmDialog.acao === 'aprovada' ? <CheckCircleIcon /> : <CancelIcon />}
                    >
                        {confirmDialog.acao === 'aprovada' ? 'Sim, aprovar' : 'Sim, rejeitar'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar(p => ({ ...p, open: false }))}>
                <Alert onClose={() => setSnackbar(p => ({ ...p, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default GerenciarAprovacoes;

