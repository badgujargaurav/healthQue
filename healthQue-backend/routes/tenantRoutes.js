const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');

router.post('/register', tenantController.validate(), tenantController.register);

module.exports = router;
