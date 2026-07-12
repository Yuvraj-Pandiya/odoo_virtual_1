const express = require('express');
const router = express.Router();
const { getVehicles, getAvailableVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle } = require('../controllers/vehicleController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/available', getAvailableVehicles);
router.get('/', getVehicles);
router.get('/:id', getVehicleById);
router.post('/', authorize('fleet_manager'), createVehicle);
router.put('/:id', authorize('fleet_manager'), updateVehicle);
router.delete('/:id', authorize('fleet_manager'), deleteVehicle);

module.exports = router;
