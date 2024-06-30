const API_URL = "https://supslike.pythonanywhere.com/RoomServer/";

const DisplayPanel = document.getElementById("display-msg");
const CloseDisplay = document.getElementById("close-display");
const StatusDisplayPanel = document.getElementById("display-status");
const DescriptionDisplayPanel = document.getElementById("display-description");

const INP_API_KEY = document.getElementById("API_PASSKEY");
const OUT_API_KEY = document.getElementById("submit-setting");

const TimeUpdate = document.getElementById("timeupdate");
const MaxRecord = document.getElementById("maxrecord");
const AverageDetect = document.getElementById("avgdetect");

const CurrentTemperature = document.getElementById("currentTemp");
const CurrentHumidity = document.getElementById("currentHumid");

const AverageTemperature = document.getElementById("avgTemp");
const AverageHumidity = document.getElementById("avgHumid");

const SoundButton = document.getElementById("sound-button");
const LightButton = document.getElementById("light-button");
const ResetButton = document.getElementById("reset-record");
const RecordsTable = document.getElementById("records-table");

const FAILED = "rgb(255, 80, 80)";
const SUCCESS = "rgb(47, 228, 47)";

var CurSetting = {
    sound: null,
    timeUpdate: null,
    MaxRecords: null,
    avgDetect: null,
    lights: null
}

var ResetRecord = false;

var TemperatureRecord = [
    ['Time', 'Temperature']
]

var HumidityRecord = [
    ['Time', 'Humidity']
]

var CurData = []

function displayMessage(color, title, message) {
    DisplayPanel.style.display = "flex";
    StatusDisplayPanel.innerText = title;
    StatusDisplayPanel.style.color = color;
    DescriptionDisplayPanel.innerHTML = message;
}

function setPlaceholders() {
    SoundButton.checked = CurSetting["sound"];
    LightButton.checked = CurSetting["lights"];
    TimeUpdate.value = CurSetting["timeUpdate"];
    MaxRecord.value = CurSetting["MaxRecords"];
    AverageDetect.value = CurSetting["avgDetect"];

    TimeUpdate.placeholder = CurSetting["timeUpdate"];
    MaxRecord.placeholder = CurSetting["MaxRecords"];
    AverageDetect.placeholder = CurSetting["avgDetect"];
}

async function FetchData() {
    try {
        const dataFetch = await fetch(API_URL + "getStatus");

        if (!dataFetch.ok) {
          displayMessage(FAILED, "Failed!", `Network response was not ok! \n\n ${dataFetch.statusText}`);
          throw new Error("Network response was not OK! \n\n"  + dataFetch.statusText);
        }

        const data = await dataFetch.json();
        const settingFetch = await fetch(API_URL + "setting");

        if (!settingFetch.ok) {
            
          displayMessage(FAILED, "Failed!", `Network response was not ok! \n\n ${settingFetch.statusText}`);
          throw new Error("Network response was not OK! \n\n"  + settingFetch.statusText);
        }

        const setting = await settingFetch.json();
        const avgFetch = await fetch(API_URL + "mean?idx=" + setting["avgDetect"]);

        if (!avgFetch.ok) {
          displayMessage(FAILED, "Failed!", `Network response was not ok! \n\n ${avgFetch.statusText}`);
          throw new Error("Network response was not OK! \n\n"  + avgFetch.statusText);
        }

        const avg = await avgFetch.json();
        CurData = data["records"]

        try {
            CurrentHumidity.innerHTML = `<span class="material-symbols-outlined">water_drop</span> ${CurData[CurData.length - 1]["data"]["humidity"]}%`;
            CurrentTemperature.innerHTML = `<span class="material-symbols-outlined">thermometer</span> ${CurData[CurData.length - 1]["data"]["temperature"]}°C`;
        } catch {
            TemperatureRecord.push([new Date(), 0]);
            HumidityRecord.push([new Date(), 0]);
        }

        CurSetting = setting
        setPlaceholders();

        try {
            AverageTemperature.innerHTML = `<span class="material-symbols-outlined">thermometer</span> ${avg["temperature"].toFixed(2)}°C`;
            AverageHumidity.innerHTML = `<span class="material-symbols-outlined">water_drop</span> ${avg["humidity"].toFixed(2)}%`;
        } catch {}
        
        for (let i = 0; i < data["records"].length; i++) {
            let curRecord = data["records"][i]

            const NewRow = document.createElement("tr");

            const NewTime = document.createElement("td");
            NewTime.innerText = curRecord['time'];

            const NewHumidity = document.createElement("td");
            NewHumidity.innerText = curRecord['data']["humidity"] + "%";

            const NewTemperature = document.createElement("td");
            NewTemperature.innerText = curRecord['data']["temperature"] + "°C";

            NewRow.appendChild(NewTime);
            NewRow.appendChild(NewTemperature);
            NewRow.appendChild(NewHumidity);
            RecordsTable.appendChild(NewRow);

            let CurDate = curRecord["miniTime"].split("-")
            let MiniTime = new Date(CurDate[0], CurDate[1] -1, CurDate[2], CurDate[3], CurDate[4], CurDate[5])

            TemperatureRecord.push([MiniTime, curRecord['data']["temperature"]]);
            HumidityRecord.push([MiniTime, curRecord['data']["humidity"]]);
        }
        LoadCharts();
    }   
      
    catch (error) {
        displayMessage(FAILED, "Error!", `There was a problem with the fetch operation: ${error}`)
    }
}

