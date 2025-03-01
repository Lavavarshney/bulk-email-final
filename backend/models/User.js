const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique:true
  },
  password: { type: String },
  subscribed: { type: Boolean, default: true }, // Add this field
  emailsSent: { type: Number, default: 0 }, // Track the number of emails sent
    sentEmails: [{ // Array to track sent emails
    emailContent: String,
    timestamp: { type: Date, default: Date.now }
  }],
  planStatus: {type: String, enum:["free","basic","premium","paid"], default:"free"},
  emailLimit: {type: Number, default: 5},
  emailsOpened: { type: Number, default: 0 }, // Track the number of emails opened
 lastEmailSentAt: { type: Date, default: null }, // Track last email sent timestamp
lastEmailOpenedAt: { type: Date, default: null }, // Track the last time an email was opened
emailsClicked: { type: Number, default: 0 }, // Track number of emails clicked ✅ (New)
lastEmailClickedAt: { type: Date, default: null },
  trackingTokens: { type: [String], default: [] } // Add trackingTokens field
});

const User = mongoose.model('User', userSchema);

module.exports = User;
