import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import {
    TextField,
    Button,
    Typography,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert
} from '@mui/material';

import userService from '../../services/userService';
import facultyService from '../../services/facultyService';
import departmentService from '../../services/departmentService';
import { ROLES } from '../../constants/roles';

const Registration = () => {
    const navigate = useNavigate();

    const [roles, setRoles] = useState([]);
    const [faculties, setFaculties] = useState([]);
    const [departments, setDepartments] = useState([]);

    const [submitError, setSubmitError] = useState('');

    const [createdUserData, setCreatedUserData] = useState(null);

    useEffect(() => {
        const fetchDictionaries = async () => {
            try {
                const [rolesData, facultiesData, departmentsData] = await Promise.all([
                    userService.getAllRoles(),
                    facultyService.getAllFaculties(),
                    departmentService.getAllDepartments()
                ]);
                setRoles(rolesData);
                setFaculties(facultiesData);
                setDepartments(departmentsData);
            } catch (err) {
                console.error('Ошибка загрузки справочников через сервисы: ', err);
            }
        };

        fetchDictionaries();
    }, []);

    const validationSchema = Yup.object({
        fullName: Yup.string()
            .required('Обязательное поле')
            .min(6, 'ФИО должно содержать не менее 6 символов'),
        login: Yup.string()
            .required('Обязательное поле')
            .min(3, 'Логин должен быть не менее 3 символов'),
        email: Yup.string()
            .email('Некорректный формат email')
            .nullable(),
        roleId: Yup.number()
            .required('Обязательное поле'),
        facultyId: Yup.number().nullable().when('roleId', {
            is: (val) => {
                const targetRole = roles.find(r => r.id === val);
                return targetRole && (targetRole.name === ROLES.DEANERY || targetRole.name === ROLES.DEPARTMENT);
            },
            then: () => Yup.number().required('Для этой роли выбор факультета обязателен'),
            otherwise: () => Yup.number().nullable()
        }),
        departmentId: Yup.number().nullable().when('roleId', {
            is: (val) => {
                const targetRole = roles.find(r => r.id === val);
                return targetRole && targetRole.name === ROLES.DEPARTMENT;
            },
            then: () => Yup.number().required('Для сотрудника кафедры выбор кафедры обязателен'),
            otherwise: () => Yup.number().nullable()
        })
    });

    const formik = useFormik({
        initialValues: {
            fullName: '',
            login: '',
            email: '',
            roleId: '',
            facultyId: '',
            departmentId: '',
        },
        validationSchema: validationSchema,
        onSubmit: async (values, { resetForm }) => {
            try {
                setSubmitError('');

                const payload = {
                    fullName: values.fullName,
                    login: values.login,
                    email: values.email || null,
                    roleId: values.roleId,
                    facultyId: values.facultyId || null,
                    departmentId: values.departmentId || null,
                };

                const data = await userService.createUser(payload);
                console.log(data);

                setCreatedUserData(data);
                resetForm();
            } catch (e) {
                if (e.response && e.response.status === 409) {
                    setSubmitError(e.response.data.message);
                } else {
                    setSubmitError('Произошла ошибка при создании пользователя');
                }
            }
        },
    });

    const handleFieldChange = (field) => (event) => {
        formik.handleChange(event);
        setSubmitError('');

        if (field === 'roleId') {
            const nextRoleId = event.target.value;
            const nextRole = roles.find(r => r.id === nextRoleId);
            const nextRoleName = nextRole ? nextRole.name : '';

            if (nextRoleName !== ROLES.DEANERY && nextRoleName !== ROLES.DEPARTMENT) {
                formik.setFieldValue('facultyId', '');
                formik.setFieldValue('departmentId', '');
            }
        }
        if (field === 'facultyId') {
            formik.setFieldValue('departmentId', '');
        }
    };
    const filteredDepartments = departments.filter(
        d => d.facultyId === formik.values.facultyId
    );

    const selectedRoleObject = roles.find(r => r.id === formik.values.roleId);
    const selectedRoleName = selectedRoleObject ? selectedRoleObject.name : '';

    const isFacultyDisabled = selectedRoleName !== ROLES.DEANERY && selectedRoleName !== ROLES.DEPARTMENT;
    const isDepartmentDisabled = selectedRoleName !== ROLES.DEPARTMENT || !formik.values.facultyId;

    return (
        <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 'calc(100vh - 70px)',
            bgcolor: '#f5f7fa',
            p: 2
        }}>
            <Box
                component="form"
                onSubmit={formik.handleSubmit}
                noValidate
                sx={{
                    width: '100%',
                    maxWidth: '28rem',
                    backgroundColor: 'white',
                    padding: '35px',
                    borderRadius: '20px',
                    boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.05)',
                    textAlign: 'center'
                }}
            >
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: '#0052a1' }}>
                    Регистрация нового пользователя
                </Typography>

                {submitError && (
                    <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
                        {submitError}
                    </Alert>
                )}

                <TextField
                    fullWidth
                    margin="normal"
                    id="fullName"
                    name="fullName"
                    label="ФИО сотрудника"
                    value={formik.values.fullName}
                    onChange={handleFieldChange('fullName')}
                    error={formik.touched.fullName && Boolean(formik.errors.fullName)}
                    helperText={formik.touched.fullName && formik.errors.fullName}
                />

                <TextField
                    fullWidth
                    margin="normal"
                    id="login"
                    name="login"
                    label="Логин в системе"
                    value={formik.values.login}
                    onChange={handleFieldChange('login')}
                    error={formik.touched.login && Boolean(formik.errors.login)}
                    helperText={formik.touched.login && formik.errors.login}
                />

                <TextField
                    fullWidth
                    margin="normal"
                    id="email"
                    name="email"
                    label="Email (необязательно)"
                    value={formik.values.email}
                    onChange={handleFieldChange('email')}
                    error={formik.touched.email && Boolean(formik.errors.email)}
                    helperText={formik.touched.email && formik.errors.email}
                />

                <FormControl fullWidth margin="normal" error={formik.touched.roleId && Boolean(formik.errors.roleId)}>
                    <InputLabel id="role-label">Роль доступа</InputLabel>
                    <Select
                        labelId="role-label"
                        id="roleId"
                        name="roleId"
                        value={formik.values.roleId}
                        label="Роль доступа"
                        onChange={handleFieldChange('roleId')}
                    >
                        {roles.map((role) => (
                            <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>
                        ))}
                    </Select>
                    {formik.touched.roleId && <FormHelperText>{formik.errors.roleId}</FormHelperText>}
                </FormControl>

                <FormControl
                    fullWidth
                    margin="normal"
                    disabled={isFacultyDisabled}
                    error={formik.touched.facultyId && Boolean(formik.errors.facultyId)}
                >
                    <InputLabel id="faculty-label">Факультет БРУ</InputLabel>
                    <Select
                        labelId="faculty-label"
                        id="facultyId"
                        name="facultyId"
                        value={formik.values.facultyId}
                        label="Факультет БРУ"
                        onChange={handleFieldChange('facultyId')}
                    >
                        {faculties.map((fac) => (
                            <MenuItem key={fac.id} value={fac.id}>{fac.name}</MenuItem>
                        ))}
                    </Select>
                    {formik.touched.facultyId && <FormHelperText>{formik.errors.facultyId}</FormHelperText>}
                </FormControl>

                <FormControl
                    fullWidth
                    margin="normal"
                    disabled={isDepartmentDisabled}
                    error={formik.touched.departmentId && Boolean(formik.errors.departmentId)}
                >
                    <InputLabel id="department-label">Кафедра</InputLabel>
                    <Select
                        labelId="department-label"
                        id="departmentId"
                        name="departmentId"
                        value={formik.values.departmentId}
                        label="Кафедра"
                        onChange={handleFieldChange('departmentId')}
                    >
                        {filteredDepartments.map((dept) => (
                            <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                        ))}
                    </Select>
                    {formik.touched.departmentId && <FormHelperText>{formik.errors.departmentId}</FormHelperText>}
                </FormControl>

                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ mt: 3, mb: 1, p: 1.2, textTransform: 'none', fontWeight: 'bold', fontSize: '1rem', bgcolor: '#0052a1' }}
                >
                    Зарегистрировать пользователя
                </Button>
            </Box>

            <Dialog open={Boolean(createdUserData)} onClose={() => setCreatedUserData(null)} PaperProps={{ sx: { borderRadius: '12px', p: 1 } }}>
                <DialogTitle sx={{ fontWeight: 'bold', color: 'success.main' }}>Пользователь успешно создан!</DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ mb: 2 }}>Сотрудник зарегистрирован. Передайте ему временные данные:</Typography>
                    <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: '8px', fontFamily: 'monospace' }}>
                        <Typography><strong>Логин:</strong> {createdUserData?.user?.login}</Typography>
                        <Typography sx={{ mt: 1 }}><strong>Временный пароль:</strong> <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>{createdUserData?.temporaryPassword}</span></Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setCreatedUserData(null); navigate('/admin'); }} variant="contained" fullWidth>Готово</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Registration;