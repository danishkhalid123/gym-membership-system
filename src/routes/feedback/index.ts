import express from 'express';
import { requireAuth } from '../../middlewares/auth.ts';
import {
    addNewFeedback,
    deleteFeedback,
    getAllFeedback,
    getFeedbackSummary,
    getMyFeedback,
    getParticularFeedback,
    replyToFeedback,
    updateFeedbackStatus,
    updateParticularFeedback,
} from '../../controllers/feedback/index.ts';

const feedbackRouter = express.Router();

feedbackRouter.use(requireAuth);

feedbackRouter.get('/summary', getFeedbackSummary);

feedbackRouter.get('/mine', getMyFeedback);

feedbackRouter.get('/', getAllFeedback);

feedbackRouter.get('/:id', getParticularFeedback);

feedbackRouter.post('/', addNewFeedback);

feedbackRouter.put('/:id', updateParticularFeedback);

feedbackRouter.patch('/:id/status', updateFeedbackStatus);

feedbackRouter.patch('/:id/reply', replyToFeedback);

feedbackRouter.delete('/:id', deleteFeedback);

export default feedbackRouter;