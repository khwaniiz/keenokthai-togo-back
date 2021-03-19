const User = require("../models/User");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const uniqueid = require("uniqueid");

// sendgrid
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


exports.userCart = async (req, res) => {
    console.log(req.body); // {cart: []}
    const { cart } = req.body;
   

    let products = [];

    const user = await User.findOne({ email: req.user.email }).exec();

    // check if cart with logged in user id already exist
    let cartExistByThisUser = await Cart.findOne({ orderedBy: user._id }).exec();

    if (cartExistByThisUser) {
        cartExistByThisUser.remove();
        console.log("removed old cart");
    }

    // get detail from Product and save to Cart Model
    for (let i = 0; i < cart.length; i++) {
        let object = {};

        object.product = cart[i]._id;
        object.count = cart[i].count;
        object.color = cart[i].color;
        object.typeOfChoice = cart[i].typeOfChoice
        object.extraCharge = cart[i].extraCharge
        object.instructions = cart[i].instructions

        // get price for creating total
        let productFromDb = await Product.findById(cart[i]._id)
            .select("price")
            .exec();
        object.price = productFromDb.price;

        products.push(object);

       
    }

    //console.log('products', products)

    let cartTotal = 0;

    if(products.extraCharge) {
        for (let i = 0; i < products.length; i++) {
            cartTotal = cartTotal + products[i].price * products[i].count;
        }
    } else {
        for (let i = 0; i < products.length; i++) {
            cartTotal = cartTotal + (products[i].price + products[i].extraCharge) * products[i].count;
        }
    }
       

   
     console.log("cartTotal", cartTotal);

    let newCart = await new Cart({
        products,
        cartTotal,
        orderedBy: user._id,
        
    }).save();

    console.log("new cart ----> ", newCart);
    res.json({ ok: true });
};

exports.getUserCart = async (req, res) => {
    const user = await User.findOne({ email: req.user.email }).exec();

    let cart = await Cart.findOne({ orderedBy: user._id })
        .populate("products.product", "_id title price typeOfChoice totalAfterDiscount")
        .exec();
    const { products, cartTotal, totalAfterDiscount } = cart;
    res.json({ products, cartTotal, totalAfterDiscount });
};

exports.emptyCart = async (req, res) => {
    console.log("empty cart");
    const user = await User.findOne({ email: req.user.email }).exec();

    const cart = await Cart.findOneAndRemove({ orderedBy: user._id }).exec();
    res.json(cart);
};

exports.saveAddress = async (req, res) => {
    const userAddress = await User.findOneAndUpdate(
        { email: req.user.email },
        { address: req.body.address }
    ).exec();

    res.json({ ok: true });
};

// pickup time
exports.getAddress = async (req, res) => {
    const userAddress = await User.findOne({ email: req.user.email }).populate('address').exec()
    //console.log('address', userAddress)
    res.json(userAddress)
}

// save pick up date time
exports.savePickupDateTime = async (req, res) => {
    let user = await User.findOne({ email: req.user.email }).exec()
    const userPickupDateTime = await Order.findOneAndUpdate(
        { orderedBy: user._id },
        { pickupDateTime: req.body.address }
    ).exec();

    res.json({ ok: true });
};

// get pickup time
exports.getPickupDateTime = async (req, res) => {
    let user = await User.findOne({ email: req.user.email }).exec()
    const userPickupDateTime = await Order.findOne({ orderedBy: user._id }).populate('pickupDateTime').exec()
    console.log('pickupDateTime', pickupDateTime)
    res.json(userAddress)
}

exports.applyCouponToUserCart = async (req, res) => {
    const { coupon } = req.body;
    console.log("COUPON", coupon);

    const validCoupon = await Coupon.findOne({ name: coupon }).exec();
    if (validCoupon === null) {
        return res.json({
            err: "Invalid coupon",
        });
    }
    console.log("VALID COUPON", validCoupon);

    const user = await User.findOne({ email: req.user.email }).exec();

    let { products, cartTotal } = await Cart.findOne({ orderedBy: user._id })
        .populate("products.product", "_id title price")
        .exec();

    console.log("cartTotal", cartTotal, "discount%", validCoupon.discount);

    // calculate the total after discount
    let totalAfterDiscount = (
        cartTotal -
        (cartTotal * validCoupon.discount) / 100
    ).toFixed(2); // 99.99

    console.log("----------> ", totalAfterDiscount);

    Cart.findOneAndUpdate(
        { orderedBy: user._id },
        { totalAfterDiscount },
        { new: true }
    ).exec();

    res.json(totalAfterDiscount);
};


