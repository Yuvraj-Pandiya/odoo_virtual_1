const express = require('express');
const router = express.Router();
const { login, register, getMe, getUsers, updateUserRole, updateUserStatus, updateProfile, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticate, getMe);

// Settings and RBAC management
router.get('/users', authenticate, authorize('fleet_manager'), getUsers);
router.put('/users/:id/role', authenticate, authorize('fleet_manager'), updateUserRole);
router.put('/users/:id/status', authenticate, authorize('fleet_manager'), updateUserStatus);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
