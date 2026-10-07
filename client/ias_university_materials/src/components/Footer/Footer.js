import React from 'react';
import { Box, Container, Typography, Link } from '@mui/material';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const styles = {
    columnTitle: {
      fontSize: '0.85rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '1px',
      color: 'rgba(255, 255, 255, 0.7)',
      mb: 1,
    },
    footerLink: {
      fontSize: '1rem',
      color: 'white',
      textDecoration: 'none',
      transition: '0.2s',
      '&:hover': {
        textDecoration: 'underline',
        opacity: 0.8,
      },
    },
    column: {
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      minWidth: '200px', 
      flex: '1 1 0',
    }
  };

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'primary.main',
        color: 'white',
        py: 5,
        px: 2,
        fontFamily: "'Play', sans-serif",
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 4,
            textAlign: { xs: 'center', md: 'center' },
          }}
        >
          <Box sx={styles.column}>
            <Typography sx={styles.columnTitle}>Авторские права</Typography>
            <Typography variant="body2">
              © {currentYear} Белорусско-Российский университет
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', opacity: 0.6 }}>
              Все права защищены.
            </Typography>
          </Box>

          <Box sx={styles.column}>
            <Typography sx={styles.columnTitle}>Разработчики системы</Typography>
            <Typography variant="body2">IT-отдел БРУ</Typography>
          </Box>

          <Box sx={styles.column}>
            <Typography sx={styles.columnTitle}>Поддержка</Typography>
            <Link href="mailto:support@bru.by" sx={styles.footerLink}>
              nikitasidarenko@gmail.com
            </Link>
          </Box>

          <Box sx={styles.column}>
            <Typography sx={styles.columnTitle}>Ресурсы</Typography>
            <Link 
              href="http://e.biblio.bru.by/" 
              target="_blank" 
              rel="noopener noreferrer" 
              sx={styles.footerLink}
            >
              Электронная библиотека
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;