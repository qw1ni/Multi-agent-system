import React, { useState, useEffect } from 'react';
import { Container, Grid, Paper, Typography, Box, CircularProgress, Alert } from '@mui/material';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import MaterialCard from '../components/MaterialCard/MaterialCard';
import materialService from '../services/materialService';

const MainPage = () => {
    const [stats, setStats] = useState(null);
    const [recentMaterials, setRecentMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                setError('');

                const [statsData, materialsData] = await Promise.all([
                    materialService.getUniversityMaterialsStats(),
                    materialService.getRecentMaterials()
                ]);

                setStats(statsData);

                const formattedMaterials = materialsData.map(m => ({
                    id: m.id,
                    title: m.title,
                    authors: [{ name: m.author }],
                    year: m.availableDate ? new Date(m.availableDate).getFullYear() : '—',
                    facultyName: m.facultyName
                }));

                setRecentMaterials(formattedMaterials);
            } catch (err) {
                console.error('Ошибка при загрузке данных главной страницы:', err);
                setError('Не удалось загрузить данные статистики. Пожалуйста, обновите страницу.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Header />
                <Box component="main" sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <CircularProgress size={60} />
                </Box>
                <Footer />
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f4f6f8' }}>
            <Header />

            <Container component="main" maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <Paper elevation={1} sx={{ p: 3, mb: 4, borderRadius: 2, border: '1px solid #dee2e6' }}>
                    <Typography variant="h5" component="h2" sx={{ mb: 3, fontWeight: 'bold' }}>
                        Общая статистика
                    </Typography>

                    <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: '16px',
                        justifyContent: 'space-between',
                        alignItems: 'stretch',
                        width: '100%'
                    }}>

                        <Box sx={{
                            p: 2,
                            bgcolor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: 2,
                            textAlign: 'center',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            alignItems: 'center'
                        }}>
                            <Typography variant="body1">
                                Общее количество МР: <strong>{stats?.totalMaterials}</strong>
                            </Typography>
                        </Box>

                        <Box sx={{
                            p: 2,
                            bgcolor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: 2,
                            textAlign: 'center',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            alignItems: 'center'
                        }}>
                            <Typography variant="body1">
                                За текущий год: <strong>{stats?.materialsThisYear}</strong>
                            </Typography>
                        </Box>

                        <Box sx={{
                            p: 2,
                            bgcolor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: 2,
                            textAlign: 'center',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            alignItems: 'center'
                        }}>
                            <Typography variant="body1">
                                Лидер факультета: <strong>{stats?.leaderFaculty}</strong>
                            </Typography>
                        </Box>

                        <Box sx={{
                            p: 2,
                            bgcolor: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: 2,
                            textAlign: 'center',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            alignItems: 'center'
                        }}>
                            <Typography variant="body1">
                                За текущий месяц: <strong>{stats?.materialsThisMonth}</strong>
                            </Typography>
                        </Box>

                    </Box>
                </Paper>

                <Paper elevation={1} sx={{ p: 3, borderRadius: 2, border: '1px solid #dee2e6' }}>
                    <Typography variant="h5" component="h2" sx={{ mb: 3, fontWeight: 'bold' }}>
                        Последние добавленные материалы
                    </Typography>

                    <Box sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '24px',
                        justifyContent: 'center',
                        alignItems: 'stretch',
                        width: '100%'
                    }}>
                        {recentMaterials.length > 0 ? (
                            recentMaterials.map(item => (
                                <Box
                                    key={item.id}
                                    sx={{
                                        display: 'flex',
                                        width: '320px',
                                        maxWidth: { xs: '100%', sm: '360px' },
                                        flexGrow: 0,
                                        flexShrink: 0
                                    }}
                                >
                                    <MaterialCard
                                        material={item}
                                        sx={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}
                                    />
                                </Box>
                            ))
                        ) : (
                            <Box sx={{ width: '100%', py: 10, textAlign: 'center' }}>
                                <Typography color="text.secondary">
                                    Материалы не найдены
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Paper>
            </Container>

            <Footer />
        </Box>
    );
};

export default MainPage;