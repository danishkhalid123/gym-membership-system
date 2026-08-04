import express from 'express';
import { createCheckoutSession, confirmPayment } from '../../controllers/payments/index.ts';

const paymentsRouter = express.Router();

paymentsRouter.post('/create-checkout-session', createCheckoutSession);

paymentsRouter.post('/confirm', confirmPayment);

export default paymentsRouter;