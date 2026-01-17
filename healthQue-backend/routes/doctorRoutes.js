const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { query, body, param } = require('express-validator');
const auth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');

router.get('/doctors', auth, requireRole('admin'), [
  query('sortBy').optional().isIn(['id', 'name', 'specialty', 'location', 'email']),
  query('sortDir').optional().isIn(['asc', 'desc']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 })
], doctorController.list);

// Example protected route: create a doctor (requires authenticated doctor role)
router.post('/doctors', auth, requireRole('doctor'), [
  body('name').isLength({ min: 2 }),
  body('email').isEmail(),
  body('specialty').optional().isString(),
  body('location').optional().isString(),
  body('phone').optional().isString()
], doctorController.create);

// Admin: create doctor on behalf of a tenant
router.post('/admin/doctors', auth, requireRole('admin'), [
  body('name').isLength({ min: 2 }),
  body('email').isEmail(),
  body('password').optional().isLength({ min: 6 }),
  body('specialty').optional().isString(),
  body('location').optional().isString(),
  body('phone').optional().isString()
], doctorController.createByAdmin);

router.get('/doctors/:id', auth, requireRole('admin'), [
  param('id').isInt({ min: 1 })
], doctorController.getById);

// admin actions: enable/disable doctor and set trial expiration
router.patch('/doctors/:id/active', auth, requireRole('admin'), [
  param('id').isInt({ min: 1 })
], doctorController.setActive);

router.patch('/doctors/:id/trial', auth, requireRole('admin'), [
  param('id').isInt({ min: 1 }),
  body('trial_expires_at').optional().isISO8601()
], doctorController.setTrial);

// delete doctor (admin only)
router.delete('/doctors/:id', auth, requireRole('admin'), [
  param('id').isInt({ min: 1 })
], doctorController.delete);

// Off-days: allow doctors themselves or admins to manage off-days
router.get('/doctors/:id/offdays', auth, [
  param('id').isInt({ min: 1 }),
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('type').optional().isIn(['scheduled','emergency'])
], doctorController.getOffDays);

router.post('/doctors/:id/offdays', auth, [
  param('id').isInt({ min: 1 }),
  body('start_date').exists(),
  body('end_date').optional(),
  body('is_recurring_weekly').optional().isBoolean(),
  body('day_of_week').optional().isInt({ min: 0, max: 6 }),
  body('type').optional().isIn(['scheduled','emergency'])
], doctorController.addOffDay);

// Set/unset by date (creates one-day off or unsets by date)
router.patch('/doctors/:id/offdays', auth, [
  param('id').isInt({ min: 1 }),
  body('date').exists().isISO8601(),
  body('action').optional().isIn(['set','unset']),
  body('type').optional().isIn(['scheduled','emergency'])
], doctorController.setOffDayByDate);

router.delete('/doctors/offdays/:id', auth, [
  param('id').isInt({ min: 1 })
], doctorController.deleteOffDay);

// PATCH to toggle or set status of an off-day (off / working)
router.patch('/doctors/offdays/:id', auth, [
  param('id').isInt({ min: 1 }),
  body('status').optional().isIn(['off','working'])
], doctorController.toggleOffDayStatus);

module.exports = router;
