import { Router } from 'express';
import { meetingController } from '../controllers/meeting.controller';
import { authMiddleware } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { 
  createMeetingSchema, 
  updateMeetingSchema, 
  updateMeetingTimeSchema,
  inviteParticipantsSchema 
} from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Meeting CRUD
router.get('/', meetingController.list);
router.post('/', validate(createMeetingSchema), meetingController.create);
router.get('/:id', meetingController.getById);
router.put('/:id', validate(updateMeetingSchema), meetingController.update);
router.delete('/:id', meetingController.delete);

// Meeting time update (for drag-and-drop)
router.put('/:id/time', validate(updateMeetingTimeSchema), meetingController.updateTime);

// Meeting actions
router.post('/:id/cancel', meetingController.cancel);
router.post('/:id/invite', validate(inviteParticipantsSchema), meetingController.invite);
router.post('/:id/respond', meetingController.respond);

export default router;

