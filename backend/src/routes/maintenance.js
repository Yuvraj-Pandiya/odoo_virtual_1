const express = require('express');
const router = express.Router();
const { getMaintenanceLogs, createMaintenanceLog, updateMaintenanceLog, closeMaintenanceLog } = require('../controllers/maintenanceController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', getMaintenanceLogs);
router.post('/', authorize('fleet_manager', 'safety_officer'), createMaintenanceLog);
router.put('/:id', authorize('fleet_manager', 'safety_officer'), updateMaintenanceLog);
router.post('/:id/close', authorize('fleet_manager', 'safety_officer'), closeMaintenanceLog);

module.exports = router;
