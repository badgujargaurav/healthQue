const express = require('express');
const router = express.Router();
const clinicsController = require('../controllers/clinicsController');
const auth = require('../middlewares/authMiddleware');
const { body } = require('express-validator');

router.use(auth);

router.get('/clinics', clinicsController.listClinics);
router.get('/clinics/:id', clinicsController.getClinic);
router.put('/clinics/:id', [ body('name').optional().isString(), body('location').optional().isString(), body('description').optional().isString(), body('schedule').optional() ], clinicsController.updateClinic);

// support PATCH for partial updates and soft-delete flag
router.patch('/clinics/:id', [ body('is_deleted').optional().isInt({ min: 0, max: 1 }), body('name').optional().isString(), body('location').optional().isString(), body('description').optional().isString(), body('schedule').optional() ], clinicsController.updateClinic);

module.exports = router;
