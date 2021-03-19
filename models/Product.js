const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema;

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true,
        required: true,
        maxlength: 32,
        text: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        index: true

    },
    description: {
        type: String,
        required: true,
        maxlength: 2000,
        text: true
    },
    ingredients: {
        type: String,
        required: true,
        maxlength: 2000,
        text: true
    },
    price: {
        type: Number,
        required: true,
        trim: true,
        maxlength: 2000,
    },
    category: {
        type: ObjectId,
        ref: 'Category'
    },
    subs: [{
        type: ObjectId,
        ref: 'Sub'
    }],
    choices: [{
        type: ObjectId,
        ref: 'Choice'
    }],
    typeOfChoice: {
        type: String,
        
    },
    extraCharge: {
        type: Number,
    },
    instructions: {
        type: String,
        maxlength: 500,
        text: true
    },
    quantity: Number,
    sold: {
        type: Number,
        default: 0
    },
    images: {
        type: Array
    },
    pickup: {
        type: String,
        enum: ["Yes", "No"]
    },
    ratings: [
        {
            star: Number,
            postedBy: { type: ObjectId, ref: "User" },
        },
    ],
},
    { timestamps: true })

module.exports = mongoose.model('Product', productSchema)