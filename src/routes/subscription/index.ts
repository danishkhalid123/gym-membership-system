import express from 'express';
import { getAllSubscriptions, getParticularSubscription, addNewSubscription, updateParticularSubscription, deleteSubscription, upgradePreviewPlan,upgradeMembership } from '../../controllers/subscriptions/index.ts';

const subscriptionsRouter = express.Router();

subscriptionsRouter.get('/', getAllSubscriptions);

subscriptionsRouter.get('/:id', getParticularSubscription);

subscriptionsRouter.post('/', addNewSubscription);

subscriptionsRouter.put('/:id', updateParticularSubscription);

subscriptionsRouter.delete('/:id', deleteSubscription);

subscriptionsRouter.post('/upgrade-preview', upgradePreviewPlan);

subscriptionsRouter.post('/upgrade-membership', upgradeMembership);

export default subscriptionsRouter;