const mongoose = require('mongoose');

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const MONGO_SERVER_SELECTION_TIMEOUT_MS = toNumber(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 15000);
const MONGO_SOCKET_TIMEOUT_MS = toNumber(process.env.MONGO_SOCKET_TIMEOUT_MS, 45000);
const MONGO_HEARTBEAT_FREQUENCY_MS = toNumber(process.env.MONGO_HEARTBEAT_FREQUENCY_MS, 10000);
const MONGO_MAX_POOL_SIZE = toNumber(process.env.MONGO_MAX_POOL_SIZE, 20);
const MONGO_MIN_POOL_SIZE = toNumber(process.env.MONGO_MIN_POOL_SIZE, 2);

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in environment variables');
  }

  mongoose.set('strictQuery', true);

  const connection = await mongoose.connect(mongoUri, {
    autoIndex: true,
    serverSelectionTimeoutMS: MONGO_SERVER_SELECTION_TIMEOUT_MS,
    socketTimeoutMS: MONGO_SOCKET_TIMEOUT_MS,
    heartbeatFrequencyMS: MONGO_HEARTBEAT_FREQUENCY_MS,
    maxPoolSize: MONGO_MAX_POOL_SIZE,
    minPoolSize: MONGO_MIN_POOL_SIZE
  });

  console.log(
    `MongoDB connected: ${connection.connection.host} (db=${connection.connection.name}, pool=${MONGO_MIN_POOL_SIZE}-${MONGO_MAX_POOL_SIZE})`
  );
  return connection;
};

mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected (possible network blip, Atlas pause, or app restart)');
});

const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

module.exports = {
  connectDB,
  closeDB
};