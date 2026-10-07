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
    Typography
} from '@mui/material';

const AuthorMaterialsTable = ({ data }) => {
    const report = data?.report ? data.report : (data && typeof data === 'object' && !Array.isArray(data) ? data : {});
    const years = Object.keys(report).sort((a, b) => b - a);

    if (years.length === 0) {
        return (
            <Typography variant="body1" sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                Данные по автору отсутствуют или еще не загружены.
            </Typography>
        );
    }

    return (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, boxShadow: 'none' }}>
            <Table sx={{ minWidth: 650, borderCollapse: 'collapse' }} aria-label="таблица материалов автора">
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableRow>
                        <TableCell align="center" sx={{ fontWeight: 'bold', width: '100px', border: '1px solid #e0e0e0' }}>Год</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', width: '60px', border: '1px solid #e0e0e0' }}>№</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', border: '1px solid #e0e0e0' }}>Информация о МУ</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {years.map((year) => {
                        const items = report[year] || [];
                        const rowSpanValue = items.length;

                        return items.map((item, index) => (
                            <TableRow key={`${year}-${item.number}-${index}`}>
                                {index === 0 && (
                                    <TableCell
                                        rowSpan={rowSpanValue}
                                        align="center"
                                        valign="top"
                                        sx={{ 
                                            fontWeight: 'bold', 
                                            fontSize: '1rem',
                                            border: '1px solid #e0e0e0',
                                            backgroundColor: '#fff',
                                            pt: 2
                                        }}
                                    >
                                        {year}
                                    </TableCell>
                                )}
                                
                                <TableCell 
                                    align="center" 
                                    valign="top" 
                                    sx={{ border: '1px solid #e0e0e0', pt: 2 }}
                                >
                                    {item.number}
                                </TableCell>
                                
                                <TableCell sx={{ border: '1px solid #e0e0e0', py: 1.5 }}>
                                    <Link 
                                        href={item.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        underline="hover"
                                        sx={{ fontWeight: '500', display: 'block', mb: 0.5, color: '#1976d2' }}
                                    >
                                        {item.title}
                                    </Link>
                                    <Typography variant="body2" component="span" sx={{ display: 'block', color: 'text.primary', mb: 0.5 }}>
                                        {item.authors} ({item.publisher}, {year})
                                    </Typography>
                                    <Link 
                                        href={item.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        variant="caption"
                                        sx={{ color: 'text.secondary', display: 'block' }}
                                    >
                                        {item.uri}
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ));
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default AuthorMaterialsTable;