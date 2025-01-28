const mongoose = require('mongoose');

// Define the schema for email analytics
const emailAnalyticsSchema = new mongoose.Schema({
  delivered: { type: Number, default: 0 },
  clicked: { type: Number, default: 0 },
  opened: { type: Number, default: 0 }
});
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
  emailAnalytics: { type: emailAnalyticsSchema, default: () => ({}) },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
