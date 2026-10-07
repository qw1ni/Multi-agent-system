import express from 'express';
import { 
    getDepartment,
    getAllDepartments,
    getDepartmentsByFacultyId,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getDepartmentsMaterialsCount,
    getDepartmentDisciplinesReport,
    getDepartmentAuthorsActivity,
    exportDepartmentDisciplinesToExcel,
    exportDepartmentDisciplinesToWord
} from '../controllers/departmentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';
import { ROLES } from '../config/roles.js';

const router = express.Router();

router.get('/', getAllDepartments);
router.get('/byFacultyId/:id', getDepartmentsByFacultyId);
router.get('/report/disciplines', getDepartmentDisciplinesReport);
router.get('/report/department_activity', getDepartmentsMaterialsCount);
router.get('/report/department_authors_activity', getDepartmentAuthorsActivity);
router.get('/export_excel/disciplines', exportDepartmentDisciplinesToExcel);
router.get('/export_word/disciplines', exportDepartmentDisciplinesToWord);
router.get('/:id', getDepartment);
router.post('/', createDepartment);
router.patch('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);
export default router;
