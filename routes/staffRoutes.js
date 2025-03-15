const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');

// Get all staff
router.get('/', staffController.getAllStaff);

// Get a specific staff member
router.get('/:id', staffController.getStaffById);

// Create a new staff member
router.post('/', staffController.createStaff);

// Update a staff member
router.put('/:id', staffController.updateStaff);

// Delete a staff member
router.delete('/:id', staffController.deleteStaff);

// Assign course to staff
router.post('/:id/assign-course', staffController.assignCourse);

// Remove course from staff
router.post('/:id/remove-course', staffController.removeCourse);

module.exports = router;