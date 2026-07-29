import express from 'express';
import { addNewMachine, deleteMachine, getAllMachines, getParticularMachine, updateParticularMachine } from '../../controllers/machine/index.ts';

const machineRouter = express.Router();

machineRouter.get('/', getAllMachines);

machineRouter.get('/:id', getParticularMachine);

machineRouter.post('/', addNewMachine);

machineRouter.put('/:id', updateParticularMachine);

machineRouter.delete('/:id', deleteMachine);

export default machineRouter;