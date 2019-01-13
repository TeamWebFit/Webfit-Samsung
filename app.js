/*global tau*/
/**
 * @requires {@link js/fs}
 */

   
    
    
/*exported init*/
( function () {
	var DB_VERSION = 5,
    DB_NAME = "HeartrateDB",
    DB_DISPLAY_NAME = "heartrate_db",
    DB_SIZE = 2 * 1024 * 1024,
    DB_TABLE_NAME = "tizenHeartrate",
    dataTypeList = ["id", "time", "heartrate"],
    pageList = ["page-result", "page-input"],
    db,
    dbType = "none",
    idbObjectStore,
    popupStatus = "Deactive";

	var INFO_SETTIMEOUT_DELAY = 10000;
	var INFO_SHOW_DELAY = 10000;
	var TEXT_STOP = 'Stop';
	var TEXT_START = 'Start';

	var heartRateEl;
	var heartImg;
	var infoBackBtn;
	var hrmControlBtn;
	var measuringText;

	var infoTimeoutEnd = 0;
	var infoTimeout = 0;

	var sensorStarted = false;
	
	 /**
     * Adds leading zero(s) to a number and make a string of fixed length.
     * @private
     * @param {number} number - A number to make a string.
     * @param {number} digit - The length of the result string.
     * @return {string} The result string
     */
    function addLeadingZero(number, digit) {
        var n = number.toString(),
            i,
            strZero = "";

        for (i = 0; i < digit - n.length; i++) {
            strZero += "0";
        }

        return strZero + n;
    }

    /**
     * Gets the string of current datetime by "MM/dd HH:mm" format.
     * @private
     * @return {string} The result string
     */
    function getDateTimeString() {
        var day = new Date();

        return (addLeadingZero(day.getMonth() + 1, 2) + "/" + addLeadingZero(day.getDate(), 2) + " " +
            addLeadingZero(day.getHours(), 2) + ":" + addLeadingZero(day.getMinutes(), 2));
    }
    
   


/*
 * Click event handler for HRM sensor Start/Stop
 * Toggles the sensor state.
 */
function onhrmControlBtnClick() {
    console.log("onhrmControlBtnClick() called...");
    
    if (hrmControlBtn.innerHTML === TEXT_START){
        console.log("info on button = start");
        startSensor();
    } else {
        console.log("info on button = stop");
        stopSensor();
        submitNewRecord();
    }
}

/*
 * Starts the HRM sensor and registers a change listener.
 * Update the UI: Shows measuring text, and change button text to Stop.
 */    
function startSensor() {
    console.log("start sensor() called...");
    sensorStarted = true;
    clearTimers();
    measuringText.classList.remove('hide');
    measuringText.classList.add('show');
    hrmControlBtn.innerHTML = TEXT_STOP;
    
    tizen.humanactivitymonitor.start('HRM', onHeartRateDataChange, onerrorCB);
}

/*
 * Clear the timers if running for handling the information popup.
 */
function clearTimers() {
    console.log("Clear timers() called");
    window.clearTimeout(infoTimeout);
    window.clearTimeout(infoTimeoutEnd);
    infoTimeout = 0;
    infoTimeoutEnd = 0;
}

/*
 * Callback function Handles change event on current heart rate.
 * 
 */
function onHeartRateDataChange(heartRateInfo) {
    console.log("onHeartRateDataChange() called...");
    if (!sensorStarted){
        return;
    }
    
    var rate = heartRateInfo.heartRate;
    var activePage = document.getElementsByClassName('ui-page-active')[0];
    var activePageId = activePage ? activePage.id : '';

    /*
     * If heart rate value is invalid-
     * Remove heart image animation, 
     * Displays measuring text and start a timer to show the information popup after 10 seconds. 
     */
     
    if (rate < 1) {
        console.log("Heart rate value < 1");
        rate = 0;
        heartRateEl.innerHTML = '';
        heartImg.classList.remove('animate');
        measuringText.classList.remove('hide');
        measuringText.classList.add('show');

        /* Start a timer when sensor is started but not able to measure the heart rate
         * showMeasuringInfo() function will be execute after 10 sec and will show a info popup.
         */
         
        if (activePageId === 'main' && infoTimeout === 0) {
            infoTimeout = window.setTimeout(showMeasuringInfo, INFO_SETTIMEOUT_DELAY);
        }
    } else {
        /*
         * If heart rate value is valid
         * Clear all the timers to  handle info popup
         * Hides measuring text
         * Start the animation on heart image
         * and displays the heart rate value.
         */
        clearTimers();
        hideMeasuringInfo();
        console.log("heartRateEl is valid information...");
        if (!heartImg.classList.contains('animate')) {
            heartImg.classList.add('animate');
            measuringText.classList.remove('show');
            measuringText.classList.add('hide');
        }
        heartRateEl.innerHTML = rate;
    }
}

/* 
 * Call back when an error occurs */
 
function onerrorCB(error) {
    console.log("Error name:"+error.name + ", message: "+error.message);
}

/*
 * Displays information popup.
 */
function showMeasuringInfo() {
    console.log("showMeasuringInfo() called..");
    infoTimeout = 0;
    tau.changePage('#info');
    
    /* Start a timer when info popup is shown
     * hideMeasuringInfo() function will be execute after 10 sec and which will redirect to main page.
     */
    infoTimeoutEnd = window.setTimeout(hideMeasuringInfo, INFO_SHOW_DELAY);
}

/*
 * Hides information popup, redirects to main page.
 */
function hideMeasuringInfo() {
    console.log("hideMeasuringInfo() called..");
    tau.changePage('#main');
    infoTimeoutEnd = 0;
}

/*
 * Stops the sensor
 * Clears timers (to handle info popup)
 * Update the UI: Hides measuring text, stop animation on heart image and change button text to Start.
 */    
function stopSensor() {
    console.log("stopSensor() called...");
    sensorStarted = false;
    heartImg.classList.remove('animate');
    measuringText.classList.remove('show');
    measuringText.classList.add('hide');
    
    clearTimers();    
    
    tizen.humanactivitymonitor.stop("HRM");
    hrmControlBtn.innerHTML = TEXT_START;
}

/*
 * Click event handler for back button on info page
 * Hides the information popup and redirects to main page.
 */
function onInfoBackBtnClick() {
    console.log("onInfoBackBtnClick() called...");
    window.clearTimeout(infoTimeoutEnd);
    infoTimeoutEnd = 0;
    tau.changePage('#main');
}


/**
 * Creates the table if not exists.
 * @private
 * @param {Object} db - The database object(WebSQL or IndexedDB)
 */
function createTable(db) {
    if (dbType === "IDB") {
        if (db.objectStoreNames.contains(DB_TABLE_NAME)) {
            db.deleteObjectStore(DB_TABLE_NAME);
            console.log("db wurde erstellt")
        }

        idbObjectStore = db.createObjectStore(DB_TABLE_NAME, {
            keyPath: "id",
            autoIncrement: true
        });
    } else if (dbType === "SQL") {
        db.transaction(function(t) {
            t.executeSql("CREATE TABLE IF NOT EXISTS " + DB_TABLE_NAME + " (id INTEGER PRIMARY KEY, heartrate INTEGER, insertday DATETIME)", []);
        });
    } else {
        alert("Error from createTable: no DBtype");
    }
}

/**
 * Inserts a data to the table.
 * @private
 * @param {Object} db - The database object(WebSQL or IndexedDB)
 * @param {Object} data - The data to be put
 */
function insertData(db, data) {
    if (dbType === "IDB") {
        idbObjectStore = db.transaction(DB_TABLE_NAME, "readwrite").objectStore(DB_TABLE_NAME);
        idbObjectStore.put(data);
        createfile(idbObjectStore);
        console.log(data.heartrate);
        console.log(data.id);
        console.log(data.insertday);
    } else if (dbType === "SQL") {
        db.transaction(function(t) {
            var dayString;

            dayString = getDateTimeString();
            t.executeSql("INSERT INTO " + DB_TABLE_NAME + " (heartrate, insertday) VALUES (?, ?)", [data.heartrate, dayString]);
        });
    }
}

function createfile(idbObjectStore){
	var fileHandleWrite = tizen.filesystem.resolve("documents", function(dir)
			{
				newDir= dir.createDirectory("GearSensorDataW");
				console.log("new directory");
				newFile= newDir.createFile("MyHeartRateW.txt");
				console.log("new file");
			    console.log("es ist drinnen");
			    newFile.openStream("w",function(fs) {
			    	console.log("es ist noch drinnen");
			    	var fileEntry = "";
			    	displayDataByIndex(fs, fileEntry);
			    	fs.write(fileEntry);
			    	console.log("eingetragen wurde: \n" + fileEntry) ;
					fs.close();
					console.log('finished');
					onDeviceReady();
				});
			}, 
			function (e){
				console.log("error" + e.message);
			});
}


function displayDataByIndex(fs, fileEntry) {
	  /*idbObjectStore = db.transaction(DB_TABLE_NAME, "readwrite").objectStore(DB_TABLE_NAME);

	  idbObjectStore.openCursor().onsuccess = function(event) {
	    var cursor = event.target.result;
	    if(cursor) {
	    	var textContent = cursor.key + ", " + cursor.value.heartrate + "\n";   
	    	fileEntry = fileEntry + textContext;
			console.log("data----------" + fileEntry) ;
			
	      //fileRow.innerHTML = cursor.value.insertdata + ', ' + cursor.value.heartrate + '\n'; 

	      cursor.continue();
	    } else {
	      console.log('Entries all displayed.');
	    }
	  };*/
	};
/**
 * Loads the data from database and show the data with showDataView.
 * @private
 * @param {Object} db - The database object
 * @return {array} The array contains the result data
 */
	

function loadDataView(db) {
    var resultBuffer = [];

    if (dbType === "IDB") {
        idbObjectStore = db.transaction(DB_TABLE_NAME, "readonly").objectStore(DB_TABLE_NAME);
        idbObjectStore.openCursor().onsuccess = function(e) {
            var cursor = e.target.result;
                return resultBuffer;
        };
    } else if (dbType === "SQL") {
        db.transaction(function(t) {
            t.executeSql("SELECT * FROM " + DB_TABLE_NAME, [],
                function(t, r) {
                    var resultBuffer = [],
                        i;

                    for (i = 0; i < r.rows.length; i++) {
                        resultBuffer.push({
                            id: r.rows.item(i).id || 0,
                            heartrate: r.rows.item(i).heartrate || 0
                        });
                    }

                    return resultBuffer;
                },
                function(t, e) {
                    alert("Error dataview: " + e.message);

                    return null;
                });
        });
    }
}

/**
 * Opens the database.
 * @private
 * @param {function} successCb - The callback function should be called after open database.
 */
function openDB(successCb) {
    var request;

    if (window.indexedDB) {
        dbType = "IDB";

        request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = function(e) {
            alert("Please allow this application to use Indexed DB");
        };
        request.onsuccess = function(e) {
            db = request.result;
            if (successCb) {
                successCb(db);
            }
        };
        // Set a callback function When the Indexed DB is created first,
        // or upgrade is needed
        request.onupgradeneeded = function(e) {
            db = e.target.result;
            createTable(db);
        };
    } else if (window.openDatabase) {
        dbType = "SQL";

        db = openDatabase(DB_NAME, DB_VERSION, DB_DISPLAY_NAME, DB_SIZE);
        createTable(db);

        if (successCb) {
            successCb(db);
        }
    } else {
        console.log("Indexed DB/WebSQL is not supported");
    }
}

/**
 * Submit a new record to the database.
 * @private
 * @return {boolean} True if the record is added into the database.
 */
function submitNewRecord() {
    var data = {
            heartrate: 0
        },
    heartRateElInt = parseInt(heartRateEl.textContent);
    console.log("heartRateEl.textContent= " + heartRateEl.textContent);

    if (heartRateElInt) {
        data.heartrate = heartRateElInt;
        console.log(data.heartrate);
    }
    data.insertday = getDateTimeString();

    insertData(db, data);

    heartRateEl.value = "";

    return true;
}



    
    window.addEventListener( 'tizenhwkey', function( ev ) {
        if( ev.keyName === "back" ) {
        var page = document.getElementsByClassName( 'ui-page-active' )[0], pageid = page ? page.id : "";
            if( pageid === "main" ) {
                try {
                    tizen.humanactivitymonitor.stop("HRM");
                    tizen.application.getCurrentApplication().exit();
                } catch (ignore) {
                }
            } else {
                window.history.back();
            }
        }
    } );
    
    
    // Upload file /////////////////////////////////////////////////
 
    
    //Upload start

    var win = function(r) {
        console.log('Code = ' + r.responseCode);
        console.log('Response = ' + r.response);
        console.log('Sent = ' + r.bytesSent);
    };

    var fail = function(error) {
        alert('An error has occurred: Code = ' + error.code);
        console.log('upload error source ' + error.source);
        console.log('upload error target ' + error.target);
    };
    
    var ft;
    function onDeviceReady() {
    	ft = new FileTransfer();
        console.log('Cordova features now available');
        ft.upload("/documents/GearSensorDataW/MyHeartRateW.txt", encodeURI('https://server.webfit.app:4009/connector/samsung/MyHeartRateQ.txt'), win, fail);
    }
   

    
    /*
     * Function invoked on onload event
     */
    function init() 
    {
    	//Cordova Setup
        document.addEventListener('deviceready', onDeviceReady, false);
        console.log("init() called...");
        openDB(loadDataView);
        console.log("DB is opened");
        heartRateEl = document.getElementById('heart-rate-value');
        heartImg = document.getElementById('heart-img');
        infoBackBtn = document.getElementById('info-back-btn');
        hrmControlBtn= document.getElementById('hrm-control-btn');
        measuringText = document.getElementById('measuring-info');
        
        //Registering click event handler for buttons.
        infoBackBtn.addEventListener('click', onInfoBackBtnClick);
        hrmControlBtn.addEventListener('click', onhrmControlBtnClick);
    }

    window.onload = init;
} () );
