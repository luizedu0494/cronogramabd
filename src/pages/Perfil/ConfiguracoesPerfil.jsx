import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseConfig';
import { userService } from '../../services/userService';
import { registrarWebPush, revogarWebPush } from '../../services/webPushService';
import {
    Container, Typography, Box, Paper, CircularProgress, Alert, Button, Grid,
    TextField, Snackbar, Avatar, Card, CardContent, Divider, Chip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import NotificationsIcon from '@mui/icons-material/Notifications';
import UploadImagem from '../../componentes/comuns/UploadImagem';

function ConfiguracoesPerfil() {
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    
    const [pushAtivo, setPushAtivo] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);

    useEffect(() => {
        const fetchProfileAndPushStatus = async () => {
            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                let userEmail = session?.user?.email;

                if (!userEmail) {
                    const localSession = localStorage.getItem('cronolab_user_session');
                    if (localSession) {
                        userEmail = JSON.parse(localSession)?.email;
                    }
                }

                if (userEmail) {
                    const data = await userService.getUserProfile(userEmail);
                    if (data) {
                        setUserProfile(data);
                        setEditedName(data.name || '');
                        setPhotoURL(data.photo_url || data.photoURL || '');
                    } else {
                        setError("Perfil não encontrado no banco de dados.");
                    }
                } else {
                    setError("Sessão do usuário não identificada.");
                }

                if ('serviceWorker' in navigator && 'PushManager' in window) {
                    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
                    if (reg) {
                        const sub = await reg.pushManager.getSubscription();
                        setPushAtivo(!!sub);
                    } else {
                        setPushAtivo(false);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar perfil:", err);
                setError("Erro ao carregar perfil.");
            } finally {
                setLoading(false);
            }
        };
        fetchProfileAndPushStatus();
    }, []);

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            if (userProfile?.email) {
                const { error } = await supabase
                    .from('users')
                    .update({
                        name: editedName,
                        photo_url: photoURL
                    })
                    .eq('email', userProfile.email);

                if (error) throw error;

                const updated = { ...userProfile, name: editedName, photo_url: photoURL };
                setUserProfile(updated);
                localStorage.setItem('cronolab_user_session', JSON.stringify(updated));

                setSnackbarMessage('Perfil atualizado com sucesso!');
                setSnackbarSeverity('success');
                setOpenSnackbar(true);
                setIsEditMode(false);
            }
        } catch (err) {
            console.error("Erro ao salvar perfil:", err);
            setSnackbarMessage(`Erro ao salvar perfil: ${err.message}`);
            setSnackbarSeverity("error");
            setOpenSnackbar(true);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadFotoSucesso = async (url) => {
        setPhotoURL(url);
        try {
            if (userProfile?.email) {
                await supabase
                    .from('users')
                    .update({ photo_url: url })
                    .eq('email', userProfile.email);

                const updated = { ...userProfile, photo_url: url };
                setUserProfile(updated);
                localStorage.setItem('cronolab_user_session', JSON.stringify(updated));

                setSnackbarMessage('Foto de perfil atualizada com sucesso!');
                setSnackbarSeverity('success');
                setOpenSnackbar(true);
            }
        } catch (err) {
            console.error('Erro ao atualizar foto de perfil:', err);
        }
    };

    const handleTogglePush = async () => {
        if (!userProfile?.uid) return;
        setPushLoading(true);
        try {
            if (pushAtivo) {
                await revogarWebPush(userProfile.uid);
                setPushAtivo(false);
                setSnackbarMessage('Notificações Web Push desativadas neste dispositivo.');
                setSnackbarSeverity('info');
            } else {
                const resultado = await registrarWebPush(userProfile.uid);
                if (resultado.sucesso) {
                    setPushAtivo(true);
                    setSnackbarMessage('Notificações Web Push (VAPID) ativadas com sucesso!');
                    setSnackbarSeverity('success');
                } else {
                    setSnackbarMessage(resultado.mensagem || 'Não foi possível ativar as notificações.');
                    setSnackbarSeverity('warning');
                }
            }
            setOpenSnackbar(true);
        } catch (err) {
            console.error('Erro ao alterar Web Push:', err);
        } finally {
            setPushLoading(false);
        }
    };

    const handleCloseSnackbar = (event, reason) => { if (reason === 'clickaway') return; setOpenSnackbar(false); };

    if (loading) return <Container sx={{ textAlign: 'center', mt: 4 }}><CircularProgress /></Container>;
    if (error) return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
    if (!userProfile) return null;

    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ p: 4, mt: 4, mb: 4 }}>
                <Typography variant="h5" gutterBottom align="center" sx={{ mb: 3 }}>Configurações do Perfil</Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3, gap: 2 }}>
                    <Avatar src={photoURL} sx={{ width: 100, height: 100 }} />
                    <UploadImagem
                        onUploadSucesso={handleUploadFotoSucesso}
                        pasta="cronolab/avatars"
                        rotulo="Alterar Foto de Perfil"
                    />
                </Box>

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Nome" value={editedName} onChange={(e) => setEditedName(e.target.value)} disabled={!isEditMode} />
                    </Grid>
                    <Grid item xs={12} sm={6}><TextField fullWidth label="Email" value={userProfile.email} disabled /></Grid>
                    <Grid item xs={12} sm={6}><TextField fullWidth label="Cargo" value={userProfile.role || 'Pendente'} disabled /></Grid>
                    


                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="h6" sx={{ mt: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <NotificationsIcon color="action" /> Notificações Push no Navegador (VAPID)
                        </Typography>
                        <Alert severity={pushAtivo ? "success" : "info"} sx={{ mb: 2 }}>
                            {pushAtivo 
                              ? "Notificações Web Push nativas VAPID estão ativas neste dispositivo."
                              : "Ative notificações nativas para receber alertas instantâneos diretamente na sua área de trabalho ou dispositivo móvel."
                            }
                        </Alert>
                        <Button
                            variant={pushAtivo ? "outlined" : "contained"}
                            color={pushAtivo ? "warning" : "primary"}
                            startIcon={pushLoading ? <CircularProgress size={20} color="inherit" /> : <NotificationsIcon />}
                            onClick={handleTogglePush}
                            disabled={pushLoading}
                            fullWidth
                        >
                            {pushLoading 
                              ? 'Processando...' 
                              : pushAtivo 
                                ? 'Desativar Notificações Web Push neste Dispositivo' 
                                : 'Ativar Notificações Web Push Nativas (VAPID)'
                            }
                        </Button>
                    </Grid>

                    {/* PREFERÊNCIAS DE NOTIFICAÇÃO E HORÁRIO SILENCIOSO */}
                    <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                            ⚙️ Preferências & Horário Silencioso
                        </Typography>
                        <Card variant="outlined" sx={{ p: 2.5, bgcolor: 'background.paper', borderRadius: 2 }}>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Escolha quando e como você quer ser notificado sobre designações e avisos da equipe.
                            </Typography>

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Início do Horário Silencioso"
                                        type="time"
                                        defaultValue="22:00"
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        inputProps={{ step: 300 }}
                                        helperText="Ex: Notificações pausadas às 22:00"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        label="Fim do Horário Silencioso"
                                        type="time"
                                        defaultValue="07:00"
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        inputProps={{ step: 300 }}
                                        helperText="Ex: Notificações retomadas às 07:00"
                                    />
                                </Grid>
                            </Grid>
                        </Card>
                    </Grid>

                    {isEditMode ? (
                        <Grid item xs={12} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                            <Button variant="outlined" onClick={() => setIsEditMode(false)}>Cancelar</Button>
                            <Button variant="contained" onClick={handleSaveProfile} disabled={loading}>Salvar</Button>
                        </Grid>
                    ) : (
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                            <Button variant="contained" startIcon={<EditIcon />} onClick={() => setIsEditMode(true)}>Editar Perfil</Button>
                        </Grid>
                    )}
                </Grid>
            </Paper>
            <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>{snackbarMessage}</Alert>
            </Snackbar>
        </Container>
    );
}

export default ConfiguracoesPerfil;