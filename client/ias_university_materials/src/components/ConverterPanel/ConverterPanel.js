import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Typography, Paper, Button, Chip, Alert, LinearProgress,
    FormGroup, FormControlLabel, Checkbox,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import TransformIcon from '@mui/icons-material/Transform';

import adminService from '../../services/adminService';

const actionButtonSx = {
    textTransform: 'none',
    fontWeight: 'bold',
    minWidth: 180,
    height: 40,
    px: 2,
};

const ConverterPanel = ({ onNotify }) => {
    const [status, setStatus] = useState(null);
    const [unavailable, setUnavailable] = useState('');
    const [selected, setSelected] = useState([]);
    const [force, setForce] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [stopLoading, setStopLoading] = useState(false);
    const selectionInitRef = useRef(false);

    const running = Boolean(status?.running);
    const sections = status?.sections || [];

    const notify = useCallback((message, severity = 'success') => {
        if (onNotify) onNotify(message, severity);
    }, [onNotify]);

    const refreshStatus = useCallback(async () => {
        try {
            const data = await adminService.getConverterStatus();
            setStatus(data);
            setUnavailable('');
            if (!data.running) setStopLoading(false);
            const ids = (data.sections || []).map((s) => s.id);
            if (!selectionInitRef.current && ids.length > 0) {
                selectionInitRef.current = true;
                setSelected(ids);
            } else {
                setSelected((prev) => prev.filter((id) => ids.includes(id)));
            }
        } catch (err) {
            setUnavailable(err.response?.data?.message || 'Не удалось получить статус конвертера');
        }
    }, []);

    useEffect(() => {
        refreshStatus();
    }, [refreshStatus]);

    useEffect(() => {
        if (!running) return undefined;
        const timer = setInterval(refreshStatus, 2000);
        return () => clearInterval(timer);
    }, [running, refreshStatus]);

    const handleToggle = (id) => {
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const handleStart = async (sectionIds) => {
        try {
            setActionLoading(true);
            const result = await adminService.startConverter(sectionIds, force);
            notify(result.message || 'Конвертация запущена', result.status === 'busy' ? 'info' : 'success');
            await refreshStatus();
        } catch (err) {
            notify(err.response?.data?.message || 'Не удалось запустить конвертацию', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartSelected = () => {
        if (selected.length === 0) {
            notify('Выберите хотя бы один раздел', 'error');
            return;
        }
        handleStart(selected);
    };

    const handleStop = async () => {
        try {
            setStopLoading(true);
            const result = await adminService.stopConverter();
            if (result.status === 'idle') setStopLoading(false);
            notify(result.message || 'Остановка конвертации запрошена', 'info');
            await refreshStatus();
        } catch (err) {
            setStopLoading(false);
            notify(err.response?.data?.message || 'Не удалось остановить конвертацию', 'error');
        }
    };

    const progress = status?.progress;
    const percent = progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
    const totals = sections.reduce(
        (acc, s) => ({
            total: acc.total + s.total,
            done: acc.done + s.success + s.partial,
            failed: acc.failed + s.failed,
            pending: acc.pending + s.pending,
        }),
        { total: 0, done: 0, failed: 0, pending: 0 },
    );

    let stateChip = <Chip size="small" label="Простаивает" />;
    if (running) {
        stateChip = status.stopping
            ? <Chip size="small" color="warning" label="Останавливается" />
            : <Chip size="small" color="primary" label="Работает" />;
    }

    return (
        <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: '12px' }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                <Box sx={{ flex: { xs: '1 1 auto', md: '0 0 33%' }, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" sx={{ color: '#0056b3', fontWeight: 'bold', mb: 1 }}>
                        Конвертация документов
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                        PDF / DOCX / DOC → Markdown + JSON (Docling)
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Button
                            variant="contained"
                            onClick={handleStartSelected}
                            disabled={actionLoading || running || !!unavailable || selected.length === 0}
                            sx={{ ...actionButtonSx, bgcolor: '#0056b3' }}
                        >
                            {actionLoading ? 'Запуск...' : 'Конвертировать выбранное'}
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => handleStart(null)}
                            disabled={actionLoading || running || !!unavailable}
                            sx={{ ...actionButtonSx, bgcolor: '#0056b3' }}
                        >
                            {actionLoading ? 'Запуск...' : 'Конвертировать всё'}
                        </Button>
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={handleStop}
                            disabled={!running || stopLoading}
                            sx={actionButtonSx}
                        >
                            {stopLoading ? 'Остановка...' : 'Остановить конвертацию'}
                        </Button>
                        <Button variant="outlined" onClick={refreshStatus} sx={actionButtonSx}>
                            Обновить статус
                        </Button>
                    </Box>
                    <FormControlLabel
                        sx={{ mt: 1 }}
                        control={
                            <Checkbox
                                size="small"
                                checked={force}
                                onChange={(e) => setForce(e.target.checked)}
                                disabled={running}
                            />
                        }
                        label="Переделать уже готовые"
                    />
                    <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5, fontWeight: 'bold', color: 'text.secondary' }}>
                        Разделы для конвертации
                    </Typography>
                    <FormGroup>
                        {sections.map((section) => (
                            <FormControlLabel
                                key={section.id}
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={selected.includes(section.id)}
                                        onChange={() => handleToggle(section.id)}
                                        disabled={running}
                                    />
                                }
                                label={`${section.name} (${section.success + section.partial}/${section.total})`}
                            />
                        ))}
                        {sections.length === 0 && !unavailable && (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                Скачанных файлов пока нет — сначала скачайте материалы в блоке парсера
                            </Typography>
                        )}
                    </FormGroup>
                </Box>

                <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
                        <TransformIcon fontSize="small" sx={{ color: '#0056b3' }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                            Статус конвертации
                        </Typography>
                        {stateChip}
                        <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                            Готово: {totals.done} из {totals.total} · ошибок: {totals.failed} · ожидает: {totals.pending}
                        </Typography>
                    </Box>

                    {unavailable && <Alert severity="warning" sx={{ mb: 2 }}>{unavailable}</Alert>}
                    {status?.last_error && <Alert severity="error" sx={{ mb: 2 }}>{status.last_error}</Alert>}

                    {running && progress && (
                        <Box sx={{ mb: 2 }}>
                            <LinearProgress variant="determinate" value={percent} sx={{ height: 8, borderRadius: 1, mb: 0.5 }} />
                            <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                                {progress.done} из {progress.total} ({percent}%) · новых: {progress.success + progress.partial}
                                {' '}· ошибок: {progress.failed} · уже были готовы: {progress.skipped}
                            </Typography>
                            {progress.current && (
                                <Typography
                                    variant="caption"
                                    component="div"
                                    sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    title={progress.current}
                                >
                                    Сейчас: {progress.current}
                                </Typography>
                            )}
                        </Box>
                    )}
                    {running && !progress && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

                    <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Раздел</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Всего файлов</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Готово</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ошибок</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ожидает</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sections.length > 0 ? sections.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell>{s.name}</TableCell>
                                        <TableCell align="right">{s.total}</TableCell>
                                        <TableCell align="right">{s.success + s.partial}</TableCell>
                                        <TableCell align="right" sx={{ color: s.failed ? 'error.main' : undefined }}>{s.failed}</TableCell>
                                        <TableCell align="right">{s.pending}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                                            Нет данных
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Typography variant="caption" component="div" sx={{ mt: 1, color: 'text.secondary' }}>
                        Подробный ход конвертации — в консоли мониторинга выше (строки «[Конвертер]»).
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );
};

export default ConverterPanel;
