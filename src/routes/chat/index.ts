import express from 'express';
import { requireAuth } from '../../middlewares/auth.ts';
import { getMyConversations, openConversation, getMessages } from '../../controllers/chat/index.ts';

const chatRouter = express.Router();

chatRouter.use(requireAuth);

chatRouter.get('/conversations', getMyConversations);

chatRouter.post('/conversations', openConversation);

chatRouter.get('/conversations/:id/messages', getMessages);

export default chatRouter;
