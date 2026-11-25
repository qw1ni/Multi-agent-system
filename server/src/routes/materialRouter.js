import express from 'express';
import {
  getMaterial,
  getMaterialsWithPagination,
  updateMaterial,
  getMaterialStats,
  getRecentMaterials,
  searchMaterials,
  ragQuery,
  ragAnswer,
  ragIngest,
  ragStats,
  ragDocuments,
  getSimilarMaterials,
  getDepartmentMaterialsReport,
  exportDepartmentReportToExcel,
  exportDepartmentReportToWord,
} from '../controllers/materialController.js';
import { getCoverage } from '../controllers/coverageController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';
import { ROLES } from '../config/roles.js';

const router = express.Router();

router.get('/pag', protect, getMaterialsWithPagination);
router.get('/recent', getRecentMaterials);
router.get('/common_stats', getMaterialStats);
router.get('/report/by_department', protect, getDepartmentMaterialsReport);
router.get('/export_excel/by_department', protect, exportDepartmentReportToExcel);
router.get('/export_word/by_department', protect, exportDepartmentReportToWord);
router.post('/rag/query', protect, ragQuery);
router.post('/rag/answer', protect, ragAnswer);
router.post('/rag/ingest', protect, ragIngest);
router.get('/rag/stats', protect, ragStats);
router.get('/rag/documents', protect, ragDocuments);
router.get('/coverage', protect, getCoverage);
router.get('/:id', protect, getMaterial);
router.post('/search', searchMaterials);
router.post('/similarity', getSimilarMaterials);
router.put('/:id', updateMaterial);

export default router;