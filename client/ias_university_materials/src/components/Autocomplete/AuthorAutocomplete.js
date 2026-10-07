import React, { useState, useEffect, useMemo } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import debounce from 'lodash/debounce';
import authorService from '../../services/authorService';

const AuthorAutocomplete = ({ value, onChange }) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState(value && typeof value === 'object' ? (value.name || '') : (value || ''));

    useEffect(() => {
        setInputValue(value && typeof value === 'object' ? (value.name || '') : (value || ''));
    }, [value]);

    const fetchAuthors = useMemo(
        () => debounce(async (query) => {
            if (!query || query.length < 2) {
                setOptions([]);
                return;
            }

            setLoading(true);
            try {
                const data = await authorService.searchAuthors(query);
                setOptions(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Search error:", error);
                setOptions([]);
            } finally {
                setLoading(false);
            }
        }, 500),
        []
    );

    useEffect(() => {
        if (value && typeof value === 'object' && inputValue === value.name) {
            return;
        }
        fetchAuthors(inputValue);
        return () => fetchAuthors.cancel();
    }, [inputValue, fetchAuthors, value]);

    return (
        <Autocomplete
            size="small"
            fullWidth
            filterOptions={(x) => x}
            options={options}
            loading={loading}
            value={value && typeof value === 'object' ? value : null}
            getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return option.name || "";
            }}
            isOptionEqualToValue={(option, val) => {
                if (!option || !val) return false;
                const optionId = typeof option === 'object' ? option.id : option;
                const valueId = typeof val === 'object' ? val.id : val;
                return optionId === valueId;
            }}
            inputValue={inputValue}
            onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue);
            }}
            onChange={(event, newValue) => {
                onChange(newValue || null);
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="Автор"
                    placeholder="Начните вводить фамилию..."
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

export default AuthorAutocomplete;