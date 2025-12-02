import { Router } from 'express';
import { calendarController } from '../controllers/calendar.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', calendarController.getEvents);
router.post('/sync', calendarController.sync);

export default router;

