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

const AuthorTable = ({ data }) => {
  if (!data || data.length === 0) {
    return <Typography sx={{ p: 2 }}>Данные об авторах не найдены</Typography>;
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
            <TableCell sx={{ fontWeight: 'bold', width: '70px' }} align="center">№</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>ФИО Автора</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }} align="center">Количество материалов</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((author, index) => (
            <TableRow key={index} hover>
              <TableCell align="center">{index + 1}</TableCell>
              <TableCell sx={{ fontWeight: index < 3 ? 'bold' : 'normal' }}>
                {author.name}
              </TableCell>
              <TableCell align="center">
                {author.count}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AuthorTable;