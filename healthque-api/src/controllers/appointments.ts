import { Response } from 'express';
import type { AuthRequest } from '../types/auth';
import pool from '../config/db';

interface BookAppointmentRequest {
  doctor_id: number;
  appointment_date: string;
  appointment_time: string;
  reason_for_visit?: string;
}

export const bookAppointment = async (req: AuthRequest, res: Response) => {
  const { doctor_id, appointment_date, appointment_time, reason_for_visit } = req.body;
  const patient_id = req.user!.id;

  if (!doctor_id || !appointment_date || !appointment_time) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    // Check if slot is available
    const [existing] = await pool.execute(
      `SELECT id FROM appointments 
       WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status != 'cancelled'`,
      [doctor_id, appointment_date, appointment_time]
    );

    if ((existing as any[]).length > 0) {
      return res.status(409).json({ success: false, error: 'Slot already booked' });
    }

    // Book appointment
    const [result] = await pool.execute(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, status, reason_for_visit)
       VALUES (?, ?, ?, ?, 'scheduled', ?)`,
      [patient_id, doctor_id, appointment_date, appointment_time, reason_for_visit || '']
    );

    res.json({
      success: true,
      data: { appointment_id: (result as any).insertId }
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ success: false, error: 'Booking failed' });
  }
};

export const getPatientAppointments = async (req: AuthRequest, res: Response) => {
  const patient_id = req.user!.id;

  try {
    const [appointments] = await pool.execute(
      `SELECT a.*, d.id as doctor_id, u.full_name as doctor_name, c.name as clinic_name
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users u ON d.user_id = u.id
       LEFT JOIN clinics c ON d.clinic_id = c.id
       WHERE a.patient_id = ? 
       ORDER BY a.appointment_date DESC, a.appointment_time DESC
       LIMIT 50`,
      [patient_id]
    );

    res.json({
      success: true,
      data: appointments
    });
  } catch (error) {
    console.error('Appointments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
  }
};

export const cancelAppointment = async (req: AuthRequest, res: Response) => {
  const appointment_id = parseInt(req.params.id);
  const patient_id = req.user!.id;

  try {
    const [result] = await pool.execute(
      `UPDATE appointments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP() 
       WHERE id = ? AND patient_id = ?`,
      [appointment_id, patient_id]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ success: false, error: 'Cancellation failed' });
  }
};
