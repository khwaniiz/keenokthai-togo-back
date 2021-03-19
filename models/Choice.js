const mongoose = require("mongoose");

const choiceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            trim: true,
            required: "Name is required",
            minlength: [2, "Too short"],
            maxlength: [32, "Too long"],
        },
        price: {
            type: Number,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        slug: {
            type: String,
            unique: true,
            lowercase: true,
            index: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Choice", choiceSchema);
