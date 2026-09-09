import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseConfig';
import {
    Card, CardContent, Typography, Box, CircularProgress, Alert, Button, Divider, Chip, Tabs, Tab
} from '@mui/material';
import { Trash2, Clock, BookOpen, Users } from 'lucide-react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { getStatusChip } from '../utils/statusChipUtils';
import { formatarCursos } from '../utils/cursoUtils';

const UltimasExclusoesCard = () => {
    const [logsAulas, setLogsAulas] = useState([]);
    const [logsRevisoes, setLogsRevisoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState(0);
    const navigate = useNavigate();
    const theme = useTheme();

    useEffect(() => {
        setLoading(true);
        const fetchLogs = async () => {
            try {
                const { data, error } = await supabase
                    .from('logs')
                    .select('*')
                    .in('type', ['DELETE', 'exclusao'])
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (error) throw error;

                const todos = (data || []).map(log => {
                    const aulaObj = log.payload?.item || log.payload?.aula || log.payload || {};
                    return {
                        id: log.id,
                        ...log,
                        aula: aulaObj,
                        user: { nome: log.user_nome || log.user?.nome || 'Usuário' },
                        timestamp: new Date(log.created_at)
                    };
                });

                const aulasExcluidas = todos.filter(l => l.aula && !l.aula.isRevisao && l.collection !== 'eventosManutencao' && l.collection !== 'eventos').slice(0, 5);
                const revisoesExcluidas = todos.filter(l => l.aula && (l.aula.isRevisao === true || l.aula.is_revisao === true)).slice(0, 5);

                setLogsAulas(aulasExcluidas);
                setLogsRevisoes(revisoesExcluidas);
                setError(null);
            } catch (err) {
                console.error("Erro ao carregar o histórico de exclusões:", err);
                setError("Erro ao carregar o histórico de exclusões.");
                setLogsAulas([]);
                setLogsRevisoes([]);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    const formatarAno = (d) => {
        if (!d) return '';
        const obj = (d && typeof d.toDate === 'function') ? d.toDate() : new Date(d);
        return dayjs(obj).isValid() ? ` - ${dayjs(obj).year()}` : '';
    };

    const renderLogs = (logs, isRevisao) => {
        if (!logs.length) return (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                {isRevisao ? 'Nenhuma revisão excluída.' : 'Nenhuma aula excluída.'}
            </Typography>
        );
        return logs.map((log, i) => (
            <React.Fragment key={log.id}>
                <Box sx={{ py: 1.5 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box display="flex" alignItems="center" gap={0.5}>
                            <Typography variant="caption" component="span" aria-hidden="true">{isRevisao ? '📖' : '🎓'}</Typography>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: theme.palette.error.main, lineHeight: 1.2 }}>
                                {log.aula?.assunto || log.aula?.disciplina || 'Sem nome'}
                            </Typography>
                        </Box>
                        {getStatusChip(log.aula?.status, { sx: { ml: 1 } })}
                    </Box>
                    {isRevisao && log.aula?.tipoRevisaoLabel && (
                        <Chip label={log.aula.tipoRevisaoLabel} size="small" color="secondary" sx={{ mt: 0.3, height: 18, fontSize: '0.65rem' }} />
                    )}
                    <Box display="flex" alignItems="center" mt={0.5}>
                        <Users size={13} style={{ marginRight: 4, color: theme.palette.text.secondary }} />
                        <Typography variant="caption">{formatarCursos(log.aula)}{formatarAno(log.aula?.dataInicio)}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={0.5} mt={0.3}>
                        <Clock size={13} style={{ color: theme.palette.text.secondary }} />
                        <Typography variant="caption" color="text.secondary">
                            Excluída em: {dayjs(log.timestamp).format('DD/MM/YYYY [às] HH:mm')}
                        </Typography>
                    </Box>
                    {log.user?.nome && (
                        <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                            Por: {log.user.nome}
                        </Typography>
                    )}
                </Box>
                {i < logs.length - 1 && <Divider />}
            </React.Fragment>
        ));
    };

    return (
        <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, p: 2, pb: 0 }}>
                <Box display="flex" alignItems="center" mb={1}>
                    <Trash2 color={theme.palette.error.main} style={{ marginRight: 8 }} size={22} />
                    <Typography variant="h6" fontWeight="bold">Últimas Exclusões</Typography>
                </Box>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="primary" indicatorColor="primary"
                    sx={{ mb: 1, minHeight: 34, '& .MuiTab-root': { minHeight: 34, fontSize: '0.75rem', py: 0 } }}>
                    <Tab label={<span><span aria-hidden="true">🎓 </span>Aulas ({logsAulas.length})</span>} />
                    <Tab label={<span><span aria-hidden="true">📖 </span>Revisões ({logsRevisoes.length})</span>} />
                </Tabs>
                {loading ? (
                    <Box display="flex" justifyContent="center" py={3}><CircularProgress size={22} /></Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <Box>
                        {tab === 0 && renderLogs(logsAulas, false)}
                        {tab === 1 && renderLogs(logsRevisoes, true)}
                    </Box>
                )}
            </CardContent>
            <Box sx={{ p: 2, pt: 1 }}>
                <Button fullWidth variant="outlined" size="small" onClick={() => navigate('/historico-aulas')} startIcon={<BookOpen size={16} />}>
                    Ver Histórico Completo
                </Button>
            </Box>
        </Card>
    );
};

export default UltimasExclusoesCard;
