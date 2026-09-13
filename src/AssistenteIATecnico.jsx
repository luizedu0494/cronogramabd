import React, { useState, useEffect, useRef } from 'react';
import {
    Container, Typography, Box, Paper, TextField, Button, CircularProgress,
    Alert, Snackbar, IconButton, InputAdornment, Chip, Avatar
} from '@mui/material';
import { Send as SendIcon, SmartToy as AIIcon, Mic as MicIcon, Stop as StopIcon, Person as PersonIcon } from '@mui/icons-material';
import { supabase } from './supabaseConfig';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { LISTA_LABORATORIOS } from './constants/laboratorios';
import { LISTA_CURSOS } from './constants/cursos';
import { useNavigate } from 'react-router-dom';

dayjs.locale('pt-br');

const BLOCOS_HORARIO = [
    { "value": "07:00-09:10", "label": "07:00 - 09:10", "turno": "Matutino" },
    { "value": "09:30-12:00", "label": "09:30 - 12:00", "turno": "Matutino" },
    { "value": "13:00-15:10", "label": "13:00 - 15:10", "turno": "Vespertino" },
    { "value": "15:30-18:00", "label": "15:30 - 18:00", "turno": "Vespertino" },
    { "value": "18:30-20:10", "label": "18:30 - 20:10", "turno": "Noturno" },
    { "value": "20:30-22:00", "label": "20:30 - 22:00", "turno": "Noturno" },
];

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.1-8b-instant';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SendTimeExtensionIcon from '@mui/icons-material/SendTimeExtension';
import { langchainService } from './services/langchainService';

// PROMPT EXPANDIDO PARA O TÉCNICO (CONSULTA + PROPOR AULAS/EVENTOS)
const PROMPT_TECNICO_ASSISTENTE = `Você é o Assistente IA do Técnico do CronoLab CESMAC.
Seu papel é auxiliar o técnico a (1) consultar o cronograma e (2) montar **propostas de agendamento de aula ou evento**.

DATA DE HOJE: ${dayjs().format('DD/MM/YYYY')} (${dayjs().format('dddd')})
HORA ATUAL: ${dayjs().format('HH:mm')}

**REGRAS DE AÇÃO:**
1. **acao = "consultar"**: Para qualquer pergunta sobre quais aulas existem, horários vagos, ocupação de laboratórios etc.
2. **acao = "propor"**: Para quando o usuário deseja agendar, criar, propor ou solicitar uma aula ou evento. Extraia os dados na chave "proposta".
3. **Bloqueio de escrita direta**: Se o usuário tentar "adicionar/alterar/excluir direto no cronograma oficial", explique de forma amigável: "Como técnico, você não pode alterar o cronograma aprovado diretamente, mas montei uma **proposta de agendamento** para revisão e envio ao coordenador."

**FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):**
Para consultas:
\`\`\`json
{
  "acao": "consultar",
  "dados": {
    "termoBusca": "string",
    "data": "DD/MM/YYYY",
    "laboratorio": "string"
  },
  "resposta": "Texto detalhado com os dados encontrados"
}
\`\`\`

Para propostas:
\`\`\`json
{
  "acao": "propor",
  "proposta": {
    "assunto": "string",
    "data": "DD/MM/YYYY",
    "horario": "07:00-09:10",
    "laboratorio": "string",
    "cursos": ["string"],
    "observacoes": "string"
  },
  "resposta": "Montei a proposta de agendamento abaixo. Confira os dados e clique em 'Confirmar e Enviar Proposta' para enviar para aprovação do coordenador."
}
\`\`\`
`;


