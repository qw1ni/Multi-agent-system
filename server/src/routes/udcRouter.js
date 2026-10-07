import express from 'express';
import { 
  getAllUdc, 
  getUdcByCode, 
  createUdc, 
  updateUdc, 
  deleteUdc 
} from '../controllers/udcController.js';

const router = express.Router();

router.get('/', getAllUdc);
router.get('/:code', getUdcByCode);
router.post('/', createUdc);
router.put('/:code', updateUdc);
router.delete('/:code', deleteUdc);

export default router;