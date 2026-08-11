import express from 'express';
import { addNewDiscount, deleteDiscount, getAllDiscounts, getParticularDiscount, updateParticularDiscount, updateDiscountStatus, validateDiscountCode } from '../../controllers/discount/index.ts';

const discountRouter = express.Router();

discountRouter.get('/', getAllDiscounts);

discountRouter.get('/:id', getParticularDiscount);

discountRouter.post('/', addNewDiscount);

discountRouter.put('/:id', updateParticularDiscount);

discountRouter.patch('/:id/status', updateDiscountStatus);

discountRouter.delete('/:id', deleteDiscount);

discountRouter.post('/validate', validateDiscountCode);

export default discountRouter;