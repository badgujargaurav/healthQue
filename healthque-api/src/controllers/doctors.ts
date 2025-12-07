import { Request, Response } from 'express';
import pool from '../config/db';

export const getDoctors = async (req: Request, res: Response) => {
  try {
    const [doctors] = await pool.execute(`
      SELECT d.id, d.specialty, u.full_name as name, c.name as clinic_name, d.consultation_duration_minutes
      FROM doctors d 
      JOIN users u ON d.user_id = u.id 
      LEFT JOIN clinics c ON d.clinic_id = c.id 
      WHERE u.role = 'doctor' AND d.is_available = TRUE
    `);
    
    res.json({
      success: true,
      data: doctors
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

export const getDoctorAvailability = async (req: Request, res: Response) => {
  const { doctorId, date } = req.query;
  
  try {
    const [slots] = await pool.execute(`
      SELECT 
        DATE(?) as date,
        SEC_TO_TIME(TIME_TO_SEC(da.start_time) + INTERVAL 30 MINUTE * slot_num) as slot_time,
        CASE WHEN a.id IS NULL THEN TRUE ELSE FALSE END as available
      FROM doctor_availability da
      CROSS JOIN (SELECT 0 slot_num UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 
                  UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10) slots
      LEFT JOIN appointments a ON a.doctor_id = ? 
        AND a.appointment_date = DATE(?) 
        AND a.appointment_time = SEC_TO_TIME(TIME_TO_SEC(da.start_time) + INTERVAL 30 MINUTE * slots.slot_num)
        AND a.status != 'cancelled'
      WHERE da.doctor_id = ? AND da.day_of_week = DAYOFWEEK(?) - 1 AND da.is_active = TRUE
        AND TIME_TO_SEC(da.start_time) + INTERVAL 30 MINUTE * slots.slot_num < TIME_TO_SEC(da.end_time)
      ORDER BY slot_time
      LIMIT 20
    `, [date, doctorId, date, doctorId, date]);
    
    res.json({
      success: true,
      data: slots
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
