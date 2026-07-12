const express = require('express');
const router = express.Router();
const { getTrips, getTripById, createTrip, dispatchTrip, completeTrip, cancelTrip } = require('../controllers/tripController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', getTrips);
router.get('/:id', getTripById);
router.post('/', authorize('fleet_manager', 'dispatcher'), createTrip);
router.post('/:id/dispatch', authorize('fleet_manager', 'dispatcher'), dispatchTrip);
router.post('/:id/complete', authorize('fleet_manager', 'dispatcher'), completeTrip);
router.post('/:id/cancel', authorize('fleet_manager', 'dispatcher'), cancelTrip);
router.put('/:id', authorize('fleet_manager'), getTripById); // view only for put

module.exports = router;
