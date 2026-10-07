import express from 'express';
import AuthRouter from './authRouter.js';
import AuthorRouter from './authorRouter.js';
import UserRouter from './userRouter.js';
import FacultyRouter from './facultyRouter.js';
import DepartmentRouter from './departmentRouter.js';
import TypeRouter from './typeRouter.js';
import Keywords from './keywordRouter.js';
import Specialities from './specialityRouter.js';
import UdcCodes from './udcRouter.js';
import Roles from './roleRouter.js';
import Materials from './materialRouter.js';
import AdminRouter from './adminRouter.js';
import { handleParserWebhookLog } from '../controllers/adminController.js';
import {ROLES} from '../config/roles.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/roleMiddleware.js';


const router = express.Router();

router.use("/auth", AuthRouter);
router.use("/authors", protect, restrictTo(...Object.values(ROLES)), AuthorRouter);
router.use('/users', protect, restrictTo(ROLES.ADMIN), UserRouter);
router.use('/faculties', protect, restrictTo(...Object.values(ROLES)), FacultyRouter);
router.use('/departments', protect, restrictTo(...Object.values(ROLES)), DepartmentRouter);
router.use('/types', TypeRouter);
router.use('/keywords', Keywords);
router.use('/specialties', Specialities);
router.use('/udc_codes', UdcCodes);
router.use('/roles', protect, restrictTo(ROLES.ADMIN), Roles);
router.use('/materials', Materials);

// Вебхук логов от парсера — без JWT (парсер не логинится)
router.post('/admin/parser/logs', handleParserWebhookLog);
router.use('/admin', protect, restrictTo(ROLES.ADMIN), AdminRouter);


export default router;
