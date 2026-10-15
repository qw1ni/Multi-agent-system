import React, { useEffect, useRef, useState } from 'react';
import {
    Box, Paper, Typography, TextField, IconButton, Fab, Chip, Stack, CircularProgress
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import agentService from '../../services/agentService';
import { ROLES } from '../../constants/roles';

const QUICK_COMMANDS = [
    'HELP',
    'STATUS',
    'LIST SECTIONS',
    'START PARSING',
    'DOWNLOAD ALL',
];

const AgentChatWidget = () => {
    const role = localStorage.getItem('role');
    const isAdmin = role === ROLES.ADMIN;

    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'agent',
            text: 'Оркестратор готов. Используйте формальный язык команд. Введите HELP.',
        },
    ]);
    const bottomRef = useRef(null);

    useEffect(() => {
        if (open && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, open]);

    if (!isAdmin) {
        return null;
    }

    const pushMessage = (roleName, text) => {
        setMessages((prev) => [...prev, { role: roleName, text }]);
    };

    const sendMessage = async (raw) => {
        const message = (raw || '').trim();
        if (!message || loading) return;

        pushMessage('user', message);
        setInput('');
        setLoading(true);
        try {
            const result = await agentService.chat(message);
            pushMessage('agent', result.message || JSON.stringify(result, null, 2));
        } catch (err) {
            // axiosInstance превращает ответ в Error с .data / .message (без .response)
            const apiMessage = err?.data?.message || err?.response?.data?.message || err?.message;
            pushMessage(
                'agent',
                apiMessage || 'Не удалось связаться с оркестратором. Проверьте, что сервис на :8003 запущен.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(input);
    };

    return (
        <>
            {!open && (
                <Fab
                    color="primary"
                    onClick={() => setOpen(true)}
                    sx={{
                        position: 'fixed',
                        right: 24,
                        bottom: 24,
                        zIndex: 1400,
                        bgcolor: '#0056b3',
                        '&:hover': { bgcolor: '#004494' },
                    }}
                    aria-label="Открыть чат с агентом"
                >
                    <ChatIcon />
                </Fab>
            )}

            {open && (
                <Paper
                    elevation={8}
                    sx={{
                        position: 'fixed',
                        right: 24,
                        bottom: 24,
                        width: { xs: 'calc(100vw - 32px)', sm: 380 },
                        height: 480,
                        zIndex: 1400,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        borderRadius: 2,
                    }}
                >
                    <Box
                        sx={{
                            px: 2,
                            py: 1.25,
                            bgcolor: '#0056b3',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                Агент-оркестратор
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                Формальный язык команд
                            </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#fff' }}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    <Box sx={{ px: 1.5, pt: 1 }}>
                        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                            {QUICK_COMMANDS.map((cmd) => (
                                <Chip
                                    key={cmd}
                                    label={cmd}
                                    size="small"
                                    onClick={() => sendMessage(cmd)}
                                    disabled={loading}
                                    sx={{ mb: 0.5 }}
                                />
                            ))}
                        </Stack>
                    </Box>

                    <Box
                        sx={{
                            flex: 1,
                            overflowY: 'auto',
                            px: 1.5,
                            py: 1,
                            bgcolor: '#f7f9fc',
                        }}
                    >
                        {messages.map((msg, idx) => (
                            <Box
                                key={`${idx}-${msg.role}`}
                                sx={{
                                    display: 'flex',
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    mb: 1,
                                }}
                            >
                                <Box
                                    sx={{
                                        maxWidth: '85%',
                                        px: 1.25,
                                        py: 1,
                                        borderRadius: 2,
                                        bgcolor: msg.role === 'user' ? '#0056b3' : '#fff',
                                        color: msg.role === 'user' ? '#fff' : 'text.primary',
                                        border: msg.role === 'user' ? 'none' : '1px solid #e3e8ef',
                                        whiteSpace: 'pre-wrap',
                                        fontSize: 13,
                                        lineHeight: 1.45,
                                    }}
                                >
                                    {msg.text}
                                </Box>
                            </Box>
                        ))}
                        {loading && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', px: 0.5 }}>
                                <CircularProgress size={14} />
                                <Typography variant="caption">Агент выполняет команду...</Typography>
                            </Box>
                        )}
                        <div ref={bottomRef} />
                    </Box>

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{
                            p: 1.25,
                            borderTop: '1px solid #e3e8ef',
                            display: 'flex',
                            gap: 1,
                            bgcolor: '#fff',
                        }}
                    >
                        <TextField
                            size="small"
                            fullWidth
                            placeholder='Например: STATUS или СКАЧАТЬ РАЗДЕЛ Факультеты'
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                        />
                        <IconButton
                            type="submit"
                            color="primary"
                            disabled={loading || !input.trim()}
                            sx={{ bgcolor: '#0056b3', color: '#fff', '&:hover': { bgcolor: '#004494' }, borderRadius: 2 }}
                        >
                            <SendIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Paper>
            )}
        </>
    );
};

export default AgentChatWidget;
