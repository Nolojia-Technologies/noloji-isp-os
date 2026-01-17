const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const voucherController = require('../controllers/voucherController');
const planController = require('../controllers/planController');
const sessionController = require('../controllers/sessionController');
const mikrotikController = require('../controllers/mikrotikController');
const routerController = require('../controllers/routerController');
const smsController = require('../controllers/smsController');

// Import middleware
const { authenticateToken, authenticateRole } = require('../middleware/auth');

// ===================================
// AUTHENTICATION ROUTES (Public)
// ===================================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/verify', authenticateToken, authController.verifyToken);

// Profile management (Protected)
router.get('/auth/profile', authenticateToken, authController.getProfile);
router.put('/auth/profile', authenticateToken, authController.updateProfile);
router.put('/auth/password', authenticateToken, authController.changePassword);

// ===================================
// USER ROUTES
// ===================================
router.get('/users', userController.getAllUsers);
router.get('/users/:id', userController.getUserById);
router.post('/users', userController.createUser);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);
router.get('/users/:id/sessions', userController.getUserSessions);

// ===================================
// VOUCHER ROUTES
// ===================================
router.get('/vouchers', voucherController.getAllVouchers);
router.get('/vouchers/stats', voucherController.getVoucherStats);
router.get('/vouchers/:code', voucherController.getVoucherByCode);
router.post('/vouchers/generate', voucherController.generateVouchers);
router.put('/vouchers/:code/status', voucherController.updateVoucherStatus);
router.delete('/vouchers/:code', voucherController.deleteVoucher);

// ===================================
// PLAN ROUTES
// ===================================
router.get('/plans', planController.getAllPlans);
router.get('/plans/:id', planController.getPlanById);
router.post('/plans', planController.createPlan);
router.put('/plans/:id', planController.updatePlan);
router.delete('/plans/:id', planController.deletePlan);

// ===================================
// SESSION ROUTES
// ===================================
router.get('/sessions', sessionController.getAllSessions);
router.get('/sessions/active', sessionController.getActiveSessions);
router.get('/sessions/stats', sessionController.getSessionStats);
router.get('/sessions/online-count', sessionController.getOnlineUsersCount);
router.get('/sessions/:id', sessionController.getSessionById);

// ===================================
// RADIUS LOGS ROUTES
// ===================================
router.get('/radius/logs', sessionController.getRadiusLogs);

// ===================================
// MIKROTIK API ROUTES
// ===================================

// Connection & System
router.get('/mikrotik/test', mikrotikController.testConnection);
router.get('/mikrotik/resources', mikrotikController.getSystemResources);
router.get('/mikrotik/interfaces', mikrotikController.getInterfaceStats);
router.get('/mikrotik/radius-config', mikrotikController.checkRadiusConfig);

// Hotspot Users
router.get('/mikrotik/hotspot/active', mikrotikController.getActiveHotspotUsers);
router.get('/mikrotik/hotspot/users', mikrotikController.getAllHotspotUsers);
router.post('/mikrotik/hotspot/users', mikrotikController.createHotspotUser);
router.delete('/mikrotik/hotspot/users/:username', mikrotikController.removeHotspotUser);
router.post('/mikrotik/hotspot/disconnect/:username', mikrotikController.disconnectUser);
router.post('/mikrotik/hotspot/disconnect-mac/:mac', mikrotikController.disconnectByMac);

// Simple Queues (Bandwidth Control)
router.get('/mikrotik/queues', mikrotikController.getAllSimpleQueues);
router.post('/mikrotik/queues', mikrotikController.addSimpleQueue);
router.put('/mikrotik/queues/:name', mikrotikController.updateSimpleQueue);
router.delete('/mikrotik/queues/:name', mikrotikController.removeSimpleQueue);

// ===================================
// ROUTER ROUTES
// ===================================
router.get('/routers', routerController.getAllRouters);
router.get('/routers/:id', routerController.getRouterById);
router.post('/routers', routerController.createRouter);
router.put('/routers/:id', routerController.updateRouter);
router.delete('/routers/:id', routerController.deleteRouter);
router.patch('/routers/:id/status', routerController.updateRouterStatus);

// Router MikroTik integration
router.get('/routers/:id/mikrotik-users', routerController.getMikrotikUsers);
router.post('/routers/:id/sync-users', routerController.syncUsers);
router.post('/routers/:id/test-connection', routerController.testConnection);

// ===================================
// SMS ROUTES
// ===================================
// SMS Credits
router.get('/sms/balance', smsController.getSMSBalance);
router.post('/sms/credits', smsController.addSMSCredits);
router.put('/sms/pricing', smsController.updateSMSPricing);

// SMS Sending
router.post('/sms/send', smsController.sendSMS);
router.post('/sms/send-bulk', smsController.sendBulkSMS);

// SMS Logs
router.get('/sms/logs', smsController.getSMSLogs);
router.get('/sms/stats', smsController.getSMSStats);

// SMS Templates
router.get('/sms/templates', smsController.getSMSTemplates);
router.post('/sms/templates', smsController.createSMSTemplate);
router.put('/sms/templates/:id', smsController.updateSMSTemplate);
router.delete('/sms/templates/:id', smsController.deleteSMSTemplate);

// ===================================
// HEALTH CHECK
// ===================================
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;
