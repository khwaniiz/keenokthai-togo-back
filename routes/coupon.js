const express = require('express');
const router = express.Router()

// middlewares
const { authCheck, adminCheck } = require("../middlewares/auth");
// controllers
const { create, remove, list } = require("../controllers/coupon");

router.post('/coupon', authCheck, adminCheck, create)
router.get('/coupons', list)
router.delete('/coupon/:couponId', authCheck, adminCheck, remove)


module.exports = router;