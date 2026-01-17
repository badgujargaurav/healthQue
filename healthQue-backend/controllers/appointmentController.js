const appointmentModel = require('../models/appointmentModel');
const { validationResult } = require('express-validator');

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });
  // patient creates an appointment on their own behalf
  const patientId = req.user?.userId;
  if (!patientId) return res.status(400).json({ error: 'Missing patient context' });
  const { doctor_id, scheduled_at, notes } = req.body;
  try {
    // validate doctor exists (optional)
    const doctorModel = require('../models/doctorModel');
    const doctor = await doctorModel.getDoctorById(doctor_id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    const appt = await appointmentModel.createAppointment({ tenantId, patientId: patientId, doctorId: doctor_id, scheduledAt: scheduled_at, notes });
    res.status(201).json({ data: appt });
  } catch (e) {
    console.error('create appointment error', e);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
};

exports.list = async (req, res) => {
  const tenantId = req.user?.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'Missing tenant context' });

  const role = req.user?.role;
  const userId = req.user?.userId;

  if (!['admin', 'doctor', 'patient'].includes(role)) return res.status(403).json({ error: 'Forbidden' });

  // Accept query params but enforce scoping based on authenticated role
  let { doctorId, patientId, page = 1, limit = 50 } = req.query;

  if (role === 'doctor') {
    doctorId = userId;
  } else if (role === 'patient') {
    patientId = userId;
  }

  // normalize numeric ids
  const dId = doctorId ? Number(doctorId) : undefined;
  const pId = patientId ? Number(patientId) : undefined;
  const p = Number(page) || 1;
  const l = Number(limit) || 50;

  try {
    const result = await appointmentModel.listAppointments({ tenantId, doctorId: dId, patientId: pId, page: p, limit: l });
    res.json({ data: result.data, meta: { total: result.total, page: Number(p), limit: Number(l) } });
  } catch (e) {
    console.error('list appointments error', e);
    res.status(500).json({ error: 'Failed to list appointments' });
  }
};

exports.updateStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const id = req.params.id;
  const { status } = req.body;
  try {
    const updated = await appointmentModel.updateAppointmentStatus(id, status);
    res.json({ data: updated });
  } catch (e) {
    console.error('update appointment error', e);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
};

exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const id = req.params.id;
  const { scheduled_at, doctor_id, patient_id } = req.body;
  try {
    const updated = await appointmentModel.updateAppointmentById(id, { scheduled_at, doctor_id, patient_id });
    res.json({ data: updated });
  } catch (e) {
    console.error('update appointment error', e);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
};
