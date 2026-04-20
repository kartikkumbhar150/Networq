import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from './utils/passport';
import mongoose from 'mongoose';
import dns from 'dns';
import authRoutes from './routes/auth';
import opportunitiesRoutes from './routes/opportunities';
import eventsRoutes from './routes/events';
import registrationsRoutes from './routes/registrations';
import profileRoutes from './routes/profile';
import feedRoutes from './routes/feed';
import connectionRoutes from './routes/connections';
import usersRoutes from './routes/users';
import chatRoutes from './routes/chat';
import rewardsRoutes from './routes/rewards';
import investmentRoutes from './routes/investment';
import adminInvestmentRoutes from './routes/adminInvestment';
import aiRoutes from './routes/ai';
import dashboardRoutes from './routes/dashboard';
import { initDatabase } from './db/init';
import { initScheduler } from './utils/scheduler';
import http from 'http';
import { WebSocketServer } from 'ws';
import { initChatWebSockets } from './ws/chat-ws';
import { flushAllCache } from './utils/redisClient';

// Fix for Nodemailer ENETUNREACH (forces IPv4 instead of failing on IPv6)
dns.setDefaultResultOrder('ipv4first');


const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '25mb' })); // allow base64 face + profile photos
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// ─── Auto-Cache Invalidation ─────────────────────────────────────────────────
app.use((req, res, next) => {
  res.on('finish', () => {
    // Whenever a mutation concludes successfully, wipe the global cache
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
      flushAllCache().catch(err => console.error('[Redis] Background flush error:', err));
    }
  });
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/registrations', registrationsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/investment', investmentRoutes);
app.use('/api/admin', adminInvestmentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'HireX Express Backend', timestamp: new Date() });
});

// ─── MongoDB Connection & Init ───────────────────────────────────────────────
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('[db]: MongoDB connected');
    await initDatabase(); // Creates collections and indexes automatically
  } catch (err) {
    console.error('[db]: MongoDB connection error', err);
    process.exit(1);
  }
}

// ─── Start Server ─────────────────────────────────────────────────────────────
connectDB().then(async () => {
  await initScheduler(); // Re-schedule pending event settlements
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  initChatWebSockets(wss);

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[server]: Port ${PORT} is already in use. Kill the old process and restart.`);
      process.exit(1);
    } else {
      throw err;
    }
  });

  server.listen(PORT, () => {
    console.log(`[server]: HireX backend running at http://localhost:${PORT}`);
    console.log(`[ws]: WebSocket chat server securely mounted`);
  });

  // Graceful shutdown — force-close all connections so the port is released
  // immediately when nodemon restarts (avoids EADDRINUSE on hot-reload)
  const shutdown = (signal: string) => {
    console.log(`[server]: ${signal} received — shutting down...`);
    // Destroy all active connections immediately (important for WebSockets)
    wss.clients.forEach(client => client.terminate());
    server.closeAllConnections?.(); // Node 18.2+ — force kill keep-alive sockets
    server.close(() => {
      mongoose.connection.close().then(() => {
        console.log('[server]: Clean exit.');
        process.exit(0);
      });
    });
    // Hard kill after 3s as absolute fallback
    setTimeout(() => process.exit(1), 3000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
});
