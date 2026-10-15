import express from 'express';
import { 
    downloadBackup, 
    runParser,
    stopParser,
    getParserStatus,
    downloadLibraryFiles,
    stopLibraryDownload,
    getDownloadSections,
    agentChat,
    getConverterStatus,
    startConverter,
    stopConverter,
} from '../controllers/adminController.js';

const router = express.Router();

router.post('/backup', downloadBackup);
router.post('/run_parser', runParser);
router.post('/stop_parser', stopParser);
router.get('/parser_status', getParserStatus);
router.get('/download_sections', getDownloadSections);
router.post('/download_files', downloadLibraryFiles);
router.post('/download_stop', stopLibraryDownload);
router.post('/agent/chat', agentChat);
router.get('/converter/status', getConverterStatus);
router.post('/converter/start', startConverter);
router.post('/converter/stop', stopConverter);

export default router;
