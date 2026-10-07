import React from 'react';
import { Container, Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SearchOffIcon from '@mui/icons-material/SearchOff';

const NotFoundPage = () => {
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
                            bgcolor: '#f8f9fa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 3,
                        }}
                    >
                        <SearchOffIcon sx={{ fontSize: '45px', color: '#6c757d' }} />
                    </Box>

                    <Typography variant="h1" sx={{ fontSize: '5rem', fontWeight: 800, color: '#343a40', lineHeight: 1 }}>
                        404
                    </Typography>

                    <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 2, mb: 1, color: '#212529' }}>
                        Страница не найдена
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                        К сожалению, запрашиваемая вами страница не существует, была удалена или перемещена по новому адресу
                    </Typography>

                    <Button
                        variant="contained"
                        onClick={() => navigate('/')}
                        sx={{
                            bgcolor: '#0056b3',
                            px: 4,
                            py: 1,
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontWeight: 'bold',
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#004494', boxShadow: 'none' },
                        }}
                    >
                        Вернуться на главную
                    </Button>
                </Paper>
            </Box>
        </Container>
    );
};

export default NotFoundPage;