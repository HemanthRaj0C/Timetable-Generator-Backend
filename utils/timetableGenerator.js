/**
 * Generates a timetable based on courses, staff, and constraints
 * 
 * @param {Object} params - Parameters for timetable generation
 * @param {Array} params.courses - List of courses to schedule
 * @param {Array} params.staff - List of staff members
 * @param {Array} params.workingDays - List of working days
 * @param {Number} params.hoursPerDay - Number of hours per day
 * @returns {Object} - Generated timetable
 */
const generateTimetable = async (params) => {
    const { courses, staff, workingDays, hoursPerDay } = params;
    
    // Default time slots (1 hour each)
    const defaultTimeSlots = [
      { start: '09:00', end: '10:00' },
      { start: '10:00', end: '11:00' },
      { start: '11:00', end: '12:00' },
      { start: '12:00', end: '13:00' },
      { start: '13:00', end: '14:00' },
      { start: '14:00', end: '15:00' },
      { start: '15:00', end: '16:00' },
      { start: '16:00', end: '17:00' },
    ];
    
    // Use only the required number of slots per day
    const timeSlots = defaultTimeSlots.slice(0, hoursPerDay);
    
    // Initialize empty schedule for each working day
    const schedule = workingDays.map(day => {
      return {
        day,
        slots: timeSlots.map(time => ({
          time,
          course: null,
          staff: null
        }))
      };
    });
    
    // Map of staff availability
    const staffAvailability = {};
    staff.forEach(s => {
      staffAvailability[s._id.toString()] = {
        availableDays: s.availableDays,
        assignedHours: 0,
        maxHours: s.availableHoursPerDay * s.availableDays.length
      };
    });
    
    // Map courses to staff members
    const courseStaffMap = {};
    staff.forEach(s => {
      s.courses.forEach(courseId => {
        const courseIdStr = courseId.toString();
        if (!courseStaffMap[courseIdStr]) {
          courseStaffMap[courseIdStr] = [];
        }
        courseStaffMap[courseIdStr].push(s._id.toString());
      });
    });
    
    // Sort courses by hours per week (descending) to schedule larger courses first
    const sortedCourses = [...courses].sort((a, b) => b.hoursPerWeek - a.hoursPerWeek);
    
    // Iterate through each course and assign slots
    for (const course of sortedCourses) {
      let hoursAssigned = 0;
      const courseId = course._id.toString();
      const staffIds = courseStaffMap[courseId] || [];
      
      if (staffIds.length === 0) {
        console.warn(`No staff assigned to course: ${course.name}`);
        continue;
      }
      
      // Try to distribute course hours across preferred days
      let preferredDays = course.preferredDays || workingDays;
      
      // Ensure we only use days that are actually in the working days
      preferredDays = preferredDays.filter(day => workingDays.includes(day));
      
      // If no valid preferred days, use all working days
      if (preferredDays.length === 0) {
        preferredDays = workingDays;
      }
      
      // Loop until we've assigned all hours for this course
      while (hoursAssigned < course.hoursPerWeek) {
        let assigned = false;
        
        // Try each preferred day
        for (const day of preferredDays) {
          if (hoursAssigned >= course.hoursPerWeek) break;
          
          // Find the day in the schedule
          const daySchedule = schedule.find(s => s.day === day);
          if (!daySchedule) continue;
          
          // Try each time slot in the day
          for (let slotIndex = 0; slotIndex < daySchedule.slots.length; slotIndex++) {
            if (hoursAssigned >= course.hoursPerWeek) break;
            
            const slot = daySchedule.slots[slotIndex];
            
            // Skip if slot is already assigned
            if (slot.course) continue;
            
            // Find an available staff member for this slot
            let assignedStaffId = null;
            
            for (const staffId of staffIds) {
              const staffAvail = staffAvailability[staffId];
              
              // Check if staff is available on this day and has hours left
              if (staffAvail.availableDays.includes(day) && 
                  staffAvail.assignedHours < staffAvail.maxHours) {
                assignedStaffId = staffId;
                staffAvail.assignedHours++;
                break;
              }
            }
            
            // If we found an available staff member, assign the slot
            if (assignedStaffId) {
              daySchedule.slots[slotIndex] = {
                ...slot,
                course: course._id,
                staff: assignedStaffId
              };
              
              hoursAssigned++;
              assigned = true;
            }
          }
        }
        
        // If we couldn't assign any more slots, break to avoid infinite loop
        if (!assigned) {
          console.warn(`Could only assign ${hoursAssigned}/${course.hoursPerWeek} hours for course: ${course.name}`);
          break;
        }
      }
    }
    
    return schedule;
  };
  
  module.exports = { generateTimetable };