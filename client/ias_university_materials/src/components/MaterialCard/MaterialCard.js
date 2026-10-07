import React from 'react';
import { Card, CardContent, CardActions, Typography, Button, Box } from '@mui/material';

const MaterialCard = ({ material }) => {
  return (
    <Card sx={{
      height: '100%',
      display: 'flex',
      width: '100%',
      flexDirection: 'column',
      border: '1px solid #dee2e6',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)'
      }
    }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography
          variant="h6"
          component="h3"
          sx={{
            color: '#0056b3',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            lineHeight: 1.3,
            mb: 2,
            minHeight: '2.6em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {material.title}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="body2">
            <strong>Авторы:</strong> {material.authors.length > 0
              ? material.authors.map(a => a.name).join(', ')
              : 'Не указаны'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#555' }}>
            <strong>Год:</strong> {material.year}
          </Typography>
          <Typography variant="body2" sx={{ color: '#555' }}>
            <strong>Факультет:</strong> {material.facultyName}
          </Typography>
        </Box>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          variant="text"
          fullWidth
          sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 'bold' }}
          href={`/materials/${material.id}`}
        >
          Перейти к материалу
        </Button>
      </CardActions>
    </Card>
  );
};

export default MaterialCard;