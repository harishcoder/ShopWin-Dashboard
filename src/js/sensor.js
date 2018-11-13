var dataArray = [];
var sensorId = [];
var dataReport;
var start = moment().subtract(29, 'days');
var end = moment();

function cb(start, end) {
    $('#reportrange span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
    date = `${start.format('MMMM D, YYYY')} to ${end.format('MMMM D, YYYY')}`;
    detectionLogReportData(start._d.getTime(), end._d.getTime());
}

$('#reportrange').daterangepicker({
    startDate: start,
    endDate: end,
    ranges: {
        'Today': [moment(), moment()],
        'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
        'Last 7 Days': [moment().subtract(6, 'days'), moment()],
        'Last 30 Days': [moment().subtract(29, 'days'), moment()],
        'This Month': [moment().startOf('month'), moment().endOf('month')],
        'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
    }
}, cb);

cb(start, end);

function detectionLogReportData(startTime, endTime) {
    db.collection('beacon_detection_log').where("unixEntryTimestamp", ">=", startTime).where("unixEntryTimestamp", "<=", endTime)
        .get().then((snapshot) => {
            dataArrayFunction(snapshot);
        }).catch((err) => {
            console.log(err);
        })
};

function dataArrayFunction(snapshot) {
    dataArray = [];
    sensorId = [];
    snapshot.docs.forEach((doc) => {
        var sensorObject = {};
        sensorObject.majorId = doc.data().majorId;
        sensorObject.minorId = doc.data().minorId;
        sensorObject.entryTime = getFormattedDate(doc.data().unixEntryTimestamp);
        sensorObject.exitTime = getFormattedDate(doc.data().unixExitTimestamp);
        sensorObject.sensorId = doc.data().beaconUUID;
        sensorObject.userId = doc.data().userId;
        sensorObject.totalActiveTime = Math.floor((doc.data().totalActiveTimeInMillis / 60000) * 100) / 100 + " min";
        dataArray.push(sensorObject);
        sensorId.push(doc.data().minorId);
    })
    sensorId = distinctVal(sensorId);
    sensorOption(sensorId);
}

function sensorOption(id) {
    var sensorOptionTemplate = '';
    sensorOptionTemplate = `<option value="0">Choose Here...</option>
                          <option value="all">All</option>`;
    $.each(id, (index, data) => {
        sensorOptionTemplate += `<option value="${data}">${data}</option>`;
    });
    $("#sensorName").html(sensorOptionTemplate);
}

function viewReport() {
    $("#message").children().remove("p");
    dataReport = [];
    var choice = $("#sensorName").val();
    if (choice == "all") {
        dataReport = dataArray;
        reportTemplate(dataReport);
    } else if (choice == "0") {
        $("#message").append(`<p class="text-white">* Please choose the valid option.</p>`);
    } else {
        $.each(dataArray, (index, data) => {
            if (data.minorId == choice) {
                dataReport.push(data);
            }
        })
        
        reportTemplate(dataReport);
    }
}

function downloadCsv(){
    JSONToCSVConvertor(reportData,"sensorPerformance",true);
}

function JSONToCSVConvertor(JSONData, ReportTitle, ShowLabel) {
    //If JSONData is not an object then JSON.parse will parse the JSON string in an Object
    var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;

    var CSV = 'sep=,' + '\r\n\n';

    //This condition will generate the Label/Header
    if (ShowLabel) {
        var row = "";

        //This loop will extract the label from 1st index of on array
        for (var index in arrData[0]) {

            //Now convert each value to string and comma-seprated
            row += index + ',';
        }

        row = row.slice(0, -1);

        //append Label row with line break
        CSV += row + '\r\n';
    }

    //1st loop is to extract each row
    for (var i = 0; i < arrData.length; i++) {
        var row = "";

        //2nd loop will extract each column and convert it in string comma-seprated
        for (var index in arrData[i]) {
            row += '"' + arrData[i][index] + '",';
        }

        row.slice(0, row.length - 1);

        //add a line break after each row
        CSV += row + '\r\n';
    }

    if (CSV == '') {
        alert("Invalid data");
        return;
    }

    //Generate a file name
    var fileName = "MyReport_";
    //this will remove the blank-spaces from the title and replace it with an underscore
    fileName += ReportTitle.replace(/ /g, "_");

    //Initialize file format you want csv or xls
    var uri = 'data:text/csv;charset=utf-8,' + escape(CSV);

    // Now the little tricky part.
    // you can use either>> window.open(uri);
    // but this will not work in some browsers
    // or you will not get the correct file extension    

    //this trick will generate a temp <a /> tag
    var link = document.createElement("a");
    link.href = uri;

    //set the visibility hidden so it will not effect on your web-layout
    link.style = "visibility:hidden";
    link.download = fileName + ".csv";

    //this part will append the anchor tag and remove it after automatic click
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function reportTemplate(report) {
    var templateHeader = "";
    var templateBody="";
    templateHeader = `<div class="pull-right m-3">
    <button class="btn btn-primary" onclick="downloadCsv()"><i class="fas fa-upload"></i> Export</button>
    <button class="btn btn-danger" onclick="closeReport()"><i class="fas fa-times-circle"></i> Close</button>
    </div>
        <table class="table " id="reportTable">
            <thead>
                <tr class="bg-dark text-white">
                    <th scope="col">Sensor Id</th>
                    <th scope="col">UserId</th>
                    <th scope="col">Entry Time</th>
                    <th scope="col">Exit Time</th>
                    <th scope="col">Total Active time</th>
                </tr>
            </thead>
            <tbody id="reportBody">

            </tbody>
        </table>
                            `;
        $("#reportData").html(templateHeader);

        $.each(report,(index,data)=>{
            templateBody+=`<tr><td>${data.sensorId}</td>
            <td>${data.userId}</td>
            <td>${data.entryTime}</td>
            <td>${data.exitTime}</td>
            <td>${data.totalActiveTime}</td></tr>`;
        })
        $("#reportBody").html(templateBody);
        $("#reportTable").DataTable();
}



function getFormattedDate(timestamp) {
    var date = new Date(timestamp);

    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();

    month = (month < 10 ? "0" : "") + month;
    day = (day < 10 ? "0" : "") + day;
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;

    var str = day + "-" + month + "-" + date.getFullYear() + "_" +  hour + ":" + min + ":" + sec;
    return str;
}

function closeReport(){
    $("#reportData").html(' ');
}

function distinctVal(arr){
    var newArray = [];
    for(var i=0, j=arr.length; i<j; i++){
        if(newArray.indexOf(arr[i]) == -1)
              newArray.push(arr[i]);  
    }
    return newArray;
}