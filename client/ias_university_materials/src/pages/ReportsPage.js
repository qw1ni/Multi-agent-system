import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Stack,
    TextField,
    Divider,
    CircularProgress,
    Alert
} from '@mui/material';
import {
    Description as WordIcon,
    PictureAsPdf as PdfIcon,
    TableChart as ExcelIcon,
    Search as SearchIcon,
    Code as JsonIcon
} from '@mui/icons-material';
import TableChartIcon from '@mui/icons-material/TableChart';
import reportService from '../services/reportService';
import excelService from '../services/excelService';
import wordService from '../services/wordService';
import specialtyService from '../services/specialtyService';
import FacultyDepTable from '../components/ReportTables/FacultyDepTable';
import FacultyTable from '../components/ReportTables/FacultyTable';
import AuthorTable from '../components/ReportTables/AuthorTable';
import AuthorMaterialsTable from '../components/ReportTables/AuthorMaterialsTable';
import SpecialtyMaterialsTable from '../components/ReportTables/SpecialtyMaterialsTable';
import SpecialtyDisciplinesWithMaterialsTable from '../components/ReportTables/SpecialtyDisciplinesWithMaterialsTable';
import DepartmentDisciplinesTable from '../components/ReportTables/DepartmentDisciplinesTable';
import MaterialsByDepartmentTable from '../components/ReportTables/MaterialsByDepartmentTable';
import AuthorAutocomplete from '../components/Autocomplete/AuthorAutocomplete';
import SpecialtyAutocomplete from '../components/Autocomplete/SpecialtyAutocomplete';
import DepartmentAutoComplete from '../components/Autocomplete/DepartmentAutocomplete';
import Header from '../components/Header/Header'
import Footer from '../components/Footer/Footer';
import { ROLES } from '../constants/roles';


