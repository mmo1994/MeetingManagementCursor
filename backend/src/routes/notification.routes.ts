import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', notificationController.list);
router.get('/unread-count', notificationController.getUnreadCount);
router.post('/mark-all-read', notificationController.markAllAsRead);
router.post('/:id/read', notificationController.markAsRead);

export default router;

