import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import type { AuthRequest } from '../types/auth';

interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: 'patient' | 'doctor' | 'receptionist' | 'admin';
}

export const register = async (req: AuthRequest, res: Response) => {
  const { email, password, full_name, phone, role } = req.body as RegisterRequest;

  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    // Check if user exists
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if ((existing as any[]).length > 0) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?)',
      [email, password_hash, full_name, phone, role]
    );

    // FIXED: Use result[0].insertId
    const userId = (result as any)[0].insertId;

    // For doctors, create doctor record
    if (role === 'doctor') {
      await pool.execute(
        'INSERT INTO doctors (user_id) VALUES (?)',
        [userId]
      );
    }

    res.json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  try {
    // Find user
    const [users] = await pool.execute('SELECT * FROM users WHERE email = ? AND is_active = TRUE', [email]);
    const user = (users as any[])[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};
