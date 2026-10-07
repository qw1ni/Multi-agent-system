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
    Typography,
    Box
} from '@mui/material';

const MaterialsByDepartment = ({ data }) => {
    if (!data || Object.keys(data).length === 0) {
        return <Typography sx={{ p: 2 }}>Данные не найдены</Typography>;
    }

    return (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
            <Table size="small" aria-label="отчет по материалам кафедры">
                <TableHead>
                    <TableRow sx={{ backgroundColor: '#eeeeee' }}>
                        <TableCell
                            align="center"
                            sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)', width: '50px' }}
                        >
                            №
                        </TableCell>
                        <TableCell
                            sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)' }}
                        >
                            Наименование методических рекомендаций (библиография)
                        </TableCell>
                        <TableCell
                            sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)', width: '20%' }}
                        >
                            Составитель(и)
                        </TableCell>
                        <TableCell
                            align="center"
                            sx={{ fontWeight: 'bold', width: '10%' }}
                        >
                            Год издания
                        </TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {Object.entries(data).map(([year, materials]) => (
                        <React.Fragment key={year}>

                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }} />
                                <TableCell
                                    colSpan={4}
                                    sx={{
                                        fontWeight: 'bold',
                                        fontStyle: 'italic',
                                        backgroundColor: '#fafafa'
                                    }}
                                >
                                    {year === 'Год не указан' ? year : `${year} год`}
                                </TableCell>
                            </TableRow>

                            {materials.map((row) => (
                                <TableRow key={`${year}-${row.number}-${row.file_link}`} hover>
                                    <TableCell align="center" sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                                        {row.number}
                                    </TableCell>
                                    <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                                        <Typography variant="body2" sx={{ mb: row.file_link ? 1 : 0 }}>
                                            {row.citation || 'Библиографическое описание отсутствует'}
                                        </Typography>
                                        {row.file_link && (
                                            <Box>
                                                <Link
                                                    href={row.file_link}
                                                    target="_blank"
                                                    rel="noopener"
                                                    color="primary"
                                                    underline="hover"
                                                    sx={{ fontSize: '0.85rem', display: 'inline-block' }}
                                                >
                                                    Ссылка на ресурс
                                                </Link>
                                            </Box>
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                                        {row.authors}
                                    </TableCell>
                                    <TableCell align="center">
                                        {year}
                                    </TableCell>
                                </TableRow>
                            ))}

                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default MaterialsByDepartment;