import express from 'express';
import {
  getAllSpecialities,
  getSpecialityByCode,
  createSpeciality,
  updateSpeciality,
  deleteSpeciality,
  getSpecialityReportByYear,
  getSpecialtyReport,
  getWithMaterials,
  getSpecialtyDisciplinesWithMaterialsReport,
  exportSpecialtyDepartmentWithMaterialsReportToExcel,
  exportSpecialtyMaterialsReportToExcel,
  exportSpecialtyMaterialsReportToWord,
  exportSpecialtyDepartmentWithMaterialsReportToWord
} from '../controllers/specialityController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';
import { ROLES } from '../config/roles.js';

const router = express.Router();

router.get('/', getAllSpecialities);
router.get('/with_materials', getWithMaterials);
router.get('/:code', getSpecialityByCode);
router.get('/report/specialities_by_year', getSpecialityReportByYear);
router.get('/report/by_specialty', protect, getSpecialtyReport);
router.get('/export_excel/by_specialty', protect, exportSpecialtyMaterialsReportToExcel);
router.get('/export_word/by_specialty', protect, exportSpecialtyMaterialsReportToWord);
router.get('/report/disciplines_with_materials', protect, getSpecialtyDisciplinesWithMaterialsReport)
router.get('/export_excel/disciplines_with_materials', protect, exportSpecialtyDepartmentWithMaterialsReportToExcel)
router.get('/export_word/disciplines_with_materials', protect, exportSpecialtyDepartmentWithMaterialsReportToWord)
router.post('/', createSpeciality);
router.put('/:code', updateSpeciality);
router.delete('/:code', deleteSpeciality);

export default router;