const express = require('express')
const auth = require('../middleware/auth')
const Task = require('../models/task')

const router = express.Router()
/* -------------------------------------------------------------------------- */
/*                                    Tasks                                   */
/* -------------------------------------------------------------------------- */

/* -------------------------------- Add Task -------------------------------- */

router.post('/tasks', auth, async (req, res) => {

    const task = new Task({
        ...req.body,
        owner: req.user._id
    })

    try {
        await task.save()
        res.status(201).send(task)
    } catch (error) {
        res.status(400).send(error);
    }
})

/* -------------------------------- Get Tasks ------------------------------- */
router.get('/tasks', auth, async (req, res) => {
    const match = {}
    const sort = {}

    if (req.query.completed) {
        match.completed = req.query.completed === 'true'
    }

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }

    try {
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        })
        res.status(200).send(req.user.tasks);
    } catch (error) {
        res.status(500).send(error)
    }
})

/* -------------------------------- Get Task -------------------------------- */
router.get('/tasks/:id', auth, async (req, res) => {

    try {
        // const task = await Task.findById(req.params.id)
        console.log('here')
        console.log(req.user._id)
        const task = await Task.findOne({ _id: req.params.id, owner: req.user._id })
        console.log('sdd', task)

        if (!task) {
            res.status(404).send();
        }

        res.send(task);
    } catch (error) {
        res.status(500).send(error)
    }
})

/* ------------------------------- Update Taks ------------------------------ */
router.patch('/tasks/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['description', 'completed']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates' })
    }

    try {
        const task = await Task.findOne({ _id: req.params.id, owner: req.user._id })
        // const task = await Task.findById(req.params.id)
        // const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })

        if (!task) {
            return res.status(404).send()
        }

        updates.forEach((update) => task[update] = req.body[update])

        await task.save()

        res.send(task)
    } catch (error) {
        res.status(500).send()
    }
})

/* ------------------------------- Delete Task ------------------------------ */
router.delete('/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id })

        if (!task) {
            res.status(404).send()
        }

        res.send(task)
    } catch (error) {
        res.status(500).send()
    }
})

module.exports = router