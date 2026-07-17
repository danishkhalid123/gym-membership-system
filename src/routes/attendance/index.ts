import express from 'express';
import { addNewAttandance, checkoutAttendance, getAllAttendance,getParticularAttandance, updateAttandance } from '../../controllers/attendance/index.ts';

const attendanceRouter = express.Router();

attendanceRouter.get('/', getAllAttendance);

attendanceRouter.get('/:id', getParticularAttandance);

attendanceRouter.post('/', addNewAttandance);

attendanceRouter.put('/', updateAttandance);

attendanceRouter.put('/checkout', checkoutAttendance);

export default attendanceRouter;