const ReportsPage = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [reportType, setReportType] = useState(null);
    const [startYear, setStartYear] = useState(2020);
    const [endYear, setEndYear] = useState(2026);
    const [authorLimit, setAuthorLimit] = useState(10);
    const [authorName, setAuthorName] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState(null);
    const [selectedAuthor, setSelectedAuthor] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [targetYear, setTargetYear] = useState(2026);

    const roleName = localStorage.getItem('role');
    const currentUser = (() => {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            console.error("Ошибка парсинга пользователя из localStorage", e);
            return null;
        }
    })();

    useEffect(() => {
        if (roleName === ROLES.DEPARTMENT && currentUser?.department_id) {
            setSelectedDepartment({
                id: currentUser.department_id,
                name: currentUser.departmentName
            });
        } else {
            setSelectedDepartment(null);
        }
        setReportData(null);
        setError(null);
    }, [reportType, roleName]);

    const availableYears = Array.from({ length: 12 }, (_, i) => 2015 + i);
    const targetYearsList = Array.from({ length: 5 }, (_, i) => 2026 + i);

    const handleGenerateReport = async () => {
        setError(null);
        setReportData(null);
        if (!reportType) {
            setError('Не выбран тип отчета');
            return;
        }
        setLoading(true);
        try {
            let data;
            if (reportType === 'faculty') {
                data = await reportService.getMaterialsByFaculty(startYear, endYear);
            } else if (reportType === 'department') {
                data = await reportService.getMaterialsByYearWithDepartments(startYear, endYear);
            } else if (reportType === 'authors') {
                data = await reportService.getTopAuthors(authorLimit);
            } else if (reportType === 'author_materials') {
                const currentAuthorName = selectedAuthor ? selectedAuthor.name : authorName;

                if (!currentAuthorName.trim()) {
                    setError('Выберите автора для поиска');
                    setLoading(false);
                    return;
                }
                data = await reportService.getAuthorMaterials(currentAuthorName, startYear, endYear);
            } else if (reportType === 'specialty_materials') {
                if (!selectedSpecialty) {
                    setError('Выберите специальность из списка');
                    setLoading(false);
                    return;
                }
                data = await reportService.getSpecialtyMaterials(selectedSpecialty.code, startYear, endYear);
            }
            else if (reportType === 'department_materials') {
                data = await reportService.getDepartmentMaterials(startYear, endYear);
            }
            else if (reportType === 'specialty_disciplines_with_materials') {
                data = await reportService.getSpecialtyDisciplinesWithMaterials(selectedSpecialty.code, startYear, endYear);
            }
            else if (reportType === 'department_disciplines' || reportType === 'reissue_needs') {
                if (!selectedDepartment) {
                    setError('Необходимо указать название кафедры для формирования данного отчета');
                    setLoading(false);
                    return;
                }
                data = await reportService.getDepartmentDisciplines(selectedDepartment.name, startYear, endYear, targetYear);
            }
            console.log(data);
            setReportData(data);
        } catch (err) {
            setError(err.message);
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleReportTypeChange = (event) => {
        const newType = event.target.value;
        setReportType(newType);
        setReportData([]);
        setError(null);
    };

    const saveExcelBlob = (blobData, fileName) => {
        const fileBlob = new Blob([blobData], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const fileURL = window.URL.createObjectURL(fileBlob);
        const downloadLink = document.createElement('a');

        downloadLink.href = fileURL;
        downloadLink.setAttribute('download', fileName);
        document.body.appendChild(downloadLink);

        downloadLink.click();

        downloadLink.remove();
        window.URL.revokeObjectURL(fileURL);
    };

    const handleExport = async (format) => {
        const currentAuthorName = selectedAuthor ? selectedAuthor.name : authorName;

        if (reportType === 'author_materials' && (!currentAuthorName || !currentAuthorName.trim())) {
            setError('Выберите автора для поиска');
            return;
        }

        if (format === 'JSON') {
            try {
                setLoading(true);
                setError(null);

                if (!reportData || (reportData.rows && reportData.rows.length === 0)) {
                    setError('Нет данных для экспорта в JSON');
                    return;
                }

                const jsonString = JSON.stringify(reportData, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const downloadUrl = window.URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `${reportType}_report_${startYear || 'all'}_${endYear || 'all'}.json`;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);

            } catch (err) {
                console.error(err);
                setError('Не удалось экспортировать отчет в формат JSON');
            } finally {
                setLoading(false);
            }
            return;
        }

        try {
            setLoading(true);
            setError(null);

            let blobData;
            let fileName = '';
            const isWord = format === 'Word';

            if (reportType === 'faculty') {
                if (isWord) {
                    blobData = await wordService.downloadFacultyReportWord(startYear, endYear);
                    fileName = `faculty_word_report_${startYear}_${endYear}.docx`;
                } else {
                    blobData = await excelService.downloadFacultyReportExcel(startYear, endYear);
                    fileName = `faculty_excel_report_${startYear}_${endYear}.xlsx`;
                }
            }
            else if (reportType === 'department') {
                if (isWord) {
                    blobData = await wordService.downloadFacultyDepReportWord(startYear, endYear);
                    fileName = `faculty_with_departments_word_report_${startYear}_${endYear}.docx`;
                } else {
                    blobData = await excelService.downloadFacultyDepReportExcel(startYear, endYear);
                    fileName = `faculty_with_departments_excel_report_${startYear}_${endYear}.xlsx`;
                }
            }
            else if (reportType === 'authors') {
                if (isWord) {
                    blobData = await wordService.downloadTopAuthorsWord(authorLimit);
                    fileName = `top_${authorLimit}_authors_word_report.docx`;
                } else {
                    blobData = await excelService.downloadTopAuthorsExcel(authorLimit);
                    fileName = `top_${authorLimit}_authors_excel_report.xlsx`;
                }
            }
            else if (reportType === 'author_materials') {
                if (isWord) {
                    blobData = await wordService.downloadAuthorMaterialsWord(currentAuthorName, startYear, endYear);
                    fileName = `author_materials_word_report_${startYear}_${endYear}.docx`;
                } else {
                    blobData = await excelService.downloadAuthorMaterialsExcel(currentAuthorName, startYear, endYear);
                    fileName = `author_materials_excel_report_${startYear}_${endYear}.xlsx`;
                }
            }
            else if (reportType === 'department_materials') {
                if (isWord) {
                    blobData = await wordService.downloaDepartmentMaterialsWord(startYear, endYear, currentUser.departmentName);
                    fileName = `department_materials_word_report_${startYear}_${endYear}.docx`;
                } else {
                    blobData = await excelService.downloaDepartmentMaterialsExcel(startYear, endYear, currentUser.departmentName);
                    fileName = `department_materials_excel_report_${startYear}_${endYear}.xlsx`;
                }
            }
            else if (reportType === 'specialty_disciplines_with_materials') {
                if (isWord) {
                    blobData = await wordService.downloaSpecialtyDepartmentsWithMaterialsWord(selectedSpecialty.code, startYear, endYear);
                    fileName = `specialty_disciplines_with_materials_word_report_${startYear}_${endYear}.docx`;
                } else {
                    blobData = await excelService.downloaSpecialtyDepartmentsWithMaterialsExcel(selectedSpecialty.code, startYear, endYear);
                    fileName = `specialty_disciplines_with_materials_excel_report_${startYear}_${endYear}.xlsx`;
                }
            }
            else if (reportType === 'specialty_materials') {
                if (isWord) {
                    blobData = await wordService.downloaSpecialtyMaterialsWord(selectedSpecialty.code, startYear, endYear);
                    fileName = `specialty_materials_word_report_${startYear}_${endYear}.docx`;
                } else {
                    blobData = await excelService.downloaSpecialtyMaterialsExcel(selectedSpecialty.code, startYear, endYear);
                    fileName = `specialty_materials_excel_report_${startYear}_${endYear}.xlsx`;
                }
            }
            else if (reportType === 'department_disciplines' || reportType === 'reissue_needs') {
                if (isWord) {
                    if (reportType === 'department_disciplines') {
                        blobData = await wordService.downloaDepartmentDisciplinesWord(selectedDepartment.name, startYear, endYear, targetYear, false);
                        fileName = `department_disciplines_word_report_${startYear}_${endYear}.docx`;
                    }
                    else {
                        blobData = await wordService.downloaDepartmentDisciplinesWord(selectedDepartment.name, startYear, endYear, targetYear, true);
                        fileName = `reissue_word_report_${startYear}_${endYear}-${targetYear}.docx`;
                    }
                } else {
                    if(reportType === 'department_disciplines'){
                        blobData = await excelService.downloaDepartmentDisciplinesExcel(selectedDepartment.name, startYear, endYear, targetYear, false);
                        fileName = `department_disciplines_report_${startYear}_${endYear}.xlsx`;
                    }
                    else{
                        blobData = await excelService.downloaDepartmentDisciplinesExcel(selectedDepartment.name, startYear, endYear, targetYear, true);
                        fileName = `reissue_excel_report_${startYear}_${endYear}.xlsx`;
                    }
                }
            }
            else {
                alert(`Экспорт для типа отчета "${reportType}" в формат ${format} еще не реализован.`);
                return;
            }

            if (blobData) {
                saveExcelBlob(blobData, fileName);
            }

        } catch (err) {
            console.error(err);
            setError(`Не удалось экспортировать отчет в формат ${format}`);
        } finally {
            setLoading(false);
        }
    };



    const ExportButtons = () => (
        <Stack direction="row" spacing={2} sx={{ mt: 3, mb: 2 }}>
            <Button
                variant="contained"
                color="primary"
                startIcon={<WordIcon />}
                onClick={() => handleExport('Word')}
                sx={{ backgroundColor: '#2b579a' }}
            >
                Экспорт в Word
            </Button>
            <Button
                variant="contained"
                color="success"
                startIcon={<ExcelIcon />}
                onClick={() => handleExport('Excel')}
                sx={{ backgroundColor: '#217346' }}
            >
                Экспорт в Excel
            </Button>
            <Button
                variant="contained"
                startIcon={<JsonIcon />}
                onClick={() => handleExport('JSON')}
                sx={{ backgroundColor: '#383636', '&:hover': { backgroundColor: '#242323' }, textTransform: 'none' }}
            >
                Экспорт в JSON
            </Button>
        </Stack>
    );

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh'
            }}
        >
            <Header />
            <Box component="main" sx={{
                p: 3,
                flexGrow: 1
            }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    Генерация отчетов
                </Typography>

                <Paper variant="outlined" sx={{ p: 3, mb: 4, backgroundColor: '#fcfcfc' }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="flex-end">

                        <FormControl sx={{ minWidth: 300 }} size="small">
                            <InputLabel>Тип отчета</InputLabel>
                            <Select
                                value={reportType}
                                label="Тип отчета"
                                onChange={handleReportTypeChange}
                            >
                                {roleName === ROLES.DEPARTMENT ? (
                                    [
                                        <MenuItem key="author_materials" value="author_materials">По автору</MenuItem>,
                                        <MenuItem key="department_materials" value="department_materials">Материалы кафедры</MenuItem>,
                                        <MenuItem key="specialty_disciplines_with_materials" value="specialty_disciplines_with_materials">По дисциплинам специальности</MenuItem>,
                                        <MenuItem key="department_disciplines" value="department_disciplines">Дисциплины кафедры</MenuItem>,
                                        <MenuItem key="reissue_needs" value="reissue_needs">Потребность в переиздании</MenuItem>
                                    ]
                                ) : (
                                    [
                                        <MenuItem key="faculty" value="faculty">По факультетам (общий)</MenuItem>,
                                        <MenuItem key="department" value="department">По факультетам (в разрезе кафедр)</MenuItem>,
                                        <MenuItem key="authors" value="authors">Топ авторов по количеству работ</MenuItem>,
                                        <MenuItem key="author_materials" value="author_materials">По автору</MenuItem>,
                                        <MenuItem key="specialty_materials" value="specialty_materials">По материалам специальности</MenuItem>,
                                        <MenuItem key="specialty_disciplines_with_materials" value="specialty_disciplines_with_materials">По дисциплинам специальности</MenuItem>,
                                        <MenuItem key="department_disciplines" value="department_disciplines">Дисциплины кафедры</MenuItem>,
                                        <MenuItem key="reissue_needs" value="reissue_needs">Потребность в переиздании</MenuItem>
                                    ]
                                )}
                            </Select>
                        </FormControl>

                        {reportType === 'author_materials' && (
                            <Box sx={{ minWidth: 300 }}>
                                <AuthorAutocomplete
                                    value={selectedAuthor}
                                    onChange={(newValue) => {
                                        setSelectedAuthor(newValue);
                                        if (newValue) {
                                            setAuthorName(newValue.name);
                                        } else {
                                            setAuthorName('');
                                        }
                                    }}
                                />
                            </Box>
                        )}

                        {(reportType === 'specialty_materials' || reportType === "specialty_disciplines_with_materials") && (
                            <Box sx={{ minWidth: 400 }}>
                                <SpecialtyAutocomplete
                                    value={selectedSpecialty}
                                    onChange={(newValue) => {
                                        setSelectedSpecialty(newValue);
                                    }}
                                />
                            </Box>
                        )}

                        {(reportType === 'department_disciplines' || reportType === 'reissue_needs') && roleName !== ROLES.DEPARTMENT && (
                            <Box sx={{ minWidth: 350 }}>
                                <DepartmentAutoComplete
                                    value={selectedDepartment}
                                    onChange={(newValue) => setSelectedDepartment(newValue)}
                                    facultyId={roleName === ROLES.DEANERY ? currentUser?.facultyId : null}
                                    allDepartments={roleName === ROLES.ADMIN || roleName === ROLES.ACADEMIC}
                                />
                            </Box>
                        )}

                        {(reportType != 'authors') && (
                            <>
                                <FormControl sx={{ minWidth: 120 }} size="small">
                                    <InputLabel>С</InputLabel>
                                    <Select
                                        value={startYear}
                                        label="С года"
                                        onChange={(e) => setStartYear(e.target.value)}
                                    >
                                        {availableYears.map(year => (
                                            <MenuItem key={year} value={year}>{year}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl sx={{ minWidth: 120 }} size="small">
                                    <InputLabel>По</InputLabel>
                                    <Select
                                        value={endYear}
                                        label="По год"
                                        onChange={(e) => setEndYear(e.target.value)}
                                    >
                                        {availableYears.map(year => (
                                            <MenuItem key={year} value={year}>{year}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </>
                        )}


                        {reportType === 'reissue_needs' && (
                            <FormControl sx={{ minWidth: 140 }} size="small">
                                <InputLabel>Год проверки</InputLabel>
                                <Select
                                    value={targetYear}
                                    label="Год проверки"
                                    onChange={(e) => setTargetYear(e.target.value)}
                                >
                                    {targetYearsList.map(year => (
                                        <MenuItem key={year} value={year}>{year}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        <Button
                            variant="contained"
                            size="medium"
                            onClick={handleGenerateReport}
                            disabled={loading}
                        >
                            {loading ? 'Загрузка...' : 'Сформировать'}
                        </Button>
                    </Stack>
                </Paper>

                <Divider sx={{ mb: 4 }} />

                <Box sx={{ position: 'relative', minHeight: '200px' }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    {!loading && !error && !reportType && !reportData && (
                        <Box sx={{ textAlign: 'center', py: 8, border: '1px dashed #ccc', borderRadius: 2, bgcolor: '#fafafa' }}>
                            <Typography color="textSecondary">
                                Выберите тип отчета и параметры для начала работы
                            </Typography>
                        </Box>
                    )}
                    {!loading && !error && reportType && !reportData && (
                        <Box sx={{ textAlign: 'center', py: 8, border: '2px dashed #3f51b5', borderRadius: 2, bgcolor: '#f0f4f8' }}>
                            <Typography color="primary" sx={{ fontWeight: 500 }}>
                                Параметры выбраны. Нажмите «Сформировать» для отображения таблицы
                            </Typography>
                        </Box>
                    )}

                    {loading && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
                            <CircularProgress size={60} />
                            <Typography sx={{ mt: 2 }}>Получение данных из системы...</Typography>
                        </Box>
                    )}

                    {!loading && !error && reportData && (
                        <Box>
                            {reportData.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 6, bgcolor: '#fff3e0', borderRadius: 2, border: '1px solid #ffe0b2' }}>
                                    <Typography color="warning.main" sx={{ fontWeight: 500 }}>
                                        За указанный период {startYear} — {endYear} гг. материалов не найдено.
                                    </Typography>
                                </Box>
                            ) : (
                                <>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <TableChartIcon color="primary" />
                                            {reportType === 'faculty' && 'Отчет по факультетам'}
                                            {reportType === 'department' && 'Отчет по факультетам в разрезе кафедр'}
                                            {reportType === 'authors' && 'Отчет по авторам'}
                                            {reportType === 'author_materials' && `Отчет по автору: ${authorName}`}
                                            {reportType === 'specialty_materials' && `Отчет по материалам специальности "${selectedSpecialty?.code} - ${selectedSpecialty?.name}"`}
                                            {reportType === 'specialty_disciplines_with_materials' && `Отчет по дисциплинам специальности "${selectedSpecialty?.code} - ${selectedSpecialty?.name}"`}
                                            {reportType === 'department_materials' && (currentUser?.departmentName ? `${currentUser.departmentName}. Отчет по материалам` : 'Материалы кафедры')}
                                            {reportType === 'department_disciplines' && `${selectedDepartment.name}. Отчет по дисциплинам`}
                                            {reportType === 'reissue_needs' && `${selectedDepartment.name}. Потребность в переиздании на ${targetYear} год`}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            Период: {startYear} — {endYear} гг.
                                        </Typography>
                                    </Stack>

                                    <ExportButtons />

                                    {reportType === 'faculty' && <FacultyTable data={reportData} startYear={startYear} endYear={endYear} />}
                                    {reportType === 'department' && <FacultyDepTable data={reportData} startYear={startYear} endYear={endYear} />}
                                    {reportType === 'authors' && <AuthorTable data={reportData} />}
                                    {reportType === 'author_materials' && <AuthorMaterialsTable data={reportData} />}
                                    {reportType === 'specialty_materials' && <SpecialtyMaterialsTable data={reportData} />}
                                    {reportType === 'department_materials' && <MaterialsByDepartmentTable data={reportData} />}
                                    {reportType === 'specialty_disciplines_with_materials' && <SpecialtyDisciplinesWithMaterialsTable data={reportData} />}
                                    {(reportType === 'department_disciplines' || reportType === 'reissue_needs') && (
                                        <DepartmentDisciplinesTable
                                            data={reportData}
                                            showReissueColumn={reportType === 'reissue_needs'}
                                        />
                                    )}
                                    <ExportButtons />
                                </>
                            )}
                        </Box>
                    )}
                </Box>
            </Box>
            <Footer />
        </Box>
    );
};

export default ReportsPage;