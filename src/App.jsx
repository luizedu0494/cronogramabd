import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './supabaseConfig';
import { userService } from './services/userService';
import getAppTheme from './theme';
import cesmacLogo from './assets/images/cesmac-logo.png';
import {
    AppBar, Toolbar, Typography, Button, Container, Box,
    CircularProgress, Snackbar, Alert, IconButton, Menu, MenuItem, Badge, Chip,
    ThemeProvider, CssBaseline, useMediaQuery, Avatar, Divider, Paper,
    Drawer, BottomNavigation, BottomNavigationAction, List, ListItemButton,
    ListItemIcon, ListItemText, Collapse
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import 'dayjs/locale/pt-br';
import AccountCircle from '@mui/icons-material/AccountCircle';
import {
    Menu as MenuIcon, Sun, Moon, LogOut, User, HelpCircle, UserCheck, Users, CalendarOff, Settings, Bell, ListTodo, Calendar, LayoutDashboard, ThumbsUp, PlusCircle, Download, BarChart, Bug, History, Bot, FlaskConical, Search, ChevronDown, ChevronUp
} from 'lucide-react';


import PromptInstalacaoPWA from './componentes/comuns/PromptInstalacaoPWA';

// --- LAZY LOADING DE PÁGINAS COM TRATAMENTO DE RE-DEPLOY ---
const lazyWithRetry = (componentImport) =>
    lazy(async () => {
        const pageHasAlreadyBeenReloaded = JSON.parse(
            window.sessionStorage.getItem('page-has-been-reloaded') || 'false'
        );
        try {
            const component = await componentImport();
            window.sessionStorage.setItem('page-has-been-reloaded', 'false');
            return component;
        } catch (error) {
            if (!pageHasAlreadyBeenReloaded) {
                window.sessionStorage.setItem('page-has-been-reloaded', 'true');
                window.location.reload();
            }
            throw error;
        }
    });

const ProporAulaForm = lazyWithRetry(() => import('./ProporAulaForm'));
const ProporEventoForm = lazyWithRetry(() => import('./ProporEventoForm'));
const MinhasPropostas = lazyWithRetry(() => import('./MinhasPropostas'));
const GerenciarAprovacoes = lazyWithRetry(() => import('./pages/Gerenciar/GerenciarAprovacoes'));
const GerenciarUsuarios = lazyWithRetry(() => import('./pages/Gerenciar/GerenciarUsuarios'));
const CalendarioCronograma = lazyWithRetry(() => import('./pages/Cronograma/CalendarioCronograma'));
const MinhasDesignacoes = lazyWithRetry(() => import('./MinhasDesignacoes'));
const PainelAvisos = lazyWithRetry(() => import('./PainelAvisos'));
const GerenciarAvisos = lazyWithRetry(() => import('./pages/Gerenciar/GerenciarAvisos'));
const AjudaFAQ = lazyWithRetry(() => import('./AjudaFAQ'));
const ConfiguracoesPerfil = lazyWithRetry(() => import('./pages/Perfil/ConfiguracoesPerfil'));
const PaginaInicial = lazyWithRetry(() => import('./pages/Cronograma/PaginaInicial'));
const GerenciarPeriodos = lazyWithRetry(() => import('./pages/Gerenciar/GerenciarPeriodos'));
const DownloadCronograma = lazyWithRetry(() => import('./DownloadCronograma'));
const AnaliseAulas = lazyWithRetry(() => import('./pages/Gerenciar/AnaliseAulas'));
const AnaliseEventos = lazyWithRetry(() => import('./pages/Gerenciar/AnaliseEventos'));
const VerificarIntegridadeDados = lazyWithRetry(() => import('./pages/Gerenciar/VerificarIntegridadeDados'));
const HistoricoAulas = lazyWithRetry(() => import('./pages/Cronograma/HistoricoAulas'));
const AssistenteIA = lazyWithRetry(() => import('./pages/IA/AssistenteIA'));
const CalendarioRevisoesTecnico = lazyWithRetry(() => import('./pages/Cronograma/CalendarioRevisoesTecnico'));
const UploadCronogramaExterno = lazyWithRetry(() => import('./UploadCronogramaExterno'));
const GerenciarEventosAvancado = lazyWithRetry(() => import('./GerenciarEventosAvancado'));
const ConsultaDisponibilidade = lazyWithRetry(() => import('./ConsultaDisponibilidade'));

const LoadingFallback = () => (<Box display="flex" justifyContent="center" alignItems="center" height="80vh"><CircularProgress /></Box>);
const MainLayout = () => (<Container maxWidth="xl" sx={{ mt: { xs: 1.5, sm: 4 }, mb: { xs: 8, sm: 4 }, px: { xs: 1.5, sm: 3 } }}><Outlet /></Container>);
const LoginScreen = ({ emailInput, setEmailInput, passwordInput, setPasswordInput, handleDirectLogin, handleGoogleLogin, handleForgotPassword, handlePublicGuestAccess, isLoggingIn, isRegistering, setIsRegistering, nameInput, setNameInput }) => (
    <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', py: 4 }}>
        <Paper elevation={4} sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center', maxWidth: 440, width: '100%', borderRadius: 3 }}>
            <img src={cesmacLogo} alt="Logo CESMAC" style={{ height: '55px', marginBottom: '16px' }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>Cronograma Lab</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Plataforma de Gestão de Laboratórios CESMAC
            </Typography>

            {/* BOTÃO DE ACESSO RÁPIDO PÚBLICO (ALUNOS E PROFESSORES) */}
            <Paper 
                elevation={0} 
                sx={{ 
                    p: 2, 
                    mb: 3, 
                    bgcolor: 'rgba(30, 126, 200, 0.06)', 
                    border: '1px solid rgba(30, 126, 200, 0.2)', 
                    borderRadius: 2 
                }}
            >
                <Typography variant="subtitle2" fontWeight={700} color="primary" gutterBottom>
                    🎓 Alunos e Professores
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                    Consulte os horários dos laboratórios em tempo real sem precisar de aprovação de conta.
                </Typography>
                <Button 
                    variant="contained" 
                    color="primary" 
                    fullWidth 
                    size="medium"
                    onClick={handlePublicGuestAccess}
                    sx={{ 
                        fontWeight: 700, 
                        textTransform: 'none', 
                        boxShadow: '0 2px 8px rgba(30,126,200,0.25)',
                        bgcolor: '#1E7EC8',
                        '&:hover': { bgcolor: '#1565C0' }
                    }}
                >
                    Visualizar Calendário (Acesso Público)
                </Button>
            </Paper>

            <Divider sx={{ my: 2, fontSize: '0.82rem', color: 'text.secondary' }}>área restrita da equipe</Divider>

            <Box component="form" onSubmit={handleDirectLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                <Typography variant="subtitle2" align="left" fontWeight={600}>
                    {isRegistering ? 'Solicitar Acesso à Equipe:' : 'Login de Técnico / Coordenação:'}
                </Typography>

                {isRegistering && (
                    <input
                        type="text"
                        placeholder="Nome completo"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        required
                        style={{
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.95rem',
                            outline: 'none',
                            width: '100%'
                        }}
                    />
                )}

                <input
                    type="email"
                    placeholder="E-mail corporativo / institucional"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.95rem',
                        outline: 'none',
                        width: '100%'
                    }}
                />

                <input
                    type="password"
                    placeholder="Sua Senha"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                    style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '0.95rem',
                        outline: 'none',
                        width: '100%'
                    }}
                />

                {!isRegistering && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -0.5 }}>
                        <Button 
                            variant="text" 
                            size="small" 
                            onClick={handleForgotPassword}
                            sx={{ fontSize: '0.8rem', textTransform: 'none', color: '#1E7EC8' }}
                        >
                            Esqueceu a senha?
                        </Button>
                    </Box>
                )}

                <Button 
                    type="submit" 
                    variant="contained" 
                    fullWidth
                    size="large"
                    disabled={!emailInput || !passwordInput || isLoggingIn}
                    sx={{ background: 'linear-gradient(135deg, #1E7EC8 0%, #00C853 100%)', fontWeight: 700, py: 1.2 }}
                >
                    {isLoggingIn ? 'Acessando...' : isRegistering ? 'Solicitar Cadastro da Equipe' : 'Entrar como Equipe'}
                </Button>
            </Box>

            <Box sx={{ mb: 2 }}>
                <Button 
                    variant="text" 
                    size="small" 
                    onClick={() => setIsRegistering(!isRegistering)}
                    sx={{ fontSize: '0.85rem', textTransform: 'none', fontWeight: 600, color: '#334155' }}
                >
                    {isRegistering ? 'Já tem conta de equipe? Faça Login' : 'Novo Técnico/Coordenador? Cadastre-se'}
                </Button>
            </Box>

            <Divider sx={{ my: 1.5, fontSize: '0.8rem', color: 'text.secondary' }}>ou com conta corporativa Google</Divider>

            <Button 
                variant="outlined" 
                fullWidth
                size="large"
                onClick={handleGoogleLogin} 
                disabled={isLoggingIn}
                startIcon={
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                }
                sx={{ 
                    color: '#374151', 
                    borderColor: '#CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontWeight: 600,
                    textTransform: 'none',
                    py: 1.2,
                    borderRadius: 2,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    '&:hover': {
                        backgroundColor: '#F8FAFC',
                        borderColor: '#94A3B8',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.12)'
                    }
                }}
            >
                Entrar com o Google da Equipe
            </Button>
        </Paper>
    </Container>
);

