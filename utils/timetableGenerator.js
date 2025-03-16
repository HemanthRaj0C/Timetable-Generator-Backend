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
        { start: '08:00', end: '09:00' },
        { start: '09:00', end: '10:00' },
        { start: '10:00', end: '11:00' },
        { start: '11:00', end: '12:00' },
        { start: '12:00', end: '13:00' },
        { start: '13:00', end: '14:00' },
        { start: '14:00', end: '15:00' },
    ];

    // Use only the required number of slots per day
    const timeSlots = defaultTimeSlots.slice(0, hoursPerDay);

    // Initialize an empty schedule for each working day
    const schedule = workingDays.map(day => ({
        day,
        slots: timeSlots.map(time => ({
            time,
            course: null,
            staff: null
        }))
    }));

    // Map of staff availability
    const staffAvailability = {};
    staff.forEach(s => {
        staffAvailability[s._id.toString()] = {
            availableDays: s.availableDays || workingDays,
            assignedHours: 0,
            maxHours: (s.availableHoursPerDay || hoursPerDay) * (s.availableDays?.length || workingDays.length)
        };
    });

    console.log("Staff Availability:", staffAvailability);

    // Map courses to staff members
    const courseStaffMap = {};
    staff.forEach(s => {
        s.courses.forEach(course => {
            const courseIdStr = course._id.toString();
            if (!courseStaffMap[courseIdStr]) {
                courseStaffMap[courseIdStr] = [];
            }
            courseStaffMap[courseIdStr].push(s._id.toString());
        });
    });

    console.log("Course Staff Mapping:", courseStaffMap);

    // Sort courses by hours per week (descending) to prioritize scheduling larger courses first
    const sortedCourses = [...courses].sort((a, b) => b.hoursPerWeek - a.hoursPerWeek);
    console.log("Sorted Courses:", sortedCourses.map(c => `${c.name} (${c.hoursPerWeek} hrs)`));

    // Iterate through each course and assign slots
    for (const course of sortedCourses) {
        let hoursAssigned = 0;
        const courseId = course._id.toString();
        const staffIds = courseStaffMap[courseId] || [];

        if (staffIds.length === 0) {
            console.warn(`No staff assigned to course: ${course.name}`);
            continue;
        }

        let preferredDays = course.preferredDays || workingDays;
        preferredDays = preferredDays.filter(day => workingDays.includes(day));

        if (preferredDays.length === 0) {
            preferredDays = workingDays;
        }

        console.log(`Assigning course "${course.name}" (${course.hoursPerWeek} hours) to preferred days:`, preferredDays);

        while (hoursAssigned < course.hoursPerWeek) {
            let assigned = false;

            for (const day of preferredDays) {
                if (hoursAssigned >= course.hoursPerWeek) break;

                const daySchedule = schedule.find(s => s.day === day);
                if (!daySchedule) continue;

                let lastAssignedCourse = null; // Track last assigned course in the day's slots

                for (let slotIndex = 0; slotIndex < daySchedule.slots.length; slotIndex++) {
                    if (hoursAssigned >= course.hoursPerWeek) break;

                    const slot = daySchedule.slots[slotIndex];
                    if (slot.course) {
                        lastAssignedCourse = slot.course; // Store last assigned course
                        continue; // Skip if already assigned
                    }

                    // Ensure no consecutive slots have the same course
                    if (lastAssignedCourse === course._id) {
                        console.log(`Skipping consecutive slot for "${course.name}" on ${day}`);
                        lastAssignedCourse = null; // Reset to allow next course
                        continue;
                    }

                    let assignedStaffId = null;

                    for (const staffId of staffIds) {
                        const staffAvail = staffAvailability[staffId];

                        if (staffAvail.availableDays.includes(day) &&
                            staffAvail.assignedHours < staffAvail.maxHours) {
                            assignedStaffId = staffId;
                            staffAvail.assignedHours++;
                            break;
                        }
                    }

                    if (assignedStaffId) {
                        slot.course = course._id;
                        slot.staff = assignedStaffId;
                        hoursAssigned++;
                        assigned = true;

                        lastAssignedCourse = course._id; // Update last assigned course for next slot
                        console.log(`Assigned "${course.name}" to ${day} (${slot.time.start} - ${slot.time.end}) with staff ${assignedStaffId}`);
                    }
                }
            }

            if (!assigned) {
                console.warn(`Could only assign ${hoursAssigned}/${course.hoursPerWeek} hours for course: ${course.name}`);
                break;
            }
        }
    }

    console.log("Final Generated Schedule:", JSON.stringify(schedule, null, 2));

    return schedule;
};

module.exports = { generateTimetable };
