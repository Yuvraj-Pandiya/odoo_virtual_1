const express = require('express');
const router = express.Router();
const { getDashboardKPIs, getFuelEfficiency, getOperationalCost, getVehicleROI, getTripTrends } = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/dashboard-kpis', getDashboardKPIs);
router.get('/fuel-efficiency', getFuelEfficiency);
router.get('/operational-cost', getOperationalCost);
router.get('/vehicle-roi', getVehicleROI);
router.get('/trip-trends', getTripTrends);

module.exports = router;
