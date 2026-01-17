const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const auth = require('../middlewares/authMiddleware');
const requireRole = require('../middlewares/requireRole');
const { body, param, query } = require('express-validator');

router.post('/patients', auth, [
  body('name').isString().isLength({ min: 2 }),
  body('dob').optional().isISO8601(),
  body('contact').optional().isObject(),
  body('medical_history').optional().isObject()
], patientController.create);

// allow admins and doctors to list patients
router.get('/patients', auth, requireRole(['admin','doctor']), [ query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 1000 }) ], patientController.list);
router.get('/patients/:id', auth, [ param('id').isInt() ], patientController.get);
router.put('/patients/:id', auth, [ param('id').isInt(), body('name').optional().isString() ], patientController.update);

module.exports = router;
