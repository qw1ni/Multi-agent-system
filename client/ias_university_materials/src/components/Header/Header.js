import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, Box, IconButton, Drawer, 
  List, ListItem, ListItemButton, ListItemText, Button, Container
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import Logo from '../../assets/logo/BRU_3.png';
import { ROLES } from '../../constants/roles'; 
import authService from '../../services/authService'; 
import UserModal from '../Modal/UserModal';

const Header = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false); 

  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const userRole = localStorage.getItem('role'); 

  const allNavItems = [
    { label: 'Главная', path: '/' },
    { label: 'Каталог', path: '/catalog' },
    { label: 'Отчеты', path: '/reports' },
    { label: 'Аналитика', path: '/analytics' },
    { label: 'Администрирование', path: '/admin' }
  ];

  const getFilteredNavItems = () => {
    if (!user || !userRole) {
      return allNavItems.filter(item => item.path === '/' || item.path === '/catalog');
    }
    if (userRole === ROLES.ADMIN) {
      return allNavItems;
    }
    return allNavItems.filter(item => item.path !== '/admin');
  };

  const navItems = getFilteredNavItems();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileModalToggle = () => {
    setProfileOpen(!profileOpen);
  };

  const handleLogout = async () => {
    try {
      await authService.logout(); 
    } catch (err) {
      console.error("Ошибка при выходе на сервере:", err);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      
      setProfileOpen(false);
      setMobileOpen(false);
      navigate('/', { replace: true });
    }
  };

  const drawerContent = (
    <Box sx={{ width: 280, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <IconButton onClick={handleDrawerToggle}>
          <CloseIcon />
        </IconButton>
      </Box>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton 
              component={Link} 
              to={item.path} 
              onClick={handleDrawerToggle} 
              sx={{ borderRadius: 1 }}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ mt: 2 }}>
        {user ? (
          <Button 
            variant="contained" 
            fullWidth 
            startIcon={<AccountCircleIcon />}
            onClick={() => { handleDrawerToggle(); handleProfileModalToggle(); }}
          >
            Профиль
          </Button>
        ) : (
          <Button 
            variant="contained" 
            fullWidth 
            onClick={() => { handleDrawerToggle(); navigate('/login'); }}
          >
            Войти
          </Button>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar position="sticky" sx={{ bgcolor: 'primary.main', boxShadow: 3 }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ display: 'flex', justifyContent: 'space-between' }}>
            
            <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'white' }}>
              <Box component="img" src={Logo} alt="logo" sx={{ height: { xs: 40, md: 50 }, width: 'auto' }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: { xs: '1rem', md: '1.25rem' } }}>
                  БРУ
                </Typography>
                <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: '0.75rem', opacity: 0.8 }}>
                  Информационно-аналитическая система
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, ml: 4, flexGrow: 1 }}>
              {navItems.map((item) => (
                <Button 
                  key={item.label} 
                  component={Link} 
                  to={item.path}
                  sx={{ color: 'white', textTransform: 'none', fontSize: '1rem', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {user ? (
                <IconButton color="inherit" onClick={handleProfileModalToggle} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
                  <AccountCircleIcon fontSize="large" />
                </IconButton>
              ) : (
                <Button 
                  variant="outlined" 
                  color="inherit"
                  onClick={() => navigate('/login')}
                  sx={{ display: { xs: 'none', md: 'inline-flex' }, mr: 1, textTransform: 'none' }} 
                >
                  Войти
                </Button>
              )}

              <IconButton color="inherit" onClick={handleDrawerToggle} sx={{ display: { md: 'none' } }}>
                <MenuIcon fontSize="large" />
              </IconButton>
            </Box>

          </Toolbar>
        </Container>
      </AppBar>

      {/* Выдвижная панель */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 } }}
      >
        {drawerContent}
      </Drawer>

      {/*Модальное окно */}
      <UserModal 
        open={profileOpen}
        onClose={handleProfileModalToggle}
        onLogout={handleLogout}
        user={user}
        userRole={userRole}
      />
    </>
  );
};

export default Header;