import React, { useState } from 'react';
import {
    TableRow, TableCell, IconButton, TextField, Select, MenuItem, Collapse, Box, Typography, Grid
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const AdminTableRow = (props) => {
    const {
        row, isEditing, onEditToggle, onCancelEdit, onDelete, onCellChange,
        validationErrors, roles, faculties, departments
    } = props;

    const [open, setOpen] = useState(false);

    const currentRole = roles.find(r => r.id === row.roleId);
    const currentRoleName = currentRole ? currentRole.name : 'Пользователь';

    const currentFaculty = faculties.find(f => f.id === row.facultyId);
    const currentFacultyName = currentFaculty ? currentFaculty.name : '—';

    const currentDepartment = departments.find(d => d.id === row.departmentId);
    const currentDepartmentName = currentDepartment ? currentDepartment.name : '—';

    const filteredDepartments = departments.filter(d => d.facultyId === row.facultyId);
    const isFacultySelectAllowed = row.roleId === 4 || row.roleId === 5;
    const isDepartmentSelectAllowed = isFacultySelectAllowed && row.roleId !== 4 && row.facultyId !== null;

    return (
        <React.Fragment>
            <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell align="center">
                    <IconButton size="small" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell align="center">{row.id}</TableCell>

                <TableCell align="left" sx={{ minWidth: 200, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {isEditing ? (
                        <TextField
                            value={row.fullName || ''}
                            size="small"
                            fullWidth
                            error={!!validationErrors.fullName}
                            helperText={validationErrors.fullName}
                            onChange={(e) => onCellChange(row.id, 'fullName', e.target.value)}
                        />
                    ) : (
                        row.fullName
                    )}
                </TableCell>

                <TableCell align="center">
                    {isEditing ? (
                        <TextField
                            value={row.login || ''}
                            size="small"
                            error={!!validationErrors.login}
                            helperText={validationErrors.login}
                            onChange={(e) => onCellChange(row.id, 'login', e.target.value)}
                        />
                    ) : (
                        row.login
                    )}
                </TableCell>

                <TableCell align="center" sx={{ minWidth: 160 }}>
                    {isEditing ? (
                        <Select
                            value={row.roleId || ''}
                            size="small"
                            fullWidth
                            onChange={(e) => onCellChange(row.id, 'roleId', Number(e.target.value))}
                        >
                            {roles.map(r => (
                                <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                            ))}
                        </Select>
                    ) : (
                        currentRoleName
                    )}
                </TableCell>

                <TableCell align="center">
                    {isEditing ? (
                        <Box display="flex" justifyContent="center" gap={1}>
                            <IconButton
                                onClick={() => onEditToggle(row.id)}
                                color="success"
                                size="small"
                                title="Сохранить изменения"
                            >
                                <SaveIcon />
                            </IconButton>

                            <IconButton
                                onClick={onCancelEdit}
                                color="error"
                                size="small"
                                title="Отменить редактирование"
                            >
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    ) : (
                        <IconButton
                            onClick={() => onEditToggle(row.id)}
                            color="primary"
                            size="small"
                            title="Редактировать пользователя"
                        >
                            <EditIcon />
                        </IconButton>
                    )}
                </TableCell>
                <TableCell align="center">
                    <IconButton
                        onClick={() => onDelete(row.id, row.roleName)}
                        color="error"
                        size="small"
                        disabled={isEditing}
                    >
                        <DeleteIcon />
                    </IconButton>
                </TableCell>
            </TableRow>

            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                    <Collapse in={open || isEditing} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2, padding: 2, bgcolor: '#fdfdfd', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                            <Typography variant="subtitle2" gutterBottom component="div" sx={{ color: '#0056b3', fontWeight: 'bold' }}>
                                Дополнительная информация о пользователе:
                            </Typography>

                            <Grid container spacing={3} alignItems="center" sx={{ mt: 0.5 }}>
                                {/* Email */}
                                <Grid item xs={12} md={4}>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>Email:</Typography>
                                    {isEditing ? (
                                        <TextField
                                            value={row.email || ''}
                                            size="small"
                                            fullWidth
                                            error={!!validationErrors.email}
                                            helperText={validationErrors.email}
                                            onChange={(e) => onCellChange(row.id, 'email', e.target.value)}
                                            sx={{ mt: 0.5 }}
                                        />
                                    ) : (
                                        <Typography variant="body2">{row.email || '—'}</Typography>
                                    )}
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>Факультет:</Typography>
                                    {isEditing ? (
                                        <Select
                                            value={row.facultyId || ''}
                                            size="small"
                                            fullWidth
                                            disabled={!isFacultySelectAllowed}
                                            onChange={(e) => onCellChange(row.id, 'facultyId', e.target.value ? Number(e.target.value) : null)}
                                            sx={{ mt: 0.5 }}
                                        >
                                            <MenuItem value=""><em>(нет)</em></MenuItem>
                                            {faculties.map(f => (
                                                <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                                            ))}
                                        </Select>
                                    ) : (
                                        <Typography variant="body2">{currentFacultyName}</Typography>
                                    )}
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>Кафедра:</Typography>
                                    {isEditing ? (
                                        <Select
                                            value={row.departmentId || ''}
                                            size="small"
                                            fullWidth
                                            disabled={!isDepartmentSelectAllowed}
                                            onChange={(e) => onCellChange(row.id, 'departmentId', e.target.value ? Number(e.target.value) : null)}
                                            sx={{ mt: 0.5 }}
                                        >
                                            <MenuItem value=""><em>(нет)</em></MenuItem>
                                            {filteredDepartments.map(d => (
                                                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                                            ))}
                                        </Select>
                                    ) : (
                                        <Typography variant="body2">
                                            {Number(row.roleId) === 4 ? '—' : currentDepartmentName}
                                        </Typography>
                                    )}
                                </Grid>
                            </Grid>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

export default AdminTableRow;