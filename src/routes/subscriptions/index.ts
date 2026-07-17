import express from 'express';
import { getAllSubscriptions, getParticularSubscription, addNewSubscription, updateParticularSubscription, deleteSubscription } from '../../controllers/subscriptions/index.ts';

const subscriptionsRouter = express.Router();

subscriptionsRouter.get('/', getAllSubscriptions);

subscriptionsRouter.get('/:id', getParticularSubscription);

subscriptionsRouter.post('/', addNewSubscription);

subscriptionsRouter.put('/:id', updateParticularSubscription);

subscriptionsRouter.delete('/:id', deleteSubscription);


export default subscriptionsRouter;