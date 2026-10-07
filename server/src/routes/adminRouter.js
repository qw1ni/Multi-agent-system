import express from 'express';
import { 
    downloadBackup, 
    runParser,
    downloadLibraryFiles,
    getDownloadSections,
} from '../controllers/adminController.js';

const router = express.Router();

router.post('/backup', downloadBackup);
router.post('/run_parser', runParser);
router.get('/download_sections', getDownloadSections);
router.post('/download_files', downloadLibraryFiles);

export default router;
