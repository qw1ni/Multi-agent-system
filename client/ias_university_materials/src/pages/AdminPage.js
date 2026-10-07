import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Box, Typography, Paper, Button,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Alert, Snackbar, TextField, TablePagination, InputAdornment,
    IconButton, Grid, FormGroup, FormControlLabel, Checkbox
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import TerminalIcon from '@mui/icons-material/Terminal';

import * as yup from 'yup';
import io from 'socket.io-client';

import AdminTableRow from '../components/Tables/AdminTableRow';

import userService from '../services/userService';
import facultyService from '../services/facultyService';
import departmentService from '../services/departmentService';
import adminService from '../services/adminService';

import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';

const userValidationSchema = yup.object().shape({
    fullName: yup.string()
        .trim()
        .required('ФИО обязательно для заполнения')
        .min(10, 'ФИО должно содержать не менее 10 символов'),
    login: yup.string()
        .trim()
        .required('Логин обязателен')
        .min(3, 'Логин должен быть не менее 3 символов'),
    email: yup.string()
        .trim()
        .notRequired()
        .transform((value) => (value === "" ? null : value))
        .nullable()
        .email('Некорректный формат Email'),
});

const AdminPage = () => {
    const navigate = useNavigate();

    const [roles, setRoles] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [editingRowId, setEditingRowId] = useState(null);

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const DEFAULT_DOWNLOAD_SECTIONS = [
        { id: 'ОКРБ 011-2009', name: 'ОКРБ 011-2009', materials_count: 0 },
        { id: 'ОКРБ 011-2022', name: 'ОКРБ 011-2022', materials_count: 0 },
        { id: 'РФ', name: 'РФ', materials_count: 0 },
        { id: 'РФ 3++', name: 'РФ 3++', materials_count: 0 },
        { id: 'Факультеты', name: 'Факультеты', materials_count: 0 },
    ];

    const [parserLoading, setParserLoading] = useState(false);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [backupLoading, setBackupLoading] = useState(false);
    const [downloadSections, setDownloadSections] = useState(DEFAULT_DOWNLOAD_SECTIONS);
    const [selectedSections, setSelectedSections] = useState(DEFAULT_DOWNLOAD_SECTIONS.map((s) => s.id));
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const actionButtonSx = {
        textTransform: 'none',
        fontWeight: 'bold',
        minWidth: 180,
        height: 40,
        px: 2,
    };

    const [logs, setLogs] = useState([]);
    const socketRef = useRef(null);
    const consoleEndRef = useRef(null);

    const loadUsers = useCallback(async (searchQuery, currentPage, limit) => {
        try {
            setTableLoading(true);
            const serverPage = currentPage + 1;
            const response = await userService.getAllUsers(searchQuery, serverPage, limit);

            setUsers(response.data || []);
            setTotalItems(response.pagination?.totalItems || 0);
        } catch (err) {
            console.error('Ошибка при загрузке пользователей:', err);
            setError('Не удалось обновить список пользователей');
        } finally {
            setTableLoading(false);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        socketRef.current = io(process.env.REACT_APP_SOCKET_URL);

        socketRef.current.on('connect', () => {
            console.log('Успешное WebSocket подключение к комнате логов');
            socketRef.current.emit('subscribe_parser_logs');
        });

        socketRef.current.on('initial_logs', (initialLogs) => {
            setLogs(initialLogs);
        });

        socketRef.current.on('new_parser_log', (newLog) => {
            setLogs((prevLogs) => [...prevLogs, newLog]);

            if (
                newLog.level === 'SUCCESS' &&
                newLog.message?.includes('Импорт дисциплин успешно завершен')
            ) {
                Snackbar('Импорт дисциплин завершен', {
                    variant: 'success'
                });
            }

            if (
                newLog.level === 'ERROR' &&
                newLog.message?.includes('Импорт дисциплин')
            ) {
                Snackbar('Импорт дисциплин завершился с ошибкой', {
                    variant: 'error'
                });
            }
        });

        socketRef.current.on('logs_cleared', () => {
            setLogs([]);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    useEffect(() => {
        const initDashboard = async () => {
            try {
                const [rolesData, facultiesData, deptsData] = await Promise.all([
                    userService.getAllRoles(),
                    facultyService.getAllFaculties(),
                    departmentService.getAllDepartments()
                ]);
                setRoles(rolesData);
                setFaculties(facultiesData);
                setDepartments(deptsData);

                await loadUsers(search, page, rowsPerPage);
            } catch (err) {
                setError('Ошибка при загрузке данных справочников с сервера');
                console.error(err);
                setLoading(false);
            }
        };
        initDashboard();
    }, [loadUsers]);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
        loadUsers(search, newPage, rowsPerPage);
    };

    const handleChangeRowsPerPage = (event) => {
        const newRowsPerPage = parseInt(event.target.value, 10);
        setRowsPerPage(newRowsPerPage);
        setPage(0);
        loadUsers(search, 0, newRowsPerPage);
    };

    const handleSearchChange = (event) => {
        const value = event.target.value;
        setSearch(value);
        setPage(0);
        loadUsers(value, 0, rowsPerPage);
    };
    const handleClearSearch = () => {
        setSearch('');
        setPage(0);
        loadUsers('', 0, rowsPerPage);
    };

    const handleBackupDownload = async () => {
        try {
            setBackupLoading(true);
            const blobData = await adminService.downloadDatabaseBackup();
            const url = window.URL.createObjectURL(new Blob([blobData]));
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            const generatedFileName = `university_library_db_backup_${dateStr}.sql`;
            link.setAttribute('download', generatedFileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

            setSnackbar({ open: true, message: 'Резервная копия успешно скачана', severity: 'success' });
        } catch (err) {
            console.error(err);
            setSnackbar({ open: true, message: 'Ошибка резервного копирования.', severity: 'error' });
        } finally {
            setBackupLoading(false);
        }
    };

    const handleStartParser = async () => {
        try {
            setParserLoading(true);
            const result = await adminService.runLibraryParser();
            setSnackbar({ open: true, message: result.message || 'Парсер запущен', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: 'Не удалось запустить парсер', severity: 'error' });
        } finally {
            setParserLoading(false);
        }
    };

    const loadDownloadSections = useCallback(async () => {
        try {
            const data = await adminService.getDownloadSections();
            const sections = data.sections || DEFAULT_DOWNLOAD_SECTIONS;
            setDownloadSections(sections);
            setSelectedSections((prev) => {
                if (prev.length > 0) {
                    return prev.filter((id) => sections.some((s) => s.id === id));
                }
                return sections.map((s) => s.id);
            });
        } catch (err) {
            console.error('Не удалось загрузить разделы для скачивания:', err);
            setDownloadSections(DEFAULT_DOWNLOAD_SECTIONS);
        }
    }, []);

    useEffect(() => {
        loadDownloadSections();
    }, [loadDownloadSections]);

    const handleToggleSection = (sectionId) => {
        setSelectedSections((prev) => (
            prev.includes(sectionId)
                ? prev.filter((id) => id !== sectionId)
                : [...prev, sectionId]
        ));
    };

    const handleDownloadSelected = async () => {
        if (selectedSections.length === 0) {
            setSnackbar({ open: true, message: 'Выберите хотя бы один раздел', severity: 'error' });
            return;
        }
        try {
            setDownloadLoading(true);
            const result = await adminService.downloadLibraryFiles(selectedSections);
            setSnackbar({ open: true, message: result.message || 'Скачивание выбранных разделов запущено', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: 'Не удалось запустить скачивание', severity: 'error' });
        } finally {
            setDownloadLoading(false);
        }
    };

    const handleDownloadAll = async () => {
        try {
            setDownloadLoading(true);
            const result = await adminService.downloadLibraryFiles(null);
            setSnackbar({ open: true, message: result.message || 'Скачивание всех файлов запущено', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: 'Не удалось запустить скачивание всех файлов', severity: 'error' });
        } finally {
            setDownloadLoading(false);
        }
    };

    const handleStartImportDisciplines = async () => {
        try {
            // setParserLoading(true);
            // const result = await adminService.runLibraryParser();
            setSnackbar({ open: true, message: 'Иморт запущен', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: 'Не удалось запустить импорт', severity: 'error' });
        } finally {
            setParserLoading(false);
        }
    };


    const handleEditToggle = async (rowId) => {
        if (editingRowId === rowId) {
            const userToValidate = users.find(u => u.id === rowId);
            try {
                setValidationErrors({});
                await userValidationSchema.validate(userToValidate, { abortEarly: false });

                const updatePayload = {
                    full_name: userToValidate.fullName,
                    login: userToValidate.login,
                    email: userToValidate.email || null,
                    role_id: Number(userToValidate.roleId),
                    faculty_id: userToValidate.facultyId ? Number(userToValidate.facultyId) : null,
                    department_id: userToValidate.departmentId ? Number(userToValidate.departmentId) : null
                };

                await userService.updateUser(rowId, updatePayload);

                setEditingRowId(null);
                setSnackbar({ open: true, message: 'Данные пользователя успешно сохранены', severity: 'success' });

                loadUsers(search, page, rowsPerPage);
            } catch (err) {
                if (err instanceof yup.ValidationError) {
                    const errors = {};
                    err.inner.forEach(e => { errors[e.path] = e.message; });
                    setValidationErrors(errors);
                } else if (err.response && err.response.status === 409) {
                    const serverMessage = err.response.data?.message || 'Конфликт данных';
                    const newErrors = {};
                    if (serverMessage.toLowerCase().includes('логин')) newErrors.login = serverMessage;
                    if (serverMessage.toLowerCase().includes('почт')) newErrors.email = serverMessage;
                    setValidationErrors(newErrors);
                    setSnackbar({ open: true, message: serverMessage, severity: 'error' });
                }
            }
        } else {
            setValidationErrors({});
            setEditingRowId(rowId);
        }
    };

    const handleCancelEdit = () => {
        setEditingRowId(null);
        setValidationErrors({});
        loadUsers(search, page, rowsPerPage);
    };

    const handleCellChange = (rowId, field, value) => {
        setUsers(prev => prev.map(u => {
            if (u.id === rowId) {
                let updated = { ...u, [field]: value };
                if (field === 'roleId') {
                    const roleObj = roles.find(r => r.id === value);
                    updated.roleName = roleObj ? roleObj.name : '';
                    if (value !== 4 && value !== 5) {
                        updated.facultyId = null; updated.departmentId = null;
                    }
                }
                return updated;
            }
            return u;
        }));
    };

    const handleDeleteUser = async (rowId, roleName) => {
        if (roleName === 'Администратор' && users.filter(u => u.roleName === 'Администратор').length <= 1 && page === 0) {
            alert('Нельзя удалить последнего Администратора.');
            return;
        }
        if (window.confirm('Вы действительно хотите удалить этого пользователя?')) {
            try {
                // ТOДО: await userService.deleteUser(rowId);
                setSnackbar({ open: true, message: 'Пользователь успешно удален', severity: 'success' });
                loadUsers(search, page, rowsPerPage);
            } catch (err) {
                setSnackbar({ open: true, message: 'Ошибка при удалении', severity: 'error' });
            }
        }
    };

    const getLogColor = (level) => {
        switch (level) {
            case 'ERROR': return '#ff6b6b';
            case 'WARNING': return '#ffd166';
            case 'SUCCESS': return '#06d6a0';
            default: return '#e0e0e0';
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <>
            <Header />
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: '12px', position: 'relative' }}>
                    {tableLoading && (
                        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'rgba(255,255,255,0.6)', zIndex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <CircularProgress />
                        </Box>
                    )}

                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} borderBottom="2px solid #e0e0e0" pb={2} flexWrap="wrap" gap={2}>
                        <Typography variant="h5" sx={{ color: '#0056b3', fontWeight: 'bold' }}>
                            Управление пользователями
                        </Typography>

                        <TextField
                            size="small"
                            variant="outlined"
                            placeholder="Поиск по ФИО, логину, email..."
                            value={search}
                            onChange={handleSearchChange}
                            sx={{ width: '350px', bgcolor: '#fff' }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: search && (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="очистить поиск"
                                            onClick={handleClearSearch}
                                            edge="end"
                                            size="small"
                                            sx={{ color: 'text.secondary' }}
                                        >
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                        <Button
                            variant="contained"
                            onClick={() => navigate('/registration')}
                            sx={{ bgcolor: '#0056b3', textTransform: 'none', fontWeight: 'bold', '&:hover': { bgcolor: '#004494' } }}
                        >
                            Добавить пользователя
                        </Button>
                    </Box>

                    <TableContainer>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                                <TableRow>
                                    <TableCell width="50px" />
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>№</TableCell>
                                    <TableCell align="left" sx={{ fontWeight: 'bold' }}>ФИО пользователя</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Логин</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Роль</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Редактировать</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Удалить</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.length > 0 ? (
                                    users.map((user, index) => (
                                        <AdminTableRow
                                            key={user.id}
                                            row={{ ...user, index: page * rowsPerPage + index + 1 }}
                                            isEditing={editingRowId === user.id}
                                            validationErrors={validationErrors}
                                            onEditToggle={handleEditToggle}
                                            onCancelEdit={handleCancelEdit}
                                            onDelete={handleDeleteUser}
                                            onCellChange={handleCellChange}
                                            roles={roles}
                                            faculties={faculties}
                                            departments={departments}
                                        />
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                            Пользователи не найдены
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={totalItems}
                        page={page}
                        onPageChange={handleChangePage}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        rowsPerPageOptions={[5, 10, 25]}
                        labelRowsPerPage="Строк на странице:"
                        labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count !== -1 ? count : `более чем ${to}`}`}
                    />
                </Paper>
                <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: '12px' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            gap: 3
                        }}
                    >
                        <Box
                            sx={{
                                flex: { xs: '1 1 auto', md: '0 0 33%' },
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}
                        >
                            <Typography variant="h6" sx={{ color: '#0056b3', fontWeight: 'bold', mb: 1 }}>
                                Парсер материалов
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <Button
                                    variant="contained"
                                    onClick={handleStartParser}
                                    disabled={parserLoading || downloadLoading}
                                    sx={{ ...actionButtonSx, bgcolor: '#0056b3' }}
                                >
                                    {parserLoading ? 'Запуск...' : 'Запуск парсера'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={handleDownloadSelected}
                                    disabled={downloadLoading || selectedSections.length === 0}
                                    sx={actionButtonSx}
                                >
                                    {downloadLoading ? 'Скачивание...' : 'Скачать выбранное'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={handleDownloadAll}
                                    disabled={downloadLoading}
                                    sx={actionButtonSx}
                                >
                                    {downloadLoading ? 'Скачивание...' : 'Скачать всё'}
                                </Button>
                            </Box>
                            <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5, fontWeight: 'bold', color: 'text.secondary' }}>
                                Разделы для скачивания
                            </Typography>
                            <FormGroup>
                                {downloadSections.map((section) => (
                                    <FormControlLabel
                                        key={section.id}
                                        control={
                                            <Checkbox
                                                checked={selectedSections.includes(section.id)}
                                                onChange={() => handleToggleSection(section.id)}
                                                disabled={downloadLoading}
                                                size="small"
                                            />
                                        }
                                        label={`${section.name} (${section.materials_count})`}
                                    />
                                ))}
                            </FormGroup>
                        </Box>

                        <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <TerminalIcon fontSize="small" sx={{ color: '#0056b3' }} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                    Консоль мониторинга
                                </Typography>
                            </Box>
                            <Paper
                                elevation={0}
                                sx={{
                                    backgroundColor: '#1e1e1e',
                                    borderRadius: '8px',
                                    p: 2,
                                    height: '180px',
                                    overflowY: 'auto',
                                    fontFamily: 'Courier New, monospace',
                                    boxShadow: 'inset 0px 2px 5px rgba(0,0,0,0.5)'
                                }}
                            >
                                {logs.length > 0 ? (
                                    logs.map((log, index) => (
                                        <Typography
                                            key={index}
                                            variant="caption"
                                            component="div"
                                            sx={{ color: getLogColor(log.level), whiteSpace: 'pre-wrap', mb: 0.5, lineHeight: 1.4 }}
                                        >
                                            {log.timestamp ? `[${new Date(log.timestamp).toLocaleTimeString()}] ` : ''}
                                            {log.message}
                                        </Typography>
                                    ))
                                ) : (
                                    <Typography variant="caption" sx={{ color: '#666', fontStyle: 'italic' }}>
                                        Ожидание запуска или системных логов...
                                    </Typography>
                                )}
                                <div ref={consoleEndRef} />
                            </Paper>
                        </Box>
                    </Box>
                </Paper>

                <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: '12px' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', md: 'row' },
                            gap: 3
                        }}
                    >
                        <Box
                            sx={{
                                flex: { xs: '1 1 auto', md: '0 0 33%' },
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center'
                            }}
                        >
                            <Typography variant="h6" sx={{ color: '#0056b3', fontWeight: 'bold', mb: 1 }}>
                                Добавление дисциплин в систему
                            </Typography>
                            <Box>
                                <Button
                                    variant="contained"
                                    onClick={handleStartImportDisciplines}
                                    disabled={parserLoading}
                                    sx={{ bgcolor: '#0056b3', textTransform: 'none', fontWeight: 'bold', px: 4 }}
                                >
                                    {parserLoading ? 'Выполняется...' : 'Запуск импорта'}
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </Paper>

                <Paper elevation={2} sx={{ p: 3, borderRadius: '12px' }}>
                    <Typography variant="h6" sx={{ color: '#0056b3', fontWeight: 'bold', mb: 2 }}>Резервное копирование БД</Typography>
                    <Button variant="contained" onClick={handleBackupDownload} disabled={backupLoading} startIcon={backupLoading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />} sx={{ bgcolor: '#0056b3', mb: 2, textTransform: 'none', fontWeight: 'bold', '&:hover': { bgcolor: '#004494' } }}>
                        {backupLoading ? 'Создание...' : 'Резервное копирование БД'}
                    </Button>
                </Paper>
            </Container>

            <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
                <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>{snackbar.message}</Alert>
            </Snackbar>
            <Footer />
        </>
    );
};

export default AdminPage;