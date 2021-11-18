/*
This source is shared under the terms of LGPL 3
www.gnu.org/licenses/lgpl.html

You are free to use the code in Commercial or non-commercial projects
*/

const MAX_DAYS = 90;
const SCHENGEN_PERIOD = 180;

function calculateTime()
{
    // Get a handle to the form
    const frm = document.forms["calcform"];

    // Get handle to the div with the output
    const elmWarning = document.getElementById("warning");
    elmWarning.style.display="block";

    // Get handle to the table
    const tbl = document.getElementById("tripTable");

    // Contains the trip table entered by the user plus the calculated data
    // It will be used by the function that draws the chart
    let tripData = createArray(tbl.rows.length - 1, 0)

    // Loop across all rows of the table checking the inputs and calculating the output
    // TODO: Enhance to ignore blank rows, sort (& merge?) the trips, validate overlaps and date range (entry<=exit)
    // Can the row index be removed from element ids?
    // Then rows in the middle can be deleted (or skipped) without throwing off the indexing.
    for(let tblIdx = 1; tblIdx <= tripData.length; tblIdx++) {
        const elmNumDays = document.getElementById("numDays"+tblIdx);
        elmNumDays.style.display="block";
        const elmResetStart = document.getElementById("resetStart"+tblIdx);
        elmResetStart.style.display="block";
        const elmResetEnd = document.getElementById("resetEnd"+tblIdx);
        elmResetEnd.style.display="block";

        // Grab the text in the entry and exit boxes
        let strEntryDate  = frm.elements["entrydate"+tblIdx].value;
        let strExitDate   = frm.elements["exitdate"+tblIdx].value;

        // Check to see if both have text

        if (strEntryDate == "") {
            elmWarning.innerHTML = "Please enter the date you entered the Schengen Zone into row "+tblIdx;
            return null;
        }
        if (strExitDate == "") {
            elmWarning.innerHTML = "Please enter the date you exited the Schengen Zone into row "+tblIdx;
            return null;
        }

        // Error check that the entry and exit are in the proper form
        let dtmEntryDate = parseDate(strEntryDate);
        let dtmExitDate = parseDate(strExitDate);

        if (dtmEntryDate === null) {
            elmWarning.innerHTML = "Please enter an entry date into row "+tblIdx+" in a valid format (MM/DD/YY)";
            return null;
        }
        if (dtmExitDate === null) {
            elmWarning.innerHTML = "Please enter an exit date into row "+tblIdx+" in a valid format (MM/DD/YY)";
            return null;
        }

        // Save the data (even if it already exists) in the tripData array in an array of anonymous objects
        let trip = {
            dtmEntryDate:   dtmEntryDate,
            dtmExitDate:    dtmExitDate,
            intDays:        daysBetween(dtmEntryDate, dtmExitDate),
            dtmResetStart:  new Date(dtmEntryDate).addDays(SCHENGEN_PERIOD),
            dtmResetEnd:    new Date(dtmExitDate).addDays(SCHENGEN_PERIOD)
        };
        tripData[tblIdx-1] = trip;

        elmWarning.innerHTML = "In row "+tblIdx+" entered the Zone on "+trip.dtmEntryDate.toDateString()+" and exited on "+trip.dtmExitDate.toDateString()+" a total of "+trip.intDays+" days";
        elmNumDays.innerHTML = trip.intDays;
        elmResetStart.innerHTML = trip.dtmResetStart.toDateString();
        elmResetEnd.innerHTML = trip.dtmResetEnd.toDateString();
    }

    return tripData;
}

