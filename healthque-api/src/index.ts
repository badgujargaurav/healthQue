import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import doctorsRouter from './routes/doctors';
import appointmentsRouter from './routes/appointments';
import authRouter from './routes/auth';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use('/api', authRouter);
app.use('/api', doctorsRouter);
app.use('/api', appointmentsRouter);

app.listen(PORT, () => {
  console.log(`HealthQue API running on port ${PORT}`);
});
