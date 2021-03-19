const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const orderSchema = new mongoose.Schema(
    {
        products: [
            {
                product: {
                    type: ObjectId,
                    ref: "Product",
                },
                count: Number,
                typeOfChoice: String,
                extraCharge: {
                    type: Number,
                },
                instructions: {
                    type: String,
                    maxlength: 500,
                    text: true
                },
            },
        ],
        paymentIntent: {},
        pickupDateTime: {
            type: Date,
        },
        orderStatus: {
            type: String,
            default: "Received",
            enum: [
                "Received",
                "Confirmed",
                "Completed",
                "Cancelled",
                "Ready for Pickup",
                "Cash Payment",
                "Venmo Payment"
            ],
        },
        sendStatus: {
            type: String,
            default: "Not sent",
            enum: [
                "Not sent",
                "Sent"
            ]
        },
        orderedBy: { type: ObjectId, ref: "User" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);