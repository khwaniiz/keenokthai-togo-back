const Choice = require('../models/Choice');
const Product = require('../models/Product');
const slugify = require('slugify');


exports.create = async (req, res) => {

    try {
        const { name, price } = req.body
        const choice = await new Choice({ name, price, slug: slugify(name) }).save();
        res.json(choice)

    } catch (error) {
        console.log(error)
        res.status(400).send('Choice create failed')
    }

}

exports.list = async (req, res) => {
    res.json(await Choice.find({}).sort({ createdAt: -1 }).exec())
}

exports.read = async (req, res) => {
    let choice = await Choice.findOne({ slug: req.params.slug }).exec();
    //res.json(sub)
    const products = await Product.find({ choices: choice })
        .populate('choices')
        .exec()

    res.json({
        choice,
        products
    })

}

exports.getChoiceId = (req, res) => {
    Choice.find({ parent: req.params._id }).exec((err, choices) => {
        if (err) console.log(err);
        res.json(choices);
    });
};


exports.update = async (req, res) => {
    const { name, price } = req.body;

    try {
        const updated = await Choice.findOneAndUpdate({ slug: req.params.slug }, { name, price, slug: slugify(name) }, { new: true })
        res.json(updated)

    } catch (error) {
        console.log(error)
        res.status(400).send('Choice update failed')
    }
}

exports.remove = async (req, res) => {

    try {

        const deleted = await Choice.findOneAndDelete({ slug: req.params.slug })
        res.json(deleted)

    } catch (error) {
        console.log(error)
        res.status(400).send('Choice delete failed')
    }

}