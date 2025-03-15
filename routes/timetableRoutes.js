const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');

// Get all timetables
router.get('/', timetableController.getTimetables);

// Get a specific timetable
router.get('/:id', timetableController.getTimetableById);

// Create a new timetable
router.post('/', timetableController.createTimetable);

// Generate schedule for a timetable
router.post('/:id/generate', timetableController.generateSchedule);

// Update a timetable
router.put('/:id', timetableController.updateTimetable);

// Delete a timetable
router.delete('/:id', timetableController.deleteTimetable);

// Update a specific slot in the timetable
router.put('/:id/slot/:dayIndex/:slotIndex', timetableController.updateSlot);

module.exports = router;