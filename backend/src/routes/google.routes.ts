import { Router } from 'express';
import { googleController } from '../controllers/google.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Callback doesn't require auth (state contains user info)
router.get('/callback', googleController.callback);

// Protected routes
router.get('/connect-url', authMiddleware, googleController.getConnectUrl);
router.post('/disconnect', authMiddleware, googleController.disconnect);
router.get('/status', authMiddleware, googleController.getStatus);

export default router;

