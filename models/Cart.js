const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const cartSchema = new mongoose.Schema(
    {
        products: [
            {
                product: {
                    type: ObjectId,
                    ref: "Product",
                },
                count: Number,
                price: Number,
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
        cartTotal: Number,
        totalAfterDiscount: Number,
        orderedBy: { type: ObjectId, ref: "User" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
