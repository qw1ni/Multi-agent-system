import React from 'react';
import { Container, Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GppBadIcon from '@mui/icons-material/GppBad';

const ForbiddenPage = () => {
    const navigate = useNavigate();

    return (
        <Container maxWidth="md">
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '80vh',
                    textAlign: 'center',
                }}
            >
                <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{
                        p: 5,
                        borderRadius: '16px',
                        bgcolor: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        maxWidth: '500px',
                    }}
                >
                    <Box
                        sx={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            bgcolor: '#fff5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 3,
                        }}
                    >
                        <GppBadIcon sx={{ fontSize: '45px', color: '#dc3545' }} />
                    </Box>

                    <Typography variant="h1" sx={{ fontSize: '5rem', fontWeight: 800, color: '#dc3545', lineHeight: 1 }}>
                        403
                    </Typography>

                    <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: '#212529' }}>
                        Доступ ограничен
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                        У вашей учетной записи недостаточно прав для просмотра этого материала или раздела системы. Он закреплен за другим подразделением.
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            onClick={() => navigate(-1)}
                            color="inherit"
                            sx={{
                                px: 3,
                                borderRadius: '10px',
                                textTransform: 'none',
                                fontWeight: 'bold',
                            }}
                        >
                            Назад
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/')}
                            sx={{
                                bgcolor: '#0056b3',
                                px: 4,
                                borderRadius: '10px',
                                textTransform: 'none',
                                fontWeight: 'bold',
                                boxShadow: 'none',
                                '&:hover': { bgcolor: '#004494', boxShadow: 'none' },
                            }}
                        >
                            На главную
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default ForbiddenPage;