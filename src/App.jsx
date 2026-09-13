import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './supabaseConfig';
import { userService } from './services/userService';
import getAppTheme from './theme';
import cesmacLogo from './assets/images/cesmac-logo.png';
import {
    AppBar, Toolbar, Typography, Button, Container, Box,
    CircularProgress, Snackbar, Alert, IconButton, Menu, MenuItem, Badge, Chip,
    ThemeProvider, CssBaseline, useMediaQuery, Avatar, Divider, Paper,
    Drawer, BottomNavigation, BottomNavigationAction, List, ListItemButton,
    ListItemIcon, ListItemText, Collapse, TextField, InputAdornment
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import 'dayjs/locale/pt-br';
import AccountCircle from '@mui/icons-material/AccountCircle';
import {
    Menu as MenuIcon, Sun, Moon, LogOut, User, HelpCircle, UserCheck, Users, CalendarOff, Settings, Bell, ListTodo, Calendar, LayoutDashboard, ThumbsUp, PlusCircle, Download, BarChart, Bug, History, Bot, FlaskConical, Search, ChevronDown, ChevronUp, Database, Eye, EyeOff
} from 'lucide-react';



import PromptInstalacaoPWA from './componentes/comuns/PromptInstalacaoPWA';
import SmartAppBanner from './components/SmartAppBanner';
import { useNotificacoes } from './hooks/useNotificacoes';
import CentroNotificacoesDrawer from './components/CentroNotificacoesDrawer';

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
const BackupSistema = lazyWithRetry(() => import('./pages/Gerenciar/BackupSistema'));


const LoadingFallback = () => (<Box display="flex" justifyContent="center" alignItems="center" height="80vh"><CircularProgress /></Box>);
const MainLayout = () => (<Container maxWidth="xl" sx={{ mt: { xs: 1.5, sm: 4 }, mb: { xs: 8, sm: 4 }, px: { xs: 1.5, sm: 3 } }}><Outlet /></Container>);
const LoginScreen = ({ emailInput, setEmailInput, passwordInput, setPasswordInput, handleDirectLogin, handleGoogleLogin, handleForgotPassword, handlePublicGuestAccess, isLoggingIn, isRegistering, setIsRegistering, nameInput, setNameInput }) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '82vh', py: 4 }}>
            <Paper 
                elevation={4} 
                sx={{ 
                    p: { xs: 3, sm: 4.5 }, 
                    textAlign: 'center', 
                    maxWidth: 440, 
                    width: '100%', 
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
                }}
            >
                <img 
                    src={cesmacLogo} 
                    alt="Logo CESMAC Centro Universitário" 
                    style={{ height: '56px', width: 'auto', objectFit: 'contain', marginBottom: '16px' }} 
                />
                <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom sx={{ letterSpacing: '-0.02em' }}>
                    Cronograma Lab
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontWeight: 500 }}>
                    Plataforma de Gestão de Laboratórios CESMAC
                </Typography>

                {/* BOTÃO DE ACESSO RÁPIDO PÚBLICO (ALUNOS E PROFESSORES) */}
                <Paper 
                    elevation={0} 
                    sx={{ 
                        p: 2.25, 
                        mb: 3, 
                        bgcolor: 'action.hover', 
                        border: '1px solid',
                        borderColor: 'primary.main',
                        borderRadius: 3 
                    }}
                >
                    <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
                        🎓 Alunos e Professores
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2, lineHeight: 1.45, fontWeight: 500 }}>
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
                            py: 1.1,
                            borderRadius: 2.5,
                            boxShadow: '0 4px 12px rgba(30,126,200,0.25)',
                            '&:hover': {
                                boxShadow: '0 6px 16px rgba(30,126,200,0.35)'
                            }
                        }}
                    >
                        Visualizar Calendário (Acesso Público)
                    </Button>
                </Paper>

                <Divider sx={{ my: 2.5, fontSize: '0.82rem', color: 'text.secondary', fontWeight: 600 }}>
                    ÁREA RESTRITA DA EQUIPE
                </Divider>

                <Box component="form" onSubmit={handleDirectLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                    <Typography variant="subtitle2" align="left" fontWeight={700} color="text.primary">
                        {isRegistering ? 'Solicitar Acesso à Equipe:' : 'Login de Técnico / Coordenação:'}
                    </Typography>

                    {isRegistering && (
                        <TextField
                            label="Nome completo"
                            variant="outlined"
                            fullWidth
                            size="medium"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            required
                            placeholder="Seu nome e sobrenome"
                            inputProps={{ 'aria-label': 'Nome completo' }}
                        />
                    )}

                    <TextField
                        label="E-mail"
                        type="email"
                        variant="outlined"
                        fullWidth
                        size="medium"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        required
                        placeholder="seu.email@exemplo.com"
                        inputProps={{ 'aria-label': 'Endereço de E-mail' }}
                    />

                    <TextField
                        label="Sua Senha"
                        type={showPassword ? 'text' : 'password'}
                        variant="outlined"
                        fullWidth
                        size="medium"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        required
                        placeholder="••••••••"
                        inputProps={{ 'aria-label': 'Sua Senha' }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                                        onClick={() => setShowPassword(!showPassword)}
                                        edge="end"
                                        size="small"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />

                    {!isRegistering && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -0.5 }}>
                            <Button 
                                variant="text" 
                                size="small" 
                                onClick={handleForgotPassword}
                                sx={{ 
                                    fontSize: '0.825rem', 
                                    textTransform: 'none', 
                                    fontWeight: 600,
                                    color: 'primary.main',
                                    p: 0,
                                    '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
                                }}
                            >
                                Esqueceu a senha?
                            </Button>
                        </Box>
                    )}

                    <Button 
                        type="submit" 
                        variant="contained" 
                        color="primary"
                        fullWidth
                        size="large"
                        disabled={!emailInput || !passwordInput || isLoggingIn}
                        sx={{ 
                            fontWeight: 700, 
                            py: 1.3,
                            borderRadius: 2.5,
                            fontSize: '0.95rem',
                            boxShadow: '0 4px 14px rgba(30,126,200,0.3)',
                            '&:hover': {
                                boxShadow: '0 6px 18px rgba(30,126,200,0.4)'
                            }
                        }}
                    >
                        {isLoggingIn ? 'Acessando...' : isRegistering ? 'Solicitar Cadastro da Equipe' : 'Entrar como Equipe'}
                    </Button>
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Button 
                        variant="text" 
                        size="small" 
                        onClick={() => setIsRegistering(!isRegistering)}
                        sx={{ 
                            fontSize: '0.85rem', 
                            textTransform: 'none', 
                            fontWeight: 600, 
                            color: 'text.secondary',
                            '&:hover': { color: 'primary.main' }
                        }}
                    >
                        {isRegistering ? 'Já tem conta de equipe? Faça Login' : 'Novo Técnico/Coordenador? Cadastre-se'}
                    </Button>
                </Box>

                <Divider sx={{ my: 2, fontSize: '0.8rem', color: 'text.secondary', fontWeight: 500 }}>
                    ou acesse com o Google
                </Divider>

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
                        color: 'text.primary', 
                        borderColor: 'divider',
                        backgroundColor: 'background.paper',
                        fontWeight: 600,
                        textTransform: 'none',
                        py: 1.2,
                        borderRadius: 2.5,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        '&:hover': {
                            backgroundColor: 'action.hover',
                            borderColor: 'primary.main',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }
                    }}
                >
                    Entrar com o Google
                </Button>
            </Paper>
        </Container>
    );
};

