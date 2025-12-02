import { Router } from 'express';
import { pushController } from '../controllers/push.controller';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { pushSubscriptionSchema } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/public-key', pushController.getPublicKey);
router.post('/subscribe', validate(pushSubscriptionSchema), pushController.subscribe);
router.post('/unsubscribe', pushController.unsubscribe);

export default router;

