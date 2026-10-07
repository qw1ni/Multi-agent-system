import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import { useNavigate } from 'react-router-dom';
import authService from "../../services/authService";
import { ROLES } from "../../constants/roles";
import * as Yup from 'yup';
import {
    TextField,
    Button,
    Typography,
    Box,
    InputAdornment,
    FormHelperText,
    IconButton,
    Paper
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AccountCircle from '@mui/icons-material/AccountCircle';
import LockIcon from '@mui/icons-material/Lock';

const validationSchema = Yup.object({
    identifier: Yup.string()
        .required('Обязательное поле')
        .min(3, 'Минимум 3 символа'),
    password: Yup.string()
        .required('Обязательное поле')
        .min(6, 'Минимум 6 символов')
});

const Login = () => {
    const navigate = useNavigate();
    const [authError, setAuthError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleClickShowPassword = () => setShowPassword((show) => !show);

    useEffect(() => {
        localStorage.clear();
    }, []);

    const formik = useFormik({
        initialValues: {
            identifier: '',
            password: ''
        },
        validationSchema: validationSchema,
        onSubmit: async (values, { resetForm }) => {
            try {
                setAuthError('');
                const response = await authService.login(values.identifier, values.password);
                localStorage.setItem('user', JSON.stringify(response.user));
                localStorage.setItem('role', response.role);
                switch (response.role) {
                    case ROLES.ADMIN:
                        navigate('/');
                        break;
                    case ROLES.ACADEMIC:
                        navigate('/');
                        break;
                    case ROLES.DEANERY:
                        navigate('/');
                        break;
                    case ROLES.DEPARTMENT:
                        navigate('/');
                        break;
                    default:
                        navigate('/catalog');
                }

                resetForm();
            } catch (e) {
                console.log(e);
                if (e.response?.data?.message) {
                    setAuthError(e.response.data.message);
                } else if (e.message.includes("401") || e.message.includes("Неверный")) {
                    setAuthError("Неверный логин/email или пароль");
                } else {
                    setAuthError("Произошла ошибка при авторизации. Попробуйте позже.");
                }
            }
        },
    });

    const handleInputChange = (event) => {
        formik.handleChange(event);
        setAuthError(''); // Сбрасываем ошибку при вводе
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f4f6f8'
        }}>
            <Paper
                elevation={3}
                component="form"
                onSubmit={formik.handleSubmit}
                noValidate
                sx={{
                    width: '100%',
                    maxWidth: '400px',
                    p: 4,
                    textAlign: 'center',
                    borderRadius: '16px',
                    bgcolor: 'background.paper'
                }}
            >
                <Typography variant="h5" sx={{ mb: 1, fontWeight: 'bold', color: '#0056b3' }}>
                    Вход в систему
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Информационно-аналитическая система БРУ
                </Typography>

                <TextField
                    fullWidth
                    margin="normal"
                    id="identifier"
                    name="identifier"
                    label="Логин или Email"
                    variant="outlined"
                    value={formik.values.identifier}
                    onChange={handleInputChange}
                    error={formik.touched.identifier && Boolean(formik.errors.identifier)}
                    helperText={formik.touched.identifier && formik.errors.identifier}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <AccountCircle color="action" />
                            </InputAdornment>
                        ),
                    }}
                />

                <TextField
                    fullWidth
                    margin="normal"
                    id="password"
                    name="password"
                    label="Пароль"
                    type={showPassword ? "text" : "password"}
                    variant="outlined"
                    value={formik.values.password}
                    onChange={handleInputChange}
                    error={formik.touched.password && Boolean(formik.errors.password)}
                    helperText={formik.touched.password && formik.errors.password}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <LockIcon color="action" />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="Переключить видимость пароля"
                                    onClick={handleClickShowPassword}
                                    edge="end"
                                >
                                    {showPassword ? <Visibility /> : <VisibilityOff />}
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                />

                {authError && (
                    <FormHelperText error sx={{ mt: 1, textAlign: 'center', fontSize: '0.875rem', fontWeight: '500' }}>
                        {authError}
                    </FormHelperText>
                )}

                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{
                        mt: 4,
                        mb: 1,
                        py: 1.2,
                        bgcolor: '#0056b3',
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        '&:hover': { bgcolor: '#004494' }
                    }}
                >
                    Войти
                </Button>
            </Paper>
        </Box>
    );
};

export default Login;