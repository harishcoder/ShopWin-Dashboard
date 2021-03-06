$(function () {
    var userArray;
    var deviceArray;
    var oldUserArray;
    var date;
    var lineChart;
    var myPieChart;
    var myBarChart;
    var avgTimeChart;
    var newUser;
    var sumCurr;
    var userMale;
    var userFemale;
    var count = 0;
    var config;
    var activeTimeOfEachSensors;
    var offerUserArray = [];
    var start = moment().subtract(29, 'days');
    var end = moment();

    function cb(start, end) {
        $('#reportrange span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
        date = `${start.format('MMMM D, YYYY')} to ${end.format('MMMM D, YYYY')}`;
        $(".loadingImage").show();
        if (count != 0) {
            lineChart.destroy();
        }
        $("#loadingIcon").show();
        $(".loadingImage").siblings().remove();
        detectionLogApiByDate(start._d.getTime(), end._d.getTime());
        detectionLogOldData(start._d.getTime(), end._d.getTime());
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

    function detectionLogApiByDate(startTime, endTime) {
        if (count != 0) {
            myPieChart.destroy();
            myBarChart.destroy();
            avgTimeChart.destroy();
        }
        db.collection('beacon_detection_log').where("unixEntryTimestamp", ">=", startTime).where("unixEntryTimestamp", "<=", endTime)
            .get().then((snapshot) => {
                numberOfUserConnected(snapshot);
                numberOfDevicesActive(snapshot);
                averageTime(snapshot);
                chartDeviceArray(snapshot, startTime, endTime);
                pieChartArray(snapshot);
                newUserVsOldUserArray(startTime);
                AverageTimeOnEachSensors(snapshot);
                offerArray();
            }).catch((err) => {
                console.log(err);
            })
    };

    function detectionLogOldData(startTime, endTime) {
        var duration = convertTimestampToDays(startTime, endTime);
        if (duration == 1) {
            db.collection('beacon_detection_log').where("unixEntryTimestamp", ">", startTime - 86400000).where("unixEntryTimestamp", "<", startTime).get().then((snapshot) => {
                numberOfUsersOld(snapshot, duration);
                newUserAndOldUser(startTime - 86400000, duration);
                averageTimeOld(snapshot, duration);
                userMaleFemaleOld(snapshot, duration);
            });
        } else if (duration <= 7 && duration > 1) {
            db.collection('beacon_detection_log').where("unixEntryTimestamp", ">", startTime - (86400000 * 7)).where("unixEntryTimestamp", "<", startTime).get().then((snapshot) => {
                numberOfUsersOld(snapshot, duration);
                newUserAndOldUser(startTime - 86400000, duration);
                averageTimeOld(snapshot, duration);
                userMaleFemaleOld(snapshot, duration);
            });
        } else {
            var endTime = startTime - (86400000 * 30);
            db.collection('beacon_detection_log').where("unixEntryTimestamp", ">", endTime).where("unixEntryTimestamp", "<", startTime).get().then((snapshot) => {
                numberOfUsersOld(snapshot, duration);
                newUserAndOldUser(startTime - 86400000, duration);
                averageTimeOld(snapshot, duration);
                userMaleFemaleOld(snapshot, duration);
            });
        }

    }

    function numberOfUsersOld(snapshot, duration) {
        oldUserArray = [];
        snapshot.docs.forEach((doc) => {
            oldUserArray.push(doc.data().userId);
        })
        oldUserArray = distinctVal(oldUserArray);
        var difference = userArray.length - oldUserArray.length;
        if (oldUserArray.length == 0) {
            var percentage = difference * 100;
        } else {
            var percentage = Math.floor((difference / oldUserArray.length) * 100);
        }
        if (difference > 0 ) {
            $(".totalUsers").html(`<h6 style="color:green; font-size:11px;"><i class="fas fa-caret-up"></i> ${percentage} % </h6>`);
        } else {
            $(".totalUsers").html(`<h6 style="color:#EF2928; font-size:11px;"><i class="fas fa-caret-down"></i> ${percentage} % </h6>`);
        }
    }

    function newUserAndOldUser(start, duration) {
        var userArrayOld = [];
        var oldUser = [];
        var newUser = [];
        db.collection("beacon_detection_log").where("unixEntryTimestamp", "<", start).get().then((snapshot) => {
            snapshot.docs.forEach((doc) => {
                userArrayOld.push(doc.data().userId);
            })
            userArrayOld = distinctVal(userArray);
            $.each(oldUserArray, (index, data) => {
                if ($.inArray(data, userArrayOld) != -1) {
                    oldUser.push(data);
                } else {
                    newUser.push(data);
                }
            })
            newUserAndOldUserTemplate(newUser, duration);
        })
    }

    function newUserAndOldUserTemplate(user, duration) {
        var difference = newUser.length - user.length;
        if (user.length == 0) {
            var percentage = difference * 100;
        } else {
            var percentage = Math.floor((difference / user.length) * 100);
        }
        if (difference > 0 ) {
            $(".newUser").html(`<h6 style="color:green; font-size:11px;"><i class="fas fa-caret-up"></i> ${percentage} % </h6>`);
        } else {
            $(".newUser").html(`<h6 style="color:#EF2928; font-size:11px;"><i class="fas fa-caret-down"></i> ${percentage} % </h6>`);
        }
    }

    function numberOfUserConnected(data) {
        userArray = [];
        data.docs.forEach((doc) => {
            userArray.push(doc.data().userId);
        })
        userArray = distinctVal(userArray);
        userData(userArray);
        $(".loadingImage").hide();
        console.log(userArray);
        $("#totalUsers").html(`${userArray.length}`);
    }

    function numberOfDevicesActive(data) {
        deviceArray = [];
        data.docs.forEach((doc) => {
            deviceArray.push(doc.data().minorId);
        });
        deviceArray = distinctVal(deviceArray);
        $("#sensorsCount").html(`${deviceArray.length}`);
    }

    function totalAverageTime(snapshot) {
        var totalTime = [];
        var sum = 0;
        snapshot.docs.forEach((doc) => {
            totalTime.push(doc.data().totalActiveTimeInMillis);
        })
        $.each(totalTime, (index, data) => {
            sum += data;
        })
        sum = convertToMin(sum);
        return sum;
    }

    function averageTime(snapshot) {
        sumCurr = totalAverageTime(snapshot);
        sumCurr = Math.floor((sumCurr / userArray.length));
        $("#totalAverageTime").html(`<h2>${sumCurr} <span class="text-muted" style="font-size:10px;">min</span></h2> `);
    }

    function averageTimeOld(snapshot, duration) {
        var sumOld = totalAverageTime(snapshot);
        sumOld = Math.floor((sumOld / userArray.length) * 100) / 100;
        var difference = sumCurr - sumOld;

        if (sumOld == 0) {
            var percentage = Math.floor(difference) * 100;
        } else {
            var percentage = Math.floor((difference / sumOld) * 100);
        }
        if (difference > 0 ) {
            $(".totalAverageTime").html(`<h6 style="color:green; font-size:11px;"><i class="fas fa-caret-up"></i> ${percentage} % </h6>`);
        } else {
            $(".totalAverageTime").html(`<h6 style="color:#EF2928; font-size:11px;"><i class="fas fa-caret-down"></i> ${percentage} % </h6>`);
        }
    }

    function userMaleFemaleOld(snapshot, duration) {
        var userArrayOld = [];
        snapshot.docs.forEach((doc) => {
            userArrayOld.push(doc.data().userId);
        })
        userArrayOld = distinctVal(userArrayOld);

        var userMaleOld = [];
        var userFemaleOld = [];

        db.collection("users").get().then((snapshot) => {
            $.each(userArrayOld, (index, data) => {
                snapshot.docs.forEach((doc) => {
                    if (doc.data().userId == data) {
                        if (doc.data().Gender == "Male") {
                            userMaleOld.push(doc.data().Gender);
                        } else {
                            userFemaleOld.push(doc.data().Gender);
                        }
                    }
                })
            })
            userMaleFemaleOldTemplate(userMaleOld, userFemaleOld, duration);
        })
    }

    function userMaleFemaleOldTemplate(male, female, duration) {
        var differenceMale = userMale.length - male.length;
        var differenceFemale = userFemale.length - female.length;
        if (male.length == 0) {
            var percentageMale = differenceMale * 100;
        } else {
            var percentageMale = Math.floor((differenceMale / male.length) * 100);
        }
        if (female.length == 0) {
            var percentageFemale = differenceFemale * 100;
        } else {
            var percentageFemale = Math.floor((differenceFemale / female.length) * 100);
        }

        userMaleTemplate(differenceMale, percentageMale, duration);
        userFemaleTemplate(differenceFemale, percentageFemale, duration);
    }

    function userMaleTemplate(difference, percentage, duration) {
        if (difference > 0 ) {
            $(".maleCount").html(`<h6 style="color:green; font-size:11px;"><i class="fas fa-caret-up"></i> ${percentage} % </h6>`);
        } else {
            $(".maleCount").html(`<h6 style="color:#EF2928; font-size:11px;"><i class="fas fa-caret-down"></i> ${percentage} % </h6>`);
        }
    }

    function userFemaleTemplate(difference, percentage, duration) {
        if (difference > 0 ) {
            $(".femaleCount").html(`<h6 style="color:green; font-size:11px;"><i class="fas fa-caret-up"></i> ${percentage} % </h6>`);
        } else {
            $(".femaleCount").html(`<h6 style="color:#EF2928; font-size:11px;"><i class="fas fa-caret-down"></i> ${percentage} % </h6>`);
        }
    }


    function chartDeviceArray(snapshot, startTime, endTime) {
        var duration = convertTimestampToDays(startTime, endTime);
        var hours = convertTimestampToHours(startTime, endTime);
        var diff;
        if (duration == 1) {
            diff = 3600000;
            count = 1;
            createDataArray(snapshot, hours, diff, startTime, count, duration);

        } else if (duration > 1 && duration < 4) {
            diff = 21600000;
            count = 6;
            createDataArray(snapshot, hours, diff, startTime, count, duration);

        } else if (duration >= 4 && duration <= 31) {
            diff = 86400000;
            count = 1;
            createDataArray(snapshot, duration, diff, startTime, count, duration);
        }
    }


    function createDataArray(snapshot, hours, diff, startTime, count, duration) {
        var time;
        var userHour
        var xTime;
        var yUser;
        var finalData = [];
        $.each(deviceArray, (index, data) => {
            finalData.push(data);
            xTime = [];
            yUser = [];
            for (var i = 0; i < hours; i += count) {
                userHour = [];

                if (i != 0) {
                    time += diff;
                } else {
                    time = startTime;
                }
                if (duration == 1) {
                    xTime.push(getTime(time));
                } else if (duration > 1 && duration < 4) {
                    xTime.push(getTimeWithDate(time));
                } else if (duration >= 4 && duration <= 31) {
                    xTime.push(getDate(time));
                }

                //  console.log(time);
                snapshot.docs.forEach((doc) => {

                    if (doc.data().minorId == data && doc.data().unixEntryTimestamp > time && doc.data().unixEntryTimestamp < (time + diff)) {
                        userHour.push(doc.data().userId);
                    }
                })
                yUser.push(distinctVal(userHour).length);
            }
            finalData[index] = {
                xTime: xTime,
                yUser: yUser
            }
        })
        createDeviceChart(finalData);
    }

    function createDeviceChart(lineData) {
        var color = ['rgba(255, 99, 132, 0.9)',
            'rgba(54, 162, 235, 0.9)',
            'rgba(255, 206, 86, 0.9)',
            'rgba(75, 192, 192, 0.9)',
            'rgba(153, 102, 255, 0.9)',
            'rgba(255, 159, 64, 0.9)'];
        config = {};
        config.type = "line";

        config.data = {};
        config.options = {};
        config.options.title = {};
        config.options.elements ={};
        config.options.elements.point ={};
        config.options.elements.point.radius =0;
        config.options.maintainAspectRatio=true;
        config.options.title.display = "true";
        config.options.legend = {};
        config.options.layout = {};
        config.options.layout.padding = 20;
        config.options.legend.display = true;
        config.options.legend.position = "bottom";
        config.options.legend.padding = 20;
        config.options.scales = {};
        config.options.scales.xAxes = [];
        config.options.scales.yAxes = [];
        var xLabel = {};
        var yLabel = {};
        xLabel.scaleLabel = {};
        xLabel.gridLines = {};
        xLabel.scaleLabel.display = true;
        xLabel.scaleLabel.labelString = "Time in Hrs/Days";
        xLabel.scaleLabel.fontColor = "black";
        xLabel.scaleLabel.fontSize = 12;
        xLabel.scaleLabel.fontFamily = "Poppins";
        xLabel.scaleLabel.padding = 5;
        xLabel.gridLines.display = false;
        yLabel.ticks = {};
        yLabel.ticks.min = 0;
        yLabel.ticks.beginAtZero = true;
        yLabel.ticks.stepSize = 1;
        yLabel.scaleLabel = {};
        yLabel.scaleLabel.display = true;
        yLabel.scaleLabel.labelString = "Number of Users";
        yLabel.scaleLabel.fontColor = "black";
        yLabel.scaleLabel.fontSize = 12;
        yLabel.scaleLabel.padding = 5;
        yLabel.scaleLabel.fontFamily = "Poppins";
        config.options.scales.xAxes.push(xLabel);
        config.options.scales.yAxes.push(yLabel);
        config.options.maintainAspectRatio = "false";
        config.data.labels = lineData[0].xTime;
        config.data.datasets = [];
        $.each(deviceArray, (index, data) => {
            var dataProperty = {};
            dataProperty.label = data;
            dataProperty.borderWidth = 2;
            dataProperty.fill = false;
            dataProperty.backgroundColor = color[index];
            dataProperty.borderColor = color[index];
            dataProperty.data = lineData[index].yUser;
            config.data.datasets.push(dataProperty);
        })
        var ctx = document.getElementById('myChart').getContext("2d");
        ctx.canvas.width = 180;
        ctx.canvas.height = 50;
        lineChart = new Chart(ctx, config);
    }

    $("#addWidget").click(()=>{
       var chartType =  $("#charts").val();
       lineChart.destroy();
       config.type = `${chartType}`;
       var ctx = document.getElementById('myChart').getContext("2d");
       lineChart = new Chart(ctx,config);
    })
    function pieChartArray(snapshot) {
        var totalTimeBySensors = [];
        var totalTimeByPercentage = [];
        $.each(deviceArray, (index, data) => {
            var sum = 0;
            var timeInMillis = [];
            snapshot.docs.forEach((doc) => {
                if (doc.data().minorId == data) {
                    timeInMillis.push(doc.data().totalActiveTimeInMillis);
                }
            })
            $.each(timeInMillis, (index, data) => {
                sum += data;
            })
            totalTimeBySensors.push(sum);
        })
        activeTimeOfEachSensors = totalTimeBySensors;
        var sensorsSum = 0;
        $.each(totalTimeBySensors, (index, data) => {
            sensorsSum += data;
        })
        $.each(totalTimeBySensors, (index, data) => {
            totalTimeByPercentage.push(Math.floor(((data / sensorsSum) * 100) * 100) / 100);
        })
        createPieChart(totalTimeByPercentage);
    }

    function createPieChart(time) {
        var ctx = document.getElementById("myPieChart").getContext('2d');
        myPieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: deviceArray,
                datasets: [{
                    label: 'contribution of sensors in percentage',
                    data: time,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)',
                        'rgba(255, 159, 64, 0.5)'
                    ],
                    borderColor: [
                        'rgba(255,99,132,1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                layout:{
                    padding:10
                },
                responsive: true,
                title: {
                    display: true,
                    text: "Contribution in Percentage",
                    fontFamily: "Poppins",
                    fontSize: 20,
                    position:"bottom",
                    fontStyle:"none"
                },
                legend: {
                    display: false,
                    position: "right"
                },
                tooltips: {
                    callbacks: {
                        label: function (tooltipItem, chartData) {
                            return chartData.labels[tooltipItem.index] + ': ' + chartData.datasets[0].data[tooltipItem.index] + '%';
                        }
                    }
                }
            }
        });
    }

    function newUserVsOldUserArray(startTime) {
        newUser = [];
        var oldUser = [];
        var oldUserData = [];
        db.collection('beacon_detection_log').where("unixEntryTimestamp", "<", startTime).get()
            .then((snapshot) => {
                snapshot.docs.forEach((doc) => {
                    oldUserData.push(doc.data().userId);
                })
                oldUserData = distinctVal(oldUserData);
                $.each(userArray, (index, data) => {
                    if ($.inArray(data, oldUserData) != -1) {
                        oldUser.push(data);
                    } else {
                        newUser.push(data);
                    }
                })
                $("#newUser").html(`${newUser.length}`);
                createNewUserVsOldUserChart(newUser, oldUser);
            })
    }

    function createNewUserVsOldUserChart(newUser, oldUser) {
        var ctx = document.getElementById("myBarChart").getContext('2d');
        myBarChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ["New Users", "Old Users"],
                datasets: [{
                    label: 'New vs Old',
                    data: [newUser.length, oldUser.length],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(255, 159, 64, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255,99,132,1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(255, 159, 64, 0.2)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio:false,
                scales: {
                    yAxes: [{
                        ticks: {
                            min: 0,
                            beginAtZero: true,
                            stepSize: 1
                        },
                        scaleLabel: {
                            display: true,
                            labelString: "Number Of Users",
                            fontFamily: "Poppins"
                        }
                    }]
                },
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: "New Users Vs Old Users",
                    fontFamily: "Poppins",
                    fontSize: 20,
                    position:"bottom",
                    padding:20,
                    fontStyle:"none"
                }
            }
        });
    }

    function AverageTimeOnEachSensors(snapshot) {
        var usersCountArray = [];
        var avgTimeOfEachSensors = [];
        var result;
        $.each(deviceArray, (index, data) => {
            var users = [];
            snapshot.docs.forEach((doc) => {
                if (doc.data().minorId == data) {
                    users.push(doc.data().userId);
                }
            })
            usersCountArray.push(distinctVal(users).length);
        })
        for (var i = 0; i < deviceArray.length; i++) {
            activeTimeOfEachSensors[i] = convertToMin(activeTimeOfEachSensors[i]);
            result = Math.floor((activeTimeOfEachSensors[i] / usersCountArray[i]) * 100) / 100;
            avgTimeOfEachSensors.push(result);
        }
        createAvgTimeChart(avgTimeOfEachSensors);
    }

    function createAvgTimeChart(time) {
        var ctx = document.getElementById("avgTimeChart").getContext('2d');
        avgTimeChart = new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels: deviceArray,
                datasets: [{
                    label: 'Avg. Active Time',
                    data: time,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.9)',
                        'rgba(54, 162, 235, 0.9)',
                        'rgba(153, 102, 255, 0.9)',
                        'rgba(255, 159, 64, 0.9)'
                    ],
                    borderColor: [
                        'rgba(255,99,132,1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                legend: {
                    display: false,
                    position: "right",

                },
                title: {
                    display: true,
                    text: "Avg. Active Time in min",
                    fontSize: 20,
                    fontFamily: "Poppins",
                    position:"bottom",
                    fontStyle:"none"
                },
                tooltips: {
                    callbacks: {
                        label: function (tooltipItem, chartData) {
                            return chartData.labels[tooltipItem.index] + ': ' + chartData.datasets[0].data[tooltipItem.index] + " min";
                        }
                    }
                }

            }
        });
    }

    function convertTimestampToDays(start, end) {
        var time = end - start;
        return Math.floor(time / (1000 * 60 * 60 * 24)) + 1;
    }

    function convertTimestampToHours(start, end) {
        var time = end - start;
        return Math.floor(time / (60 * 60 * 1000)) + 1;
    }

    function convertToMin(data) {
        return Math.floor((data / 60000) * 100) / 100;
    }

    function getTimeWithDate(timestamp) {
        var date = new Date(timestamp);
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var dateNum = date.getDate();
        var month = months[date.getMonth()];
        var hour = hours < 9 ? "0" + hours : hours;
        var min = minutes < 9 ? "0" + minutes : minutes;
        return (`${dateNum}-${month} ${hour}:${min}`);
    }

    function getTime(timestamp) {
        var date = new Date(timestamp);
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var hour = hours < 9 ? "0" + hours : hours;
        var min = minutes < 9 ? "0" + minutes : minutes;
        return (`${hour}:${min}`);
    }

    function getDate(timestamp) {
        var date = new Date(timestamp);
        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        var dateNum = date.getDate();
        var month = months[date.getMonth()];
        return (`${dateNum}-${month}`);
    }

    function distinctVal(arr){
        var newArray = [];
        for(var i=0, j=arr.length; i<j; i++){
            if(newArray.indexOf(arr[i]) == -1)
                  newArray.push(arr[i]);  
        }
        return newArray;
    }


    $('#sidebarCollapse').on('click', function () {
        $('#sidebar').toggleClass('active');
        $(this).toggleClass('active');
    });


    $(".border p .cancelCard").click((e) => {
        var iconTarget = e.target;
        var target = $(iconTarget).parents("div");
        console.log(target);
        if ($(iconTarget).attr("class") == "svg-inline--fa fa-toggle-on fa-w-18") {
            $(iconTarget).attr("class", (index, value) => {
                value = "fas fa-toggle-off";
                return value;
            })
            $(target[0]).find("canvas").slideUp('400');
        } else {
            $(iconTarget).attr("class", "fas fa-toggle-on");
            $(target[0]).find("canvas").slideDown('400');
        }
    })

    function userData(array) {
        userMale = [];
        userFemale = [];
        offerUserArray = [];
        var body = "";
        $("#tableUserBody").children().remove();
        db.collection("users").get().then((snapshot) => {
            $.each(array, (index, data) => {
                snapshot.docs.forEach((doc) => {
                    if (doc.data().userId == data) {
                        if (doc.data().Gender == "Male") {
                            userMale.push(doc.data().Gender);
                        } else {
                            userFemale.push(doc.data().Gender);
                        }
                    }
                })
            })
            $("#maleCount").html(`${userMale.length}`);
            $("#femaleCount").html(`<h2>${userFemale.length}</h2>`);
        });
        $.each(array, (index, data) => {
            db.collection("users").doc(data).collection("user_nearby_offer").get().then((snapshot) => {
                body = '';
                body += `<tr ><td rowspan="${snapshot.docs.length}">${data}</td>`;
                snapshot.docs.forEach((doc) => {
                    var user = doc.data();
                    user.userId = data;
                    offerUserArray.push(user);
                    body += `
                   <td>${doc.data().offerId}</td>
                   <td>${doc.data().offerTitle}</td>
                   <td>${doc.data().description}</td>
                   <td>${getTimeWithDate(doc.data().timestamp)}</td>
                   </tr>`;
                })
                $("#tableUserBody").append(body);
            })
        })
    }

    function offerArray() {
        $("#tableOfferBody").children().remove();
        var offerArray = [];
        db.collection("offers").get().then((snapshot) => {
            snapshot.docs.forEach((doc) => {
                offerArray.push(doc.data());
            })
            offerTemplate(offerArray);
        })
    }

    function offerTemplate(array) {
        var offers = [];
        $.each(offerUserArray, (index, data) => {
            offers.push(data.offerId);
        })

        var a = [], b = [], prev;

        offers.sort();
        for (var i = 0; i < offers.length; i++) {
            if (offers[i] !== prev) {
                a.push(offers[i]);
                b.push(1);
            } else {
                b[b.length - 1]++;
            }
            prev = offers[i];
        }
        var template = '';
        for (var i = 0; i < a.length; i++) {
            template += `<tr><td>${a[i]}</td><td class="mr-auto">${b[i]}</td></tr>`
        }
        $("#tableOfferBody").html(template);
    }

    $(".mainChart p span .widget").click(()=>{
        $(".graph .mainChart").removeClass("col-lg-12");
        $(".graph .mainChart").addClass("col-lg-10",800,"easeInBack",()=>{
            $(".sideData").show('slow');
        });
        
    });

    $("#closeWidget").click(()=>{
        $(".sideData").hide('slow',()=>{
            $(".graph .mainChart").removeClass("col-lg-10");
            $(".graph .mainChart").addClass("col-lg-12",1000,"easeInBack");
        });
    })

});




