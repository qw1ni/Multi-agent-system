import React, { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { axiosInstance } from '../../services/axiosInstance';

const FacultyAutocomplete = ({
    value,
    onChange,
    userRole,
    userFacultyName,
    hideAllOption = false
}) => {

    const [faculties, setFaculties] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {

        if (userRole === 'Сотрудник деканата') {
            const deanFaculty = {
                id: Number(localStorage.getItem('faculty_id')),
                name: userFacultyName
            };

            setFaculties([deanFaculty]);
            onChange(deanFaculty);
            return;
        }

        const fetchFaculties = async () => {
            setLoading(true);
            try {
                const response = await axiosInstance.get('/faculties');

                let data = response.data;

                if (!hideAllOption) {
                    data = [
                        { id: 'all', name: 'Все факультеты' },
                        ...data
                    ];
                }

                setFaculties(data);

            } catch (error) {
                console.error('Ошибка загрузки списка факультетов:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFaculties();

    }, [userRole, userFacultyName, hideAllOption]);

    return (
        <Autocomplete
            options={faculties}
            loading={loading}
            value={value}
            onChange={(event, newValue) => {
                onChange(newValue);
            }}
            getOptionLabel={(option) => option?.name || ''}
            isOptionEqualToValue={(option, val) =>
                String(option?.id) === String(val?.id)
            }
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="Факультет"
                    size="small"
                />
            )}
        />
    );
};
export default FacultyAutocomplete;