const mongoose = require('mongoose');

const functionSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    route: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: true,
      enum: ['javascript', 'python'],
      default: 'javascript',
    },
    timeout: {
      type: Number,
      required: true,
      default: 30000, // 30 seconds
    },
    environment: {
      type: Map,
      of: String,
      default: {},
    },
    virtualizationType: {
      type: String,
      required: true,
      enum: ['docker', 'gvisor'],
      default: 'docker',
    },
    imageId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['creating', 'ready', 'error'],
      default: 'creating',
    },
    lastInvoked: {
      type: Date,
      default: null,
    },
    deploymentCount: {
      type: Number,
      default: 0,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Function', functionSchema);