const mongoose = require('mongoose');

const brandSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'userInfo'
  }
}, { timestamps: true });


const brandModel = mongoose.model('Brand', brandSchema);

module.exports = brandModel;