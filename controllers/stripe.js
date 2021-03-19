const User = require("../models/User");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

exports.createPaymentIntent = async (req, res) => {
    //console.log(req.body)

    const { couponApplied } = req.body
    // later apply coupon
    // later calculate price

    // find user
    const user = await User.findOne({ email: req.user.email }).exec()

    // get user cart total
    const { cartTotal, totalAfterDiscount } = await Cart.findOne({
        orderedBy: user._id,
    }).exec();
    console.log("CART TOTAL", cartTotal, "AFTER DIS%", totalAfterDiscount);



    let finalAmount = 0;

    if (couponApplied && totalAfterDiscount) {
        //  finalAmount = Math.round(totalAfterDiscount * 100)
         finalAmount = Math.round(((totalAfterDiscount * 0.029 + 0.3) + (totalAfterDiscount)).toFixed(2) * 100)
    } else {
        //  finalAmount = Math.round(cartTotal * 100)
       finalAmount = Math.round(((cartTotal * 0.029 + 0.3) +  cartTotal ).toFixed(2)* 100) 
    }

    console.log("Final Amount", finalAmount);

    // create payment intent with order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
        description: "KeenokOrder",
        amount: finalAmount,
        currency: "usd",
    });

    res.send({
        clientSecret: paymentIntent.client_secret,
        cartTotal,
        totalAfterDiscount,
        payable: finalAmount,
        
    });
};
