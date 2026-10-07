import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Typography 
} from '@mui/material';

const FacultyTable = ({ data, startYear, endYear }) => {
  const years = Array.from(
    { length: Number(endYear) - Number(startYear) + 1 },
    (_, i) => (Number(startYear) + i).toString()
  );

  if (!data || data.length === 0) {
    return <Typography sx={{ p: 2 }}>Данные для отчета не найдены</Typography>;
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell sx={{ fontWeight: 'bold' }}>Наименование факультета</TableCell>
            {years.map(year => (
              <TableCell key={year} align="center" sx={{ fontWeight: 'bold' }}>
                {year}
              </TableCell>
            ))}
            <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#e3f2fd' }}>
              Итого
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, index) => {
            const isTotalRow = row.faculty_name === "Итого";
            
            return (
              <TableRow 
                key={index} 
                hover={!isTotalRow}
                sx={{ 
                  backgroundColor: isTotalRow ? '#fafafa' : 'inherit',
                  '& td': { fontWeight: isTotalRow ? 'bold' : 'inherit' }
                }}
              >
                <TableCell>{row.faculty_name}</TableCell>
                
                {years.map(year => (
                  <TableCell key={year} align="center">
                    {row[year] || 0}
                  </TableCell>
                ))}
                
                <TableCell 
                  align="center" 
                  sx={{ 
                    backgroundColor: isTotalRow ? '#bbdefb' : '#faffff',
                    fontWeight: 'bold' 
                  }}
                >
                  {row.total}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default FacultyTable;