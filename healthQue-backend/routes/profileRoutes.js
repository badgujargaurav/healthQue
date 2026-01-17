const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const auth = require('../middlewares/authMiddleware');
const { body } = require('express-validator');

router.get('/profile', auth, profileController.getProfile);
router.put('/profile', auth, [
	body('name').optional().isString().isLength({ min: 2 }),
	body('phone').optional().isString().isLength({ min: 6 }),
	body('website').optional().isString(),
	body('company').optional().isObject(),
	body('specialty').optional().isString(),
	body('clinic_address').optional().isString(),
	body('clinic_name').optional().isString().isLength({ min: 1 })
], profileController.updateProfile);

router.put('/profile/password', auth, [
	body('newPassword').isLength({ min: 6 })
], profileController.changePassword);

module.exports = router;
