import { Router } from 'express';
import { getDoctors, getDoctorAvailability } from '../controllers/doctors';

const router = Router();

router.get('/doctors', getDoctors);
router.get('/doctors/:id/availability', getDoctorAvailability);

export default router;
