const express = require('express');
const {
  getFunctions,
  getFunctionById,
  createFunction,
  updateFunction,
  deleteFunction,
  invokeFunction
} = require('../controllers/functionController');

const router = express.Router();

router.route('/')
  .get(getFunctions)
  .post(createFunction);

router.route('/:id')
  .get(getFunctionById)
  .put(updateFunction)
  .delete(deleteFunction);

router.route('/:id/invoke')
  .post(invokeFunction);

module.exports = router;