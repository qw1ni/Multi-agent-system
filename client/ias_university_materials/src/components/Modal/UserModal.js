import React from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Box, Typography, Button, Avatar, Divider 
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import {ROLES} from '../../constants/roles';

const UserModal = ({ open, onClose, onLogout, user, userRole }) => {
  const isDepartmentEmployee = userRole === ROLES.DEPARTMENT;
  const isDeaneryEmployee = userRole === ROLES.DEANERY;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: '12px', p: 1 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 1 }}>
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          <AccountCircleIcon />
        </Avatar>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
            Личный кабинет
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Текущая сессия
          </Typography>
        </Box>
      </DialogTitle>
      
      <Divider sx={{ my: 1 }} />
      
      <DialogContent sx={{ py: 1 }}>
        {user && (
          <Box display="flex" flexDirection="column" gap={1.5}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>ФИО сотрудника:</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{user.fullName}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>Логин в системе:</Typography>
              <Typography variant="body2">{user.login}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>Email:</Typography>
              <Typography variant="body2">{user.email}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>Роль доступа:</Typography>
              <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{userRole}</Typography>
            </Box>
          
            {(isDepartmentEmployee || isDeaneryEmployee) && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>Факультет:</Typography>
                <Typography variant="body2">{user.facultyName || 'Не указан'}</Typography>
              </Box>
            )}

            {isDepartmentEmployee && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>Кафедра:</Typography>
                <Typography variant="body2">{user.departmentName || 'Не указана'}</Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      
      <Divider sx={{ my: 1 }} />
      
      <DialogActions sx={{ px: 2, pb: 1, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit" sx={{ textTransform: 'none' }}>
          Закрыть
        </Button>
        <Button 
          onClick={onLogout} 
          variant="contained" 
          color="error" 
          sx={{ textTransform: 'none', fontWeight: 'bold' }}
        >
          Выйти из системы
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserModal;