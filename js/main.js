import { CalendarMerger } from "./CalendarMergerClass.js";

const container = document.getElementById("calendar-container");
const addBtn = document.getElementById("add-btn");
const submitButton = document.getElementById("submit-btn")

let rowCount = 1;

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
    let calendarMerger = new CalendarMerger();

    const inputFiles = document.querySelectorAll('input[name="calendar[]"]');
    const notes = document.querySelectorAll('input[name="note[]"]');

    let nameList = Array.from(notes).map(note => note.value);

    let isValid = true;

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
        calendarMerger.setMetadata(nameList, inputFiles)
        const icalString = await calendarMerger.generateMergedCalendar();
        downloadFile(icalString, "merged-calendar.ics");
    } catch (err) {
        console.error(err);
        alert("An error occurred while processing your calendars. Check console for details.");
    }
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

addBtn.addEventListener("click", addRow);
submitButton.addEventListener("click", handleSubmit);

addRow();
addRow();