exports.createOrder = async (req, res) => {
    // console.log(req.body);
    // return;
    const { paymentIntent } = req.body.stripeResponse;
    console.log('paymentIntent from back', paymentIntent)

    const user = await User.findOne({ email: req.user.email }).exec();

    let { products } = await Cart.findOne({ orderedBy: user._id }).populate("products.product", "_id title price typeOfChoice extraCharge instructions").exec();

    let userCart = await Cart.findOne({ orderedBy: user._id }).exec();

    let newOrder = await new Order({
        products,
        paymentIntent,
        orderedBy: user._id,
        pickupDateTime: user.address,
    }).save();

console.log('cartTotal', userCart.cartTotal)
     console.log('New Order back', newOrder)
    // console.log('User data back', user)

    // decrement quantity. increment sold
    let bulkOption = products.map((item) => {
        return {
            updateOne: {
                filter: { _id: item.product._id }, // get product from products
                update: { $inc: { quantity: -item.count, sold: +item.count } }
            }
        }
    })

    let updated = await Product.bulkWrite(bulkOption, {})
    // console.log('Product quantity decrement and increment sold products', updated)

     console.log("NEW ORDER SAVED", newOrder);

    // email to admin
    const emailData = {
        to: 'chalermkhwan.b.n@gmail.com', // admin
        from: process.env.EMAIL_FROM,
        subject: `New order received`,
        html: `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Nunito&display=swap');

            .container {
                font-family: 'Nunito', sans-serif;
                background-color: #fff;
                color: #333;
                border-radius: 10px;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
                padding: 20px;
                margin: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            .header {
                color: #525f7f;
                border-bottom: 1px #ccc solid;
                padding-bottom: 5px;
                margin-bottom: 5px;
                font-weight: bold;
            }
            .detail {
                background-color: #f6f9fc;
                color: #8898aa;
                border-radius: 10px;
                padding: 20px;
                margin: 10px;
                width: 50%;
            }
            .title_container {
                color: #8898aa;
                border-radius: 10px;
                padding: 20px;
                margin: 10px;
                display: flex;
            }
            .logo {
                margin: 10px;
              }
            .link {
                color: #8898aa;
                text-decoration: none;
                border-bottom: 1px #ccc solid;
            }
            .link:hover {
                border-bottom: none;
                color: #525f7f;
            }

            @media (max-width: 500px) {
                .container {
                padding: 10px;
                margin: 2px;
            }
            .detail {
                padding: 10px;
                margin: 10px;
                width: 80%;
                }

            .logo {
                width: 20px;
                height: 20px;
                margin: 15px 2px 0 0;
                }
            .header {
                font-size: 1.1rem;
                }    
            .header_title {
                padding-bottom: 0px;
                margin-bottom: 0px;
                font-size: 1rem;
                }
            }
        </style>
             
       <div style=' font-family: 'Nunito', sans-serif;
            background-color: #fff;
            color: #333;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
            padding: 20px;
            margin: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;'>

            <div style='  color: #8898aa;
            border-radius: 10px;
            padding: 20px;
            margin: 10px;
          display: flex;'>

                <h3 style='color: #525f7f;
                border-bottom: 1px #ccc solid;
                padding-bottom: 5px;
                margin-bottom: 5px;
                font-weight: bold;'>Keenok Thai To Go</h3>
            </div>

        <div style='background-color: #f6f9fc;
        color: #8898aa;
          border-radius: 10px;
        padding: 20px;
        margin: 10px;
        '>
            <p style='color: #8898aa;'>Customer name: ${user.name}</p>
            <p style='color: #8898aa;'>Pickup date and time: ${user.address}</p>    
            <p style='color: #8898aa;'>Customer's email: ${user.email}</p>
            <p style='color: #8898aa;'>Transaction ID: ${paymentIntent.id}</p>
            <p style='color: #8898aa;'>Order ID: ${newOrder._id}</p>
        </div>

        <div style='  background-color: #f6f9fc;
        color: #8898aa;
          border-radius: 10px;
        padding: 20px;
        margin: 10px;
        '>
            <h3 style='color: #525f7f;
            border-bottom: 1px #ccc solid;
            padding-bottom: 5px;
            margin-bottom: 5px;
            font-weight: bold;'>Product details</h3>
            ${products
              .map((p) => {
                return `<div>
                        <p style='color: #8898aa;'>Product: ${p.product.title}</p>
                        <p style='color: #8898aa;'>Choice of: ${p.typeOfChoice ? p.typeOfChoice : ''} $${p.extraCharge ? p.extraCharge.toFixed(2) : 0}</p>
                        <p style='color: #8898aa;'>Special Instruction: ${p.instructions ? p.instructions : 'None'}</p>
                        <p style='color: #8898aa;'>Price: $${(p.price + p.extraCharge).toFixed(2)}</p>
                        <p style='color: #8898aa;'>Quantity: ${p.count}</p>
                </div>`;
              })
              .join('--------------------')}
        </div>

        <div style='background-color: #f6f9fc;
        color: #8898aa;
          border-radius: 10px;
        padding: 20px;
        margin: 10px;
        '>
            <h3 style='  color: #525f7f;
            border-bottom: 1px #ccc solid;
            padding-bottom: 5px;
            margin-bottom: 5px;
            font-weight: bold;'>Total order cost: $${((paymentIntent.amount)/100).toFixed(2)}</h3>
            <p color: #8898aa;><a href='https://www.keenokthai.com/index.html' target='_blank'
            rel="noopener noreferrer" style=' color: #8898aa;
  text-decoration: none;
  border-bottom: 1px #ccc solid;'>Sign in to confirm the order.</a></p>
        </div>
        </div>
        `,
      };

      sgMail
        .send(emailData)
        .then((sent) => console.log('SENT >>>', sent))
        .catch((err) => console.log('ERR >>>', err));

    // email to customer
    const emailData2 = {
        to: user.email,
        from: process.env.EMAIL_FROM,
        subject: `We've received your order`,
        html: `

        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link
            href="https://fonts.googleapis.com/css2?family=Fira+Sans+Extra+Condensed:ital,wght@0,100;0,300;0,400;0,700;1,300&family=Imprima&family=Nunito:wght@200;300;400;700&display=swap"
            rel="stylesheet">

            <style type="text/css">
            @import url('https://fonts.googleapis.com/css2?family=Nunito&display=swap');
    
            .container {
                font-family: 'Nunito', sans-serif;
                background-color: #fff;
                color: #333;
                border-radius: 10px;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
                padding: 20px;
                margin: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
    
            .header {
                color: #525f7f;
                border-bottom: 1px #ccc solid;
                padding-bottom: 5px;
                margin-bottom: 5px;
                font-weight: bold;
            }
            .detail {
                background-color: #f6f9fc;
                color: #8898aa;
                border-radius: 10px;
                padding: 20px;
                margin: 10px;
                width: 50%;
            }
            .title_container {
                color: #8898aa;
                border-radius: 10px;
                padding: 20px;
                margin: 10px;
                display: flex;
            }
            .link {
                color: #8898aa;
                text-decoration: none;
                border-bottom: 1px #ccc solid;
            }
            .link:hover {
                border-bottom: none;
                color: #525f7f;
            }
    
            @media (max-width: 500px) {
                .container {
                padding: 10px;
                margin: 2px;
            }
            .detail {
                padding: 10px;
                margin: 10px;
                width: 80%;
                }
            .header {
                font-size: 1.1rem;
                }    
            .header_title {
                padding-bottom: 0px;
                margin-bottom: 0px;
                font-size: 1rem;
                }
            }
        </style>
        </head>
    
            <div style=' font-family: 'Nunito', sans-serif;
            background-color: #fff;
            color: #333;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
            padding: 20px;
            margin: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;'>

                <div style=' color: #8898aa;
                border-radius: 10px;
                padding: 20px;
                margin: 10px;
              display: flex;'>
                   
                    <h3 style='color: #525f7f;
                    border-bottom: 1px #ccc solid;
                    padding-bottom: 5px;
                    margin-bottom: 5px;
                    font-weight: bold;'>Keenok Thai To Go</h3>
                </div>

                <div style=' background-color: #f6f9fc;
                color: #8898aa;
                  border-radius: 10px;
                padding: 20px;
                margin: 10px;
                '>

                  <p style='color: #8898aa;'>Hey ${user.name}, thank you for your order.</p>
                    <p style='color: #8898aa;'>We will review and send you a confirmation email shortly. If you don't hear from us within a few days, please reply to this email or call us at 912-658-6723.</p>
                    <p style='color: #8898aa;'>Have a great day!</p>
                    <p style='color: #8898aa;'>Order ID: ${newOrder._id}</p>
                    <p style='color: #8898aa;'>Transaction ID: ${paymentIntent.id}</p>
                </div>

                 <div style=' background-color: #f6f9fc;
                color: #8898aa;
                  border-radius: 10px;
                padding: 20px;
                margin: 10px;
               '>
                    <h3 style='font-size: 1.1rem;'>Product details</h3>

                    ${products
                    .map((p) => {
                        return `<div>
                            <p style='color: #8898aa;'>Product: ${p.product.title}</p>
                            <p style='color: #8898aa;'>Choice of: ${p.typeOfChoice ? p.typeOfChoice : ''} $${p.extraCharge ? p.extraCharge.toFixed(2) : 0}</p>
                            <p style='color: #8898aa;'>Special Instruction: ${p.instructions ? p.instructions : 'None'}</p>
                            <p style='color: #8898aa;'>Price: $${(p.price + p.extraCharge).toFixed(2)}</p>
                            <p style='color: #8898aa;'>Quantity: ${p.count}</p>
                        </div>`;
                    })
                    .join('--------------------')}
                </div>

                <div style=' background-color: #f6f9fc;
                color: #8898aa;
                  border-radius: 10px;
                padding: 20px;
                margin: 10px;
                '>
                <h3 style='font-size: 1.1rem;'>Sub total: $${(userCart.cartTotal).toFixed(2)}</h3>
                    <h3 style='font-size: 1.1rem;'>Card fee: $${((paymentIntent.amount/100)-(userCart.cartTotal)).toFixed(2)}</h3>
                    <h3 style='font-size: 1.1rem;'>Total order cost: $${(paymentIntent.amount/100).toFixed(2)}</h3>
                    <p style='color: #8898aa;'>Thank your for your support!</p>
                </div>
            </div>
       
        `,
      };
      sgMail
        .send(emailData2)
        .then((sent) => console.log('SENT 2 >>>', sent))
        .catch((err) => console.log('ERR 2 >>>', err));
       
    res.json({ ok: true });

};


