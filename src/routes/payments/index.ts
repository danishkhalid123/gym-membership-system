import express from 'express';
import { createCheckoutSession, confirmPayment, createUpgradeCheckoutSession, confirmUpgrade } from '../../controllers/payments/index.ts';

const paymentsRouter = express.Router();

paymentsRouter.post('/create-checkout-session', createCheckoutSession);

paymentsRouter.post('/confirm', confirmPayment);

paymentsRouter.post('/upgrade-checkout-session', createUpgradeCheckoutSession);

paymentsRouter.post('/confirm-upgrade', confirmUpgrade);

export default paymentsRouter;