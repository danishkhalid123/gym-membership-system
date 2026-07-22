import express from 'express';
import { getAllUsers, getParticularUser, addNewUser, updateParticularUser, deleteUser } from '../../controllers/users/index.ts';

const usersRouter = express.Router();

usersRouter.get('/', getAllUsers);

usersRouter.get('/:id', getParticularUser);

usersRouter.post('/', addNewUser);

usersRouter.put('/:id', updateParticularUser);

usersRouter.delete('/:id', deleteUser);


export default usersRouter;