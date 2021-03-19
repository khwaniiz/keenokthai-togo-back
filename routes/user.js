const express = require('express');
const router = express.Router();


// middlewares
const { authCheck } = require("../middlewares/auth");
// controllers
const { userCart, getUserCart, emptyCart, saveAddress, getAddress, applyCouponToUserCart, createOrder, orders, addToWishlist, wishlist, removeFromWishlist, createCashOrder, createVenmoOrder, getUsers,savePickupDateTime, getPickupDateTime} = require("../controllers/user");


router.post('/user/cart', authCheck, userCart) // save cart
router.get('/user/cart', authCheck, getUserCart) // get cart
router.delete('/user/cart', authCheck, emptyCart) // empty cart
router.post('/user/address', authCheck, saveAddress) // create address(pickup time)
router.get('/user/address', authCheck, getAddress) // get address(pick up time)

// order
router.post('/user/order', authCheck, createOrder)
router.post('/user/cash-order', authCheck, createCashOrder)
router.post('/user/venmo-order', authCheck, createVenmoOrder)
router.get('/user/orders', authCheck, orders)
router.post('/user/pickupDateTime', authCheck, savePickupDateTime) // create pickup time
router.get('/user/pickupDateTime', authCheck, getPickupDateTime) // get pick up time

// coupon
router.post('/user/cart/coupon', authCheck, applyCouponToUserCart)

// wishlist
router.post('/user/wishlist', authCheck, addToWishlist)
router.get('/user/wishlist', authCheck, wishlist)
router.put('/user/wishlist/:productId', authCheck, removeFromWishlist)


module.exports = router;