exports.orders = async (req, res) => {
    let user = await User.findOne({ email: req.user.email }).exec()

    let userOrders = await Order.find({ orderedBy: user._id }).populate('products.product').populate('orderedBy', '_id name email address').exec()
    res.json(userOrders)
}


// wishlist
exports.addToWishlist = async (req, res) => {
    const { productId } = req.body;

    const user = await User.findOneAndUpdate({ email: req.user.email }, { $addToSet: { wishlist: productId } }).exec()

    res.json({ ok: true })
}

exports.wishlist = async (req, res) => {
    const list = await User.findOne({ email: req.user.email })
        .select('wishlist').populate('wishlist').exec()

    res.json(list)
}

exports.removeFromWishlist = async (req, res) => {
    const { productId } = req.params;
    const user = await User.findOneAndUpdate({ email: req.user.email }, { $pull: { wishlist: productId } })
        .exec()

    res.json({ ok: true })
}

exports.createCashOrder = async (req, res) => {

    const { cash, couponApplied } = req.body;

    // if cash is true, create order with status of cash

    if (!cash) return res.status(400).send('Create cash order failed')

    const user = await User.findOne({ email: req.user.email }).exec();

    let { products } = await Cart.findOne({ orderedBy: user._id }).populate("products.product", "_id title price typeOfChoice extraCharge instructions").exec();

    let userCart = await Cart.findOne({ orderedBy: user._id }).exec();

   
    console.log('cash userCart back', userCart)


    let finalAmount = 0;

    if (couponApplied && userCart.totalAfterDiscount) {
        finalAmount = userCart.totalAfterDiscount * 100;
    } else {
        finalAmount = userCart.cartTotal * 100;
    }

    let newOrder = await new Order({
        products: userCart.products,
        typeOfChoice:userCart.typeOfChoice,
        extraCharge: userCart.extraCharge,
        instructions: userCart.instructions,
        paymentIntent: {
            id: uniqueid(),
            amount: finalAmount,
            currency: 'usd',
            status: 'Cash Payment',
            created: Date.now(),
            payment_method_types: ['Cash'],

        },
        orderedBy: user._id,
        orderStatus: 'Received',
        pickupDateTime: user.address
        
    }).save();

    console.log('New cash order back', newOrder)
    // decrement quantity. increment sold
    let bulkOption = userCart.products.map((item) => {
        return {
            updateOne: {
                filter: { _id: item.product._id }, // get product from products
                update: { $inc: { quantity: -item.count, sold: +item.count } }
            }
        }
    })

    let updated = await Product.bulkWrite(bulkOption, {})
    // console.log('Product quantity decrement and increment sold products', updated)


     // email to admin
     const emailData = {
        to: 'chalermkhwan.b.n@gmail.com', // admin
        from: process.env.EMAIL_FROM,
        subject: `New order received`,
        html: `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Nunito&display=swap');

            .container {
                font-family: 'Nunito', sans-serif;
                background-color: #fff;
                color: #333;
                border-radius: 10px;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
                padding: 20px;
                margin: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            .header {
                color: #525f7f;
                border-bottom: 1px #ccc solid;
                padding-bottom: 5px;
                margin-bottom: 5px;
                font-weight: bold;
            }
            .detail {
                background-color: #f6f9fc;
                color: #8898aa;
                border-radius: 10px;
                padding: 20px;
                margin: 10px;
                width: 50%;
            }
            .title_container {
                color: #8898aa;
                border-radius: 10px;
                padding: 20px;
                margin: 10px;
                display: flex;
            }
            .logo {
                margin: 10px;
              }
            .link {
                color: #8898aa;
                text-decoration: none;
                border-bottom: 1px #ccc solid;
            }
            .link:hover {
                border-bottom: none;
                color: #525f7f;
            }

            @media (max-width: 500px) {
                .container {
                padding: 10px;
                margin: 2px;
            }
            .detail {
                padding: 10px;
                margin: 10px;
                width: 80%;
                }

            .logo {
                width: 20px;
                height: 20px;
                margin: 15px 2px 0 0;
                }
            .header {
                font-size: 1.1rem;
                }    
            .header_title {
                padding-bottom: 0px;
                margin-bottom: 0px;
                font-size: 1rem;
                }
            }
        </style>
             
       <div style=' font-family: 'Nunito', sans-serif;
            background-color: #fff;
            color: #333;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
            padding: 20px;
            margin: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;'>

            <div style='  color: #8898aa;
            border-radius: 10px;
            padding: 20px;
            margin: 10px;
          display: flex;'>

                <h3 style='color: #525f7f;
                border-bottom: 1px #ccc solid;
                padding-bottom: 5px;
                margin-bottom: 5px;
                font-weight: bold;'>Keenok Thai To Go</h3>
            </div>

        <div style='background-color: #f6f9fc;
        color: #8898aa;
          border-radius: 10px;
        padding: 20px;
        margin: 10px;
        '>
            <p style='color: #8898aa;'>Customer name: ${user.name}</p>
            <p style='color: #8898aa;'>Pickup date and time: ${user.address}</p>    
            <p style='color: #8898aa;'>Customer's email: ${user.email}</p>
            <p style='color: #8898aa;'>Payment method: ${newOrder.paymentIntent.payment_method_types}</p>
            <p style='color: #8898aa;'>Order ID: ${newOrder._id}</p>
        </div>

        <div style='  background-color: #f6f9fc;
        color: #8898aa;
          border-radius: 10px;
        padding: 20px;
        margin: 10px;
        '>
            <h3 style='color: #525f7f;
            border-bottom: 1px #ccc solid;
            padding-bottom: 5px;
            margin-bottom: 5px;
            font-weight: bold;'>Product details</h3>
            ${products
              .map((p) => {
                return `<div>
                        <p style='color: #8898aa;'>Product: ${p.product.title}</p>
                        <p style='color: #8898aa;'>Choice of: ${p.typeOfChoice ? p.typeOfChoice : ''} $${p.extraCharge ? p.extraCharge.toFixed(2) : 0}</p>
                        <p style='color: #8898aa;'>Special Instruction: ${p.instructions ? p.instructions : 'None'}</p>
                        <p style='color: #8898aa;'>Price: $${(p.price + p.extraCharge).toFixed(2)}</p>
                        <p style='color: #8898aa;'>Quantity: ${p.count}</p>
                </div>`;
              })
              .join('--------------------')}
        </div>

        <div style='background-color: #f6f9fc;
        color: #8898aa;
          border-radius: 10px;
        padding: 20px;
        margin: 10px;
        '>
        <h3 style='  color: #525f7f;
        border-bottom: 1px #ccc solid;
        padding-bottom: 5px;
        margin-bottom: 5px;
        font-weight: bold;'>Total order cost: $${userCart.cartTotal.toFixed(2)}</h3>

            <p color: #8898aa;><a href='https://www.keenokthai.com/index.html' target='_blank'
            rel="noopener noreferrer" style=' color: #8898aa;
  text-decoration: none;
  border-bottom: 1px #ccc solid;'>Sign in to confirm the order.</a></p>
        </div>
        </div>
        `,
      };

      sgMail
        .send(emailData)
        .then((sent) => console.log('SENT >>>', sent))
        .catch((err) => console.log('ERR >>>', err));


          // email to customer
    const emailData2 = {
        to: user.email,
        from: process.env.EMAIL_FROM,
        subject: `We've received your order!`,
        html: `

        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style type="text/css">
            @import url('https://fonts.googleapis.com/css2?family=Nunito&display=swap');
    
            .container {
                font-family: 'Nunito', sans-serif;
                background-color: #fff;
                color: #333;
                border-radius: 10px;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
                padding: 20px;
                margin: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
    
            .header {
                color: #525f7f;
                border-bottom: 1px #ccc solid;
                padding-bottom: 5px;
                margin-bottom: 5px;
                font-weight: bold;
            }
            .detail {
                background-color: #f6f9fc;
                color: #8898aa;
                border-radius: 10px;
                padding: 20px;
                margin: 10px;
                width: 50%;
            }
            .title_container {
                color: #8898aa;
                border-radius: 10px;
                padding: 20px;
                margin: 10px;
                display: flex;
            }
            .link {
                color: #8898aa;
                text-decoration: none;
                border-bottom: 1px #ccc solid;
            }
            .link:hover {
                border-bottom: none;
                color: #525f7f;
            }
    
            @media (max-width: 500px) {
                .container {
                padding: 10px;
                margin: 2px;
            }
            .detail {
                padding: 10px;
                margin: 10px;
                width: 80%;
                }
            .header {
                font-size: 1.1rem;
                }    
            .header_title {
                padding-bottom: 0px;
                margin-bottom: 0px;
                font-size: 1rem;
                }
            }
        </style>
        </head>
    
            <div style=' font-family: 'Nunito', sans-serif;
            background-color: #fff;
            color: #333;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
            padding: 20px;
            margin: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;'>

                <div style=' color: #8898aa;
                border-radius: 10px;
                padding: 20px;
                margin: 10px;
              display: flex;'>
                   
                    <h3 style='color: #525f7f;
                    border-bottom: 1px #ccc solid;
                    padding-bottom: 5px;
                    margin-bottom: 5px;
                    font-weight: bold;'>Keenok Thai To Go</h3>
                </div>

                <div style=' background-color: #f6f9fc;
                color: #8898aa;
                  border-radius: 10px;
                padding: 20px;
                margin: 10px;
                '>

                    <p style='color: #8898aa;'>Hey ${user.name}, thank you for your order.</p>
                    <p style='color: #8898aa;'>We will review and send you a confirmation email shortly. If you don't hear from us within a few days, please reply to this email or call us at 912-658-6723.</p>
                    <p style='color: #8898aa;'>Have a great day!</p>
                    <p style='color: #8898aa;'>Order ID: ${newOrder._id}</p>
                    <p style='color: #8898aa;'>Payment method: ${newOrder.paymentIntent.payment_method_types}</p>
                </div>

                 <div style=' background-color: #f6f9fc;
                color: #8898aa;
                  border-radius: 10px;
                padding: 20px;
                margin: 10px;
               '>
                    <h3 style='font-size: 1.1rem;'>Product details</h3>

                    ${products
                    .map((p) => {
                        return `<div>
                            <p style='color: #8898aa;'>Product: ${p.product.title}</p>
                            <p style='color: #8898aa;'>Choice of: ${p.typeOfChoice ? p.typeOfChoice : ''} $${p.extraCharge ? p.extraCharge.toFixed(2) : 0}</p>
                            <p style='color: #8898aa;'>Special Instruction: ${p.instructions ? p.instructions : 'None'}</p>
                            <p style='color: #8898aa;'>Price: $${(p.price + p.extraCharge).toFixed(2)}</p>
                            <p style='color: #8898aa;'>Quantity: ${p.count}</p>
                        </div>`;
                    })
                    .join('--------------------')}
                </div>

                <div style=' background-color: #f6f9fc;
                color: #8898aa;
                  border-radius: 10px;
                padding: 20px;
                margin: 10px;
                '>
                    <h3 style='font-size: 1.1rem;'>Total order cost: $${userCart.cartTotal.toFixed(2)}</h3>
                    <p style='color: #8898aa;'>Thank your for your support!</p>
                </div>
            </div>
       
        `,
      };
      sgMail
        .send(emailData2)
        .then((sent) => console.log('SENT 2 >>>', sent))
        .catch((err) => console.log('ERR 2 >>>', err));


    //console.log("NEW ORDER SAVED", newOrder);
    res.json({ ok: true });
};

