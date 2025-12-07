import { Router } from 'express';
import { bookAppointment, getPatientAppointments, cancelAppointment } from '../controllers/appointments';
import { authenticateToken } from '../middleware/auth';
const router = Router();

router.post('/appointments', authenticateToken, bookAppointment);      // PROTECTED
router.get('/appointments', authenticateToken, getPatientAppointments); // PROTECTED
router.delete('/appointments/:id', authenticateToken, cancelAppointment); // PROTECTED

export default router;