function addRow()
{
    const tbl = document.getElementById("tripTable");
    let intCurrentIndex = tbl.rows.length;
    let intCurrentRow = tbl.insertRow(-1);

    let elmTripNo = document.createElement("div");
    elmTripNo.setAttribute("id", "tripNo" + intCurrentIndex);
    elmTripNo.innerHTML = intCurrentIndex;

    let elmEntry = document.createElement("input");
    elmEntry.setAttribute("name", "entrydate" + intCurrentIndex);
    elmEntry.setAttribute("id", "entrydate" + intCurrentIndex);
    elmEntry.setAttribute("placeholder", "DD/MM/YY");
    elmEntry.setAttribute("onblur", "calculateTime()");

    let elmExit = document.createElement("input");
    elmExit.setAttribute("name", "exitdate" + intCurrentIndex);
    elmExit.setAttribute("id", "exitdate" + intCurrentIndex);
    elmExit.setAttribute("placeholder", "DD/MM/YY");
    elmExit.setAttribute("onblur", "calculateTime()");

    let elmNumDays = document.createElement("div");
    elmNumDays.setAttribute("id", "numDays" + intCurrentIndex);

    let elmResetStart = document.createElement("div");
    elmResetStart.setAttribute("id", "resetStart" + intCurrentIndex);

    let elmResetEnd = document.createElement("div");
    elmResetEnd.setAttribute("id", "resetEnd" + intCurrentIndex);

    let cell = intCurrentRow.insertCell(-1);
    cell.appendChild(elmTripNo);

    cell = intCurrentRow.insertCell(-1);
    cell.appendChild(elmEntry);

    cell = intCurrentRow.insertCell(-1);
    cell.appendChild(elmExit);

    cell = intCurrentRow.insertCell(-1);
    cell.appendChild(elmNumDays);

    cell = intCurrentRow.insertCell(-1);
    cell.appendChild(elmResetStart);

    cell = intCurrentRow.insertCell(-1);
    cell.appendChild(elmResetEnd);
}

function removeRow() {
    const tbl = document.getElementById("tripTable");
    if(tbl.rows.length > 2) {
        tbl.deleteRow(tbl.rows.length - 1)
    }
}

function onLoad()
{
    // Load the Visualization API and the corechart package.
    google.charts.load('current', {'packages':['corechart']});
}

function genChart()
{
    const arrTripData = calculateTime() ?? [];

    if(arrTripData.length == 0) {
        document.getElementById('chart_div').style.display = 'none';
    } else {
        document.getElementById('chart_div').style.display = 'block';
        document.getElementById('warning').style.removeProperty('display');

        // Create our data table.
        const data = new google.visualization.DataTable();
        const ENABLE_FORECAST = document.getElementById('blnShowMaxDays').checked;

        // One column for the date and a column per trip
        data.addColumn('datetime', 'Date');
        data.addColumn('number', MAX_DAYS + ' Days Max');
        //data.addColumn('number', 'Day');
        arrTripData.forEach((trip, idx) => {
            data.addColumn('number', 'Trip'+(idx+1));
        })
        if(ENABLE_FORECAST) data.addColumn('number', 'Max Stay', 'forecast');

        // Need to do some work before we can populate the rows
        // Big assumption here is that the trips are in order (TODO: make sure this is true, also validate no overlaps)
        // so the first trip entry date is the first row
        // and the last trip end reset date is the last row
        const dtmRangeStart = arrTripData[0].dtmEntryDate;
        const dtmRangeEnd   = arrTripData[arrTripData.length-1].dtmResetEnd;

        // Now loop through the date range populating the active days for each trip
        let arrActiveDays = createArray(arrTripData.length, 0);
        let intFooIdx = 0;
        for(let dtmIdx = dtmRangeStart; dtmIdx <= dtmRangeEnd; dtmIdx.addDays(1)) {
            // Populate the graph
            let arrRow = [new Date(dtmIdx), MAX_DAYS];
            let intForecastDays = 0;
            if(ENABLE_FORECAST) {
                intForecastDays = forecast(arrTripData, [...arrActiveDays], dtmIdx, dtmRangeEnd);
            }
            arrActiveDays = calculateDay(arrTripData, arrActiveDays, dtmIdx);
            arrRow = arrRow.concat(arrActiveDays);
            if(ENABLE_FORECAST) {
                arrRow = arrRow.concat([intForecastDays]);
            }
            console.log("Row "+intFooIdx+" is "+arrRow);
            data.addRow(arrRow);
            intFooIdx++;
        }

        // Set chart options
        let options = {
            'title':'Active days on Schengen Zone tourist visa',
            //'width':1500,
            //'height':1200,
            'width':500,
            'height':375,
            'isStacked':true,
            'hAxis':{
                'title':'Date',
                'format':'MMM yy'
            },
            'seriesType':'area',
            'series':{
                0:{
                    'type':'line',
                    'lineDashStyle':[1,1],
                    'color':'red'
                }
            }
        };
        if(ENABLE_FORECAST) {
            options.series[data.getNumberOfColumns()-2] = {
                'type':'line',
                'lineDashStyle':[1,1],
                'color':'green',
                pointsVisible:true,
                pointSize: 1
            };
        }
        //'hAxis':{'title':'Date',
        //         'format':'M/d/y',
        //         'minValue':startDateRange,
        //         'maxValue':endDateRange}};

        // Instantiate and draw our chart, passing in some options.
        const chart = new google.visualization.ComboChart(document.getElementById('chart_div'));
        //google.visualization.events.addListener(chart, 'select', selectHandler);
        chart.draw(data, options);
    }
}

