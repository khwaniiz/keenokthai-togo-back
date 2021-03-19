const mongoose = require('mongoose');
require('dotenv').config()

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });

    console.log('MongoDB Connected...');
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
