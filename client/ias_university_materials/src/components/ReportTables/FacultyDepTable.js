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

const FacultyDepTable = ({ data, startYear, endYear }) => {
  const years = Array.from(
    { length: Number(endYear) - Number(startYear) + 1 },
    (_, i) => (Number(startYear) + i).toString()
  );

  if (!data || data.length === 0) {
    return <Typography sx={{ p: 2 }}>Данные не найдены</Typography>;
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
      <Table size="small" aria-label="отчет по кафедрам">
        <TableHead>
          <TableRow sx={{ backgroundColor: '#eeeeee' }}>
            <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
              Факультет
            </TableCell>
            <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
              Кафедра
            </TableCell>
            {years.map(year => (
              <TableCell key={year} align="center" sx={{ fontWeight: 'bold' }}>
                {year}
              </TableCell>
            ))}
            <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#e0f7fa' }}>
              Итого
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((faculty, fIdx) => (
            <React.Fragment key={fIdx}>
              {faculty.departments.map((dep, dIdx) => (
                <TableRow key={dIdx} hover>
                  {dIdx === 0 && (
                    <TableCell 
                      rowSpan={faculty.departments.length + 1} 
                      sx={{ 
                        verticalAlign: 'top', 
                        fontWeight: 'bold',
                        borderRight: '1px solid rgba(224, 224, 224, 1)',
                        backgroundColor: '#fafafa'
                      }}
                    >
                      {faculty.name}
                    </TableCell>
                  )}
                  <TableCell sx={{ borderRight: '1px solid rgba(224, 224, 224, 1)' }}>
                    {dep.department_name}
                  </TableCell>
                  {years.map(year => (
                    <TableCell key={year} align="center">
                      {dep[year] || 0}
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ fontWeight: 500, backgroundColor: '#faffff' }}>
                    {dep.total}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold', fontStyle: 'italic' }}>
                  ИТОГО по факультету:
                </TableCell>
                {years.map(year => (
                  <TableCell key={year} align="center" sx={{ fontWeight: 'bold' }}>
                    {faculty.totals[year] || 0}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: '#b2ebf2' }}>
                  {faculty.totals.total}
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default FacultyDepTable;