const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('./config/database');
const paymentRoutes = require('./routes/payments');

const app = express();

connectDB();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use('/api/payments', paymentRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'M-Pesa Payment System API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/payments/health',
      initiatePayment: 'POST /api/payments/initiate',
      confirmPayment: 'POST /api/payments/confirm',
      getTransactions: 'GET /api/payments/transactions',
      getTransaction: 'GET /api/payments/transactions/:transactionId',
      refundPayment: 'POST /api/payments/refund',
      webhook: 'POST /api/payments/webhook',
    },
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

module.exports = app;
