const express = require('express');
const router = express.Router();
const { getFuelLogs, createFuelLog, deleteFuelLog, getExpenses, createExpense } = require('../controllers/fuelController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/fuel', getFuelLogs);
router.post('/fuel', createFuelLog);
router.delete('/fuel/:id', deleteFuelLog);

router.get('/expenses', getExpenses);
router.post('/expenses', createExpense);

module.exports = router;
