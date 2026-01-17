const express = require('express');
const router = express.Router();
const clinicsController = require('../controllers/clinicsController');
const auth = require('../middlewares/authMiddleware');
const { body } = require('express-validator');

router.use(auth);

router.get('/clinics', clinicsController.listClinics);
router.get('/clinics/:id', clinicsController.getClinic);
router.put('/clinics/:id', [ body('name').optional().isString(), body('location').optional().isString(), body('description').optional().isString(), body('schedule').optional() ], clinicsController.updateClinic);

module.exports = router;
