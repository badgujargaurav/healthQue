const { validationResult } = require('express-validator');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map(e => ({ field: e.param, msg: e.msg })) });
  }
  return null;
}

module.exports = { handleValidation };
