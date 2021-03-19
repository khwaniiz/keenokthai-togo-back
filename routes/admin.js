const express = require('express');
const router = express.Router();

// middlewares
const { authCheck, adminCheck } = require('../middlewares/auth')

const { orders, orderStatus, getUsers, orderSendStatus } = require('../controllers/admin')

// routes
router.get('/admin/orders', authCheck, orders)
router.get('/admin/users', authCheck, getUsers)
router.put('/admin/order-status', authCheck, adminCheck, orderStatus)
router.put('/admin/order-send-status', authCheck, adminCheck, orderSendStatus)


module.exports = router;