import express from 'express';
import { profile } from '../../controllers/profile/index.ts';

const profileRouter = express.Router();

profileRouter.get('/profile', profile);

export default profileRouter;