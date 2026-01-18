const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const auth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const { body, param, query } = require('express-validator');

router.post('/appointments', auth, requireRole('patient'), [
  body('doctor_id').isInt(),
  body('scheduled_at').isISO8601(),
  body('notes').optional().isString()
], appointmentController.create);

// allow authenticated users to list appointments; controller will scope results by role
router.get('/appointments', auth, [ query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 1000 }) ], appointmentController.list);
router.put('/appointments/:id/status', auth, [ param('id').isInt(), body('status').isIn(['scheduled','completed','cancelled']) ], appointmentController.updateStatus);
router.put('/appointments/:id/status', auth, [ param('id').isInt(), body('status').isIn(['scheduled','completed','cancelled']) ], appointmentController.updateStatus);
router.put('/appointments/:id', auth, [ param('id').isInt(), body('scheduled_at').optional().isISO8601(), body('doctor_id').optional().isInt(), body('patient_id').optional().isInt() ], appointmentController.update);

// PATCH for partial updates including soft-delete
router.patch('/appointments/:id', auth, [ param('id').isInt(), body('is_deleted').optional().isInt({ min: 0, max: 1 }), body('scheduled_at').optional().isISO8601(), body('doctor_id').optional().isInt(), body('patient_id').optional().isInt() ], appointmentController.update);

module.exports = router;
