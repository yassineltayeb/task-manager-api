const express = require('express')
const auth = require('../middleware/auth')
const multer = require('multer')
const sharp = require('sharp')
const User = require('../models/user')
const { sendWelcomeEmail, sendCancelationEmail } = require('../emails/account')

const router = express.Router()



/* -------------------------------------------------------------------------- */
/*                                    Users                                   */
/* -------------------------------------------------------------------------- */

/* -------------------------------- Add User -------------------------------- */
router.post('/users', async (req, res) => {
    const user = new User(req.body)

    try {

        await user.save()

        sendWelcomeEmail(user.email, user.name)

        const token = await user.generateAuthToken()

        res.status(201).send({ user, token })
    } catch (error) {
        res.status(400).send(error)
    }
})

/* ------------------------------- Login User ------------------------------- */
router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.send({ user, token })
    } catch (error) {
        res.status(400).send(error)
    }
})

/* ------------------------------- Logout User ------------------------------ */
router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => token.token !== req.token)
        await req.user.save()

        res.send()
    } catch (error) {
        res.status(500).send(error)
    }
})

router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()

        res.send()
    } catch (error) {
        res.status(500).send(error)
    }
})

/* -------------------------------- Get Users ------------------------------- */
router.get('/users/me', auth, async (req, res) => {
    res.send(req.user)
})


/* -------------------------------- Get User -------------------------------- */
router.get('/users/:id', async (req, res) => {

    try {
        console.log(req.params.id)
        const user = await User.findById(req.params.id)
        if (!user) {
            res.status(404).send();
        }
        res.send(user);

    } catch (error) {
        res.status(500).send(error)
    }
})

/* ------------------------------- Update User ------------------------------ */
router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'password', 'age']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }

    try {

        updates.forEach((update) => req.user[update] = req.body[update])

        await req.user.save()

        return res.send(req.user)
    } catch (error) {
        res.status(500).send(error)
    }
})

/* ------------------------------- Delete User ------------------------------ */
router.delete('/users/me', auth, async (req, res) => {
    try {
        req.user.remove()

        sendCancelationEmail(req.user.email, req.user.name)

        res.send(req.user)
    } catch (error) {
        res.status(500).send(error)
    }
})

/* ------------------------------- User Avatar ------------------------------ */
const upload = multer({
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            cb(new Error('Please upload an image'))
        }

        cb(undefined, true)
    }
})

router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer()
    req.user.avatar = buffer
    await req.user.save()
    res.send()
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

/* ------------------------------ Delete Avatar ----------------------------- */
router.delete('/users/me/avatar', auth, async (req, res) => {
    try {
        req.user.avatar = undefined
        await req.user.save()
        res.send()
    } catch (error) {
        res.status(400).send({ error: error.message })
    }

}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

/* ---------------------------- View User Avatar ---------------------------- */
router.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
        if (!user || !user.avatar) {
            throw new Error()
        }

        res.set('Content-Type', 'image/jpg')
        res.send(user.avatar)

    } catch (error) {
        res.status(400).send()
    }
})

module.exports = router