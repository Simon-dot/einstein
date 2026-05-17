const express = require('express');
const { body, validationResult } = require('express-validator');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

router.get('/health', paymentController.health);

router.post(
  '/initiate',
  [
    body('phoneNumber').notEmpty().withMessage('Phone number is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('accountReference').notEmpty().withMessage('Account reference is required'),
  ],
  validateRequest,
  paymentController.initiatePayment
);

router.post(
  '/confirm',
  [
    body('checkoutRequestID').notEmpty().withMessage('checkoutRequestID is required'),
  ],
  validateRequest,
  paymentController.confirmPayment
);

router.get('/transactions', paymentController.getTransactions);

router.get('/transactions/:transactionId', paymentController.getTransaction);

router.post(
  '/refund',
  [
    body('transactionId').notEmpty().withMessage('transactionId is required'),
    body('refundAmount').isNumeric().withMessage('refundAmount must be a number'),
  ],
  validateRequest,
  paymentController.refundPayment
);

router.post('/webhook', paymentController.handleCallback);

module.exports = router;
