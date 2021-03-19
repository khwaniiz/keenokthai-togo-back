const express = require('express');
const router = express.Router()

// Middleware
const {authCheck, adminCheck} = require('../middlewares/auth')

// Controller
const {createUpdateUser, currentUser} = require('../controllers/auth')

router.post('/create-update-user', authCheck, createUpdateUser)
router.post('/current-user', authCheck, currentUser)
router.post('/current-admin', authCheck, adminCheck, currentUser)

module.exports = router;