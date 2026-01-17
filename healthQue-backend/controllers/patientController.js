const patientModel = require('../models/patientModel');
const { validationResult } = require('express-validator');

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });
  const { name, dob, contact, medical_history } = req.body;
  try {
    const p = await patientModel.createPatient({ tenantId, name, dob, contact, medical_history });
    res.status(201).json({ data: p });
  } catch (e) {
    console.error('create patient error', e);
    res.status(500).json({ error: 'Failed to create patient' });
  }
};

exports.get = async (req, res) => {
  const id = req.params.id;
  try {
    const p = await patientModel.getPatientById(id);
    if (!p) return res.status(404).json({ error: 'Not found' });
    res.json({ data: p });
  } catch (e) {
    console.error('get patient error', e);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
};

exports.list = async (req, res) => {
  const tenantId = req.user?.tenantId;
  const { filter, page = 1, limit = 50 } = req.query;
  try {
    const result = await patientModel.listPatients({ tenantId, filter, page, limit });
    res.json({ data: result.data, meta: { total: result.total, page: Number(page), limit: Number(limit) } });
  } catch (e) {
    console.error('list patients error', e);
    res.status(500).json({ error: 'Failed to list patients' });
  }
};

exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const id = req.params.id;
  try {
    const updated = await patientModel.updatePatientById(id, req.body);
    res.json({ data: updated });
  } catch (e) {
    console.error('update patient error', e);
    res.status(500).json({ error: 'Failed to update patient' });
  }
};
