// src/MinhasPropostas.js

import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseConfig';
import {
    Container, Typography, Box, CircularProgress, Alert, Paper,
    List, ListItem, ListItemText, ListItemSecondaryAction, Chip, Divider,
    Grid
} from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

const MinhasPropostas = ({ userInfo }) => {
    const [propostas, setPropostas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPropostas = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data: authData } = await supabase.auth.getUser();
                const user = authData?.user;
                
                const localSessionStr = localStorage.getItem('cronolab_user_session');
                const localSession = localSessionStr ? JSON.parse(localSessionStr) : null;

                const uid = user?.id || userInfo?.uid || userInfo?.id || localSession?.uid;
                const email = user?.email || userInfo?.email || localSession?.email;

                if (!uid && !email) {
                    setLoading(false);
                    return;
                }

                // Busca propostas filtrando por UID ou por E-mail do proponente
                let query = supabase.from('aulas').select('*');
                
                if (uid && email) {
                    query = query.or(`proposto_por_uid.eq.${uid},proposto_por_uid.eq.${email}`);
                } else if (uid) {
                    query = query.eq('proposto_por_uid', uid);
                } else {
                    query = query.eq('proposto_por_uid', email);
                }

                const { data, error } = await query.order('created_at', { ascending: false });

                if (error) throw error;

                const propostasList = (data || []).map(d => ({
                    ...d,
                    id: d.id,
                    laboratorioSelecionado: d.laboratorio,
                    horarioSlotString: d.horario_slot,
                    dataInicio: d.data_inicio,
                    createdAt: d.created_at
                }));

                setPropostas(propostasList);
            } catch (err) {
                console.error("Erro ao carregar propostas:", err);
                setError("Erro ao carregar propostas.");
            } finally {
                setLoading(false);
            }
        };

        fetchPropostas();
    }, [userInfo]);

    const getChipProps = (status) => {
        switch (status) {
            case 'aprovada':
                return { label: 'Aprovada', color: 'success' };
            case 'rejeitada':
                return { label: 'Rejeitada', color: 'error' };
            default:
                return { label: 'Pendente Aprovação', color: 'warning' };
        }
    };

    const pendentes = propostas.filter(p => p.status === 'pendente');
    const aprovadas = propostas.filter(p => p.status === 'aprovada');
    const rejeitadas = propostas.filter(p => p.status === 'rejeitada');

    const agora = dayjs();
    const aulasIminentes = aprovadas.filter(p => {
        if (!p.dataInicio) return false;
        const inicio = dayjs(p.dataInicio.toDate ? p.dataInicio.toDate() : p.dataInicio);
        const diffMinutos = inicio.diff(agora, 'minute');
        return diffMinutos >= 0 && diffMinutos <= 30;
    });

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Container maxWidth="md">
            {aulasIminentes.length > 0 && (
                <Alert
                    severity="warning"
                    variant="filled"
                    sx={{ mt: 3, mb: 1, bgcolor: '#d48806', color: '#fff', fontWeight: 'bold', borderRadius: 2 }}
                >
                    ⚡ <strong>Alerta de Prep de Lab:</strong> Você tem {aulasIminentes.length} aula(s) aprovada(s) iniciando em ≤ 30 minutos!
                    {aulasIminentes.map(a => ` "${a.assunto}" no ${a.laboratorioSelecionado || 'Lab'}`).join('; ')}
                </Alert>
            )}
            <Paper elevation={3} sx={{ p: 4, mt: 2 }}>
                <Typography variant="h5" component="h1" gutterBottom>
                    Minhas Propostas de Aula
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                    Aulas propostas por você e seus respectivos status de aprovação.
                </Typography>

                {/* Resumo */}
                <Grid container spacing={2} sx={{ my: 2 }}>
                    <Grid item xs={4}>
                        <Paper elevation={1} sx={{ p: 1.5, textAlign: 'center', borderTop: '3px solid #ed6c02' }}>
                            <Typography variant="h4" fontWeight="bold" color="warning.main">{pendentes.length}</Typography>
                            <Typography variant="caption">Pendentes</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={4}>
                        <Paper elevation={1} sx={{ p: 1.5, textAlign: 'center', borderTop: '3px solid #2e7d32' }}>
                            <Typography variant="h4" fontWeight="bold" color="success.main">{aprovadas.length}</Typography>
                            <Typography variant="caption">Aprovadas</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={4}>
                        <Paper elevation={1} sx={{ p: 1.5, textAlign: 'center', borderTop: '3px solid #d32f2f' }}>
                            <Typography variant="h4" fontWeight="bold" color="error.main">{rejeitadas.length}</Typography>
                            <Typography variant="caption">Rejeitadas</Typography>
                        </Paper>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {propostas.length === 0 ? (
                    <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                        Você não possui nenhuma proposta no momento.
                    </Typography>
                ) : (
                    <List disablePadding>
                        {propostas.map((proposta, index) => {
                            const dataAula = proposta.dataInicio
                                ? dayjs(proposta.dataInicio?.toDate ? proposta.dataInicio.toDate() : (proposta.dataInicio || proposta.data_inicio)).format('DD/MM/YYYY [às] HH:mm')
                                : '—';
                            const dataProposta = (proposta.createdAt || proposta.created_at)
                                ? dayjs(proposta.createdAt?.toDate ? proposta.createdAt.toDate() : (proposta.createdAt || proposta.created_at)).format('DD/MM/YYYY HH:mm')
                                : '—';

                            return (
                                <React.Fragment key={proposta.id}>
                                    <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                                        <ListItemText
                                            primary={
                                                <Typography variant="subtitle1" fontWeight="bold">
                                                    {proposta.assunto || 'Sem título'}
                                                </Typography>
                                            }
                                            secondary={
                                                <Box component="span" sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.5 }}>
                                                    <Typography variant="body2" component="span" color="text.secondary">
                                                        🏛️ {proposta.laboratorioSelecionado || '—'} &nbsp;|&nbsp; 📅 {dataAula}
                                                    </Typography>
                                                    {proposta.status === 'rejeitada' && proposta.motivoRejeicao && (
                                                        <Box sx={{ mt: 0.5, p: 1, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 1 }}>
                                                            <Typography variant="caption" fontWeight="bold" component="span" display="block">
                                                                Motivo da Rejeição:
                                                            </Typography>
                                                            <Typography variant="caption" component="span">
                                                                {proposta.motivoRejeicao}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    <Typography variant="caption" component="span" color="text.disabled" sx={{ mt: 0.5 }}>
                                                        Proposto em: {dataProposta}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                        <ListItemSecondaryAction>
                                            <Chip {...getChipProps(proposta.status)} size="small" />
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    {index < propostas.length - 1 && <Divider />}
                                </React.Fragment>
                            );
                        })}
                    </List>
                )}
            </Paper>
        </Container>
    );
};

export default MinhasPropostas;