const Timetable = require('../models/Timetable');
const Course = require('../models/Course');
const Staff = require('../models/Staff');
const { generateTimetable } = require('../utils/timetableGenerator');

// Get all timetables
exports.getTimetables = async (req, res) => {
  try {
    const timetables = await Timetable.find({})
      .populate({
        path: 'schedule.slots.course',
        model: 'Course'
      })
      .populate({
        path: 'schedule.slots.staff',
        model: 'Staff',
        select: 'name email'
      });
    
    res.status(200).json(timetables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single timetable
exports.getTimetableById = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate({
        path: 'schedule.slots.course',
        model: 'Course'
      })
      .populate({
        path: 'schedule.slots.staff',
        model: 'Staff',
        select: 'name email'
      });
      
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    res.status(200).json(timetable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a timetable
exports.createTimetable = async (req, res) => {
  try {
    const { name, description, workingDays, hoursPerDay } = req.body;
    
    // Create empty timetable first
    const timetable = new Timetable({
      name,
      description,
      workingDays,
      hoursPerDay,
      schedule: [] // We'll generate this after creation
    });
    
    const savedTimetable = await timetable.save();
    
    res.status(201).json(savedTimetable);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Generate timetable schedule
exports.generateSchedule = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    // Get all courses and staff
    const courses = await Course.find({});
    const staff = await Staff.find({}).populate('courses');
    console.log("Fetched Staff:", staff);
    staff.forEach(s => console.log(`Staff ${s.name} has courses:`, s.courses));

    
    if (courses.length === 0) {
      return res.status(400).json({ message: 'No courses found to schedule' });
    }
    
    if (staff.length === 0) {
      return res.status(400).json({ message: 'No staff found to assign' });
    }
    
    // Generate schedule
    const schedule = await generateTimetable({
      courses,
      staff,
      workingDays: timetable.workingDays,
      hoursPerDay: timetable.hoursPerDay
    });
    
    // Update timetable with generated schedule
    timetable.schedule = schedule;
    timetable.updatedAt = Date.now();
    
    const updatedTimetable = await timetable.save();
    
    // Return populated timetable
    const populatedTimetable = await Timetable.findById(updatedTimetable._id)
      .populate({
        path: 'schedule.slots.course',
        model: 'Course'
      })
      .populate({
        path: 'schedule.slots.staff',
        model: 'Staff',
        select: 'name email'
      });
    
    res.status(200).json(populatedTimetable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a timetable
exports.updateTimetable = async (req, res) => {
  try {
    const { name, description, workingDays, hoursPerDay } = req.body;
    
    const timetable = await Timetable.findById(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    // Update fields
    if (name) timetable.name = name;
    if (description) timetable.description = description;
    if (workingDays) timetable.workingDays = workingDays;
    if (hoursPerDay) timetable.hoursPerDay = hoursPerDay;
    
    timetable.updatedAt = Date.now();
    
    const updatedTimetable = await timetable.save();
    
    res.status(200).json(updatedTimetable);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a timetable
exports.deleteTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findByIdAndDelete(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    res.status(200).json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a specific slot in the timetable
exports.updateSlot = async (req, res) => {
  try {
    const { dayIndex, slotIndex } = req.params;
    const { courseId, staffId } = req.body;
    
    const timetable = await Timetable.findById(req.params.id);
    
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    
    // Validate day and slot indices
    if (dayIndex >= timetable.schedule.length || dayIndex < 0) {
      return res.status(400).json({ message: 'Invalid day index' });
    }
    
    if (slotIndex >= timetable.schedule[dayIndex].slots.length || slotIndex < 0) {
      return res.status(400).json({ message: 'Invalid slot index' });
    }
    
    // Update the slot
    timetable.schedule[dayIndex].slots[slotIndex].course = courseId || null;
    timetable.schedule[dayIndex].slots[slotIndex].staff = staffId || null;
    timetable.updatedAt = Date.now();
    
    await timetable.save();
    
    // Return populated timetable
    const populatedTimetable = await Timetable.findById(timetable._id)
      .populate({
        path: 'schedule.slots.course',
        model: 'Course'
      })
      .populate({
        path: 'schedule.slots.staff',
        model: 'Staff',
        select: 'name email'
      });
    
    res.status(200).json(populatedTimetable);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};