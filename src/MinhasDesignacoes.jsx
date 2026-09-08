import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseConfig';
import { useAuth } from './AuthContext';
import {
    Container, Typography, Paper, List, ListItem, ListItemText,
    CircularProgress, Alert, Box, Chip, Button
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import GroupIcon from '@mui/icons-material/Group';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

function MinhasDesignacoes() {
    const [aulas, setAulas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser, userProfile } = useAuth();
    const theme = useTheme();

    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const uidTarget = currentUser?.id || currentUser?.uid || userProfile?.uid;

    const handleSortToggle = () => {
        setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    };

    const fetchDesignacoes = useCallback(async () => {
        if (!uidTarget) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const startOfMonth = selectedDate.startOf('month').format('YYYY-MM-DD');
        const endOfMonth = selectedDate.endOf('month').format('YYYY-MM-DD');

        try {
            const { data, error: err } = await supabase
                .from('aulas')
                .select('*')
                .contains('tecnicos', [uidTarget])
                .gte('data_inicio', startOfMonth)
                .lte('data_inicio', endOfMonth)
                .order('data_inicio', { ascending: sortOrder === 'asc' });

            if (err) throw err;

            const aulasFormatadas = (data || []).map(item => ({
                id: item.id,
                assunto: item.assunto || item.title || 'Aula',
                laboratorioSelecionado: item.laboratorio || item.laboratorioSelecionado || 'Laboratório',
                tipoAtividade: item.tipo_atividade || 'aula',
                dataInicio: item.data_inicio ? dayjs(item.data_inicio) : null,
                dataFim: item.data_fim ? dayjs(item.data_fim) : null,
                horarioSlot: item.horario_slot || item.horario,
                tecnicosInfo: item.tecnicos_info || [],
            }));

            setAulas(aulasFormatadas);
        } catch (err) {
            console.error('Erro ao buscar designações no Supabase:', err);
            setError('Falha ao carregar suas aulas designadas.');
        } finally {
            setLoading(false);
        }
    }, [uidTarget, selectedDate, sortOrder]);

    useEffect(() => {
        fetchDesignacoes();

        if (!uidTarget) return;

        // Supabase Realtime: Atualização instantânea sem necessidade de reload
        const channel = supabase
            .channel(`designacoes-${uidTarget}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'aulas',
                },
                () => {
                    fetchDesignacoes();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [uidTarget, fetchDesignacoes]);

    if (loading && aulas.length === 0) {
        return (
            <Container maxWidth="md" sx={{ textAlign: 'center', mt: 4 }}>
                <CircularProgress />
                <Typography variant="h6" sx={{ mt: 2 }}>
                    Carregando suas designações...
                </Typography>
            </Container>
        );
    }

    if (!currentUser && !userProfile) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Alert severity="warning">Por favor, faça login para acessar suas designações.</Alert>
            </Container>
        );
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" mb={2}>
                        <Box>
                            <Typography variant="h4" fontWeight={700} gutterBottom>
                                Minhas Designações
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Suas aulas e revisões atribuídas em tempo real.
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<RefreshIcon />}
                            onClick={fetchDesignacoes}
                            sx={{ mt: { xs: 1, sm: 0 } }}
                        >
                            Atualizar
                        </Button>
                    </Box>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {/* Filtros e Ordenação */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                        <DatePicker
                            views={['month', 'year']}
                            label="Filtrar por Mês/Ano"
                            value={selectedDate}
                            onChange={(newDate) => setSelectedDate(newDate || dayjs())}
                            slotProps={{ textField: { size: 'small' } }}
                        />
                        <Button
                            variant="outlined"
                            size="medium"
                            onClick={handleSortToggle}
                            startIcon={<SwapVertIcon />}
                        >
                            Data ({sortOrder === 'asc' ? 'Crescente' : 'Decrescente'})
                        </Button>
                    </Box>

                    {aulas.length === 0 ? (
                        <Typography variant="body1" align="center" color="text.secondary" sx={{ py: 4 }}>
                            Você não possui nenhuma designação para o mês selecionado.
                        </Typography>
                    ) : (
                        <List>
                            {aulas.map((aula) => (
                                <Paper key={aula.id} elevation={2} sx={{ mb: 2, p: 2, borderRadius: 2, borderLeft: `5px solid ${theme.palette.primary.main}` }}>
                                    <ListItem alignItems="flex-start" disableGutters>
                                        <ListItemText
                                            primary={
                                                <Typography variant="h6" component="div" gutterBottom fontWeight={700}>
                                                    {aula.assunto}
                                                    <Chip
                                                        label={aula.tipoAtividade === 'aula' ? 'Aula' : 'Revisão'}
                                                        size="small"
                                                        color={aula.tipoAtividade === 'aula' ? 'primary' : 'secondary'}
                                                        sx={{ ml: 1, fontWeight: 700 }}
                                                    />
                                                </Typography>
                                            }
                                            secondary={
                                                <React.Fragment>
                                                    <Typography component="div" variant="body2" color="text.secondary">
                                                        <Box component="span" sx={{ fontWeight: 'bold' }}>Laboratório:</Box> {aula.laboratorioSelecionado}
                                                    </Typography>
                                                    <Typography component="div" variant="body2" color="text.secondary">
                                                        <Box component="span" sx={{ fontWeight: 'bold' }}>Data:</Box> {aula.dataInicio ? aula.dataInicio.format('dddd, DD [de] MMMM [de] YYYY') : 'N/A'}
                                                    </Typography>
                                                    <Typography component="div" variant="body2" color="text.secondary">
                                                        <Box component="span" sx={{ fontWeight: 'bold' }}>Horário:</Box> {aula.horarioSlot || (aula.dataInicio ? `${aula.dataInicio.format('HH:mm')} - ${aula.dataFim ? aula.dataFim.format('HH:mm') : ''}` : '')}
                                                    </Typography>
                                                    {aula.tecnicosInfo && aula.tecnicosInfo.filter(t => t.uid !== uidTarget).length > 0 && (
                                                        <Typography component="div" variant="caption" color="text.disabled" sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                                                            <GroupIcon fontSize="inherit" sx={{ mr: 0.5 }} />
                                                            Com: {aula.tecnicosInfo.filter(t => t.uid !== uidTarget).map(t => t.name || t.email).join(', ')}
                                                        </Typography>
                                                    )}
                                                </React.Fragment>
                                            }
                                            secondaryTypographyProps={{ component: 'div' }}
                                        />
                                    </ListItem>
                                </Paper>
                            ))}
                        </List>
                    )}
                </Paper>
            </Container>
        </LocalizationProvider>
    );
}

export default MinhasDesignacoes;