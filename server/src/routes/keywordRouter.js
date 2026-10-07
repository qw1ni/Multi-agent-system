import express from 'express';
import { 
  getAllKeywords, 
  getKeywordById, 
  createKeyword, 
  updateKeyword, 
  deleteKeyword 
} from '../controllers/keywordController.js';

const router = express.Router();

router.get('/', getAllKeywords);
router.get('/:id', getKeywordById);
router.post('/', createKeyword);
router.put('/:id', updateKeyword);
router.delete('/:id', deleteKeyword);

export default router;