function App() {
    const [user, setUser] = useState(null);
    const [userProfileData, setUserProfileData] = useState(null);
    const [pendingProposalsCount, setPendingProposalsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [anchorEl, setAnchorEl] = useState(null);
    const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState(null);
    const [coordenadorMenuAnchorEl, setCoordenadorMenuAnchorEl] = useState(null);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('themeMode') === 'dark');

    const theme = useMemo(() => getAppTheme(darkMode ? 'dark' : 'light'), [darkMode]);
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleThemeChange = () => { const newMode = !darkMode; setDarkMode(newMode); localStorage.setItem('themeMode', newMode ? 'dark' : 'light'); };
    
    useEffect(() => {
        setLoading(true);
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUser(session.user);
                    const profile = await userService.upsertUser(session.user);
                    setUserProfileData(profile);
                } else {
                    const localSession = localStorage.getItem('cronolab_user_session');
                    if (localSession) {
                        const parsed = JSON.parse(localSession);
                        setUser(parsed);
                        const profile = await userService.getUserProfile(parsed.email);
                        setUserProfileData(profile || parsed);
                    } else {
                        setUser(null);
                        setUserProfileData(null);
                    }
                }
            } catch (err) {
                console.error("Erro ao verificar sessão Supabase:", err);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUser(session.user);
                const profile = await userService.upsertUser(session.user);
                setUserProfileData(profile);
            }
        });

        return () => subscription?.unsubscribe();
    }, []);

    useEffect(() => {
        if (userProfileData?.role !== 'coordenador') return;
        const fetchPending = async () => {
            try {
                const { data } = await supabase.from('aulas').select('id').eq('status', 'pendente');
                setPendingProposalsCount(data?.length || 0);
            } catch (e) {
                console.error('Erro ao buscar pendências:', e);
            }
        };
        fetchPending();
    }, [userProfileData?.role]);
    
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    const handleGoogleLogin = async () => {
        if (isLoggingIn) return; 
        setIsLoggingIn(true);
        try {
            await userService.loginWithGoogle();
        } catch (error) { 
            setSnackbarMessage("O provedor Google OAuth do Supabase precisa de Client ID no painel. Utilize a entrada direta por e-mail e senha abaixo!"); 
            setSnackbarSeverity("info"); 
            setOpenSnackbar(true); 
        } finally { 
            setIsLoggingIn(false); 
        }
    };

    const handleForgotPassword = async () => {
        const targetEmail = emailInput.trim().toLowerCase();
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!targetEmail || !emailRegex.test(targetEmail)) {
            setSnackbarMessage("Digite seu e-mail no campo acima para enviarmos o link de recuperação de senha.");
            setSnackbarSeverity("warning");
            setOpenSnackbar(true);
            return;
        }

        setIsLoggingIn(true);
        try {
            await userService.resetPassword(targetEmail);
            setSnackbarMessage(`Enviamos um e-mail para ${targetEmail} com as instruções de redefinição!`);
            setSnackbarSeverity("success");
            setOpenSnackbar(true);
        } catch (err) {
            setSnackbarMessage(`Não foi possível enviar a redefinição: ${err.message}`);
            setSnackbarSeverity("error");
            setOpenSnackbar(true);
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleDirectLogin = async (e, customEmail = null) => {
        e?.preventDefault();
        const targetEmail = (customEmail || emailInput || '').trim().toLowerCase();
        
        // Validação estrita de formato de e-mail
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!targetEmail || !emailRegex.test(targetEmail)) {
            setSnackbarMessage("Por favor, informe um endereço de e-mail válido (exemplo: usuario@dominio.com).");
            setSnackbarSeverity("warning");
            setOpenSnackbar(true);
            return;
        }

        if (!passwordInput || passwordInput.length < 6) {
            setSnackbarMessage("A senha precisa ter pelo menos 6 caracteres por motivos de segurança.");
            setSnackbarSeverity("warning");
            setOpenSnackbar(true);
            return;
        }

        setIsLoggingIn(true);
        try {
            if (isRegistering) {
                // Registrar novo usuário no Supabase Auth
                await userService.registerWithPassword(targetEmail, passwordInput, nameInput || targetEmail.split('@')[0]);
                const newPendingUser = {
                    uid: `usr_${Date.now()}`,
                    name: nameInput || targetEmail.split('@')[0],
                    email: targetEmail,
                    role: null,
                    status: 'pendente',
                    approval_pending: true,
                    approvalPending: true
                };
                await userService.upsertUser(newPendingUser);
                localStorage.setItem('cronolab_user_session', JSON.stringify(newPendingUser));
                setUser(newPendingUser);
                setUserProfileData(newPendingUser);
                setSnackbarMessage("Conta criada com sucesso! Aguardando aprovação do Coordenador.");
                setSnackbarSeverity("success");
                setOpenSnackbar(true);
            } else {
                // Tentar autenticação via Supabase Auth ou Perfil existente
                try {
                    await userService.loginWithPassword(targetEmail, passwordInput);
                } catch (authErr) {
                    console.log('Login via Supabase Auth direto:', authErr.message);
                }

                const profile = await userService.getUserProfile(targetEmail);
                
                if (profile) {
                    localStorage.setItem('cronolab_user_session', JSON.stringify(profile));
                    setUser(profile);
                    setUserProfileData(profile);
                    setSnackbarMessage(`Bem-vindo, ${profile.name}!`); 
                    setSnackbarSeverity("success"); 
                    setOpenSnackbar(true);
                } else {
                    const newViewerUser = {
                        uid: `usr_${Date.now()}`,
                        name: targetEmail.split('@')[0],
                        email: targetEmail,
                        role: 'visualizador',
                        status: 'aprovado',
                        approval_pending: false,
                        approvalPending: false
                    };
                    await userService.upsertUser(newViewerUser);
                    localStorage.setItem('cronolab_user_session', JSON.stringify(newViewerUser));
                    setUser(newViewerUser);
                    setUserProfileData(newViewerUser);
                    setSnackbarMessage("Conta criada com sucesso! Acesso à visualização do calendário liberado."); 
                    setSnackbarSeverity("success"); 
                    setOpenSnackbar(true);
                }
            }
        } catch (err) {
            setSnackbarMessage(`Erro ao acessar: ${err.message}`); 
            setSnackbarSeverity("error"); 
            setOpenSnackbar(true);
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = async () => { 
        await userService.logout();
        setUser(null);
        setUserProfileData(null);
        handleMenuClose(); 
    };
    const handleCloseSnackbar = (event, reason) => { if (reason === 'clickaway') return; setOpenSnackbar(false); };
    const handleProfileMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => { setAnchorEl(null); setMobileMoreAnchorEl(null); setCoordenadorMenuAnchorEl(null); };
    const handleMobileMenuOpen = (event) => setMobileMoreAnchorEl(event.currentTarget);
    const handleCoordenadorMenuOpen = (event) => {
        setMobileMoreAnchorEl(null);
        setCoordenadorMenuAnchorEl(event.currentTarget);
    };
    
    const handlePublicGuestAccess = () => {
        const guestUser = {
            uid: `guest_visitor`,
            name: 'Visitante (Aluno / Professor)',
            email: 'visitante@cesmac.edu.br',
            role: 'visualizador',
            status: 'aprovado',
            approval_pending: false,
            approvalPending: false
        };
        localStorage.setItem('cronolab_user_session', JSON.stringify(guestUser));
        setUser(guestUser);
        setUserProfileData(guestUser);
        setSnackbarMessage("Acesso público ativado. Bem-vindo(a) ao Calendário!");
        setSnackbarSeverity("info");
        setOpenSnackbar(true);
    };

    const role = userProfileData?.role || 'visualizador';
    const isApproved = userProfileData?.status !== 'rejeitado' && (userProfileData?.status === 'aprovado' || userProfileData?.approval_pending === false || userProfileData?.approvalPending === false || userProfileData?.role === 'visualizador');
    const approvalPending = !isApproved;
    const isCoordenadorOrTecnico = role === 'coordenador' || role === 'tecnico';
    
    if (loading) return <LoadingFallback />;
    
    const PendingApprovalScreen = () => {
        const isRejeitado = userProfileData?.status === 'rejeitado';
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', py: 4 }}>
                <Paper elevation={4} sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center', maxWidth: 460, width: '100%', borderRadius: 3 }}>
                    <img src={cesmacLogo} alt="Logo CESMAC" style={{ height: '55px', marginBottom: '16px' }} />
                    
                    {isRejeitado ? (
                        <>
                            <Typography variant="h5" fontWeight={700} color="error" gutterBottom>
                                Acesso Não Autorizado
                            </Typography>
                            <Alert severity="error" sx={{ my: 2, textAlign: 'left' }}>
                                Seu cadastro neste e-mail (<strong>{userProfileData?.email}</strong>) foi analisado e <strong>recusado/desativado</strong> pela coordenação dos laboratórios.
                            </Alert>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Se você acredita que isto é um engano, entre em contato diretamente com a coordenação para solicitar a liberação do seu perfil.
                            </Typography>
                        </>
                    ) : (
                        <>
                            <Typography variant="h5" fontWeight={700} color="warning.main" gutterBottom>
                                Cadastro em Análise
                            </Typography>
                            <Alert severity="warning" sx={{ my: 2, textAlign: 'left' }}>
                                Seu cadastro (<strong>{userProfileData?.email}</strong>) está pendente de aprovação pela coordenação.
                            </Alert>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Assim que o seu perfil for aprovado e o cargo (Coordenador ou Técnico) for atribuído, você terá acesso total às funcionalidades da plataforma.
                            </Typography>
                        </>
                    )}

                    <Button variant="contained" color="primary" fullWidth onClick={handleLogout} sx={{ py: 1.2, fontWeight: 700 }}>
                        Sair / Voltar à Tela Inicial
                    </Button>
                </Paper>
            </Container>
        );
    };
    const CoordenadorGerenciarMenu = () => (
        <Menu 
            anchorEl={coordenadorMenuAnchorEl} 
            open={Boolean(coordenadorMenuAnchorEl)} 
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
            <MenuItem component={Link} to="/gerenciar-aprovacoes" onClick={handleMenuClose}>
                <ListItemIcon>
                    <Badge badgeContent={pendingProposalsCount} color="error">
                        <ThumbsUp size={18} />
                    </Badge>
                </ListItemIcon>
                <ListItemText primary="Aprovações" primaryTypographyProps={{ noWrap: true }} />
            </MenuItem>
            <MenuItem component={Link} to="/analise-aulas" onClick={handleMenuClose}>
                <ListItemIcon><BarChart size={18} /></ListItemIcon>
                <ListItemText primary="Análise de Aulas" primaryTypographyProps={{ noWrap: true }} />
            </MenuItem>
            <MenuItem component={Link} to="/analise-eventos" onClick={handleMenuClose}>
                <ListItemIcon><BarChart size={18} /></ListItemIcon>
                <ListItemText primary="Análise de Eventos" primaryTypographyProps={{ noWrap: true }} />
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem component={Link} to="/verificar-integridade" onClick={handleMenuClose}>
                <ListItemIcon><Bug size={18} /></ListItemIcon>
                <ListItemText primary="Integridade" primaryTypographyProps={{ noWrap: true }} />
            </MenuItem>
        </Menu>
    );
    
    const navMenuItems = role === 'visualizador' ? [
        <MenuItem key="cal" component={Link} to="/calendario" onClick={handleMenuClose}><ListItemIcon><Calendar size={18} /></ListItemIcon><ListItemText primary="Calendário" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
        <MenuItem key="ia" component={Link} to="/assistente-ia" onClick={handleMenuClose}><ListItemIcon><Bot size={18} /></ListItemIcon><ListItemText primary="Assistente IA" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
        <MenuItem key="ajuda" component={Link} to="/ajuda" onClick={handleMenuClose}><ListItemIcon><HelpCircle size={18} /></ListItemIcon><ListItemText primary="Dúvidas do Visitante" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
        <Divider key="div-guest" sx={{ my: 0.5 }} />,
        <MenuItem key="sair-guest" onClick={handleLogout} sx={{ color: 'error.main' }}><ListItemIcon><LogOut size={18} color="red" /></ListItemIcon><ListItemText primary="Sair do Modo Visitante" primaryTypographyProps={{ noWrap: true }} /></MenuItem>
    ] : [
        <MenuItem key="painel" component={Link} to="/" onClick={handleMenuClose}><ListItemIcon><LayoutDashboard size={18} /></ListItemIcon><ListItemText primary="Painel" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
        <MenuItem key="cal" component={Link} to="/calendario" onClick={handleMenuClose}><ListItemIcon><Calendar size={18} /></ListItemIcon><ListItemText primary="Calendário" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
        !approvalPending ? <MenuItem key="historico" component={Link} to="/historico-aulas" onClick={handleMenuClose}><ListItemIcon><History size={18} /></ListItemIcon><ListItemText primary="Histórico" primaryTypographyProps={{ noWrap: true }} /></MenuItem> : null,
        !approvalPending ? <MenuItem key="avisos" component={Link} to="/avisos" onClick={handleMenuClose}><ListItemIcon><Bell size={18} /></ListItemIcon><ListItemText primary="Avisos" primaryTypographyProps={{ noWrap: true }} /></MenuItem> : null,
        !approvalPending ? <MenuItem key="ia" component={Link} to="/assistente-ia" onClick={handleMenuClose}><ListItemIcon><Bot size={18} /></ListItemIcon><ListItemText primary="Assistente IA" primaryTypographyProps={{ noWrap: true }} /></MenuItem> : null,
        <Divider key="div1" sx={{ my: 0.5 }} />,
        ...(role === 'coordenador' && !approvalPending ? [
            <MenuItem key="agend" component={Link} to="/propor-aula" onClick={handleMenuClose}><ListItemIcon><PlusCircle size={18} /></ListItemIcon><ListItemText primary="Agendar Aula" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <MenuItem key="agend-evento" component={Link} to="/propor-evento" onClick={handleMenuClose}><ListItemIcon><PlusCircle size={18} /></ListItemIcon><ListItemText primary="Agendar Evento" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <MenuItem key="gerenciar-eventos-avancado" component={Link} to="/gerenciar-eventos-avancado" onClick={handleMenuClose}><ListItemIcon><CalendarOff size={18} /></ListItemIcon><ListItemText primary="Gerenciar Eventos" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <MenuItem key="consulta-disponibilidade" component={Link} to="/consulta-disponibilidade" onClick={handleMenuClose}><ListItemIcon><Search size={18} /></ListItemIcon><ListItemText primary="Consulta Disponibilidade" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <MenuItem key="gerenciar-menu" onClick={handleCoordenadorMenuOpen}><ListItemIcon><ListTodo size={18} /></ListItemIcon><ListItemText primary="Gerenciar" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <MenuItem key="users" component={Link} to="/gerenciar-usuarios" onClick={handleMenuClose}><ListItemIcon><Users size={18} /></ListItemIcon><ListItemText primary="Usuários" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <MenuItem key="importar-externo" component={Link} to="/importar-cronograma-externo" onClick={handleMenuClose}><ListItemIcon><Download size={18} /></ListItemIcon><ListItemText primary="Importar Cronograma" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <MenuItem key="periodos" component={Link} to="/gerenciar-periodos" onClick={handleMenuClose}><ListItemIcon><CalendarOff size={18} /></ListItemIcon><ListItemText primary="Períodos Eventos" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <MenuItem key="gerenciar-avisos" component={Link} to="/gerenciar-avisos" onClick={handleMenuClose}><ListItemIcon><Settings size={18} /></ListItemIcon><ListItemText primary="Gerenciar Avisos" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
        ] : []),
        ...(role === 'tecnico' && !approvalPending ? [
            <MenuItem key="aula" component={Link} to="/propor-aula" onClick={handleMenuClose}><ListItemIcon><PlusCircle size={18} /></ListItemIcon><ListItemText primary="Propor Atividade" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <MenuItem key="consulta-disponibilidade-tec" component={Link} to="/consulta-disponibilidade" onClick={handleMenuClose}><ListItemIcon><Search size={18} /></ListItemIcon><ListItemText primary="Consulta Disponibilidade" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <MenuItem key="design" component={Link} to="/minhas-designacoes" onClick={handleMenuClose}><ListItemIcon><UserCheck size={18} /></ListItemIcon><ListItemText primary="Designações" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <MenuItem key="prop" component={Link} to="/minhas-propostas" onClick={handleMenuClose}><ListItemIcon><ListTodo size={18} /></ListItemIcon><ListItemText primary="Minhas Propostas" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <MenuItem key="revisoes" component={Link} to="/revisoes" onClick={handleMenuClose}><ListItemIcon><FlaskConical size={18} /></ListItemIcon><ListItemText primary="Revisões" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
        ] : []),
        <Divider key="div2" sx={{ my: 0.5 }} />,
        isCoordenadorOrTecnico && !approvalPending ? (<MenuItem key="download-cronograma" component={Link} to="/download-cronograma" onClick={handleMenuClose}><ListItemIcon><Download size={18} /></ListItemIcon><ListItemText primary="Baixar Cronograma" primaryTypographyProps={{ noWrap: true }} /></MenuItem>) : null,
        !approvalPending ? <MenuItem key="ajuda" component={Link} to="/ajuda" onClick={handleMenuClose}><ListItemIcon><HelpCircle size={18} /></ListItemIcon><ListItemText primary="Ajuda/FAQ" primaryTypographyProps={{ noWrap: true }} /></MenuItem> : null
    ];

    const cleanMenuItems = (items) => {
        const activeItems = items.filter(Boolean);
        return activeItems.filter((item, idx) => {
            if (item.type === Divider) {
                if (idx === 0 || idx === activeItems.length - 1) return false;
                if (activeItems[idx - 1]?.type === Divider) return false;
            }
            return true;
        });
    };

    const renderMobileMenu = (
        <Menu 
            anchorEl={mobileMoreAnchorEl} 
            open={Boolean(mobileMoreAnchorEl)} 
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
            {cleanMenuItems(navMenuItems)}
            {role !== 'visualizador' && [
                <Divider key="div-prof" sx={{ my: 0.5 }} />,
                <MenuItem key="perfil" component={Link} to="/perfil" onClick={handleMenuClose}>
                    <ListItemIcon><User size={18} /></ListItemIcon>
                    <ListItemText primary="Perfil" primaryTypographyProps={{ noWrap: true }} />
                </MenuItem>,
                <MenuItem key="logout" onClick={handleLogout}>
                    <ListItemIcon><LogOut size={18} /></ListItemIcon>
                    <ListItemText primary="Sair" primaryTypographyProps={{ noWrap: true }} />
                </MenuItem>
            ]}
        </Menu>
    );
    const renderProfileMenu = (
        <Menu 
            anchorEl={anchorEl} 
            open={Boolean(anchorEl)} 
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
            {role !== 'visualizador' && (
                <MenuItem component={Link} to="/perfil" onClick={handleMenuClose}>
                    <ListItemIcon><User size={18} /></ListItemIcon>
                    <ListItemText primary="Perfil" primaryTypographyProps={{ noWrap: true }} />
                </MenuItem>
            )}
            <MenuItem onClick={handleLogout}>
                <ListItemIcon><LogOut size={18} /></ListItemIcon>
                <ListItemText primary={role === 'visualizador' ? "Sair do Modo Visitante" : "Sair"} primaryTypographyProps={{ noWrap: true }} />
            </MenuItem>
        </Menu>
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                    {user && !approvalPending && (
                        <AppBar 
                            position="static"
                            sx={{
                                bgcolor: darkMode ? '#0B132B' : '#ffffff',
                                color: darkMode ? '#ffffff' : '#1A202C',
                                borderBottom: '2px solid',
                                borderImage: 'linear-gradient(90deg, #1E7EC8, #00C853) 1',
                                boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.06)'
                            }}
                        >
                            <Toolbar>
                                <Box component={Link} to={role === 'visualizador' ? "/calendario" : "/"} sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit', flexGrow: 1, gap: 1 }}>
                                    <img src={cesmacLogo} alt="Logo CESMAC" style={{ height: '35px', marginRight: '4px' }} />
                                    {!isMobile && (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="h6" fontWeight={700} noWrap>Cronograma Lab</Typography>
                                            <Chip 
                                                label={role === 'visualizador' ? "Modo Visitante" : "v2.0 • PostgreSQL"} 
                                                size="small" 
                                                sx={{ 
                                                    height: 22, 
                                                    fontSize: '0.68rem', 
                                                    fontWeight: 700, 
                                                    background: role === 'visualizador' ? 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)' : 'linear-gradient(135deg, #1E7EC8 0%, #00C853 100%)', 
                                                    color: '#ffffff',
                                                    borderRadius: '6px',
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                                }} 
                                            />
                                        </Box>
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <IconButton onClick={handleThemeChange} color="inherit" aria-label="Alternar tema">
                                        {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
                                    </IconButton>
                                    {role === 'visualizador' ? (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={handleLogout}
                                            startIcon={<LogOut size={16} />}
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                fontSize: '0.8rem',
                                                ml: 1,
                                                borderRadius: 2,
                                                borderColor: 'rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            Sair
                                        </Button>
                                    ) : (
                                        <IconButton onClick={handleProfileMenuOpen} color="inherit" aria-label="Menu de perfil">
                                            {(userProfileData?.photo_url || userProfileData?.photoURL) ? (
                                                <Avatar src={userProfileData.photo_url || userProfileData.photoURL} sx={{ width: 28, height: 28 }} />
                                            ) : (
                                                <AccountCircle sx={{ fontSize: 28 }} />
                                            )}
                                        </IconButton>
                                    )}
                                    <IconButton edge="end" onClick={handleMobileMenuOpen} color="inherit" aria-label="Menu principal">
                                        <MenuIcon size={22} />
                                    </IconButton>
                                </Box>
                            </Toolbar>
                        </AppBar>
                    )}
                    {renderMobileMenu} {renderProfileMenu} {role === 'coordenador' && <CoordenadorGerenciarMenu />}
                    <Suspense fallback={<LoadingFallback />}>
                        <Routes>
                             {!user ? (
                                <Route 
                                    path="*" 
                                    element={
                                        <LoginScreen 
                                            emailInput={emailInput} 
                                            setEmailInput={setEmailInput} 
                                            passwordInput={passwordInput} 
                                            setPasswordInput={setPasswordInput} 
                                            handleDirectLogin={handleDirectLogin} 
                                            handleGoogleLogin={handleGoogleLogin} 
                                            handleForgotPassword={handleForgotPassword} 
                                            handlePublicGuestAccess={handlePublicGuestAccess}
                                            isLoggingIn={isLoggingIn} 
                                            isRegistering={isRegistering} 
                                            setIsRegistering={setIsRegistering} 
                                            nameInput={nameInput} 
                                            setNameInput={setNameInput} 
                                        />
                                    } 
                                />
                             ) : approvalPending ? (<Route path="*" element={<PendingApprovalScreen />} />) : (
                                <Route element={<MainLayout />}>
                                    <Route path="/" element={role === 'visualizador' ? <Navigate to="/calendario" replace /> : <PaginaInicial userInfo={userProfileData}/>} />
                                    <Route path="/calendario" element={<CalendarioCronograma userInfo={userProfileData} />} />
                                    <Route path="/historico-aulas" element={role === 'visualizador' ? <Navigate to="/calendario" replace /> : <HistoricoAulas />} />
                                    <Route path="/propor-aula" element={<ProporAulaForm userInfo={userProfileData} currentUser={user} />} />
                                    <Route path="/propor-evento" element={<ProporEventoForm userInfo={userProfileData} currentUser={user} />} />
                                    <Route path="/propor-aula/:aulaId" element={<ProporAulaForm userInfo={userProfileData} currentUser={user} />} />
                                    <Route path="/propor-evento/:eventoId" element={<ProporEventoForm userInfo={userProfileData} currentUser={user} />} />
                                    <Route path="/avisos" element={<PainelAvisos />} />
                                    <Route path="/ajuda" element={<AjudaFAQ userInfo={userProfileData} />} />
                                    <Route path="/perfil" element={role === 'visualizador' ? <Navigate to="/calendario" replace /> : <ConfiguracoesPerfil />} />
                                    <Route path="/consulta-disponibilidade" element={<ConsultaDisponibilidade />} />
                                    {role === 'tecnico' && (<><Route path="/minhas-propostas" element={<MinhasPropostas />} /><Route path="/minhas-designacoes" element={<MinhasDesignacoes />} /><Route path="/revisoes" element={<CalendarioRevisoesTecnico userInfo={userProfileData} />} /></>)}
                                    {role === 'coordenador' && (<>
                                        <Route path="/gerenciar-aprovacoes" element={<GerenciarAprovacoes />} />
                                        <Route path="/gerenciar-usuarios" element={<GerenciarUsuarios />} />
                                        <Route path="/gerenciar-avisos" element={<GerenciarAvisos />} />
                                        <Route path="/gerenciar-periodos" element={<GerenciarPeriodos />} />
                                        <Route path="/gerenciar-eventos-avancado" element={<GerenciarEventosAvancado userInfo={userProfileData} />} />
                                        <Route path="/analise-aulas" element={<AnaliseAulas />} />
                                        <Route path="/analise-eventos" element={<AnaliseEventos />} />
                                        <Route path="/verificar-integridade" element={<VerificarIntegridadeDados />} />
                                        <Route path="/importar-cronograma-externo" element={<UploadCronogramaExterno />} />
                                    </>)}
                                    <Route path="/assistente-ia" element={<AssistenteIA userInfo={userProfileData} currentUser={user} mode={darkMode ? 'dark' : 'light'} />} />
                                    {isCoordenadorOrTecnico && (<Route path="/download-cronograma" element={<DownloadCronograma />} />)}
                                    <Route path="*" element={<Navigate to={role === 'visualizador' ? "/calendario" : "/"} replace />} />

                                </Route>
                            )}
                        </Routes>
                    </Suspense>
                    <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}><Alert onClose={handleCloseSnackbar} severity={snackbarSeverity}>{snackbarMessage}</Alert></Snackbar>
                    <PromptInstalacaoPWA />
                </LocalizationProvider>
            </Router>
        </ThemeProvider>
    );
}
export default App;