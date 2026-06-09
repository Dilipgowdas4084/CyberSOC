import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { authRouter } from './routes/auth';
import { devicesRouter } from './routes/devices';
import { threatsRouter } from './routes/threats';
import { alertsRouter } from './routes/alerts';
import { packetsRouter } from './routes/packets';
import { vulnerabilitiesRouter } from './routes/vulnerabilities';
import { incidentsRouter } from './routes/incidents';
import { logsRouter } from './routes/logs';
import { dashboardRouter } from './routes/dashboard';
import { reportsRouter } from './routes/reports';
import { setupSocketHandlers } from './socket/handlers';
import { startSimulationEngine } from './services/simulationEngine';

const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please slow down.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth', authLimiter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/threats', threatsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/packets', packetsRouter);
app.use('/api/vulnerabilities', vulnerabilitiesRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'CyberSOC API' });
});

// 404 handler
app.use((_, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Setup socket handlers
setupSocketHandlers(io);

// Start simulation engine (generates realistic mock data)
startSimulationEngine(io);

const PORT = parseInt(process.env.PORT || '4000');
httpServer.listen(PORT, () => {
  console.log(`\n🛡️  CyberSOC Backend running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO ready`);
  console.log(`📊 Simulation engine started\n`);
});
