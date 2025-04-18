const express = require('express');
const {
  getFunctionMetrics,
  getSystemMetrics
} = require('../controllers/metricsController');

const router = express.Router();

router.route('/function/:id')
  .get(getFunctionMetrics);

router.route('/system')
  .get(getSystemMetrics);

module.exports = router;