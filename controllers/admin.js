const Order = require('../models/Order')
const User = require('../models/User')

exports.orders = async (req, res) => {
    let allOrders = await Order.find({})
        .sort('-createdAt')
        .populate('products.product')
        .exec()
    res.json(allOrders)
}

exports.orderStatus = async (req, res) => {
    const { orderId, orderStatus } = req.body

    let updated = await Order.findByIdAndUpdate(orderId, { orderStatus }, { new: true }).exec()

    res.json(updated)
}

// update sending order status
exports.orderSendStatus = async (req, res) => {
    const { orderId, sendStatus } = req.body

    let updated = await Order.findByIdAndUpdate(orderId, { sendStatus }, { new: true }).exec()

    res.json(updated)
}

exports.getUsers = async (req, res) => {
    console.log(req.body)
    let users = await User.find({}).exec()
    res.json(users)
}