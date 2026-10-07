import express from 'express';
import { 
  getAuthorById, 
  getAllAuthors, 
  createAuthor,
  updateAuthor, 
  deleteAuthor,
  getTopAuthors,
  searchAuthors,
  findByAuthor,
  exportTopAuthorsReportToExcel,
  exportAuthorReportToExcel,
  exportTopAuthorsReportToWord,
  exportAuthorReportToWord
} from '../controllers/authorController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getAllAuthors);
router.get('/search', protect, searchAuthors);
router.get('/:id', getAuthorById);
router.get('/report/top_authors', getTopAuthors);
router.get('/report/by_author', findByAuthor);
router.get('/export_excel/top_authors', protect, exportTopAuthorsReportToExcel);
router.get('/export_word/top_authors', protect, exportTopAuthorsReportToWord);
router.get('/export_excel/by_author', protect, exportAuthorReportToExcel);
router.get('/export_word/by_author', protect, exportAuthorReportToWord);
router.post('/', createAuthor);
router.patch('/:id', updateAuthor);
router.delete('/:id', deleteAuthor);
export default router;