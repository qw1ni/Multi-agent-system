import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const SpecialtyTable = ({ data, startYear, endYear }) => {
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => Number(startYear) + i);

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Код и наименование специальности</TableCell>
            {years.map(year => (
              <TableCell key={year} align="center" sx={{ fontWeight: 'bold' }}>{year}</TableCell>
            ))}
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Итого</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index} hover>
              <TableCell>{row.specCode} {row.specName}</TableCell>
              {years.map(year => (
                <TableCell key={year} align="center">{row.values[year] || 0}</TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>{row.total}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SpecialtyTable;