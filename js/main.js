import ICAL from "./lib/ical.js";
import { TimeSlot, BusyTimeSlot } from "./TimeDataClass.js";

let rowCount = 1;

const container = document.getElementById("calendar-container");
const addBtn = document.getElementById("add-btn");
const submitButton = document.getElementById("submit-btn")

function addRow() {
    const div = document.createElement("div");
    div.className = "calendar-row";

    div.innerHTML = `
                <div class="file-input-wrapper">
                    <label for="file-${rowCount}">Calendar File ${rowCount}:</label><br>
                    <input type="file" name="calendar[]" accept=".ics" required>
                </div>
                <div class="text-input-wrapper">
                    <label for="note-${rowCount}">Note:</label><br>
                    <input type="text" name="note[]" placeholder="Name">
                </div>
            `;

    container.appendChild(div);
    rowCount++;
}

async function handleSubmit() {
    const inputFiles = document.querySelectorAll('input[name="calendar[]"]');
    const notes = document.querySelectorAll('input[name="note[]"]');

    let nameList = Array.from(notes).map(note => note.value);
    let fileNameList = Array.from(inputFiles).map(tempFile => (tempFile.files[0].name).split(".")[0]);

    let isValid = true;

    function nameFromPersonId(personId) {
        if (personId == null) throw TypeError("personID is null");
        if (nameList[personId] != "") {
            return nameList[personId];
        } else if (fileNameList[personId] != null) {
            return fileNameList[personId];
        } else {
            return personId;
        }
    };

    inputFiles.forEach((fileInput, index) => {
        if (!fileInput.files.length) {
            isValid = false;
            alert(`Please select a file for row ${index + 1}.`);
        }
    });

    if (!isValid) {
        return;
    }

    try {
        const mergedVcalendar = new ICAL.Component("vcalendar");
        let dateArray = new Array();

        mergedVcalendar.addPropertyWithValue("prodid", "//Merged Downtime Timetable Calendar//");

        for (let fileID = 0; fileID < inputFiles.length; fileID++) {
            const fileContentString = await readFileAsText(inputFiles[fileID].files[0]);
            const jcalData = ICAL.parse(fileContentString);
            const tempComponent = new ICAL.Component(jcalData);
            const allEvents = tempComponent.getAllSubcomponents("vevent");

            allEvents.forEach((event) => {
                let timeData = BusyTimeSlot.fromEvent(event, fileID);
                pushTimeSlotByDate(timeData, dateArray)
            })
        }

        for (let year in dateArray) {
            if (!dateArray[year]) continue;

            for (let day = 0; day < dateArray[year].length; day++) {
                if (dateArray[year][day] == null) continue;

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
                            `${(nameFromPersonId(personId))} is free`,
                        );

                        pendingEvents.push(eventComp);
                    }
                }

                for (const tempEvent of pendingEvents) {
                    mergedVcalendar.addSubcomponent(tempEvent);
                }
            }
        }

        // console.log(JSON.stringify(dateArray));

        console.log("finished");
        const jcalDataMerged = mergedVcalendar.toJSON();
        const icalString = ICAL.stringify(jcalDataMerged);

        downloadFile(icalString, "merged-calendar.ics");
    } catch (err) {
        console.error(err);
        alert("An error occurred while processing your calendars. Check console for details.");
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

function downloadFile(content, fileName) {
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function pushTimeSlotByDate(timeSlot, dateArray) {
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

addBtn.addEventListener("click", addRow);
submitButton.addEventListener("click", handleSubmit);

addRow();
addRow();