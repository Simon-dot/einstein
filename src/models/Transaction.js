const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    accountReference: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    checkoutRequestID: {
      type: String,
      unique: true,
      sparse: true,
    },
    merchantRequestID: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    resultCode: {
      type: String,
    },
    resultDesc: {
      type: String,
    },
    mpesaReceiptNumber: {
      type: String,
    },
    transactionDate: {
      type: Date,
    },
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundStatus: {
      type: String,
      enum: [null, 'pending', 'completed', 'failed'],
      default: null,
    },
    metadata: {
      type: Object,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