const NotificacoesIconHeader = ({ uid, onOpen }) => {
    const { naoLidas } = useNotificacoes(uid || undefined);
    return (
        <IconButton 
            onClick={onOpen} 
            color="inherit" 
            aria-label="Notificações"
            sx={{ 
                minWidth: 44, 
                minHeight: 44, 
                p: 1, 
                borderRadius: '12px',
                '&:hover': { bgcolor: 'action.hover' } 
            }}
        >
            <Badge badgeContent={naoLidas || 0} color="error">
                <Bell size={20} />
            </Badge>
        </IconButton>
    );
};

const NotificacoesMenuArea = ({ uid, open, onClose }) => {
    const { notificacoes = [], naoLidas = 0, carregando = false, marcarLida, marcarTodasLidas } = useNotificacoes(uid || undefined);
    return (
        <CentroNotificacoesDrawer
            open={open}
            onClose={onClose}
            notificacoes={notificacoes}
            naoLidas={naoLidas}
            carregando={carregando}
            marcarLida={marcarLida}
            marcarTodasLidas={marcarTodasLidas}
        />
    );
};

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
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [gerenciarExpandedMobile, setGerenciarExpandedMobile] = useState(false);
    const [coordenadorMenuAnchorEl, setCoordenadorMenuAnchorEl] = useState(null);
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('themeMode') === 'dark');
    const [drawerNotificacoesAberto, setDrawerNotificacoesAberto] = useState(false);

    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

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
    const handleMenuClose = () => { setAnchorEl(null); setMobileMoreAnchorEl(null); setMobileDrawerOpen(false); };
    const handleMobileMenuOpen = (event) => {
        if (isMobile) {
            setMobileDrawerOpen(true);
        } else {
            setMobileMoreAnchorEl(event.currentTarget);
        }
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
    
    const isRejeitado = userProfileData?.status === 'rejeitado';

    const navMenuItems = role === 'visualizador' ? [
        <MenuItem key="cal" component={Link} to="/calendario" onClick={handleMenuClose}><ListItemIcon><Calendar size={18} /></ListItemIcon><ListItemText primary="Calendário" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
        <MenuItem key="download-cronograma" component={Link} to="/download-cronograma" onClick={handleMenuClose}><ListItemIcon><Download size={18} /></ListItemIcon><ListItemText primary="Baixar Cronograma" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
        <MenuItem key="ajuda" component={Link} to="/ajuda" onClick={handleMenuClose}><ListItemIcon><HelpCircle size={18} /></ListItemIcon><ListItemText primary="Dúvidas do Visitante" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
        <Divider key="div-guest" sx={{ my: 0.5 }} />,
        <MenuItem key="sair-guest" onClick={handleLogout} sx={{ color: 'error.main' }}><ListItemIcon><LogOut size={18} color="red" /></ListItemIcon><ListItemText primary="Sair do Modo Visitante" primaryTypographyProps={{ noWrap: true }} /></MenuItem>
    ] : [
        <MenuItem key="painel" component={Link} to="/" onClick={handleMenuClose}><ListItemIcon><LayoutDashboard size={18} /></ListItemIcon><ListItemText primary="Painel" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
        <MenuItem key="cal" component={Link} to="/calendario" onClick={handleMenuClose}><ListItemIcon><Calendar size={18} /></ListItemIcon><ListItemText primary="Calendário" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
        !approvalPending ? <MenuItem key="historico" component={Link} to="/historico-aulas" onClick={handleMenuClose}><ListItemIcon><History size={18} /></ListItemIcon><ListItemText primary="Histórico" primaryTypographyProps={{ noWrap: true }} /></MenuItem> : null,
        !approvalPending ? <MenuItem key="avisos" component={Link} to="/avisos" onClick={handleMenuClose}><ListItemIcon><Bell size={18} /></ListItemIcon><ListItemText primary="Avisos" primaryTypographyProps={{ noWrap: true }} /></MenuItem> : null,
        <Divider key="div1" sx={{ my: 0.5 }} />,
        ...(role === 'coordenador' && !approvalPending ? [
            <MenuItem key="agend" component={Link} to="/propor-aula" onClick={handleMenuClose}><ListItemIcon><PlusCircle size={18} /></ListItemIcon><ListItemText primary="Agendar Aula" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <MenuItem key="agend-evento" component={Link} to="/propor-evento" onClick={handleMenuClose}><ListItemIcon><PlusCircle size={18} /></ListItemIcon><ListItemText primary="Agendar Evento" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <MenuItem key="consulta-disponibilidade" component={Link} to="/consulta-disponibilidade" onClick={handleMenuClose}><ListItemIcon><Search size={18} /></ListItemIcon><ListItemText primary="Consulta Disponibilidade" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <Divider key="div-gestao" sx={{ my: 0.5 }} />,
            <MenuItem key="gerenciar-menu" onClick={(e) => { e.stopPropagation(); setGerenciarExpandedMobile(prev => !prev); }}><ListItemIcon><ListTodo size={18} /></ListItemIcon><ListItemText primary="Gerenciar & Gestão" primaryTypographyProps={{ fontWeight: 600, noWrap: true }} /></MenuItem>,
        ] : []),
        ...(role === 'tecnico' && !approvalPending ? [
            <MenuItem key="aula" component={Link} to="/propor-aula" onClick={handleMenuClose}><ListItemIcon><PlusCircle size={18} /></ListItemIcon><ListItemText primary="Propor Atividade" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
            <MenuItem key="consulta-disponibilidade-tec" component={Link} to="/consulta-disponibilidade" onClick={handleMenuClose}><ListItemIcon><Search size={18} /></ListItemIcon><ListItemText primary="Consulta Disponibilidade" primaryTypographyProps={{ noWrap: true }} /></MenuItem>,
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

    if (loading) return <LoadingFallback />;

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                    <SmartAppBanner />
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
                            <Toolbar sx={{ justifyContent: { xs: 'space-between', sm: 'flex-start' } }}>
                                <Box component={Link} to={role === 'visualizador' ? "/calendario" : "/"} sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit', flexGrow: { xs: 0, sm: 1 }, gap: 1 }}>
                                    <img src={cesmacLogo} alt="Logo CESMAC Centro Universitário" style={{ height: '36px', width: 'auto', objectFit: 'contain', marginRight: '4px' }} />
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
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.25, sm: 1.5 } }}>
                                    <IconButton 
                                        onClick={handleThemeChange} 
                                        color="inherit" 
                                        aria-label={darkMode ? "Alternar para modo claro" : "Alternar para modo escuro"}
                                        sx={{ 
                                            minWidth: 44, 
                                            minHeight: 44, 
                                            p: 1, 
                                            borderRadius: '12px',
                                            '&:hover': { bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' } 
                                        }}
                                    >
                                        {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
                                    </IconButton>
                                    {role !== 'visualizador' && (
                                        <NotificacoesIconHeader 
                                            uid={userProfileData?.uid || user?.id} 
                                            onOpen={() => setDrawerNotificacoesAberto(true)} 
                                        />
                                    )}
                                    {role === 'visualizador' ? (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={handleLogout}
                                            startIcon={<LogOut size={16} />}
                                            aria-label="Sair da sessão"
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 600,
                                                fontSize: '0.8rem',
                                                ml: 0.5,
                                                px: 1.5,
                                                py: 0.8,
                                                borderRadius: 2,
                                                borderColor: 'rgba(0,0,0,0.2)',
                                                minHeight: 40
                                            }}
                                        >
                                            Sair
                                        </Button>
                                    ) : (
                                        <IconButton 
                                            onClick={handleProfileMenuOpen} 
                                            color="inherit" 
                                            aria-label="Menu de perfil do usuário"
                                            sx={{ 
                                                minWidth: 44, 
                                                minHeight: 44, 
                                                p: 0.5, 
                                                borderRadius: '12px',
                                                '&:hover': { bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' } 
                                            }}
                                        >
                                            {(userProfileData?.photo_url || userProfileData?.photoURL) ? (
                                                <Avatar src={userProfileData.photo_url || userProfileData.photoURL} alt={userProfileData.name || "Foto de perfil"} sx={{ width: 30, height: 30 }} />
                                            ) : (
                                                <AccountCircle sx={{ fontSize: 30 }} />
                                            )}
                                        </IconButton>
                                    )}
                                    <IconButton 
                                        edge="end" 
                                        onClick={handleMobileMenuOpen} 
                                        color="inherit" 
                                        aria-label="Abrir menu de navegação"
                                        aria-expanded={mobileDrawerOpen}
                                        sx={{ 
                                            minWidth: 44, 
                                            minHeight: 44, 
                                            p: 1, 
                                            borderRadius: '12px',
                                            bgcolor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                            '&:hover': { bgcolor: darkMode ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)' } 
                                        }}
                                    >
                                        <MenuIcon size={22} />
                                    </IconButton>
                                </Box>
                            </Toolbar>
                        </AppBar>
                    )}
                    
                    {/* Drawer Mobile Responsivo e Ergonômico (Thumb Zone) */}
                    <Drawer
                        anchor="bottom"
                        open={mobileDrawerOpen}
                        onClose={handleMenuClose}
                        PaperProps={{
                            sx: {
                                borderTopLeftRadius: 20,
                                borderTopRightRadius: 20,
                                maxHeight: '85vh',
                                bgcolor: darkMode ? '#0B132B' : '#ffffff',
                                color: darkMode ? '#ffffff' : '#1A202C',
                                pb: 3,
                                pt: 1,
                                px: 1
                            }
                        }}
                    >
                        <Box sx={{ width: 40, height: 4, bgcolor: darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', borderRadius: 2, mx: 'auto', my: 1 }} />
                        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar 
                                    src={userProfileData?.photo_url || userProfileData?.photoURL} 
                                    sx={{ width: 42, height: 42, border: '2px solid #1E7EC8' }}
                                />
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                                        {userProfileData?.name || userProfileData?.nome || 'Usuário'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" lineHeight={1}>
                                        {role === 'visualizador' ? 'Modo Visitante' : role === 'coordenador' ? 'Coordenador' : role === 'tecnico' ? 'Técnico de Laboratório' : 'Usuário'}
                                    </Typography>
                                </Box>
                            </Box>
                            <Chip 
                                label={darkMode ? "Escuro" : "Claro"} 
                                size="small"
                                icon={darkMode ? <Sun size={14}/> : <Moon size={14}/>}
                                onClick={handleThemeChange}
                                sx={{ borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                            />
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <List sx={{ px: 1 }}>
                            {navMenuItems.filter(Boolean).map((item, idx) => {
                                if (item.type === Divider) {
                                    return <Divider key={`drawer-div-${idx}`} sx={{ my: 1 }} />;
                                }

                                if (item.key === 'gerenciar-menu') {
                                    return (
                                        <React.Fragment key="gerenciar-menu-fragment">
                                            <MenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setGerenciarExpandedMobile(prev => !prev);
                                                }}
                                                sx={{
                                                    minHeight: 48,
                                                    borderRadius: 2,
                                                    my: 0.5,
                                                    px: 2,
                                                    display: 'flex',
                                                    justify: 'space-between',
                                                    '&:hover': { bgcolor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <ListItemIcon><ListTodo size={20} /></ListItemIcon>
                                                    <ListItemText primary="Gestão & Administração" primaryTypographyProps={{ fontWeight: 600 }} />
                                                </Box>
                                                {gerenciarExpandedMobile ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </MenuItem>
                                            <Collapse in={gerenciarExpandedMobile} timeout="auto" unmountOnExit sx={{ pl: 2 }}>
                                                <MenuItem component={Link} to="/gerenciar-aprovacoes" onClick={handleMenuClose} sx={{ minHeight: 42, borderRadius: 2, my: 0.2 }}>
                                                    <ListItemIcon>
                                                        <Badge badgeContent={pendingProposalsCount} color="error">
                                                            <ThumbsUp size={18} />
                                                        </Badge>
                                                    </ListItemIcon>
                                                    <ListItemText primary="Aprovações" primaryTypographyProps={{ fontSize: '0.875rem' }} />
                                                </MenuItem>
                                                <MenuItem component={Link} to="/analise-aulas" onClick={handleMenuClose} sx={{ minHeight: 42, borderRadius: 2, my: 0.2 }}>
                                                    <ListItemIcon><BarChart size={18} /></ListItemIcon>
                                                    <ListItemText primary="Análise de Aulas" primaryTypographyProps={{ fontSize: '0.875rem' }} />
                                                </MenuItem>
                                                <MenuItem component={Link} to="/analise-eventos" onClick={handleMenuClose} sx={{ minHeight: 42, borderRadius: 2, my: 0.2 }}>
                                                    <ListItemIcon><BarChart size={18} /></ListItemIcon>
                                                    <ListItemText primary="Análise de Eventos" primaryTypographyProps={{ fontSize: '0.875rem' }} />
                                                </MenuItem>
                                                <MenuItem component={Link} to="/gerenciar-eventos-avancado" onClick={handleMenuClose} sx={{ minHeight: 42, borderRadius: 2, my: 0.2 }}>
                                                    <ListItemIcon><CalendarOff size={18} /></ListItemIcon>
                                                    <ListItemText primary="Gerenciar Eventos" primaryTypographyProps={{ fontSize: '0.875rem' }} />
                                                </MenuItem>
                                                <MenuItem component={Link} to="/gerenciar-avisos" onClick={handleMenuClose} sx={{ minHeight: 42, borderRadius: 2, my: 0.2 }}>
                                                    <ListItemIcon><Settings size={18} /></ListItemIcon>
                                                    <ListItemText primary="Gerenciar Avisos" primaryTypographyProps={{ fontSize: '0.875rem' }} />
                                                </MenuItem>
                                                <MenuItem component={Link} to="/verificar-integridade" onClick={handleMenuClose} sx={{ minHeight: 42, borderRadius: 2, my: 0.2 }}>
                                                    <ListItemIcon><Bug size={18} /></ListItemIcon>
                                                    <ListItemText primary="Integridade dos Dados" primaryTypographyProps={{ fontSize: '0.875rem' }} />
                                                </MenuItem>
                                                <MenuItem component={Link} to="/gerenciar-usuarios" onClick={handleMenuClose} sx={{ minHeight: 42, borderRadius: 2, my: 0.2 }}>
                                                    <ListItemIcon><Users size={18} /></ListItemIcon>
                                                    <ListItemText primary="Usuários" primaryTypographyProps={{ fontSize: '0.875rem' }} />
                                                </MenuItem>
                                                <MenuItem component={Link} to="/gerenciar-periodos" onClick={handleMenuClose} sx={{ minHeight: 42, borderRadius: 2, my: 0.2 }}>
                                                    <ListItemIcon><CalendarOff size={18} /></ListItemIcon>
                                                    <ListItemText primary="Períodos de Eventos" primaryTypographyProps={{ fontSize: '0.875rem' }} />
                                                </MenuItem>
                                                <MenuItem component={Link} to="/importar-cronograma-externo" onClick={handleMenuClose} sx={{ minHeight: 42, borderRadius: 2, my: 0.2 }}>
                                                    <ListItemIcon><Download size={18} /></ListItemIcon>
                                                    <ListItemText primary="Importar Cronograma" primaryTypographyProps={{ fontSize: '0.875rem' }} />
                                                </MenuItem>
                                                <MenuItem component={Link} to="/backup-sistema" onClick={handleMenuClose} sx={{ minHeight: 42, borderRadius: 2, my: 0.2 }}>
                                                    <ListItemIcon><Database size={18} /></ListItemIcon>
                                                    <ListItemText primary="Backup do Sistema" primaryTypographyProps={{ fontSize: '0.875rem' }} />
                                                </MenuItem>
                                            </Collapse>
                                        </React.Fragment>
                                    );
                                }

                                return React.cloneElement(item, {
                                    key: item.key || `drawer-item-${idx}`,
                                    onClick: (e) => {
                                        if (item.props.onClick) item.props.onClick(e);
                                        handleMenuClose();
                                    },
                                    sx: {
                                        minHeight: 48,
                                        borderRadius: 2,
                                        my: 0.5,
                                        px: 2,
                                        '&:hover': { bgcolor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                                        ...item.props.sx
                                    }
                                });
                            })}
                            {role !== 'visualizador' && (
                                <>
                                    <Divider sx={{ my: 1 }} />
                                    <MenuItem 
                                        component={Link} 
                                        to="/perfil" 
                                        onClick={handleMenuClose}
                                        sx={{ minHeight: 48, borderRadius: 2, my: 0.5, px: 2 }}
                                    >
                                        <ListItemIcon><User size={20} /></ListItemIcon>
                                        <ListItemText primary="Meu Perfil" primaryTypographyProps={{ fontWeight: 600 }} />
                                    </MenuItem>
                                    <MenuItem 
                                        onClick={handleLogout}
                                        sx={{ minHeight: 48, borderRadius: 2, my: 0.5, px: 2, color: 'error.main' }}
                                    >
                                        <ListItemIcon><LogOut size={20} color="#ef4444" /></ListItemIcon>
                                        <ListItemText primary="Sair da Conta" primaryTypographyProps={{ fontWeight: 600 }} />
                                    </MenuItem>
                                </>
                            )}
                        </List>
                    </Drawer>

                    {/* Menu Desktop */}
                    <Menu 
                        anchorEl={mobileMoreAnchorEl} 
                        open={Boolean(mobileMoreAnchorEl) && !isMobile} 
                        onClose={handleMenuClose}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        PaperProps={{
                            sx: {
                                width: 280,
                                maxHeight: '85vh',
                                overflowY: 'auto'
                            }
                        }}
                    >
                        {navMenuItems.filter(Boolean).map((item, idx) => {
                            if (item.type === Divider) {
                                return <Divider key={`desk-div-${idx}`} sx={{ my: 0.5 }} />;
                            }

                            if (item.key === 'gerenciar-menu') {
                                return (
                                    <React.Fragment key="desk-gerenciar-fragment">
                                        <MenuItem
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setGerenciarExpandedMobile(prev => !prev);
                                            }}
                                            sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <ListItemIcon><ListTodo size={18} /></ListItemIcon>
                                                <ListItemText primary="Gestão & Administração" primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }} />
                                            </Box>
                                            {gerenciarExpandedMobile ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </MenuItem>
                                        <Collapse in={gerenciarExpandedMobile} timeout="auto" unmountOnExit sx={{ pl: 2 }}>
                                            <MenuItem component={Link} to="/gerenciar-aprovacoes" onClick={handleMenuClose}>
                                                <ListItemIcon>
                                                    <Badge badgeContent={pendingProposalsCount} color="error">
                                                        <ThumbsUp size={16} />
                                                    </Badge>
                                                </ListItemIcon>
                                                <ListItemText primary="Aprovações" primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                            </MenuItem>
                                            <MenuItem component={Link} to="/analise-aulas" onClick={handleMenuClose}>
                                                <ListItemIcon><BarChart size={16} /></ListItemIcon>
                                                <ListItemText primary="Análise de Aulas" primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                            </MenuItem>
                                            <MenuItem component={Link} to="/analise-eventos" onClick={handleMenuClose}>
                                                <ListItemIcon><BarChart size={16} /></ListItemIcon>
                                                <ListItemText primary="Análise de Eventos" primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                            </MenuItem>
                                            <MenuItem component={Link} to="/gerenciar-eventos-avancado" onClick={handleMenuClose}>
                                                <ListItemIcon><CalendarOff size={16} /></ListItemIcon>
                                                <ListItemText primary="Gerenciar Eventos" primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                            </MenuItem>
                                            <MenuItem component={Link} to="/gerenciar-avisos" onClick={handleMenuClose}>
                                                <ListItemIcon><Settings size={16} /></ListItemIcon>
                                                <ListItemText primary="Gerenciar Avisos" primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                            </MenuItem>
                                            <MenuItem component={Link} to="/verificar-integridade" onClick={handleMenuClose}>
                                                <ListItemIcon><Bug size={16} /></ListItemIcon>
                                                <ListItemText primary="Integridade dos Dados" primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                            </MenuItem>
                                            <MenuItem component={Link} to="/gerenciar-usuarios" onClick={handleMenuClose}>
                                                <ListItemIcon><Users size={16} /></ListItemIcon>
                                                <ListItemText primary="Usuários" primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                            </MenuItem>
                                            <MenuItem component={Link} to="/gerenciar-periodos" onClick={handleMenuClose}>
                                                <ListItemIcon><CalendarOff size={16} /></ListItemIcon>
                                                <ListItemText primary="Períodos de Eventos" primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                            </MenuItem>
                                            <MenuItem component={Link} to="/importar-cronograma-externo" onClick={handleMenuClose}>
                                                <ListItemIcon><Download size={16} /></ListItemIcon>
                                                <ListItemText primary="Importar Cronograma" primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                            </MenuItem>
                                            <MenuItem component={Link} to="/backup-sistema" onClick={handleMenuClose}>
                                                <ListItemIcon><Database size={16} /></ListItemIcon>
                                                <ListItemText primary="Backup do Sistema" primaryTypographyProps={{ fontSize: '0.85rem' }} />
                                            </MenuItem>
                                        </Collapse>
                                    </React.Fragment>
                                );
                            }

                            return item;
                        })}
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

                    {/* Menu Perfil */}
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

                    {user && !approvalPending && (
                        <NotificacoesMenuArea
                            uid={userProfileData?.uid}
                            open={drawerNotificacoesAberto}
                            onClose={() => setDrawerNotificacoesAberto(false)}
                        />
                    )}
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
                             ) : approvalPending ? (
                                <Route 
                                    path="*" 
                                    element={
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
                                    } 
                                />
                             ) : (
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
                                    {role === 'tecnico' && (<><Route path="/minhas-propostas" element={<MinhasPropostas userInfo={userProfileData} />} /><Route path="/minhas-designacoes" element={<MinhasDesignacoes />} /><Route path="/revisoes" element={<CalendarioRevisoesTecnico userInfo={userProfileData} />} /></>)}
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
                                        <Route path="/backup-sistema" element={<BackupSistema userProfile={userProfileData} />} />
                                    </>)}
                                    <Route path="/assistente-ia" element={<Navigate to="/calendario" replace />} />
                                    <Route path="/download-cronograma" element={<DownloadCronograma />} />
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