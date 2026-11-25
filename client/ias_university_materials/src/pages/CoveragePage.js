import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Container, MenuItem, Paper,
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography, CircularProgress,
} from '@mui/material';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { axiosInstance } from '../services/axiosInstance';

const STATUS = {
  gap: { label: 'не издано и нет в библиотеке', color: 'error' },
  fact: { label: 'издано, в библиотеке не найдено', color: 'warning' },
  library: { label: 'есть в библиотеке, среди изданных нет', color: 'info' },
  both: { label: 'издано и есть в библиотеке', color: 'success' },
};

const CoveragePage = () => {
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('gap');
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async (next = {}) => {
    const params = {
      department: next.department ?? department,
      status: next.status ?? status,
      q: next.q ?? q,
      limit: 120,
    };
    setBusy(true);
    setError('');
    try {
      const response = await axiosInstance.get('/materials/coverage', { params });
      setData(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Не удалось посчитать сверку');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
    // первая загрузка
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = data?.summary || { gap: 0, fact: 0, library: 0, both: 0, total: 0 };

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Сверка плана УМД
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Строка плана сопоставляется с уже изданными УМД (выгрузка «издано») и с каталогом библиотеки по названию дисциплины.
          Совпадение в библиотеке — если название дисциплины входит в заголовок материала.
        </Typography>

        <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            select
            size="small"
            label="Кафедра плана"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            sx={{ minWidth: 260 }}
          >
            <MenuItem value="">Все кафедры</MenuItem>
            {(data?.departments || []).map((name) => (
              <MenuItem key={name} value={name}>{name}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Дисциплина"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <Button variant="contained" onClick={() => load()} disabled={busy}>
            Посчитать
          </Button>
          {busy && <CircularProgress size={22} />}
        </Paper>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {Object.entries(STATUS).map(([key, meta]) => (
            <Chip
              key={key}
              color={status === key ? meta.color : 'default'}
              variant={status === key ? 'filled' : 'outlined'}
              label={`${meta.label}: ${summary[key] || 0}`}
              onClick={() => {
                setStatus(key);
                load({ status: key });
              }}
            />
          ))}
          <Chip
            variant={status === '' ? 'filled' : 'outlined'}
            label={`все дисциплины плана: ${summary.total || 0}`}
            onClick={() => {
              setStatus('');
              load({ status: '' });
            }}
          />
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Дисциплина</TableCell>
                <TableCell align="right">Строк плана</TableCell>
                <TableCell align="right">Издано</TableCell>
                <TableCell align="right">Библиотека</TableCell>
                <TableCell>Статус</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.items || []).map((row) => (
                <TableRow key={row.discipline}>
                  <TableCell>{row.discipline}</TableCell>
                  <TableCell align="right">{row.plan_rows}</TableCell>
                  <TableCell align="right">{row.fact_rows}</TableCell>
                  <TableCell align="right">{row.library_rows}</TableCell>
                  <TableCell>{STATUS[row.status]?.label || row.status}</TableCell>
                </TableRow>
              ))}
              {!busy && (data?.items || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>Нет строк. Если план не загружен, таблица будет пустой.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Container>
      <Footer />
    </>
  );
};

export default CoveragePage;
