import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { updateSettingsSchema } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', settingsController.get);
router.put('/', validate(updateSettingsSchema), settingsController.update);

export default router;

