import React, { useState, useCallback, useEffect } from 'react';
import {
    Container, TextField, FormControl, InputLabel,
    Select, MenuItem, Button, Typography, Paper, Box, Pagination
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import MaterialCard from '../components/MaterialCard/MaterialCard';
import AuthorAutocomplete from '../components/Autocomplete/AuthorAutocomplete';

import facultyService from '../services/facultyService';
import departmentService from '../services/departmentService';
import materialService from '../services/materialService';

import { ROLES } from '../constants/roles';

const CatalogPage = () => {

    const storedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
    const userRole = localStorage.getItem('role') || null;

    const [materials, setMaterials] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const limit = 20;

    const [filters, setFilters] = useState({
        search: '',
        faculty: userRole === ROLES.DEPARTMENT || userRole === ROLES.DEANERY ? storedUser?.facultyId || '' : '',
        department: userRole === ROLES.DEPARTMENT ? storedUser?.departmentId || '' : '',
        author: '',
        yearFrom: '',
        yearTo: ''
    });

    const [faculties, setFaculties] = useState([]);
    const [availableDepartments, setAvailableDepartments] = useState([]);
    const [activeParams, setActiveParams] = useState({
        facultyId: userRole === ROLES.DEPARTMENT || userRole === ROLES.DEANERY ? storedUser?.facultyId || undefined : undefined,
        departmentId: userRole === ROLES.DEPARTMENT ? storedUser?.departmentId || undefined : undefined,
    });
    const [isSearching, setIsSearching] = useState(false);
    const [similarityScores, setSimilarityScores] = useState({});

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 12 }, (_, i) => currentYear - i);

    const fetchMaterials = useCallback(async (currentPage = 1) => {
        if (activeParams.noResults) {
            setMaterials([]);
            setTotalPages(0);
            return;
        }

        try {
            const data = await materialService.getMaterialsWithPag({
                page: currentPage,
                limit: limit,
                ...activeParams
            });

            let resultItems = data.items || [];

            if (activeParams.materialIds) {
                resultItems = resultItems
                    .map(item => ({
                        ...item,
                        similarity: similarityScores[item.id] || 0
                    }))
                    .sort((a, b) => b.similarity - a.similarity);
            }

            setMaterials(resultItems);
            setTotalPages(data.pagination.totalPages || 1);
        } catch (error) {
            console.error("Ошибка при загрузке:", error);
        }
    }, [activeParams, limit, similarityScores]);

    useEffect(() => {
        fetchMaterials(page);
    }, [page, fetchMaterials]);

    useEffect(() => {
        const loadFacs = async () => {
            const data = await facultyService.getAllFaculties();
            setFaculties(data);
        };
        loadFacs();
    }, []);

    useEffect(() => {
        const loadDepts = async () => {
            if (filters.faculty) {
                const data = await departmentService.getAllDepartmentsByFacultyId(filters.faculty);
                setAvailableDepartments(data);
            } else {
                setAvailableDepartments([]);
            }
        };
        loadDepts();
    }, [filters.faculty]);

    const handlePageChange = (event, value) => {
        setPage(value);
        window.scrollTo(0, 0);
    };

    const handleApplyFilters = () => {
        const searchedIds = Object.keys(similarityScores);

        const params = {
            facultyId: filters.faculty || undefined,
            departmentId: filters.department || undefined,
            authorId: filters.author?.id || undefined,
            yearFrom: filters.yearFrom || undefined,
            yearTo: filters.yearTo || undefined,
        };

        if (filters.search.trim() && searchedIds.length > 0) {
            params.materialIds = searchedIds.join(',');
        } else if (filters.search.trim()) {
            params.search = filters.search;
            params.sortBy = 'year';
            params.order = 'asc';
        } else {
            params.sortBy = 'year';
            params.order = 'asc';
        }

        setActiveParams(params);
        setPage(1);
    };

    const handleReset = () => {
        const isDepSec = userRole === ROLES.DEPARTMENT;
        const isDeanSec = userRole === ROLES.DEANERY;

        const defaultFilters = {
            search: '',
            faculty: isDepSec || isDeanSec ? storedUser?.facultyId || '' : '',
            department: isDepSec ? storedUser?.departmentId || '' : '',
            author: null,
            yearFrom: '',
            yearTo: ''
        };

        setFilters(defaultFilters);
        setActiveParams({
            facultyId: defaultFilters.faculty || undefined,
            departmentId: defaultFilters.department || undefined
        });
        setPage(1);
    };
    const handleSearchClick = async () => {
        if (!filters.search.trim()) {
            handleReset();
            return;
        }

        setIsSearching(true);

        try {
            const result = await materialService.searchMaterials(filters.search);


            if (!result || (!result.exact?.length && !result.semantic?.length)) {
                setSimilarityScores({});
                setMaterials([]);
                setActiveParams({ noResults: true });
                setTotalPages(0);
                return;
            }

            const exact = result.exact || [];
            const semantic = result.semantic || [];

            const combined = [
                ...exact.map(item => ({
                    material_id: item.id,
                    similarity: 1
                })),
                ...semantic.map(item => ({
                    material_id: item.material_id,
                    similarity: item.similarity || 0
                }))
            ];

            const seen = new Set();
            const uniqueCombined = combined.filter(item => {
                if (seen.has(item.material_id)) return false;
                seen.add(item.material_id);
                return true;
            });

            const scores = {};
            uniqueCombined.forEach(item => {
                scores[item.material_id] = item.similarity;
            });

            setSimilarityScores(scores);

            const ids = uniqueCombined.map(item => item.material_id);

            setActiveParams({
                materialIds: ids.join(','),
                facultyId: filters.faculty || undefined,
                departmentId: filters.department || undefined,
                authorId: filters.author?.id || undefined,
                yearFrom: filters.yearFrom || undefined,
                yearTo: filters.yearTo || undefined,
            });

            setPage(1);

        } catch (error) {
            console.error("Search Error:", error);
        } finally {
            setIsSearching(false);
        }
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'search' && !value.trim()) {
            setSimilarityScores({});
        }
        if (name === 'faculty') {
            setFilters(prev => ({ ...prev, [name]: value, department: '' }));
        } else {
            setFilters(prev => ({ ...prev, [name]: value }));
        }
    };

    return (
        <>
            <Header />
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#333' }}>
                    Каталог материалов
                </Typography>

                <Paper sx={{ p: 3, mb: 4, bgcolor: '#fff', borderRadius: '8px' }} elevation={0} variant="outlined">
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                            <Box sx={{
                                width: { xs: '100%', md: '70%' },
                                display: 'flex',
                                gap: 1
                            }}>
                                <TextField
                                    fullWidth
                                    placeholder="Введите поисковой запрос"
                                    name="search"
                                    value={filters.search}
                                    onChange={handleChange}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '12px 0 0 12px',
                                            bgcolor: '#f8f9fa'
                                        }
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    disabled={isSearching}
                                    onClick={handleSearchClick}
                                    sx={{
                                        borderRadius: '0 12px 12px 0',
                                        px: 4,
                                        bgcolor: '#0056b3',
                                        boxShadow: 'none',
                                        '&:hover': { bgcolor: '#004494' }
                                    }}
                                >
                                    {isSearching ? 'Поиск...' : 'Найти'}
                                </Button>
                            </Box>
                        </Box>

                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            pt: 2,
                            borderTop: '1px solid #eee'
                        }}>
                            <Box sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 2,
                                '& > *': { flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 16px)', md: '1 1 0' } }
                            }}>
                                <FormControl size="small" disabled={userRole === ROLES.DEPARTMENT || userRole === ROLES.DEANERY}>
                                    <InputLabel>Факультет</InputLabel>
                                    <Select name="faculty" value={filters.faculty} label="Факультет" onChange={handleChange}>
                                        <MenuItem value="">Все факультеты</MenuItem>
                                        {faculties.map((f) => (
                                            <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl size="small" disabled={userRole === ROLES.DEPARTMENT || !filters.faculty}>
                                    <InputLabel>Кафедра</InputLabel>
                                    <Select name="department" value={filters.department} label="Кафедра" onChange={handleChange}>
                                        <MenuItem value="">Все кафедры</MenuItem>
                                        {availableDepartments.map(dept => (
                                            <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <AuthorAutocomplete
                                    value={filters.author}
                                    onChange={(val) => setFilters(prev => ({ ...prev, author: val }))}
                                />

                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>С</InputLabel>
                                        <Select name="yearFrom" value={filters.yearFrom} label="Год от" onChange={handleChange}>
                                            <MenuItem value="">Любой</MenuItem>
                                            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>По</InputLabel>
                                        <Select name="yearTo" value={filters.yearTo} label="Год до" onChange={handleChange}>
                                            <MenuItem value="">Любой</MenuItem>
                                            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    onClick={handleReset}
                                    sx={{ height: '40px', px: 3, textTransform: 'none' }}
                                >
                                    <RestartAltIcon sx={{ mr: 1, fontSize: '20px' }} /> Сбросить
                                </Button>
                                <Button
                                    variant="contained"
                                    sx={{ bgcolor: '#0056b3', height: '40px', px: 4, textTransform: 'none' }}
                                    onClick={handleApplyFilters}
                                >
                                    Применить фильтры
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </Paper>

                <Box sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '24px',
                    justifyContent: 'center',
                    alignItems: 'stretch',
                    width: '100%'
                }}>
                    {materials.length > 0 ? (
                        materials.map(item => (
                            <Box
                                key={item.id}
                                sx={{
                                    display: 'flex',
                                    width: '360px',
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

                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={handlePageChange}
                        shape="rounded"
                        color="primary"
                        showFirstButton
                        showLastButton
                    />
                </Box>
            </Container>
            <Footer />
        </>
    );
};

export default CatalogPage;