require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// logging
const morgan = require('morgan');
app.use(morgan('dev'));

// Routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const clinicsRoutes = require('./routes/clinicsRoutes');

// mount under versioned API base path
const API_BASE = process.env.API_BASE || '/api/v1';
app.use(API_BASE, authRoutes);
app.use(API_BASE, profileRoutes);
app.use(API_BASE, doctorRoutes);
app.use(API_BASE, tenantRoutes);
app.use(API_BASE, patientRoutes);
app.use(API_BASE, appointmentRoutes);
app.use(API_BASE, clinicsRoutes);

const PORT = process.env.PORT || 4000;

if (require.main === module) {
	(async () => {
		// Ensure clinics.description column exists when using MySQL
		try {
			const { pool } = require('./db');
			if (pool) {
				const [cols] = await pool.query("SHOW COLUMNS FROM clinics LIKE 'description'");
				if (!cols || cols.length === 0) {
					console.log('Adding missing `description` column to clinics table');
					try {
						await pool.query("ALTER TABLE clinics ADD COLUMN description TEXT NULL");
						console.log('`description` column added');
					} catch (e) {
						console.warn('Failed adding description column to clinics:', e && e.message ? e.message : e);
					}
				} else {
					// column exists
				}
			}
		} catch (e) {
			console.warn('Could not ensure clinics.description column:', e && e.message ? e.message : e);
		}

		app.listen(PORT, () => console.log(`healthQue backend running on port ${PORT} (base: ${API_BASE})`));
	})();
}

module.exports = app;
