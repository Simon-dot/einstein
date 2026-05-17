# M-Pesa Payment System

A Node.js/Express-based payment processing system integrated with M-Pesa (Safaricom's mobile payment service). This system handles payment initiation, transaction tracking, refunds, and webhook callbacks.

## Features

✅ **Payment Initiation** - Initiate M-Pesa STK push payments
✅ **Transaction History** - Track all payments and their status
✅ **Payment Confirmation** - Query transaction status
✅ **Refunds** - Process refunds for completed transactions
✅ **Webhooks** - Handle M-Pesa callback notifications
✅ **Comprehensive Logging** - Track all transactions in MongoDB

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB with Mongoose
- **Payment Gateway**: M-Pesa Daraja API (Safaricom)
- **Validation**: express-validator

## Installation

1. **Clone the repository**
   ```bash
   cd einstein
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Copy `.env.example` to `.env` and add your M-Pesa credentials:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/mpesa-payments
   MPESA_CONSUMER_KEY=your_consumer_key
   MPESA_CONSUMER_SECRET=your_consumer_secret
   MPESA_BUSINESS_SHORTCODE=174379
   MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd
   MPESA_ENVIRONMENT=sandbox
   MPESA_CALLBACK_URL=http://yourdomain.com/api/payments/webhook
   ```

4. **Start the server**
   ```bash
   npm start
   ```

## API Endpoints

### 1. Initiate Payment
- **Endpoint**: `POST /api/payments/initiate`
- **Body**:
  ```json
  {
    "phoneNumber": "254700000000",
    "amount": 1000,
    "accountReference": "ORD-123",
    "description": "Payment for Order 123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "transactionId": "...",
      "checkoutRequestID": "...",
      "merchantRequestID": "...",
      "responseCode": "0"
    }
  }
  ```

### 2. Confirm Payment
- **Endpoint**: `POST /api/payments/confirm`
- **Body**:
  ```json
  {
    "checkoutRequestID": "..."
  }
  ```
- **Response**: Returns transaction status and details

### 3. Get All Transactions
- **Endpoint**: `GET /api/payments/transactions`
- **Query Parameters**:
  - `status`: Filter by status (pending, completed, failed, refunded)
  - `accountReference`: Filter by account reference
  - `limit`: Results per page (default: 20)
  - `skip`: Pagination offset (default: 0)

### 4. Get Single Transaction
- **Endpoint**: `GET /api/payments/transactions/:transactionId`
- **Response**: Detailed transaction information

### 5. Process Refund
- **Endpoint**: `POST /api/payments/refund`
- **Body**:
  ```json
  {
    "transactionId": "...",
    "refundAmount": 500
  }
  ```

### 6. M-Pesa Webhook
- **Endpoint**: `POST /api/payments/webhook`
- **Purpose**: Receives payment status callbacks from M-Pesa

### 7. Health Check
- **Endpoint**: `GET /api/payments/health`

## Database Schema

### Transaction Document
```javascript
{
  phoneNumber: String,      // Customer phone number
  amount: Number,           // Payment amount in KES
  accountReference: String, // Order/reference ID
  description: String,      // Payment description
  status: String,           // pending, completed, failed, refunded
  checkoutRequestID: String,
  merchantRequestID: String,
  mpesaReceiptNumber: String,
  transactionDate: Date,
  refundAmount: Number,     // Total refunded amount
  refundStatus: String,     // pending, completed, failed
  createdAt: Date,
  updatedAt: Date
}
```

## Usage Example

```javascript
const axios = require('axios');

// 1. Initiate payment
const initiateResponse = await axios.post('http://localhost:5000/api/payments/initiate', {
  phoneNumber: '254700000000',
  amount: 1000,
  accountReference: 'ORD-123',
  description: 'Payment for Order 123'
});

const checkoutRequestID = initiateResponse.data.data.checkoutRequestID;

// 2. Check payment status after a few seconds
const confirmResponse = await axios.post('http://localhost:5000/api/payments/confirm', {
  checkoutRequestID: checkoutRequestID
});

console.log('Payment Status:', confirmResponse.data.data.status);

// 3. View transaction history
const transactionsResponse = await axios.get('http://localhost:5000/api/payments/transactions', {
  params: { status: 'completed', limit: 10 }
});

console.log('Transactions:', transactionsResponse.data.data.transactions);
```

## Configuration Details

### M-Pesa Environments
- **Sandbox**: For testing (default)
- **Production**: For live transactions

### Phone Number Format
The system automatically converts phone numbers to the international format (254xxxxx).
Accepted formats:
- `0700000000`
- `254700000000`
- `+254700000000`

## Notes

- Ensure MongoDB is running before starting the server
- Get M-Pesa credentials from [Safaricom Daraja Portal](https://developer.safaricom.co.ke/)
- Store sensitive data in `.env` file, never commit it
- Test in sandbox environment before going to production

## License

ISC
