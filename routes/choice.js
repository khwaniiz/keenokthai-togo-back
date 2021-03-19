const express = require('express');
const router = express.Router()

// Middleware
const { authCheck, adminCheck } = require('../middlewares/auth')

// controller
const {
    create,
    read,
    update,
    remove,
    list,
    getChoiceId
 
} = require("../controllers/choice");


// routes
router.post("/choice", authCheck, adminCheck, create);
router.get("/choice", list);
router.get("/choice/:slug", read);
router.get("/choices/:_id", getChoiceId);
router.put("/choice/:slug", authCheck, adminCheck, update);
router.delete("/choice/:slug", authCheck, adminCheck, remove);



module.exports = router;