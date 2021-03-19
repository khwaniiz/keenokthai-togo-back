const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config')
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require("body-parser");
const { readdirSync } = require('fs');
require('dotenv').config()

// App
const app = express()
const port = process.env.PORT || 8000;

// Connect to DB
connectDB();

// Import routes
const authRoutes = require('./routes/auth')

// App middleware
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: "5mb" }));

// Routes middleware
readdirSync("./routes").map((r) => app.use("/api", require("./routes/" + r)));




app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})