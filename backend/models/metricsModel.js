const mongoose = require('mongoose');

const metricsSchema = mongoose.Schema(
  {
    functionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Function',
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    executionTime: {
      type: Number,
      required: true,
    },
    memoryUsage: {
      type: Number,
      required: true,
    },
    cpuUsage: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['success', 'error', 'timeout'],
      required: true,
    },
    statusCode: {
      type: Number,
    },
    errorMessage: {
      type: String,
    },
    virtualizationType: {
      type: String,
      required: true,
      enum: ['docker', 'gvisor'],
    },
    requestId: {
      type: String,
      required: true,
    },
    coldStart: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

// Add compound index for efficient queries
metricsSchema.index({ functionId: 1, timestamp: -1 });

module.exports = mongoose.model('Metrics', metricsSchema);