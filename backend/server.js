const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { connectDB } = require('./config/db');

const elderRoutes = require('./routes/elder.routes');
const callRoutes = require('./routes/call.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const webhookRoutes = require('./routes/webhook.routes');
const authRoutes = require('./routes/auth.routes');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const MONGO_CONNECT_MAX_RETRIES = Number(process.env.MONGO_CONNECT_MAX_RETRIES || 5);
const MONGO_CONNECT_RETRY_DELAY_MS = Number(process.env.MONGO_CONNECT_RETRY_DELAY_MS || 3000);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  })
);

app.use(
  express.json({
    limit: process.env.JSON_BODY_LIMIT || '15mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    }
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/elders', elderRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/webhook', webhookRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error'
  });
});

const startServer = async () => {
  let connected = false;
  let lastError = null;

  for (let attempt = 1; attempt <= MONGO_CONNECT_MAX_RETRIES; attempt += 1) {
    try {
      await connectDB();
      connected = true;
      break;
    } catch (error) {
      lastError = error;
      const retrying = attempt < MONGO_CONNECT_MAX_RETRIES;
      console.error(
        `MongoDB connect attempt ${attempt}/${MONGO_CONNECT_MAX_RETRIES} failed: ${error?.message || error}`
      );
      if (retrying) {
        await new Promise((resolve) => setTimeout(resolve, MONGO_CONNECT_RETRY_DELAY_MS));
      }
    }
  }

  if (!connected) {
    throw lastError || new Error('MongoDB connection failed after retries');
  }

  app.listen(PORT, () => {
    console.log(`Sathi backend running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;