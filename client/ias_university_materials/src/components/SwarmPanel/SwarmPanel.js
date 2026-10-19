import React from 'react';
import {
    Box, Typography, Chip, LinearProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import HubIcon from '@mui/icons-material/Hub';

const STATE_VIEW = {
    waiting: { label: 'Ожидает', color: 'default' },
    running: { label: 'Работает', color: 'primary' },
    done: { label: 'Готово', color: 'success' },
    stopped: { label: 'Остановлен', color: 'warning' },
    failed: { label: 'Ошибка', color: 'error' },
    restarting: { label: 'Перезапуск', color: 'secondary' },
};

const MODE_LABEL = {
    incremental: 'только новые материалы',
    full: 'с нуля',
};

const SwarmPanel = ({ swarm }) => {
    if (!swarm || !swarm.agents || swarm.agents.length === 0) {
        return null;
    }

    const totals = swarm.totals || {};
    const statusText = swarm.running
        ? (swarm.stopping ? 'останавливается' : 'работает')
        : 'завершён';

    return (
        <Box sx={{ mt: 2 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
                <HubIcon fontSize="small" sx={{ color: '#0056b3' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                    Рой агентов парсинга — {statusText}
                    {swarm.mode ? ` (${MODE_LABEL[swarm.mode] || swarm.mode})` : ''}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                    Записано: {totals.saved || 0} · обработано: {totals.processed || 0} · уже в БД: {totals.skipped_known || 0}
                </Typography>
            </Box>
            {swarm.running && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}
            <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Агент</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Раздел</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Статус</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Сейчас обрабатывает</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Записано</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Обработано</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Уже в БД</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {swarm.agents.map((agent) => {
                            const view = STATE_VIEW[agent.state] || { label: agent.state, color: 'default' };
                            const stats = agent.stats || {};
                            return (
                                <TableRow key={agent.id}>
                                    <TableCell>{agent.name}</TableCell>
                                    <TableCell>{agent.section}</TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={agent.restarts ? `${view.label} · перезапусков: ${agent.restarts}` : view.label}
                                            color={view.color}
                                            title={agent.error || ''}
                                        />
                                    </TableCell>
                                    <TableCell
                                        sx={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                        title={agent.current_node || ''}
                                    >
                                        {['failed', 'restarting'].includes(agent.state) ? (agent.error || '—') : (agent.current_node || '—')}
                                    </TableCell>
                                    <TableCell align="right">{stats.saved || 0}</TableCell>
                                    <TableCell align="right">{stats.processed || 0}</TableCell>
                                    <TableCell align="right">{stats.skipped_known || 0}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default SwarmPanel;
