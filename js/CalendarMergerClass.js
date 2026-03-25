import ICAL from "./lib/ical.js";
import { TimeSlot, BusyTimeSlot } from "./TimeDataClass.js";

export class CalendarMerger {
    constructor(tempNameList = [], tempInputFiles = []) {
        this.setMetadata(tempNameList, tempInputFiles);
    }

    setMetadata(tempNameList, tempInputFiles) {
        this.nameList = tempNameList;
        this.inputFiles = tempInputFiles;

        // for fallback naming - file name in summary
        this.fileNameList = Array.from(tempInputFiles).map(tempFile => (tempFile.files[0].name).split(".")[0]);
    }

    async generateMergedCalendar() {
        const mergedVcalendar = new ICAL.Component("vcalendar");
        mergedVcalendar.addPropertyWithValue("prodid", "//Merged Downtime Timetable Calendar//");
        
        let dateArray = new Array(); 

        for (let fileID = 0; fileID < this.inputFiles.length; fileID++) {
            const fileContentString = await this.#readFileAsText(this.inputFiles[fileID].files[0]);
            const jcalData = ICAL.parse(fileContentString);
            const tempComponent = new ICAL.Component(jcalData);
            const allEvents = tempComponent.getAllSubcomponents("vevent");

            allEvents.forEach((event) => {
                let timeData = BusyTimeSlot.fromEvent(event, fileID);
                this.#pushTimeSlotByDate(timeData, dateArray);
            });
        }

        for (let year in dateArray) {
            if (!dateArray[year]) continue;

            for (let day = 0; day < dateArray[year].length; day++) {
                if (!dateArray[year][day]) continue;

                let dayFreeTimeSlots = TimeSlot.extractFreeTimeSlotsByPerson(dateArray[year][day]);
                let pendingEvents = [];

                for (let currentPersonId in dayFreeTimeSlots) {
                    for (let currentTimeSlot of dayFreeTimeSlots[currentPersonId]) {
                        const tempStartTime = ICAL.Time.fromJSDate(currentTimeSlot.startTime.toJSDate());
                        const tempEndTime = ICAL.Time.fromJSDate(currentTimeSlot.endTime.toJSDate());
                        const personId = currentTimeSlot.personId;

                        let eventComp = new ICAL.Component("vevent");
                        eventComp.addPropertyWithValue("dtstart", tempStartTime);
                        eventComp.addPropertyWithValue("dtend", tempEndTime);
                        eventComp.addPropertyWithValue(
                            "summary",
                            `${this.#getNameFromPersonId(personId)} is free`,
                        );

                        pendingEvents.push(eventComp);
                    }
                }

                for (const tempEvent of pendingEvents) {
                    mergedVcalendar.addSubcomponent(tempEvent);
                }
            }
        }

        const jcalDataMerged = mergedVcalendar.toJSON();
        return ICAL.stringify(jcalDataMerged);
    }

    #getNameFromPersonId(personId) {
        if (personId == null) throw TypeError("personID is null");

        if (this.nameList[personId] && this.nameList[personId] !== "") {
            return this.nameList[personId]; // use written name (note)
        }
        else if (this.fileNameList[personId]) {
            return this.fileNameList[personId]; // fallback to file name
        }
        else {
            return personId; // fallback to id
        }
    }

    #readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    #pushTimeSlotByDate(timeSlot, dateArray) {
        const year = timeSlot.year;
        const dayOfYear = timeSlot.dayOfYear;

        if (!dateArray[year]) {
            dateArray[year] = [];
        }

        if (!dateArray[year][dayOfYear]) {
            dateArray[year][dayOfYear] = [];
        }

        dateArray[year][dayOfYear].push(timeSlot);
    }
}