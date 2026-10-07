import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Link,
    IconButton,
    Tooltip,
    Typography,
    Box
} from '@mui/material';
import {
    Launch as LaunchIcon,
    GetApp as DownloadIcon,
    MenuBook as BookIcon
} from '@mui/icons-material';

const SpecialtyMaterialsTable = ({ data }) => {
    const report = data?.data || data;
    const materials = report?.materials || [];

    if (!report || materials.length === 0) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="textSecondary">
                    Для данной специальности методические материалы не найдены.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ mt: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: '#f5f7fa' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Шифр специальности: <span style={{ color: '#1976d2' }}>{report.specCode}</span>
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Название направления: <span style={{ color: '#1976d2' }}>{report.specName}</span>
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                    Всего найдено материалов: {report.totalMaterials}
                </Typography>
            </Paper>

            <TableContainer component={Paper} variant="outlined">
                <Table sx={{ minWidth: 650 }} aria-label="specialty materials table">
                    <TableHead sx={{ backgroundColor: '#f0f4f8' }}>
                        <TableRow>
                            <TableCell align="center" sx={{ fontWeight: 'bold', width: '60px' }}>№ п/п</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Наименование учебно-методического материала / Авторы</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', width: '120px' }}>Год издания</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', width: '120px' }}>Ссылки</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {materials.map((material, index) => (
                            <TableRow key={material.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell align="center">{index + 1}</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                        <BookIcon color="action" sx={{ mt: 0.3, fontSize: '1.2rem' }} />
                                        <Box>
                                            <Typography variant="body1" sx={{ fontWeight: 500, lineHeight: 1.4 }}>
                                                {material.title}
                                            </Typography>
                                            {material.alternativeTitle && (
                                                <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                                                    {material.citation}
                                                </Typography>
                                            )}
                                            <Typography variant="body2" color="primary" sx={{ mt: 0.5, fontWeight: 'medium' }}>
                                                Авторы: {material.authors}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell align="center">
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                        {material.issuedYear}
                                    </Typography>
                                    {material.pages && (
                                        <Typography variant="caption" color="textSecondary">
                                            {material.pages} с.
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell align="center">
                                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                        {material.uri && (
                                            <Tooltip title="Открыть в электронной библиотеке">
                                                <IconButton 
                                                    component={Link} 
                                                    href={material.uri} 
                                                    target="_blank" 
                                                    rel="noopener"
                                                    size="small"
                                                    color="primary"
                                                >
                                                    <LaunchIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {material.fileLink && (
                                            <Tooltip title="Скачать документ (PDF)">
                                                <IconButton 
                                                    component={Link} 
                                                    href={material.fileLink} 
                                                    target="_blank" 
                                                    rel="noopener"
                                                    size="small"
                                                    color="error"
                                                >
                                                    <DownloadIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default SpecialtyMaterialsTable;