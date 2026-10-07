import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Paper, Box,
    Button, Divider, CircularProgress, Chip, Stack, IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import MaterialCard from '../components/MaterialCard/MaterialCard';
import materialService from '../services/materialService';

const PassportRow = ({ label, value }) => (
    <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        py: 1.5,
        borderBottom: '1px dashed #e0e0e0',
        '&:last-child': { borderBottom: 'none' }
    }}>
        <Typography
            variant="body2"
            color="text.secondary"
            sx={{
                fontWeight: 500,
                minWidth: '140px',
                pr: 1
            }}
        >
            {label}
        </Typography>
        <Typography
            variant="body2"
            color="text.primary"
            sx={{
                fontWeight: 600,
                textAlign: 'right',
                wordBreak: 'break-word',
                pl: 1
            }}
        >
            {value || '—'}
        </Typography>
    </Box>
);

const MaterialDetailPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [material, setMaterial] = useState(null);
    const [similarMaterials, setSimilarMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            let currentMaterial = null;

            try {
                currentMaterial = await materialService.getFullMaterialInfo(id);
                setMaterial(currentMaterial);
            } catch (error) {
                if (error.response) {
                    if (error.response.status === 403) { navigate('/403', { replace: true }); return; }
                    if (error.response.status === 404) { navigate('/404', { replace: true }); return; }
                }
                setLoading(false);
                return;
            }

            if (currentMaterial) {
                try {
                    const similarInfo = await materialService.getSimilarMaterials(currentMaterial.id, 9);

                    if (Array.isArray(similarInfo) && similarInfo.length > 0) {

                        const idsOrder = similarInfo
                            .map(item => item.material_id);

                        const paginationData = await materialService.getMaterialsWithPag({
                            materialIds: idsOrder.join(','),
                            limit: 10
                        });

                        const similarityMap = new Map(
                            similarInfo.map(item => [item.material_id, item.similarity])
                        );

                        const sortedSimilarityMaterials = paginationData.items
                            .map(item => ({
                                ...item,
                                similarity: similarityMap.get(item.id) || 0
                            }))
                            .sort((a, b) => b.similarity - a.similarity);

                        setSimilarMaterials(sortedSimilarityMaterials);
                    }

                } catch (error) {
                    console.error("Ошибка загрузки похожих:", error);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchDetail();
        window.scrollTo(0, 0);
    }, [id, navigate]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!material) return <Typography align="center">Материал не найден</Typography>;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f8f9fa' }}>
            <Header />
            <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 3
                }}>

                    <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 65%', lg: '1 1 68%' } }}>

                        <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 3, border: '1px solid #eef2f6', height: '100%' }}>
                            <Typography
                                variant="caption"
                                sx={{
                                    display: 'block',
                                    color: 'text.secondary',
                                    fontSize: '0.8rem',
                                    mb: 0.5,
                                    fontWeight: 500
                                }}
                            >
                                {material.facultyName} → {material.departmentName} → методическая рекомендация
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#1a202c', lineHeight: 1.3, mb: 1 }}>
                                    {material.title}
                                </Typography>
                                <IconButton
                                    onClick={() => navigate(-1)}
                                    size="small"
                                    sx={{
                                        color: '#0056b3',
                                        bgcolor: '#f0f4f8',
                                        '&:hover': { bgcolor: '#e2e8f0' },
                                        borderRadius: 2,
                                        p: 0.8
                                    }}
                                    title="Назад в каталог"
                                >
                                    <ArrowBackIcon fontSize="small" />
                                </IconButton>
                            </Box>

                            {material.alternativeTitle && (
                                <Typography variant='p' color="text.secondary" sx={{ fontSize: '1rem', fontWeight: 400, mb: 3, fontStyle: 'italic' }}>
                                    {material.alternativeTitle}
                                </Typography>
                            )}

                            <Box sx={{ mb: 4, marginTop: '2em' }}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', tracking: 1, mb: 1 }}>
                                    Авторы
                                </Typography>
                                <Typography variant="p" sx={{ fontSize: "1rem" }}>
                                    {material.authors?.map(a => a.name).join(', ') || 'Авторы не указаны'}
                                </Typography>
                            </Box>

                            <Divider sx={{ my: 3 }} />

                            {material.citation && (
                                <Box sx={{ mb: 4, p: 2.5, bgcolor: '#f0f4f8', borderRadius: 2, borderLeft: '4px solid #0056b3', position: 'relative' }}>
                                    <FormatQuoteIcon sx={{ position: 'absolute', right: 12, top: 12, color: '#d0dbe5', fontSize: 40 }} />
                                    <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                                        Библиографическое описание для цитирования:
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#334155', fontStyle: 'italic', pr: 4, lineHeight: 1.6 }}>
                                        {material.citation}
                                    </Typography>
                                </Box>
                            )}

                            {material.specialities && material.specialities.length > 0 && (
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', mb: 1.5 }}>
                                        Для специальностей
                                    </Typography>
                                    <Stack direction="row" flexWrap="wrap" gap={1}>
                                        {material.specialities.map((s, idx) => (
                                            <Chip
                                                key={idx}
                                                icon={<MenuBookIcon size="small" />}
                                                label={`${s.spec_code} — ${s.spec_name}`}
                                                sx={{ bgcolor: '#fff', border: '1px solid #cbd5e1', color: '#334155', p: 0.5 }}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            )}

                            {material.keywords && material.keywords.length > 0 && (
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', mb: 1.5 }}>
                                        Ключевые слова
                                    </Typography>
                                    <Stack direction="row" flexWrap="wrap" gap={1}>
                                        {material.keywords.map((k, idx) => (
                                            <Chip
                                                key={idx}
                                                label={k.word}
                                                sx={{ bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#e2e8f0' }, color: '#475569', fontWeight: 500 }}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            )}
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', mb: 1.5 }}>
                                    Ссылки
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <Button
                                        variant="contained"
                                        startIcon={<OpenInNewIcon />}
                                        href={material.uri}
                                        target="_blank"
                                        sx={{ bgcolor: '#0056b3', '&:hover': { bgcolor: '#004394' }, textTransform: 'none', px: 3, py: 1.2, borderRadius: 2, fontWeight: 'bold' }}
                                    >
                                        В электронную библиотеку
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<PictureAsPdfIcon />}
                                        href={material.fileLink}
                                        target="_blank"
                                        sx={{ textTransform: 'none', px: 3, py: 1.2, borderRadius: 2, fontWeight: 'bold', color: '#dc2626', borderColor: '#fca5a5', '&:hover': { bgcolor: '#fef2f2', borderColor: '#ef4444', color: '#dc2626' } }}
                                    >
                                        Открыть PDF
                                    </Button>
                                </Stack>
                            </Box>

                        </Paper>
                    </Box>

                    <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 35%', lg: '1 1 32%' } }}>
                        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #eef2f6', bgcolor: '#fff' }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', tracking: 1, mb: 2 }}>
                                Характеристики издания
                            </Typography>
                            <Box>
                                <PassportRow label="Год издания" value={material.year} />
                                <PassportRow label="Количество страниц" value={material.pages ? `${material.pages} с.` : '—'} />
                                <PassportRow label="Язык публикации" value={material.language} />
                                <PassportRow label="Издатель" value={material.publisher} />
                                <PassportRow label="Индекс УДК" value={material.materialUdcCodes?.map(u => u.code).join(', ')} />
                                <PassportRow
                                    label="В базе библиотеки с"
                                    value={material.availableDate ? new Date(material.availableDate).toLocaleDateString() : '—'}
                                />
                            </Box>
                        </Paper>
                    </Box>

                </Box>

                {similarMaterials.length > 0 && (
                    <Box sx={{ mt: 6 }}>
                        <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', color: '#1a202c' }}>
                            Похожие материалы
                        </Typography>
                        <Box sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 3,
                            justifyContent: 'flex-start'
                        }}>
                            {similarMaterials.map(item => (
                                <Box
                                    key={item.id}
                                    sx={{
                                        flex: {
                                            xs: '1 1 100%',
                                            sm: '1 1 calc(50% - 12px)',
                                            md: '1 1 calc(33.333% - 16px)'
                                        },
                                        maxWidth: { md: 'calc(33.333% - 16px)' },
                                        display: 'flex'
                                    }}
                                >
                                    <MaterialCard material={item} />
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}
            </Container>
            <Footer />
        </Box>
    );
};

export default MaterialDetailPage;