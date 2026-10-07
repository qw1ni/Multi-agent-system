import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Paper, FormControl, InputLabel, Select,
    MenuItem, Button, Stack, CircularProgress, Alert,
    List, ListItemButton, ListItemText, ListItemIcon
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import reportService from '../services/reportService';
import LineChart from '../components/Charts/LineChart';
import PieChart from '../components/Charts/PieChart';
import BarChart from '../components/Charts/BarChart';
import { ROLES } from '../constants/roles';
import FacultyAutocomplete from '../components/Autocomplete/FacultyAutocomplete';
import DepartmentAutoComplete from '../components/Autocomplete/DepartmentAutocomplete';

const AnalyticsPage = () => {
    const currentYear = new Date().getFullYear();

    const vizOptions = [
        { id: 'departments_activity', label: 'Активность кафедр', icon: <BarChartIcon /> },
        { id: 'departments_by_years', label: 'Активность кафедр по годам', icon: <BarChartIcon /> },
        { id: 'departments_activity_2', label: 'Активность кафедр', icon: <PieChartIcon /> },
        { id: 'by_faculty', label: 'Динамика по факультету', icon: <ShowChartIcon /> },
        { id: 'faculties_activity', label: 'Активность факультетов', icon: <BarChartIcon /> },
        { id: 'faculties_by_departments', label: 'Активность факультетов в разрезе кафедр', icon: <BarChartIcon /> },
        { id: 'faculties_activity_2', label: 'Активность факультетов', icon: <PieChartIcon /> },
        { id: 'by_faculties', label: 'Динамика по факультетам', icon: <ShowChartIcon /> },
        { id: 'authors_by_department', label: 'Активность авторов кафедры', icon: <BarChartIcon /> },
    ];

    const [vizType, setVizType] = useState('');
    const [startYear, setStartYear] = useState(2020);
    const [endYear, setEndYear] = useState(currentYear);
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isGenerated, setIsGenerated] = useState(false);
    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState(null);

    const roleName = localStorage.getItem('role');
    const currentUser = useMemo(() => {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            return null;
        }
    }, []);

    const isAuthorDepartmentReport = vizType === 'authors_by_department';

    useEffect(() => {
        setIsGenerated(false);
        setError(null);

        setSelectedDepartment(null);

        if (roleName === ROLES.DEPARTMENT && currentUser?.department_id) {
            setSelectedFaculty({
                id: currentUser.faculty_id,
                name: currentUser.facultyName
            });

            setSelectedDepartment({
                id: currentUser.department_id,
                name: currentUser.departmentName
            });

            return;
        }

        if (roleName === ROLES.DEANERY && currentUser?.faculty_id) {
            setSelectedFaculty({
                id: currentUser.faculty_id,
                name: currentUser.facultyName
            });
            return;
        }

        setSelectedFaculty(null);

    }, [vizType]);

    useEffect(() => {
        setSelectedDepartment(null);
    }, [selectedFaculty]);

    const availableYears = useMemo(() => {
        const years = [];
        for (let y = 2010; y <= currentYear; y++) {
            years.push(y);
        }
        return years;
    }, [currentYear]);

    const isFacultyFilterVisible = [
        'departments_activity',
        'departments_activity_2',
        'departments_by_years',
        'authors_by_department',
        'by_faculty'
    ].includes(vizType);

    const handleSetPeriod = (yearsCount) => {
        setError(null);
        setIsGenerated(false);
        if (yearsCount === 'all') {
            setStartYear(2010);
            setEndYear(currentYear);
        } else {
            setStartYear(currentYear - yearsCount + 1);
            setEndYear(currentYear);
        }
    };

    const handleGenerateAnalytics = async () => {
        if (!vizType) {
            setError('Выберите тип визуализации из списка слева для формирования графика');
            return;
        }

        if (vizType === 'departments_activity_2' && !selectedFaculty) {
            setError('Выберите факультет для построения диаграммы');
            return;
        }

        if (startYear > endYear) {
            setError('Год «С» не может быть больше года «По»');
            return;
        }

        if (vizType === 'authors_by_department') {
            if (!selectedFaculty) {
                setError('Выберите факультет');
                return;
            }

            if (!selectedDepartment) {
                setError('Выберите кафедру');
                return;
            }
        }

        setLoading(true);
        setError(null);
        setIsGenerated(false);

        const facultyParam =
            (isFacultyFilterVisible && selectedFaculty && selectedFaculty.id !== 'all')
                ? selectedFaculty.id
                : null;

        try {
            if (vizType === 'departments_activity') {
                const responseData = await reportService.getDepartmentMaterialsCount(startYear, endYear, facultyParam);
                setReportData(responseData);
            }
            else if (vizType === 'departments_activity_2') {
                const responseData = await reportService.getMaterialsByYearWithDepartments(startYear, endYear, facultyParam);
                setReportData(responseData);
            }
            else if (vizType === 'faculties_activity_1') {
                const responseData = await reportService.getMaterialsByFaculty(startYear, endYear);
                setReportData(responseData);
            }
            else if (vizType === 'faculties_activity_2') {
                const responseData = await reportService.getMaterialsByFaculty(startYear, endYear);
                setReportData(responseData);
            }
            else if (vizType === 'faculties_by_departments') {
                const responseData = await reportService.getMaterialsByYearWithDepartments(startYear, endYear);
                setReportData(responseData);
            }
            else if (vizType === 'departments_by_years') {
                const responseData = await reportService.getMaterialsByYearWithDepartments(startYear, endYear);
                setReportData(responseData);
            }
            else if (vizType === 'authors_by_department') {
                const responseData = await reportService.getDepartmentAuthorsActivity(selectedDepartment.id, startYear, endYear);
                setReportData(responseData);
            }
            else if (vizType === 'by_faculty') {
                const responseData = await reportService.getDepartmentMaterialsByFaculty(selectedFaculty.name, startYear, endYear);
                setReportData(responseData);
            }
            else if (vizType === 'by_faculties') {
                const responseData = await reportService.getMaterialsByFaculty(startYear, endYear);
                console.log(responseData)
                setReportData(responseData);
            }
            else {
                const data = await reportService.getMaterialsByFaculty(startYear, endYear, facultyParam);
                setReportData(data.filter(item => item.faculty_name !== "Итого"));
            }
            setIsGenerated(true);
        } catch (err) {
            console.error("Ошибка загрузки аналитики:", err);
            setError('Произошла ошибка при получении данных аналитики из системы');
        } finally {
            setLoading(false);
        }
    };

    const handleYearChange = (setter) => (e) => {
        setter(e.target.value);
        setIsGenerated(false);
        setError(null);
    };

    const handleSelectVizType = (typeId) => {
        setVizType(typeId);
        setIsGenerated(false);
        setError(null);
    };

    const labels = useMemo(() => {
        const range = [];
        for (let y = startYear; y <= endYear; y++) range.push(y.toString());
        return range;
    }, [startYear, endYear]);

    const lineChartData = {
        labels: labels,
        datasets: reportData.map((faculty, index) => ({
            label: faculty.faculty_name,
            data: labels.map(year => faculty[year] || 0),
            borderColor: `hsl(${(index * 60) % 360}, 70%, 50%)`,
            backgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%)`,
            tension: 0.3,
        }))
    };

    const departmentsLineChartData = useMemo(() => {
        return {
            labels: labels,
            datasets: reportData.map((dept, index) => ({
                label: dept.department_name,
                data: labels.map(year => dept[year] || 0),
                borderColor: `hsl(${(index * 75) % 360}, 75%, 50%)`,
                backgroundColor: `hsl(${(index * 75) % 360}, 75%, 50%)`,
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6
            }))
        };
    }, [reportData, labels]);

    const facultiesPieChartData = useMemo(() => {
        if (vizType !== 'faculties_activity_2') return null;
        if (!reportData || reportData.length === 0) return null;

        const filteredData = reportData.filter(item => item.faculty_name !== 'Итого');

        const totalSum = filteredData.reduce((sum, item) => sum + Number(item.total || 0), 0);

        return {
            labels: filteredData.map(f => `${f.faculty_name} (${f.total})`),
            datasets: [
                {
                    data: filteredData.map(f => f.total),
                    backgroundColor: filteredData.map((_, i) =>
                        `hsl(${(i * (360 / filteredData.length)) % 360}, 65%, 55%)`
                    ),
                    borderColor: '#fff',
                    borderWidth: 2,
                }
            ],
            totalSum
        };
    }, [vizType, reportData]);

    const departmentsPieChartData = useMemo(() => {

        if (vizType !== 'departments_activity_2') return null;

        if (!reportData || reportData.length === 0 || !selectedFaculty) {
            return null;
        }

        const faculty = reportData.find(
            f => f.name === selectedFaculty.name
        );

        if (!faculty || !faculty.departments) return null;

        return {
            labels: faculty.departments.map(dept =>
                dept.department_name
                    .replace(/^Кафедра\s+/i, '')
                    .replace(/["']/g, '')
            ),
            datasets: [
                {
                    data: faculty.departments.map(dept => dept.total),
                    backgroundColor: faculty.departments.map((_, i) =>
                        `hsl(${(i * (360 / faculty.departments.length)) % 360}, 65%, 55%)`
                    ),
                    borderColor: '#fff',
                    borderWidth: 2,
                }
            ]
        };

    }, [vizType, reportData, selectedFaculty]);

    const barChartData = useMemo(() => {
        console.log(reportData)
        const cleanLabels = reportData.map(d => {
            const rawName = d.departmentName || d.department_name || '';
            return rawName
                .replace(/^кафедра\s*["«]/i, '')
                .replace(/["»]$/, '')
                .trim();
        });

        return {
            labels: cleanLabels,
            datasets: [{
                label: 'Количество материалов',
                data: reportData.map(d => d.materialsCount || d.count),
                backgroundColor: 'rgba(0, 86, 179, 0.7)',
                borderColor: '#0056b3',
                borderWidth: 1,
                borderRadius: 4,
                maxBarThickness: 60,
            }]
        };
    }, [reportData]);

    const facultyDepartmentsBarData = useMemo(() => {
        const labels = [];
        const dataValues = [];

        console.log(reportData)

        reportData.forEach((faculty) => {
            if (!faculty.departments || faculty.departments.length === 0) return;

            labels.push(faculty.name);
            dataValues.push(null);

            faculty.departments.forEach((dept) => {
                const cleanDeptName = dept.department_name
                    .replace(/^Кафедра\s+/i, '')
                    .replace(/["']/g, '');

                labels.push(cleanDeptName);
                const totalValue = dept.total !== undefined ? Number(dept.total) : 0;
                dataValues.push(totalValue);
            });
        });

        return {
            labels: labels,
            datasets: [
                {
                    label: 'Количество материалов за период',
                    data: dataValues,
                    backgroundColor: 'rgba(59, 130, 246, 0.75)',
                    borderColor: '#1d4ed8',
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8
                }
            ]
        };
    }, [reportData, startYear, endYear]);

    const facultiesBarChartData = useMemo(() => {
        if (vizType !== 'faculties_activity') return null;

        const filteredData = reportData.filter(item => item.faculty_name !== 'Итого');

        return {
            labels: filteredData.map(f => f.faculty_name),
            datasets: [
                {
                    label: 'Количество материалов',
                    data: filteredData.map(f => f.total),
                    backgroundColor: 'rgba(0, 86, 179, 0.7)',
                    borderColor: '#0056b3',
                    borderWidth: 1,
                    borderRadius: 4,
                }
            ]
        };
    }, [vizType, reportData]);

    const departmentsByYearsBarData = useMemo(() => {

        if (vizType !== 'departments_by_years') return null;
        if (!reportData || reportData.length === 0) return null;

        const labels = [];
        const dataValues = [];

        const facultiesToUse =
            selectedFaculty && selectedFaculty.id !== 'all'
                ? reportData.filter(f => f.name === selectedFaculty.name)
                : reportData;

        facultiesToUse.forEach(faculty => {

            if (!faculty.departments) return;

            faculty.departments.forEach(dept => {

                const cleanDeptName = dept.department_name
                    .replace(/^Кафедра\s+/i, '')
                    .replace(/["']/g, '');

                labels.push(cleanDeptName);
                dataValues.push(null);

                Object.keys(dept)
                    .filter(key => /^\d{4}$/.test(key))
                    .sort()
                    .forEach(year => {

                        labels.push(year);
                        dataValues.push(Number(dept[year]) || 0);

                    });

            });

        });

        return {
            labels,
            datasets: [
                {
                    label: 'Количество материалов',
                    data: dataValues,
                    backgroundColor: 'rgba(59, 130, 246, 0.75)',
                    borderColor: '#1d4ed8',
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.6,
                    categoryPercentage: 0.8
                }
            ]
        };

    }, [vizType, reportData, selectedFaculty]);

    const authorsBarChartData = useMemo(() => {

        if (vizType !== 'authors_by_department') return null;
        if (!reportData || reportData.length === 0) return null;

        return {
            labels: reportData.map(a => a.author_name),
            datasets: [
                {
                    label: 'Количество материалов',
                    data: reportData.map(a => a.materials_count),
                    backgroundColor: 'rgba(59, 130, 246, 0.75)',
                    borderColor: '#1d4ed8',
                    borderWidth: 1,
                    borderRadius: 4,
                    maxBarThickness: 60,
                }
            ]
        };

    }, [vizType, reportData]);

    const facultiesDynamicLineData = useMemo(() => {

        if (vizType !== 'by_faculties') return null;
        if (!reportData || reportData.length === 0) return null;

        const filtered = reportData.filter(
            f => f.faculty_name !== 'Итого'
        );

        const labels = [];
        for (let y = startYear; y <= endYear; y++) {
            labels.push(String(y));
        }

        return {
            labels,
            datasets: filtered.map((faculty, index) => ({
                label: faculty.faculty_name,
                data: labels.map(year =>
                    Number(faculty[year]) || 0
                ),
                borderColor: `hsl(${(index * 60) % 360}, 70%, 50%)`,
                backgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%)`,
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6,
            }))
        };

    }, [vizType, reportData, startYear, endYear]);

    const handleExportImage = () => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = `chart_${vizType}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    };

    const usesreportData = [
        'departments_activity',
        'by_faculty',
        'authors_by_department'
    ].includes(vizType);

    const hasData = usesreportData
        ? reportData.length > 0
        : reportData.length > 0;

    const facultyTitlePart =
        selectedFaculty && selectedFaculty.id !== 'all'
            ? selectedFaculty.name
            : 'Все факультеты';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f8f9fa' }}>
            <Header />
            <Box component="main" sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

                <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#0056b3' }}>
                    Аналитика
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, flexGrow: 1, alignItems: 'flex-start' }}>

                    <Box sx={{ flex: { xs: '1 1 auto', md: '0 0 320px' }, width: { md: 320 } }}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#fff' }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', mb: 1.5, pl: 1 }}>
                                Tип визуализации
                            </Typography>
                            <List component="nav" disablePadding>
                                {vizOptions.map((option) => (
                                    <ListItemButton
                                        key={option.id}
                                        selected={vizType === option.id}
                                        onClick={() => handleSelectVizType(option.id)}
                                        sx={{
                                            borderRadius: 1.5,
                                            mb: 0.5,
                                            '&.Mui-selected': {
                                                bgcolor: '#e6f0fa',
                                                color: '#0056b3',
                                                '&:hover': { bgcolor: '#d2e5f7' },
                                                '& .MuiListItemIcon-root': { color: '#0056b3' }
                                            }
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                                            {option.icon}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={option.label}
                                            primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: vizType === option.id ? 600 : 500 }}
                                        />
                                    </ListItemButton>
                                ))}
                            </List>
                        </Paper>
                    </Box>

                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>

                        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, bgcolor: '#fff' }}>
                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>

                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <FormControl size="small" sx={{ minWidth: 100 }}>
                                            <InputLabel>Год с</InputLabel>
                                            <Select value={startYear} label="Год с" onChange={handleYearChange(setStartYear)}>
                                                {availableYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                        <FormControl size="small" sx={{ minWidth: 100 }}>
                                            <InputLabel>Год по</InputLabel>
                                            <Select value={endYear} label="Год по" onChange={handleYearChange(setEndYear)}>
                                                {availableYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                                            </Select>
                                        </FormControl>
                                    </Stack>

                                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: { xs: 1, sm: 0 } }}>
                                        <Button variant="outlined" size="small" onClick={() => handleSetPeriod(1)} sx={{ textTransform: 'none', borderRadius: 1.5 }}>за год</Button>
                                        <Button variant="outlined" size="small" onClick={() => handleSetPeriod(3)} sx={{ textTransform: 'none', borderRadius: 1.5 }}>за 3 года</Button>
                                        <Button variant="outlined" size="small" onClick={() => handleSetPeriod(5)} sx={{ textTransform: 'none', borderRadius: 1.5 }}>за 5 лет</Button>
                                        <Button variant="outlined" size="small" onClick={() => handleSetPeriod('all')} sx={{ textTransform: 'none', borderRadius: 1.5 }}>Все время</Button>
                                    </Stack>

                                    <Button
                                        variant="contained"
                                        color="primary"
                                        disabled={loading || !vizType}
                                        onClick={handleGenerateAnalytics}
                                        sx={{ textTransform: 'none', px: 4, py: 0.8, borderRadius: 2, fontWeight: 'bold' }}
                                    >
                                        Сформировать
                                    </Button>
                                </Box>

                                {isFacultyFilterVisible && (
                                    <Box
                                        sx={{
                                            pt: 1,
                                            borderTop: '1px dashed #e0e0e0',
                                            display: 'flex',
                                            gap: 2,
                                            flexWrap: 'wrap',
                                            flexDirection: 'column',
                                            maxWidth: '300px'
                                        }}
                                    >
                                        <FacultyAutocomplete
                                            value={selectedFaculty}
                                            onChange={(newValue) => {
                                                setSelectedFaculty(newValue);
                                                setIsGenerated(false);
                                            }}
                                            userRole={roleName}
                                            userFacultyName={currentUser?.facultyName}
                                            hideAllOption={vizType === 'departments_activity_2'}
                                        />
                                        {isAuthorDepartmentReport && (
                                            <DepartmentAutoComplete
                                                facultyId={selectedFaculty?.id}
                                                value={selectedDepartment}
                                                onChange={(newValue) => {
                                                    setSelectedDepartment(newValue);
                                                    setIsGenerated(false);
                                                }}
                                            />
                                        )}
                                    </Box>
                                )}
                            </Stack>
                        </Paper>
                        <Paper variant="outlined" sx={{ p: 4, minHeight: '450px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', bgcolor: '#fff', borderRadius: 2, flexGrow: 1 }}>

                            {error && (
                                <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                                    {error}
                                </Alert>
                            )}

                            {!loading && !error && !vizType && !isGenerated && (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography color="textSecondary" variant="body1">
                                        Выберите тип визуализации в меню слева и параметры периода для начала работы
                                    </Typography>
                                </Box>
                            )}

                            {!loading && !error && vizType && !isGenerated && (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <Typography color="primary" sx={{ fontWeight: 500 }}>
                                        Тип «{vizOptions.find(o => o.id === vizType)?.label}» выбран. Нажмите «Сформировать» для построения аналитического графика
                                    </Typography>
                                </Box>
                            )}

                            {loading && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <CircularProgress size={50} />
                                    <Typography sx={{ mt: 2 }} color="textSecondary">Получение аналитических метрик...</Typography>
                                </Box>
                            )}

                            {!loading && !error && isGenerated && (
                                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    {!hasData ? (
                                        <Box sx={{ textAlign: 'center', py: 4, width: '100%', bgcolor: '#fff3e0', borderRadius: 2, border: '1px solid #ffe0b2' }}>
                                            <Typography color="warning.main" sx={{ fontWeight: 500 }}>
                                                За указанный период ({startYear} - {endYear} гг.) данных для анализа не найдено.
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ alignSelf: 'flex-start', mb: 3 }}>
                                                <CalendarMonthIcon color="primary" />
                                                <Typography variant="h6" sx={{ fontWeight: '600', color: '#1a202c' }}>
                                                    {vizOptions.find(o => o.id === vizType)?.label} ({startYear} - {endYear} гг.)
                                                    {isFacultyFilterVisible && selectedFaculty && selectedFaculty.id !== 'all' && ` - ${selectedFaculty.name}`}
                                                </Typography>
                                            </Stack>

                                             <Box sx={{
                                                width: '100%',
                                                height: ['faculties_by_departments', 'departments_activity', 'faculties_activity', 'departments_by_years', 'authors_by_department'].includes(vizType) ? 'auto' : '400px',
                                                mb: 4
                                            }}>
                                                {vizType === 'departments_activity' && <BarChart chartData={barChartData} title={`${facultyTitlePart}. Активность кафедр (${startYear} - ${endYear} гг.)`} />}
                                                {vizType === 'departments_activity_2' && departmentsPieChartData && (
                                                    <PieChart
                                                        chartData={departmentsPieChartData}
                                                        startYear={startYear}
                                                        endYear={endYear}
                                                        title={`${selectedFaculty.name}. Активность кафедр (${startYear} - ${endYear} гг.)`}
                                                    />
                                                )}
                                                {vizType === 'departments_by_years' && departmentsByYearsBarData && (
                                                    <BarChart
                                                        chartData={departmentsByYearsBarData}
                                                        title={
                                                            selectedFaculty && selectedFaculty.id !== 'all'
                                                                ? `${selectedFaculty.name}. Активность кафедр по годам (${startYear} - ${endYear} гг.)`
                                                                : 'Активность кафедр по годам всех факультетов'
                                                        }
                                                    />
                                                )}
                                                {vizType === 'faculties_activity' && facultiesBarChartData && (
                                                    <BarChart chartData={facultiesBarChartData} title={`Активность факультетов (${startYear} - ${endYear} гг.)`} />
                                                )}
                                                {vizType === 'faculties_activity_2' && <PieChart chartData={facultiesPieChartData} startYear={startYear} endYear={endYear} />}
                                                {vizType === 'by_faculty' && <LineChart chartData={departmentsLineChartData} title={`${selectedFaculty.name}. Динамика публикаций (${startYear} - ${endYear} гг.)`} />}
                                                {vizType === 'by_faculties' && facultiesDynamicLineData && (
                                                    <LineChart
                                                        chartData={facultiesDynamicLineData}
                                                        title={`Динамика публикаций по факультетам (${startYear} - ${endYear} гг.)`}
                                                    />
                                                )}
                                                {vizType === 'faculties_by_departments' && (
                                                    <BarChart chartData={facultyDepartmentsBarData} title={`Активность факультетов в разрезе кафедр (${startYear} - ${endYear} гг.)`} />
                                                )}
                                                {vizType === 'authors_by_department' && authorsBarChartData && (
                                                    <BarChart
                                                        chartData={authorsBarChartData}
                                                        title={`${selectedDepartment?.name}. Активность авторов (${startYear} - ${endYear} гг.)`}
                                                    />
                                                )}
                                            </Box>

                                            <Button
                                                variant="contained"
                                                startIcon={<ImageIcon />}
                                                onClick={handleExportImage}
                                                sx={{
                                                    textTransform: 'none',
                                                    bgcolor: '#2b579a',
                                                    px: 4,
                                                    borderRadius: 2,
                                                    '&:hover': { bgcolor: '#1e3f72' }
                                                }}
                                            >
                                                PNG
                                            </Button>
                                        </>
                                    )}
                                </Box>
                            )}
                        </Paper>
                    </Box>
                </Box>
            </Box>
            <Footer />
        </Box>
    );
};

export default AnalyticsPage;