import React, { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import specialtyService from '../../services/specialtyService';

const SpecialtyAutocomplete = ({ value, onChange }) => {
    const [specialties, setSpecialties] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchSpecialties = async () => {
            setLoading(true);
            try {
                const data = await specialtyService.getSpecialtiesWithMaterials();
                setSpecialties(data || []);
            } catch (err) {
                console.error("Не удалось загрузить список специальностей", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSpecialties();
    }, []);

    return (
        <Autocomplete
            size="small"
            options={specialties}
            loading={loading}
            isOptionEqualToValue={(option, val) => option.code === val?.code}
            getOptionLabel={(option) => `${option.code} — ${option.name}`}
            value={value}
            onChange={(event, newValue) => {
                onChange(newValue);
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="Специальность / Направление"
                    placeholder="Начните вводить код или название..."
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }}
                />
            )}
            noOptionsText="Специальности не найдены"
            loadingText="Загрузка списка..."
        />
    );
};

export default SpecialtyAutocomplete;