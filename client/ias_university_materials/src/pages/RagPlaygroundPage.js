import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Container, Paper,
  TextField, Typography, CircularProgress,
} from '@mui/material';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import ragService from '../services/ragService';

const ALL_SECTIONS = { id: '__all__', name: 'Все разделы' };

const allFilesOption = (sectionId) => ({
  doc_id: '__section__',
  source_file: null,
  label: !sectionId || sectionId === ALL_SECTIONS.id ? 'Все документы' : 'Весь раздел',
});

const fileName = (doc) => (doc?.source_file || doc?.doc_id || '').replace(/_/g, ' ');

const RagPlaygroundPage = () => {
  const [documents, setDocuments] = useState([]);
  const [section, setSection] = useState(ALL_SECTIONS);
  const [selected, setSelected] = useState(allFilesOption(ALL_SECTIONS.id));
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [searched, setSearched] = useState(false);
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, docsData] = await Promise.all([
          ragService.stats(),
          ragService.documents(),
        ]);
        setStats(statsData);
        setDocuments(docsData.documents || []);
      } catch {
        setError('Сервис MiniLM не запущен (порт 8002). Сначала проиндексируйте обработанные файлы.');
      }
    };
    load();
  }, []);

  const sectionOptions = useMemo(() => {
    const counts = new Map();
    documents.forEach((doc) => {
      const key = doc.section || 'Без раздела';
      const prev = counts.get(key) || { id: key, name: key, files: 0, chunks: 0 };
      prev.files += 1;
      prev.chunks += doc.chunks || 0;
      counts.set(key, prev);
    });
    return [ALL_SECTIONS, ...[...counts.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'))];
  }, [documents]);

  const fileOptions = useMemo(() => {
    const inSection = section?.id && section.id !== ALL_SECTIONS.id
      ? documents.filter((doc) => (doc.section || 'Без раздела') === section.id)
      : documents;
    return [
      allFilesOption(section?.id),
      ...inSection.slice().sort((a, b) => fileName(a).localeCompare(fileName(b), 'ru')),
    ];
  }, [documents, section]);

  const handleSectionChange = (_, value) => {
    const next = value || ALL_SECTIONS;
    setSection(next);
    setSelected(allFilesOption(next.id));
    setHits([]);
    setSearched(false);
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (q.length < 3) return;
    setError('');
    setBusy(true);
    try {
      const payload = {
        query: q,
        limit: 6,
        threshold: 0.25,
      };
      const oneFile = selected && selected.doc_id !== '__section__';
      if (oneFile) {
        if (selected.source_file) payload.source_file = selected.source_file;
        else payload.doc_id = selected.doc_id;
      } else if (section?.id && section.id !== ALL_SECTIONS.id) {
        payload.section = section.id;
      }
      const data = await ragService.query(payload);
      setHits(data.results || []);
      setSearched(true);
    } catch (err) {
      setError(err.data?.detail || err.message || 'Сервис MiniLM не запущен (порт 8002)');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Header />
      <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
        <Typography variant="h5" sx={{ color: '#0056b3', fontWeight: 'bold', mb: 1 }}>
          Семантический поиск MiniLM
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Сначала выберите раздел корпуса (Факультеты, РФ3+++ и т.п.), затем документ внутри него.
          Модель находит ближайшие фрагменты, а не пишет ответ своими словами.
        </Typography>

        {stats && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Разделов: {Math.max(sectionOptions.length - 1, 0)}. Документов: {stats.document_count}.
            Фрагментов: {stats.total_chunks}.
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Paper sx={{ p: 3, borderRadius: '12px' }}>
          <Box display="flex" gap={2} flexWrap="wrap" sx={{ mb: 2 }}>
            <Autocomplete
              sx={{ flex: 1, minWidth: 240 }}
              options={sectionOptions}
              value={section}
              onChange={handleSectionChange}
              getOptionLabel={(option) => {
                if (!option) return '';
                if (option.id === ALL_SECTIONS.id) return option.name;
                return `${option.name} (${option.files} док.)`;
              }}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField {...params} label="Раздел" placeholder="Факультеты, РФ3+++…" />
              )}
            />
            <Autocomplete
              key={section?.id || 'all'}
              sx={{ flex: 1, minWidth: 240 }}
              options={fileOptions}
              value={selected}
              onChange={(_, value) => setSelected(value || allFilesOption(section?.id))}
              groupBy={(option) => (option.doc_id === '__section__' ? '' : (option.section || ''))}
              getOptionLabel={(option) => {
                if (!option) return '';
                if (option.doc_id === '__section__') return option.label;
                return `${fileName(option)} (${option.chunks} фрагм.)`;
              }}
              isOptionEqualToValue={(a, b) => a.doc_id === b.doc_id}
              noOptionsText="В этом разделе нет обработанных файлов"
              renderInput={(params) => (
                <TextField {...params} label="Документ" placeholder="Выберите файл внутри раздела" />
              )}
            />
          </Box>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Вопрос"
            placeholder="Например: контрольные вопросы лабораторной работы"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button
            variant="contained"
            sx={{ mt: 2, bgcolor: '#0056b3' }}
            disabled={query.trim().length < 3 || busy}
            onClick={handleSearch}
          >
            {busy ? 'Поиск…' : 'Найти фрагменты'}
          </Button>
          {busy && <CircularProgress size={22} sx={{ ml: 2, verticalAlign: 'middle' }} />}
        </Paper>

        {hits.map((hit) => (
          <Paper key={hit.chunk_id} sx={{ p: 2, mt: 2, borderRadius: '12px' }}>
            <Typography variant="caption" color="text.secondary">
              сходство {hit.similarity}
              {hit.section ? ` · ${hit.section}` : ''}
              {hit.source_file ? ` · ${hit.source_file}` : ''}
              {hit.pages?.length ? ` · с. ${hit.pages.join(', ')}` : ''}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{hit.text}</Typography>
          </Paper>
        ))}
        {!busy && searched && hits.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Ничего не найдено. Попробуйте другой вопрос, раздел или документ.
          </Typography>
        )}
      </Container>
      <Footer />
    </>
  );
};

export default RagPlaygroundPage;