OUT_API_KEY.addEventListener("click", async function() {
    try {   

        if (Number(TimeUpdate.value) <= 0) {
            displayMessage(FAILED, "Failed!", `Time Update value must be larger than 0!`);
            return;
        }

        if (Number(MaxRecord.value) <= 0) {
            displayMessage(FAILED, "Failed!", `Max Record value must be larger than 0!`);
            return;
        }

        if (Number(AverageDetect.value) <= 1) {
            displayMessage(FAILED, "Failed!", `Time Update value must be larger than 1!`);
            return;
        }

        if (Number(AverageDetect.value) > Number(MaxRecord.value)) {
            displayMessage(FAILED, "Failed!", `Max Record value must be larger than Average Detection!`);
            return;
        }

        CurSetting.timeUpdate = Number(TimeUpdate.value);
        CurSetting.MaxRecords = Number(MaxRecord.value);
        CurSetting.avgDetect = Number(AverageDetect.value);
        CurSetting.lights = LightButton.checked;
        CurSetting.sound = SoundButton.checked;

        let Payload = CurSetting;
        Payload.API_PASSKEY = INP_API_KEY.value
        
        const response = await fetch(API_URL + "settingUpdate", {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(Payload) 
          });

        if (!response.ok) {
          displayMessage(FAILED, "Failed!", `Network response was not ok! \n\n ${response.statusText}`);
          throw new Error("Network response was not OK! \n\n"  + response.statusText);
        }

        if (ResetRecord) {
            const response = await fetch(API_URL + "reset", {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                }
              });;
    
            if (!response.ok) {
              displayMessage(FAILED, "Failed!", `Network response was not ok! \n\n ${response.statusText}`);
              throw new Error("Network response was not OK! \n\n"  + response.statusText);
            }

            ResetButton.style.backgroundColor = FAILED;
            ResetButton.style.color = "white";
            ResetButton.innerText = "Reset Records";

            const childNodes = RecordsTable.childNodes;

            for (let i = childNodes.length - 1; i > 0; i--) {
                const childNode = childNodes[i];
                RecordsTable.removeChild(childNode);
            }
        }
        displayMessage(SUCCESS, "Success!", "You can now close this panel.")
        setPlaceholders();
    } 
      
    catch (error) {
        displayMessage(FAILED, "Error!", `There was a problem with the fetch operation: ${error}`)
    }
})

function LoadCharts() {
    google.charts.load('current',{packages:['corechart']});
    google.charts.setOnLoadCallback(drawChart);

    function drawChart() {
        const TemperatureData = google.visualization.arrayToDataTable(TemperatureRecord);
        const TemperatureOptions = {
                title: '',
                hAxis: {
                    title: 'Time',
                    textStyle: {color: '#FFFFFF'}, 
                    titleTextStyle: {color: '#FFFFFF'},
                    format: 'HH:mm'
                },
                vAxis: {
                    title: 'Temperature',
                    textStyle: {color: '#FFFFFF'},
                    titleTextStyle: {color: '#FFFFFF'}
                },
                legend: 'none',
                backgroundColor: '#7896AB',
                colors: ['#FFF'], 
                titleTextStyle: {
                    color: '#000', 
                    fontSize: 24,
                }
            };
        
        const HumidityData = google.visualization.arrayToDataTable(HumidityRecord);
        const HumidityOptions = {
                title: '',
                hAxis: {
                    title: 'Time',
                    textStyle: {color: '#000'}, 
                    titleTextStyle: {color: '#000'},
                    format: 'HH:mm'
                },
                vAxis: {
                    title: 'Humidity',
                    textStyle: {color: '#000'},
                    titleTextStyle: {color: '#000'}
                },
                legend: 'none',
                backgroundColor: '#EEF2EA',
                colors: ['#000'], 
                titleTextStyle: {
                    color: '#000', 
                    fontSize: 24,
                }
            };

        const TemperatureChart = new google.visualization.LineChart(document.getElementById('temp-chart'));
        TemperatureChart.draw(TemperatureData, TemperatureOptions);

        const HumidityChart = new google.visualization.LineChart(document.getElementById('humid-chart'));
        HumidityChart.draw(HumidityData, HumidityOptions);
    }
}

CloseDisplay.addEventListener("click", function() {
    DisplayPanel.style.display = "none";
})

ResetButton.addEventListener("click", function() {
    if (ResetRecord) {
        ResetButton.style.backgroundColor = FAILED;
        ResetButton.style.color = "white";
        ResetButton.innerText = "Reset Records";
    }

    else {
        ResetButton.style.backgroundColor = SUCCESS;
        ResetButton.style.color = "black";
        ResetButton.innerText = "Keep Records";
    }

    ResetRecord = !ResetRecord;
})

FetchData();
