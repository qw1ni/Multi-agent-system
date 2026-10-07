import React, { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress, Box, Typography } from '@mui/material';
import departmentService from '../../services/departmentService';

const DepartmentAutoComplete = ({ facultyId, allDepartments = false, value, onChange, error, helperText }) => {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let active = true;

        if (!allDepartments && !facultyId) {
            setOptions([]);
            return;
        }

        const fetchDepartments = async () => {
            setLoading(true);
            try {
                const responseData = allDepartments
                    ? await departmentService.getAllDepartments()
                    : await departmentService.getAllDepartmentsByFacultyId(facultyId);

                if (active) {
                    setOptions(responseData);
                }
            } catch (err) {
                console.error('Ошибка при загрузке списка кафедр:', err);
                if (active) {
                    setOptions([]);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        if (open) {
            fetchDepartments();
        }

        return () => {
            active = false;
        };
    }, [open, facultyId, allDepartments]);

    return (
        <Autocomplete
            id="department-autocomplete"
            open={open}
            size='small'
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            value={value}
            onChange={(event, newValue) => {
                onChange(newValue);
            }}
            isOptionEqualToValue={(option, val) =>
                String(option?.id) === String(val?.id)
            }
            getOptionLabel={(option) => option.name || ''}
            options={options}
            loading={loading}
            noOptionsText="Кафедры не найдены"
            loadingText="Загрузка списка..."
            renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id}>
                    <Typography variant="body2">{option.name}</Typography>
                </Box>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="Выберите кафедру"
                    variant="outlined"
                    fullWidth
                    error={!!error}
                    helperText={helperText}
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <React.Fragment>
                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </React.Fragment>
                        ),
                    }}
                />
            )}
        />
    );
};

export default DepartmentAutoComplete;