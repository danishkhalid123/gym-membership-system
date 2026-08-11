import express from 'express';
import { getAllMembershipPlans, getParticularMembershipPlan, addNewMembershipPlan, updateParticularMembershipPlan, deleteMembershipPlan } from '../../controllers/membership-plans/index.ts';

const membershipPlansRouter = express.Router();

membershipPlansRouter.get('/', getAllMembershipPlans);

membershipPlansRouter.get('/:id', getParticularMembershipPlan);

membershipPlansRouter.post('/', addNewMembershipPlan);

membershipPlansRouter.put('/:id', updateParticularMembershipPlan);

membershipPlansRouter.delete('/:id', deleteMembershipPlan);


export default membershipPlansRouter;