function forecast(arrTripData, arrActiveDays, dtmIdx, dtmRangeEnd) {
    // Forecast the longest stay possible beginning on the current day (dtmIdx)
    // Algorithm: Treat every day as active starting from today, and count the days
    //            between today and the day when the stay limit is reached.

    console.log("begin forecast")
    let blnBreak = false;
    let dtmForecastIdx;
    for(dtmForecastIdx = new Date(dtmIdx); dtmForecastIdx <= dtmRangeEnd; dtmForecastIdx.addDays(1)) {
        arrActiveDays = calculateDay(arrTripData, arrActiveDays, dtmForecastIdx, true);
        if (arrActiveDays.reduce(add, 0) > MAX_DAYS) {
            blnBreak = true;
            break;
        }
    }
    console.log("end forecast");

    return blnBreak ? daysBetween(dtmIdx, dtmForecastIdx) - 1 : MAX_DAYS;
}

function add(accumulator, a) {
    // using this with Array.reduce creates a sum function
    return accumulator + a;
}

Date.prototype.addDays = function(days) {
    // javascript dates are confusing.. need this for my sanity
    this.setDate(this.getDate() + parseInt(days));
    return this;
};

function parseDate(strDateText) {
    // Split the text dates into their components (assumption that format is DD-MM-YYYY)
    // Uses dashes, slashes or dots as delimiters (user could even mix them)
    // TODO: Do some bounds checking
    // TODO: Give option to enter date in US format (MM-DD-YYYY)
    const arrDateParts = /^(\d\d|\d)[\/\-\.](\d\d|\d)[\/\-\.](\d\d|\d\d\d\d)$/.exec(strDateText);
    if(arrDateParts === null) return null;

    let day    = arrDateParts[1];
    let month  = arrDateParts[2] - 1; // The months start at 0 in JS
    let year   = arrDateParts[3];
    if (year < 100) { year = parseInt(year) + 2000; }
    return new Date(year, month, day);
}

function daysBetween(dtm1, dtm2) {
    return Math.round((dtm2 - dtm1)/(1000*60*60*24)) + 1;
}

function createArray(intLength, fill=null) {
    let arr = [];
    arr.length = intLength;
    if(fill!==null) arr.fill(fill);
    return arr;
}

function calculateDay(arrTripData, arrActiveDays, dtmIdx, blnForceActive=false) {
    // Loop through the trips and update the arrActiveDays count accordingly
    arrTripData.forEach((trip, idx) => {
        if(dtmIdx >= trip.dtmEntryDate && dtmIdx <= trip.dtmExitDate) {
            arrActiveDays[idx]++;
            console.log("added an active day to trip "+(idx+1));
            blnForceActive = false; // To prevent double-counting days when blnForceActive=true
        } else
        if(dtmIdx >= trip.dtmResetStart && dtmIdx <= trip.dtmResetEnd) {
            arrActiveDays[idx]--;
            console.log("removed an active day to trip "+(idx+1));
        }
    });
    if(arrTripData.length > 0 && blnForceActive) {
        arrActiveDays[0]++;
        console.log("force-added an active day to trip 1")
    }

    return arrActiveDays;
}