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
});

const User = mongoose.model('User', userSchema);

module.exports = User;