function AssistenteIATecnico({ userInfo, currentUser, mode }) {
    const [mensagens, setMensagens] = useState([]);
    const [inputUsuario, setInputUsuario] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [isRecording, setIsRecording] = useState(false);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    // Acesso permitido para 'tecnico' e 'coordenador' (se desejar)
    const isTecnicoOuCoordenador = userInfo?.role === 'tecnico' || userInfo?.role === 'coordenador';

    useEffect(() => {
        if (!isTecnicoOuCoordenador) {
            setSnackbarMessage('Acesso negado. Apenas técnicos e coordenadores podem usar o Assistente IA de Consulta.');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
            setTimeout(() => navigate('/'), 2000);
        }
    }, [isTecnicoOuCoordenador, navigate]);

    useEffect(() => {
        scrollToBottom();
    }, [mensagens]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const adicionarMensagem = (texto, tipo = 'usuario') => {
        setMensagens(prev => [...prev, { texto, tipo, timestamp: new Date() }]);
    };

    const chamarGroqAPI = async (prompt, contexto, historicoMsgs = []) => {
        try {
            const systemContent = `${PROMPT_TECNICO_ASSISTENTE}\n\nCONTEXTO DE CONEXÃO:\n${contexto}\n\nIMPORTANTE: Responda obrigatoriamente no formato JSON válido.`;
            const ultimosTurnos = historicoMsgs.slice(-6).map(m => ({
                role: m.tipo === 'usuario' ? 'user' : 'assistant',
                content: typeof m.texto === 'string' ? m.texto : 'Proposta gerada'
            }));

            const payload = {
                model: GROQ_MODEL,
                messages: [
                    { role: 'system', content: systemContent },
                    ...ultimosTurnos,
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 1500,
                response_format: { type: 'json_object' }
            };

            const response = await fetch('/api/groq', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payload })
            });

            const contentType = response.headers.get('content-type');
            const isJson = contentType && contentType.includes('application/json');
            const data = isJson ? await response.json().catch(() => ({})) : {};

            if (!response.ok || !isJson) {
                const serverError = data?.error || data?.message;
                const errDetail = typeof serverError === 'string' 
                    ? serverError 
                    : (serverError?.message || response.statusText || `Erro ${response.status}`);
                return { erro: errDetail };
            }

            const resposta = data.choices?.[0]?.message?.content;
            if (!resposta) return { erro: 'Resposta vazia da IA' };

            const jsonMatch = resposta.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : { acao: 'consultar', resposta };
            
            const jsonMatch = resposta.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            return { acao: 'consultar', resposta: resposta };
        } catch (error) {
            console.error('Erro ao chamar Groq API:', error);
            throw error;
        }
    };

    const handleConfirmarProposta = async (proposta) => {
        try {
            const dataObj = dayjs(proposta.data || dayjs(), 'DD/MM/YYYY');
            const novaProposta = {
                assunto: proposta.assunto || 'Proposta via IA',
                laboratorioSelecionado: proposta.laboratorio || 'Anatomia 1',
                horarioSlotString: proposta.horario || '07:00-09:10',
                cursos: proposta.cursos || ['Medicina'],
                dataInicio: Timestamp.fromDate(dataObj.toDate()),
                observacoes: proposta.observacoes || 'Proposta criada via Assistente IA do Técnico',
                status: 'pendente',
                propostoPorUid: currentUser?.uid || 'tecnico',
                propostoPorNome: userInfo?.nome || currentUser?.displayName || 'Técnico',
                origem: 'ia',
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'aulas'), novaProposta);



            setSnackbarMessage('✅ Proposta enviada com sucesso para a fila de aprovação!');
            setSnackbarSeverity('success');
            setOpenSnackbar(true);
            adicionarMensagem('✅ Proposta registrada com sucesso na fila do coordenador!', 'ia');
        } catch (err) {
            console.error('Erro ao enviar proposta:', err);
            setSnackbarMessage('Erro ao enviar proposta.');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
        }
    };

    const buscarAulasSupabase = async (criterios) => {
        try {
            let queryBuilder = supabase.from('aulas').select('*');

            if (criterios.data) {
                const dataInicio = dayjs(criterios.data, 'DD/MM/YYYY').startOf('day').toISOString();
                const dataFim = dayjs(criterios.data, 'DD/MM/YYYY').endOf('day').toISOString();
                queryBuilder = queryBuilder.gte('data_inicio', dataInicio).lte('data_inicio', dataFim);
            } else if (criterios.mes) {
                const [mes, ano] = criterios.mes.split('/');
                const dataInicio = dayjs().month(parseInt(mes) - 1).year(parseInt(ano)).startOf('month').toISOString();
                const dataFim = dayjs().month(parseInt(mes) - 1).year(parseInt(ano)).endOf('month').toISOString();
                queryBuilder = queryBuilder.gte('data_inicio', dataInicio).lte('data_inicio', dataFim);
            }

            if (criterios.laboratorio) {
                queryBuilder = queryBuilder.eq('laboratorio', criterios.laboratorio);
            }

            const { data, error } = await queryBuilder;
            if (error) throw error;

            let aulas = (data || []).map(d => ({
                id: d.id,
                ...d,
                laboratorioSelecionado: d.laboratorio,
                dataInicio: d.data_inicio ? dayjs(d.data_inicio) : null,
            }));

            if (criterios.termoBusca) {
                const termo = criterios.termoBusca.toLowerCase();
                aulas = aulas.filter(aula => 
                    (aula.assunto && aula.assunto.toLowerCase().includes(termo)) ||
                    (aula.tipo_atividade && aula.tipo_atividade.toLowerCase().includes(termo))
                );
            }

            return aulas;
        } catch (error) {
            console.error('Erro ao buscar aulas:', error);
            return [];
        }
    };

    const handleSend = async (textInput = inputUsuario) => {
        if (!textInput.trim() || carregando) return;

        const mensagemUsuario = textInput.trim();
        adicionarMensagem(mensagemUsuario, 'usuario');
        setInputUsuario('');
        setCarregando(true);

        try {
            const contexto = `Cursos: ${LISTA_CURSOS.map(c => c.value).join(', ')}\nLaboratórios: ${LISTA_LABORATORIOS.map(l => l.id).join(', ')}\nHorários: ${BLOCOS_HORARIO.map(h => h.value).join(', ')}`;
            const resultadoIA = await chamarGroqAPI(mensagemUsuario, contexto, mensagens);

            if (resultadoIA.erro) {
                adicionarMensagem(`Erro: ${resultadoIA.erro}`, 'ia');
                return;
            }

            if (resultadoIA.acao === 'propor' && resultadoIA.proposta) {
                const p = resultadoIA.proposta;
                const textoMsg = resultadoIA.resposta || 'Montei a proposta com base nas informações. Confira os dados:';
                setMensagens(prev => [...prev, {
                    texto: textoMsg,
                    tipo: 'ia',
                    proposta: p,
                    timestamp: new Date()
                }]);
                return;
            }

            const aulas = await buscarAulasSupabase(resultadoIA.dados || {});
            let resposta = resultadoIA.resposta;

            if (typeof resposta !== 'string') {
                try {
                    resposta = JSON.stringify(resposta, null, 2);
                } catch (e) {
                    resposta = "Erro ao formatar resposta da IA.";
                }
            }

            if (!resposta || resposta.trim() === 'null' || resposta.trim() === '') {
                if (aulas.length > 0) {
                    const listaAulas = aulas.map(aula => 
                        `* **Assunto:** ${aula.assunto}\n  **Data:** ${dayjs(aula.dataInicio.toDate()).format('DD/MM/YYYY HH:mm')}\n  **Laboratório:** ${aula.laboratorioSelecionado}\n  **Cursos:** ${Array.isArray(aula.cursos) ? aula.cursos.join(', ') : 'N/A'}`
                    ).join('\n\n');
                    resposta = `Encontrei ${aulas.length} aula(s):\n\n${listaAulas}`;
                } else {
                    resposta = `Não encontrei nenhuma aula que corresponda à sua busca.`;
                }
            }
            adicionarMensagem(resposta, 'ia');

        } catch (error) {
            console.error('Erro no processamento:', error);
            adicionarMensagem('Ocorreu um erro ao processar sua solicitação.', 'ia');
        } finally {
            setCarregando(false);
        }
    };

    const handleMicClick = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSnackbarMessage('Seu navegador não suporta a API de Reconhecimento de Fala.');
            setSnackbarSeverity('error');
            setOpenSnackbar(true);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        if (isRecording) {
            recognition.stop();
            setIsRecording(false);
        } else {
            recognition.start();

            recognition.onstart = () => {
                setIsRecording(true);
                setSnackbarMessage('Gravando... Fale agora.');
                setSnackbarSeverity('info');
                setOpenSnackbar(true);
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInputUsuario(transcript);
                handleSend(transcript);
            };

            recognition.onerror = (event) => {
                setSnackbarMessage(`Erro de reconhecimento de fala: ${event.error}`);
                setSnackbarSeverity('error');
                setOpenSnackbar(true);
            };

            recognition.onend = () => {
                setIsRecording(false);
            };
        }
    };

    const renderMensagem = (mensagem, index) => {
        const isUsuario = mensagem.tipo === 'usuario';

        return (
            <Box
                key={index}
                sx={{ display: 'flex', flexDirection: 'column', alignItems: isUsuario ? 'flex-end' : 'flex-start', mb: 2 }}
            >
                <Paper
                    elevation={2}
                    sx={{
                        p: 1.5,
                        maxWidth: '85%',
                        borderRadius: isUsuario ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        backgroundColor: isUsuario ? 'primary.main' : 'action.hover',
                        color: isUsuario ? 'primary.contrastText' : 'text.primary',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        border: isUsuario ? 'none' : '1px solid',
                        borderColor: 'divider'
                    }}
                >
                    <Typography variant="body1">{mensagem.texto}</Typography>

                    {mensagem.proposta && (
                        <Paper variant="outlined" sx={{ mt: 1.5, p: 2, bgcolor: 'background.paper', borderRadius: 2, borderLeft: '4px solid #ed6c02' }}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <SendTimeExtensionIcon color="warning" size="small" />
                                <Typography variant="subtitle2" fontWeight="bold" color="warning.main">
                                    Proposta Prontas para Envio
                                </Typography>
                            </Box>
                            <Typography variant="body2"><strong>Assunto:</strong> {mensagem.proposta.assunto || '—'}</Typography>
                            <Typography variant="body2"><strong>Data:</strong> {mensagem.proposta.data || '—'}</Typography>
                            <Typography variant="body2"><strong>Horário:</strong> {mensagem.proposta.horario || '—'}</Typography>
                            <Typography variant="body2"><strong>Laboratório:</strong> {mensagem.proposta.laboratorio || '—'}</Typography>
                            <Typography variant="body2"><strong>Cursos:</strong> {Array.isArray(mensagem.proposta.cursos) ? mensagem.proposta.cursos.join(', ') : mensagem.proposta.cursos || '—'}</Typography>
                            
                            <Button
                                variant="contained"
                                color="warning"
                                size="small"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleConfirmarProposta(mensagem.proposta)}
                                sx={{ mt: 2, fontWeight: 'bold' }}
                            >
                                Confirmar e Enviar Proposta
                            </Button>
                        </Paper>
                    )}

                    <Typography 
                        variant="caption" 
                        sx={{ 
                            display: 'block', 
                            textAlign: 'right', 
                            mt: 0.5, 
                            color: isUsuario ? 'rgba(255, 255, 255, 0.8)' : 'text.secondary' 
                        }}
                    >
                        {dayjs(mensagem.timestamp).format('HH:mm')}
                    </Typography>
                </Paper>
            </Box>
        );
    };

    const sugestoesChips = [
        "Quais aulas estão no Anatomia 1 amanhã?",
        "Propor aula de Anatomia amanhã às 13h no Lab 2 para Enfermagem",
        "Horários vagos no Microscopia 1 amanhã",
        "Propor revisão de Bioquímica na próxima quinta 09:30"
    ];

    if (!isTecnicoOuCoordenador) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Alert severity="error">Acesso negado.</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
            <Paper elevation={3} sx={{ p: 2.5, mb: 2, borderRadius: 2, borderLeft: '5px solid', borderColor: 'primary.main' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <Box display="flex" alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main', mr: 1.5 }}>
                            <AIIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" component="h1" fontWeight={700}>
                                Assistente IA do Técnico & Agendamento
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                CronoLab — CESMAC
                            </Typography>
                        </Box>
                    </Box>
                    <Chip 
                        icon={<PersonIcon fontSize="small" />} 
                        label={userInfo?.role === 'coordenador' ? 'Perfil Coordenador' : 'Perfil Técnico'} 
                        color="primary" 
                        variant="outlined" 
                        size="small" 
                    />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    Consulte o cronograma ou peça para a IA montar uma proposta de aula/evento.
                </Typography>
            </Paper>

            <Paper elevation={3} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2.5, overflow: 'hidden', borderRadius: 2 }}>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1, mb: 2 }}>
                    {mensagens.length === 0 && (
                        <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                            <Typography variant="body2" sx={{ mb: 1.5 }}>
                                Experimente selecionar uma sugestão de consulta ou proposta:
                            </Typography>
                            <Box display="flex" flexWrap="wrap" justifyContent="center" gap={1}>
                                {sugestoesChips.map((sugestao, idx) => (
                                    <Chip
                                        key={idx}
                                        label={sugestao}
                                        onClick={() => handleSend(sugestao)}
                                        clickable
                                        color="primary"
                                        variant="outlined"
                                        size="small"
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}
                    {mensagens.map(renderMensagem)}
                    {carregando && (
                        <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                            <Paper elevation={1} sx={{ p: 1.5, borderRadius: '16px 16px 16px 4px', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={16} />
                                <Typography variant="body2" color="text.secondary">Assistente IA está processando...</Typography>
                            </Paper>
                        </Box>
                    )}
                    <div ref={messagesEndRef} />
                </Box>

                <Box display="flex" alignItems="center" sx={{ gap: 1 }}>
                    <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        placeholder={isRecording ? "Ouvindo..." : "Digite sua pergunta ou solicitação de proposta..."}
                        value={inputUsuario}
                        onChange={(e) => setInputUsuario(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        disabled={carregando || isRecording}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        color={isRecording ? "error" : "default"}
                                        onClick={handleMicClick}
                                        disabled={carregando}
                                        size="small"
                                        title={isRecording ? "Parar de ouvir" : "Falar por voz"}
                                    >
                                        {isRecording ? <StopIcon fontSize="small" /> : <MicIcon fontSize="small" />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleSend()}
                        disabled={!inputUsuario.trim() || carregando || isRecording}
                        sx={{ minWidth: 48, px: 2.5 }}
                    >
                        {carregando ? <CircularProgress size={20} color="inherit" /> : <SendIcon fontSize="small" />}
                    </Button>
                </Box>
            </Paper>

            <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={() => setOpenSnackbar(false)}>
                <Alert onClose={() => setOpenSnackbar(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default AssistenteIATecnico;
