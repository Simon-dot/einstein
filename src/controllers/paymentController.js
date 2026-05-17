const Transaction = require('../models/Transaction');
const mpesaClient = require('../config/mpesa');

exports.initiatePayment = async (req, res) => {
  try {
    const { phoneNumber, amount, accountReference, description } = req.body;

    if (!phoneNumber || !amount || !accountReference) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: phoneNumber, amount, accountReference',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    const transaction = new Transaction({
      phoneNumber,
      amount,
      accountReference,
      description: description || 'Payment',
      status: 'pending',
    });

    const mpesaResponse = await mpesaClient.initiatePayment(
      phoneNumber,
      amount,
      accountReference,
      description || 'Payment'
    );

    transaction.checkoutRequestID = mpesaResponse.CheckoutRequestID;
    transaction.merchantRequestID = mpesaResponse.MerchantRequestID;

    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        transactionId: transaction._id,
        checkoutRequestID: mpesaResponse.CheckoutRequestID,
        merchantRequestID: mpesaResponse.MerchantRequestID,
        responseCode: mpesaResponse.ResponseCode,
        responseDescription: mpesaResponse.ResponseDescription,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.confirmPayment = async (req, res) => {
  try {
    const { checkoutRequestID } = req.body;

    if (!checkoutRequestID) {
      return res.status(400).json({
        success: false,
        message: 'checkoutRequestID is required',
      });
    }

    const queryResponse = await mpesaClient.queryTransaction(checkoutRequestID);

    const transaction = await Transaction.findOne({ checkoutRequestID });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    if (queryResponse.ResultCode === '0') {
      transaction.status = 'completed';
      transaction.resultCode = queryResponse.ResultCode;
      transaction.resultDesc = queryResponse.ResultDesc;
      transaction.mpesaReceiptNumber = queryResponse.MpesaReceiptNumber;
      transaction.transactionDate = new Date(queryResponse.TransactionDate);
    } else {
      transaction.status = 'failed';
      transaction.resultCode = queryResponse.ResultCode;
      transaction.resultDesc = queryResponse.ResultDesc;
    }

    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Payment status retrieved',
      data: {
        transactionId: transaction._id,
        status: transaction.status,
        amount: transaction.amount,
        mpesaReceiptNumber: transaction.mpesaReceiptNumber,
        transactionDate: transaction.transactionDate,
        resultDesc: transaction.resultDesc,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { status, accountReference, limit = 20, skip = 0 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (accountReference) filter.accountReference = accountReference;

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Transaction.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.refundPayment = async (req, res) => {
  try {
    const { transactionId, refundAmount } = req.body;

    if (!transactionId || !refundAmount) {
      return res.status(400).json({
        success: false,
        message: 'transactionId and refundAmount are required',
      });
    }

    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed transactions can be refunded',
      });
    }

    if (refundAmount > transaction.amount - transaction.refundAmount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount exceeds available balance',
      });
    }

    const refundResponse = await mpesaClient.refundTransaction(
      transaction.phoneNumber,
      refundAmount,
      transaction.mpesaReceiptNumber
    );

    transaction.refundAmount += refundAmount;
    transaction.refundStatus = 'pending';
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Refund initiated successfully',
      data: {
        transactionId: transaction._id,
        refundAmount,
        refundStatus: 'pending',
        conversationID: refundResponse.ConversationID,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.handleCallback = async (req, res) => {
  try {
    const body = req.body;
    const result = body.Result;

    console.log('M-Pesa Callback received:', result);

    const transaction = await Transaction.findOne({
      checkoutRequestID: result.CheckoutRequestID,
    });

    if (!transaction) {
      console.log('Transaction not found for CheckoutRequestID:', result.CheckoutRequestID);
      return res.status(200).json({ acknowledged: true });
    }

    if (result.ResultCode === 0) {
      transaction.status = 'completed';
      transaction.mpesaReceiptNumber = result.Items?.Item?.find(
        (item) => item.Name === 'MpesaReceiptNumber'
      )?.Value;
      transaction.transactionDate = new Date();
    } else {
      transaction.status = 'failed';
    }

    transaction.resultCode = result.ResultCode;
    transaction.resultDesc = result.ResultDesc;

    await transaction.save();

    res.status(200).json({ acknowledged: true });
  } catch (error) {
    console.error('Callback processing error:', error);
    res.status(200).json({ acknowledged: true });
  }
};

exports.health = (req, res) => {
  res.status(200).json({ status: 'Payment service is running' });
};
