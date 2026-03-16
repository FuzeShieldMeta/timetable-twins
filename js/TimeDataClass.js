import { DateTime } from "./lib/luxon.mjs";

export class TimeSlot {
	#MAX_END_HOUR = 20;
	#MAX_START_HOUR = 8;

	constructor(startTime, endTime, personId) {
		this.personId = personId;

		this.startTime = startTime;
		this.endTime = endTime;
	}

	get year() {
		return this.startTime.year;
	}

	get dayOfYear() {
		return this.startTime.ordinal;
	}

	static #sortTimeSlotsArrayByStartDate(timeSlotArray) {
		const sortedSlots = [...timeSlotArray].sort(
			(a, b) => a.startTime.toUnixInteger() - b.startTime.toUnixInteger(),
		); // we don't need millisecond precision here
		return sortedSlots;
	}

	static extractFreeTimeSlotsPerPerson(timeSlotArray) {
		const sortedSlots = this.#sortTimeSlotsArrayByStartDate(timeSlotArray);

		let freeSlots = [];

		for (let i = 0; i < sortedSlots.length - 1; i++) {
			const currentEnd = sortedSlots[i].endTime;
			const nextStart = sortedSlots[i + 1].startTime;

			const gapDuration = nextStart.diff(currentEnd, "minutes").minutes;

			if (gapDuration > 0) {
				freeSlots.push(
					new TimeSlot(currentEnd, nextStart, sortedSlots[i].personId),
				);
			}
		}
		return freeSlots;
	}

	static extractPersonSlotsFromDay(dayArray) {
		let slotsByPerson = {};

		for (const timeSlot of dayArray) {
			if (!slotsByPerson[timeSlot.personId]) {
				slotsByPerson[timeSlot.personId] = [];
			}
			slotsByPerson[timeSlot.personId].push(timeSlot);
		}
		return slotsByPerson;
	}

	static extractFreeTimeSlotsByPerson(dayArray) {
		const slotsByPerson = TimeSlot.extractPersonSlotsFromDay(dayArray);

		let freeSlotsByPerson = {};

		for (const personId in slotsByPerson) {
			if (!personId) continue;

			const currentTimeSlots = slotsByPerson[personId];
			let freeSlots = TimeSlot.extractFreeTimeSlotsPerPerson(currentTimeSlots);
			freeSlotsByPerson[personId] = freeSlots;
		}
		return freeSlotsByPerson;
	}
}

export class BusyTimeSlot extends TimeSlot {
	constructor(currentStartICALTime, currentEndICALTime, personId) {
		let currentStartDateTime = DateTime.fromJSDate(
			currentStartICALTime.toJSDate(),
			{ zone: "utc" },
		);
		let currentEndDateTime = DateTime.fromJSDate(
			currentEndICALTime.toJSDate(),
			{ zone: "utc" },
		);

		let startAuckland = currentStartDateTime.setZone("Pacific/Auckland");
		let endAuckland = currentEndDateTime.setZone("Pacific/Auckland");

		super(startAuckland, endAuckland, personId);
	}

	static fromEvent(event, personId) {
		const currentStartDate = event.getFirstPropertyValue("dtstart");
		const currentEndDate = event.getFirstPropertyValue("dtend");
		const timeData = new BusyTimeSlot(currentStartDate, currentEndDate, personId);
		return timeData;
	}
}