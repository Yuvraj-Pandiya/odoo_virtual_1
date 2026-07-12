const express = require('express');
const router = express.Router();
const { getDrivers, getAvailableDrivers, getDriverById, createDriver, updateDriver, deleteDriver } = require('../controllers/driverController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/available', getAvailableDrivers);
router.get('/', getDrivers);
router.get('/:id', getDriverById);
router.post('/', authorize('fleet_manager', 'safety_officer'), createDriver);
router.put('/:id', authorize('fleet_manager', 'safety_officer'), updateDriver);
router.delete('/:id', authorize('fleet_manager'), deleteDriver);

module.exports = router;
