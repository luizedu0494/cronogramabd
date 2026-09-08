import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseConfig';
import { userService } from '../../services/userService';
import {
    Container, Typography, Box, Paper, CircularProgress, Alert, Button, Grid,
    TextField, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Avatar
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
    
    const [telegramChatId, setTelegramChatId] = useState('');
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
                        setTelegramChatId(data.telegram_chat_id || data.telegramChatId || '');
                        setPhotoURL(data.photo_url || data.photoURL || '');
                    } else {
                        setError("Perfil não encontrado no banco de dados.");
                    }
                } else {
                    setError("Sessão do usuário não identificada.");
                }

                if ('Notification' in window && Notification.permission === 'granted') {
                    setPushAtivo(true);
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
                        telegram_chat_id: telegramChatId,
                        photo_url: photoURL
                    })
                    .eq('email', userProfile.email);

                if (error) throw error;

                const updated = { ...userProfile, name: editedName, telegram_chat_id: telegramChatId, photo_url: photoURL };
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

    const handleAtivarPush = async () => {
        setPushLoading(true);
        console.log('[PUSH] Iniciando processo de ativação de notificações...');
        try {
            if (!('Notification' in window)) {
                console.error('[PUSH] Navegador não possui a API Notification.');
                throw new Error('Navegador não suporta notificações Push.');
            }

            console.log('[PUSH] Solicitando permissão ao usuário...');
            const permission = await Notification.requestPermission();
            console.log('[PUSH] Permissão obtida:', permission);
            if (permission !== 'granted') {
                throw new Error('Permissão de notificação negada pelo usuário.');
            }

            setPushAtivo(true);
            setSnackbarMessage('Notificações Push ativadas com sucesso neste dispositivo!');
            setSnackbarSeverity('success');
            setOpenSnackbar(true);
        } catch (err) {
            console.error('[PUSH ERRO COMPLETO]:', err);
            let userMsg = err.message || 'Erro ao ativar notificações Push.';
            setSnackbarMessage(userMsg);
            setSnackbarSeverity("error");
            setOpenSnackbar(true);
        } finally {
            console.log('[PUSH] Finalizado');
            setPushLoading(false);
        }
    };

    const handleCloseSnackbar = (event, reason) => { if (reason === 'clickaway') return; setOpenSnackbar(false); };

    if (loading) return <Container sx={{ textAlign: 'center', mt: 4 }}><CircularProgress /></Container>;
    if (error) return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
    if (!userProfile) return null;

    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
                <Typography variant="h5" gutterBottom align="center" sx={{ mb: 3 }}>Configurações do Perfil</Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3, gap: 2 }}>
                    <Avatar src={photoURL} sx={{ width: 100, height: 100 }} />
                    <UploadImagem
                        onUploadSucesso={handleUploadFotoSucesso}
                        pasta="cronolab/avatars"
                        rotulo="Alterar Foto de Perfil"
                    />
                </Box>

                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField fullWidth label="Nome" value={editedName} onChange={(e) => setEditedName(e.target.value)} disabled={!isEditMode} />
                    </Grid>
                     <Grid item xs={12}>
                        <TextField fullWidth label="Telegram Chat ID" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} disabled={!isEditMode} helperText="Seu ID para receber notificações do Telegram." />
                    </Grid>
                    <Grid item xs={12}><TextField fullWidth label="Email" value={userProfile.email} disabled /></Grid>
                    <Grid item xs={12}><TextField fullWidth label="Cargo" value={userProfile.role || 'Pendente'} disabled /></Grid>
                    
                    <Grid item xs={12}>
                        <Alert severity={pushAtivo ? "success" : "info"} sx={{ mb: 1 }}>
                            {pushAtivo 
                              ? "As Notificações Push estão ativadas e autorizadas neste navegador."
                              : "Clique abaixo para receber alertas instantâneos de aulas e avisos. Certifique-se de permitir as notificações na janela/pop-up do navegador (ícone 🔒 do lado da URL)."
                            }
                        </Alert>
                        <Button
                            variant={pushAtivo ? "contained" : "outlined"}
                            color={pushAtivo ? "success" : "primary"}
                            startIcon={pushLoading ? <CircularProgress size={20} color="inherit" /> : <NotificationsIcon />}
                            onClick={handleAtivarPush}
                            disabled={pushLoading}
                            fullWidth
                        >
                            {pushLoading 
                              ? 'Ativando Notificações...' 
                              : pushAtivo 
                                ? 'Notificações Push Ativas neste Dispositivo' 
                                : 'Ativar Notificações Push no Navegador'
                            }
                        </Button>
                    </Grid>

                    {isEditMode ? (
                        <Grid item xs={12} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            <Button variant="outlined" onClick={() => setIsEditMode(false)}>Cancelar</Button>
                            <Button variant="contained" onClick={handleSaveProfile} disabled={loading}>Salvar</Button>
                        </Grid>
                    ) : (
                        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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