const axios = require('axios');

class MpesaClient {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORTCODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    this.callbackUrl = process.env.MPESA_CALLBACK_URL;
    this.baseUrl = this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });
      return response.data.access_token;
    } catch (error) {
      throw new Error(`Failed to get M-Pesa access token: ${error.message}`);
    }
  }

  async initiatePayment(phoneNumber, amount, accountReference, description) {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.encodePassword(timestamp);

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        {
          BusinessShortCode: this.businessShortCode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.floor(amount),
          PartyA: this.formatPhoneNumber(phoneNumber),
          PartyB: this.businessShortCode,
          PhoneNumber: this.formatPhoneNumber(phoneNumber),
          CallBackURL: this.callbackUrl,
          AccountReference: accountReference,
          TransactionDesc: description,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`STK Push failed: ${error.message}`);
    }
  }

  async queryTransaction(checkoutRequestID) {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.getTimestamp();
      const password = this.encodePassword(timestamp);

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        {
          BusinessShortCode: this.businessShortCode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestID,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Query transaction failed: ${error.message}`);
    }
  }

  async refundTransaction(phoneNumber, amount, originalTransactionRef) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/mpesa/b2c/v1/paymentrequest`,
        {
          InitiatorName: process.env.BUSINESS_NAME || 'Business',
          SecurityCredential: this.businessShortCode,
          CommandID: 'BusinessPayment',
          Amount: Math.floor(amount),
          PartyA: this.businessShortCode,
          PartyB: this.formatPhoneNumber(phoneNumber),
          Remarks: `Refund for ${originalTransactionRef}`,
          QueueTimeOutURL: `${this.callbackUrl}/timeout`,
          ResultURL: `${this.callbackUrl}/result`,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Refund failed: ${error.message}`);
    }
  }

  encodePassword(timestamp) {
    const data = `${this.businessShortCode}${this.passkey}${timestamp}`;
    return Buffer.from(data).toString('base64');
  }

  getTimestamp() {
    const now = new Date();
    return now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
  }

  formatPhoneNumber(phone) {
    let formatted = phone.replace(/\D/g, '');
    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.substring(1);
    } else if (!formatted.startsWith('254')) {
      formatted = '254' + formatted;
    }
    return formatted;
  }
}

module.exports = new MpesaClient();