exports.createVenmoOrder = async (req, res) => {

    const { venmo, couponApplied } = req.body;
    console.log('venmo', req.body)

    // if venmo is true, create order with status of cash

    if (!venmo) return res.status(400).send('Create venmo order failed')

    const user = await User.findOne({ email: req.user.email }).exec();

    let { products } = await Cart.findOne({ orderedBy: user._id }).populate("products.product", "_id title price typeOfChoice extraCharge instructions").exec();

    let userCart = await Cart.findOne({ orderedBy: user._id }).exec();

   
    console.log('venmo userCart backend', userCart)


    let finalAmount = 0;

    if (couponApplied && userCart.totalAfterDiscount) {
        finalAmount = userCart.totalAfterDiscount * 100;
    } else {
        finalAmount = userCart.cartTotal * 100;
    }

    let newOrder = await new Order({
        products: userCart.products,
        typeOfChoice:userCart.typeOfChoice,
        extraCharge: userCart.extraCharge,
        instructions: userCart.instructions,
        paymentIntent: {
            id: uniqueid(),
            amount: finalAmount,
            currency: 'usd',
            status: 'Venmo Payment',
            created: Date.now(),
            payment_method_types: ['Venmo'],

        },
        orderedBy: user._id,
        orderStatus: 'Received',
        pickupDateTime: user.address
        
    }).save();

    console.log('New venmo order back', newOrder)
    // decrement quantity. increment sold
    let bulkOption = userCart.products.map((item) => {
        return {
            updateOne: {
                filter: { _id: item.product._id }, // get product from products
                update: { $inc: { quantity: -item.count, sold: +item.count } }
            }
        }
    })

    let updated = await Product.bulkWrite(bulkOption, {})
    // console.log('Product quantity decrement and increment sold products', updated)


     // email to admin
     const emailData = {
        to: 'chalermkhwan.b.n@gmail.com', // admin
        from: process.env.EMAIL_FROM,
        subject: `New order received`,
        html: `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Nunito&display=swap');

            .container {
                font-family: 'Nunito', sans-serif;
                background-color: #fff;
                color: #333;
                border-radius: 10px;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
                padding: 20px;
                margin: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            .header {
                color: #525f7f;
                border-bottom: 1px #ccc solid;
                padding-bottom: 5px;
                margin-bottom: 5px;
                font-weight: bold;
            }
            .detail {
                background-color: #f6f9fc;
                color: #8898aa;
                border-radius: 10px;
                padding: 20px;
                margin: 10px;
                width: 50%;
            }
            .title_container {
                color: #8898aa;
                border-radius: 10px;
                padding: 20px;
                margin: 10px;
                display: flex;
            }
            .logo {
                margin: 10px;
              }
            .link {
                color: #8898aa;
                text-decoration: none;
                border-bottom: 1px #ccc solid;
            }
            .link:hover {
                border-bottom: none;
                color: #525f7f;
            }

            @media (max-width: 500px) {
                .container {
                padding: 10px;
                margin: 2px;
            }
            .detail {
                padding: 10px;
                margin: 10px;
                width: 80%;
                }

            .logo {
                width: 20px;
                height: 20px;
                margin: 15px 2px 0 0;
                }
            .header {
                font-size: 1.1rem;
                }    
            .header_title {
                padding-bottom: 0px;
                margin-bottom: 0px;
                font-size: 1rem;
                }
            }
        </style>
             
       <div style=' font-family: 'Nunito', sans-serif;
            background-color: #fff;
            color: #333;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
            padding: 20px;
            margin: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;'>

            <div style='  color: #8898aa;
            border-radius: 10px;
            padding: 20px;
            margin: 10px;
          display: flex;'>

                <h3 style='color: #525f7f;
                border-bottom: 1px #ccc solid;
                padding-bottom: 5px;
                margin-bottom: 5px;
                font-weight: bold;'>Keenok Thai To Go</h3>
            </div>

        <div style='background-color: #f6f9fc;
        color: #8898aa;
          border-radius: 10px;
        padding: 20px;
        margin: 10px;
        '>
            <p style='color: #8898aa;'>Customer name: ${user.name}</p>
            <p style='color: #8898aa;'>Pickup date and time: ${user.address}</p>    
            <p style='color: #8898aa;'>Customer's email: ${user.email}</p>
            <p style='color: #8898aa;'>Payment method: ${newOrder.paymentIntent.payment_method_types}</p>
            <p style='color: #8898aa;'>Order ID: ${newOrder._id}</p>
        </div>

        <div style='  background-color: #f6f9fc;
        color: #8898aa;
          border-radius: 10px;
        padding: 20px;
        margin: 10px;
        '>
            <h3 style='color: #525f7f;
            border-bottom: 1px #ccc solid;
            padding-bottom: 5px;
            margin-bottom: 5px;
            font-weight: bold;'>Product details</h3>
            ${products
              .map((p) => {
                return `<div>
                        <p style='color: #8898aa;'>Product: ${p.product.title}</p>
                        <p style='color: #8898aa;'>Choice of: ${p.typeOfChoice ? p.typeOfChoice : ''} $${p.extraCharge ? p.extraCharge.toFixed(2) : 0}</p>
                        <p style='color: #8898aa;'>Special Instruction: ${p.instructions ? p.instructions : 'None'}</p>
                        <p style='color: #8898aa;'>Price: $${(p.price + p.extraCharge).toFixed(2)}</p>
                        <p style='color: #8898aa;'>Quantity: ${p.count}</p>
                </div>`;
              })
              .join('--------------------')}
        </div>

        <div style='background-color: #f6f9fc;
        color: #8898aa;
          border-radius: 10px;
        padding: 20px;
        margin: 10px;
        '>
        <h3 style='  color: #525f7f;
        border-bottom: 1px #ccc solid;
        padding-bottom: 5px;
        margin-bottom: 5px;
        font-weight: bold;'>Total order cost: $${userCart.cartTotal.toFixed(2)}</h3>

            <p color: #8898aa;><a href='https://www.keenokthai.com/index.html' target='_blank'
            rel="noopener noreferrer" style=' color: #8898aa;
  text-decoration: none;
  border-bottom: 1px #ccc solid;'>Sign in to confirm the order.</a></p>
        </div>
        </div>
        `,
      };

      sgMail
        .send(emailData)
        .then((sent) => console.log('SENT >>>', sent))
        .catch((err) => console.log('ERR >>>', err));


          // email to customer
    const emailData2 = {
        to: user.email,
        from: process.env.EMAIL_FROM,
        subject: `We've received your order!`,
        html: `

        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style type="text/css">
            @import url('https://fonts.googleapis.com/css2?family=Nunito&display=swap');
    
            .container {
                font-family: 'Nunito', sans-serif;
                background-color: #fff;
                color: #333;
                border-radius: 10px;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
                padding: 20px;
                margin: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
    
            .header {
                color: #525f7f;
                border-bottom: 1px #ccc solid;
                padding-bottom: 5px;
                margin-bottom: 5px;
                font-weight: bold;
            }
            .detail {
                background-color: #f6f9fc;
                color: #8898aa;
                border-radius: 10px;
                padding: 20px;
                margin: 10px;
                width: 50%;
            }
            .title_container {
                color: #8898aa;
                border-radius: 10px;
                padding: 20px;
                margin: 10px;
                display: flex;
            }
            .link {
                color: #8898aa;
                text-decoration: none;
                border-bottom: 1px #ccc solid;
            }
            .link:hover {
                border-bottom: none;
                color: #525f7f;
            }
    
            @media (max-width: 500px) {
                .container {
                padding: 10px;
                margin: 2px;
            }
            .detail {
                padding: 10px;
                margin: 10px;
                width: 80%;
                }
            .header {
                font-size: 1.1rem;
                }    
            .header_title {
                padding-bottom: 0px;
                margin-bottom: 0px;
                font-size: 1rem;
                }
            }
        </style>
        </head>
    
            <div style=' font-family: 'Nunito', sans-serif;
            background-color: #fff;
            color: #333;
            border-radius: 10px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
            padding: 20px;
            margin: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;'>

                <div style=' color: #8898aa;
                border-radius: 10px;
                padding: 20px;
                margin: 10px;
              display: flex;'>
                   
                    <h3 style='color: #525f7f;
                    border-bottom: 1px #ccc solid;
                    padding-bottom: 5px;
                    margin-bottom: 5px;
                    font-weight: bold;'>Keenok Thai To Go</h3>
                </div>

                <div style=' background-color: #f6f9fc;
                color: #8898aa;
                  border-radius: 10px;
                padding: 20px;
                margin: 10px;
                '>

                    <p style='color: #8898aa;'>Hey ${user.name}, thank you for your order.</p>
                    <p style='color: #8898aa;'>We will review and send you a confirmation email shortly. If you don't hear from us within a few days, please reply to this email or call us at 912-658-6723.</p>
                    <p style='color: #8898aa;'>Have a great day!</p>
                    <p style='color: #8898aa;'>Order ID: ${newOrder._id}</p>
                    <p style='color: #8898aa;'>Payment method: ${newOrder.paymentIntent.payment_method_types}</p>
                </div>

                 <div style=' background-color: #f6f9fc;
                color: #8898aa;
                  border-radius: 10px;
                padding: 20px;
                margin: 10px;
               '>
                    <h3 style='font-size: 1.1rem;'>Product details</h3>

                    ${products
                    .map((p) => {
                        return `<div>
                            <p style='color: #8898aa;'>Product: ${p.product.title}</p>
                            <p style='color: #8898aa;'>Choice of: ${p.typeOfChoice ? p.typeOfChoice : ''} $${p.extraCharge ? p.extraCharge.toFixed(2) : 0}</p>
                            <p style='color: #8898aa;'>Special Instruction: ${p.instructions ? p.instructions : 'None'}</p>
                            <p style='color: #8898aa;'>Price: $${(p.price + p.extraCharge).toFixed(2)}</p>
                            <p style='color: #8898aa;'>Quantity: ${p.count}</p>
                        </div>`;
                    })
                    .join('--------------------')}
                </div>

                <div style=' background-color: #f6f9fc;
                color: #8898aa;
                  border-radius: 10px;
                padding: 20px;
                margin: 10px;
                '>
                    <h3 style='font-size: 1.1rem;'>Total order cost: $${userCart.cartTotal.toFixed(2)}</h3>
                    <p style='color: #8898aa;'>Thank your for your support!</p>
                </div>
            </div>
       
        `,
      };
      sgMail
        .send(emailData2)
        .then((sent) => console.log('SENT 2 >>>', sent))
        .catch((err) => console.log('ERR 2 >>>', err));


    console.log("NEW ORDER SAVED", newOrder);
    res.json({ ok: true });
};

