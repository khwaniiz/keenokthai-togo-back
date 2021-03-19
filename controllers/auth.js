const User = require('../models/User')

exports.createUpdateUser = async (req, res) => {
   const {name, picture, email } = req.user;
   const {userName} = req.body
   console.log('req.body', req.body, 'req.user', req.user)
    // const user = await User.findOneAndUpdate({email}, {name: email.split('@')[0], picture}, {new: true})
    const user = await User.findOneAndUpdate({email}, {name: userName, picture}, {new: true})
    if(user) {
        console.log('User updated', user)
        res.json(user)
    } else {
        const newUser = await new User({
            email,
            name: userName,
            picture
         }).save();
        console.log('User created', newUser)
        res.json(newUser)
    }
}

exports.currentUser = async (req, res) => {
try {
    (await User.findOne({email: req.user.email})).execPopulate((err, user) => {
    if(err) throw new Error(err)
    res.json(user)
})
} catch (error) {
    console.log(error)
}
}