// Load new instance of TLE.js
var tlejs = new TLEJS();
var lastPositionOfNextPass;
var nextPass = null

// Get SATCAT number for satellite and
// return s n2yo link for the satellite
function getSatelliteLink(tles) {
  var satNum = tlejs.getSatelliteNumber(tles);
  return "https://www.n2yo.com/satellite/?s=" + satNum;
}

// Get URL parameters
// This will be use to get page numbers
function getURLParameter(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function load() {
  $('#location').html(GROUND_STATION_LAT + ', ' + GROUND_STATION_LON);
  getUpcomingPassInfo();
  getAllUpcomingPasses();
  getDynamoPasses(function (metadata) {

    $('#messages').html('');

    // show newest first
    var sortedMeta = metadata.sort(function (m1, m2) {
      var m1key = m1.passDate + "-" + m1.passTime;
      var m2key = m2.passDate + "-" + m2.passTime;
      return (m1key > m2key) ? -1 : 1;
    });

    var captureCount = 0;

    // Function to convert time for each pass
    function convertToLocal(date,time){
      var combinedDate = new Date(date+" "+time);
      var local = moment.utc(combinedDate).local().format('YYYY-MM-DD HH:mm:ss');
      return local;
    }

    // Pagination
    // Get sorted JSON  array
    var json = sortedMeta;
    // Find the total number of records in the array
    var totalJSON = json.length;
    // Determine number of pages that will need to be displayed
    // Rounding up to ensure the last set of records are visible
    var totalPages = Math.ceil(totalJSON/MAX_CAPTURES);
    // Current pages
    var page = getURLParameter('page');
    if(page==null){page=1;}
    // Variable to add active class to list element
    var activeClass,disableClass,lastClass;
    // Variables for Prev and next
    var prevPage = parseInt(page) - 1;
    var nextPage = parseInt(page) + 1;
    //  Create list  elements
    for (let i=1; i<=totalPages; i++) {
      // If on the first page, disable previous
      if(page==1){ disableClass='disabled';} else { disableClass='';}
      // If on th elast page, disable next
      if(page==totalPages){ lastClass='disabled';} else { lastClass='';}
      // Display current page number as active
      if(page==i){ activeClass = 'active';} else {activeClass='';}
      // List elements
      if(i==1){$('#pages').append(['<li class="page-item '+disableClass+'"><a class="page-link" href="index.html?page='+prevPage+'">Previous</a></li>'].join(''));}
      $('#pages').append(['<li class="page-item '+activeClass+'"><a class="page-link" href="index.html?page='+i+'">'+i+'</a></li>'].join(''));
      if(i==totalPages){$('#pages').append(['<li class="page-item '+lastClass+'"><a class="page-link" href="index.html?page='+nextPage+'">Next</a></li>'].join(''));}
    }
    // Determine how many records to show per page
    var recPerPage = MAX_CAPTURES;
    // Use Math.max to ensure that we at least start from record 0
    var startRec = Math.max(page - 1, 0) * recPerPage;
    // Define end of array and stay within bounds of record set
    var endRec = Math.min(startRec + recPerPage, totalJSON);
    // Create JSON array for current page with appropriate records
    var recordsToShow = json.splice(startRec, endRec);

    // Displays each pass
    recordsToShow.forEach(function (m) {
      if (++captureCount > MAX_CAPTURES) return;
      if (m == null) return;
      var mapId = m.imageKey + '-gt';
      var satLink = '<a target="_blank" href="' + getSatelliteLink([m.tle1, m.tle2]) + '">' + m.satellite + '</a>';
      $('#previous_passes').append([
        //'<br clear="all"/>',
        '<h3 class="mt-1">', convertToLocal(m.passDate,m.passTime), '</h3>',
        '<p>', m.passDate, '  ', m.passTime, '<p>',
        '<div class="row" style="margin-left:0px;">',
          '<div id=', mapId, ' style="height: 240px;" class="col-lg-6 col-md-6 col-xs-11 col-11">',
          '</div>',
          '<div style="margin-bottom:10px;" class="col-lg-6 col-md-6 col-xs-12 col-12">',
            '<div>satellite: ', satLink, '</div>',
            '<div>elevation: ', m.elevation, '&deg;', '</div>',
            '<div>direction: ', m.direction, '</div>',
            '<div>downlink freq: ', m.frequency, ' MHz', '</div>',
            '<div>gain: ', m.gain, '</div>',
            '<div>channel A: ', m.chan_a, '</div>',
            '<div>channel B: ', m.chan_b, '</div>',
            '<div><a target=\"_blank\" href=\"images/'+m.imageKey+'-PRISTINE.png\">pristine</a> | <a target=\"_blank\" href=\"maps/'+m.imageKey+'-map.png\">map</a> | <a target=\"_blank\" href=\"audio/'+m.imageKey+'.wav\">audio</a></div>',
          '</div>',
        '</div>'].join(''));
      $('#previous_passes').append([
        '<div class="row" style="margin-bottom: 8px;" class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-12">',
          '<div style="margin-bottom:10px;" class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-12">',
            '<div>orbital elements:</div>',
            '<div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-12">', m.tle1.replace(/ /g, " "), '</div>',
            '<div class="col-lg-12 col-md-12 col-sm-12 col-xs-12 col-12">', m.tle2.replace(/ /g, " "), '</div>',
          '</div>',
        '</div>'].join(''));

      var mapOptions = {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false,
        dragging: false
      };
      var groundTrackMap = L.map(mapId, mapOptions).setView([GROUND_STATION_LAT, GROUND_STATION_LON], 4);

      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.streets',
        accessToken: MAP_BOX_ACCESS_TOKEN
      }).addTo(groundTrackMap);
      var bounds = groundTrackMap.getBounds();
      var marker = L.marker([GROUND_STATION_LAT, GROUND_STATION_LON], {title: GROUND_STATION_NAME}).addTo(groundTrackMap);

      var t = m.passTime.split(' ').join('');
      var captureTime = new Date(m.passDate + 'T' + t).getTime();
      if (m.passDuration) {
        // get the current orbit at the middle of the pass duration so it is the correct orbit for the ground station location.
        captureTime += (m.passDuration/2) * 1000;
      }

      const orbits = tlejs.getGroundTrackLatLng(
        [m.tle1, m.tle2],
        10000,
        captureTime
      );
      var orbit = orbits[1];
      var polyline = L.polyline(orbit, {color: 'red'}).addTo(groundTrackMap);
      const lat = 0;
      const lon = 1;
      const tickLength = 0.5;
      for(var i=0;i<orbit.length-1;i=i+5) {
        var origin = orbit[i];
        if ((origin[lat] < bounds.getNorth()) && (origin[lat] > bounds.getSouth())) {
          // draw two ticks to indicate direction of orbit
          /*

          directionAngle:   |
                  +135deg  /|\  -135deg
                            |
           */
          var dlon = orbit[i+1][lon] - origin[lon];
          var dlat = orbit[i+1][lat] - origin[lat];

          // angle from point i and point i+1
          var directionAngle = Math.atan2(dlat,dlon);

          var tickAngle = directionAngle - (135 * (Math.PI/180))
          var tick = [tickLength * Math.sin(tickAngle), tickLength * Math.cos(tickAngle)];
          var tickPoints = [ [origin[lat], origin[lon]], [origin[lat]+tick[lat], origin[lon]+tick[lon]] ];
          L.polyline(tickPoints, {color: 'red'}).addTo(groundTrackMap);

          tickAngle = directionAngle + (135 * (Math.PI/180))
          tick = [tickLength * Math.sin(tickAngle), tickLength * Math.cos(tickAngle)];
          tickPoints = [ [origin[lat], origin[lon]], [origin[lat]+tick[lat], origin[lon]+tick[lon]] ];
          L.polyline(tickPoints, {color: 'red'}).addTo(groundTrackMap);
        }
      }

      m.images.forEach(function (i) {
        if (i.filename.endsWith("-ZA.png")) i.order = 1;
        if (i.filename.endsWith("-MCIR-precip.png")) i.order = 2;
        if (i.filename.endsWith("-MCIR.png")) i.order = 3;
        if (i.filename.endsWith("-NO.png")) i.order = 4;
        if (i.filename.endsWith("-MSA.png")) i.order = 5;
        if (i.filename.endsWith("-MSA-precip.png")) i.order = 6;
        if (i.filename.endsWith("-THERM.png")) i.order = 7;
      });
      var images = m.images.sort(function (i1, i2) {
        return (i1.order < i2.order) ? -1 : 1;
      });
      var imageHtml = [
        '<div class="row mb-5">'
      ];
      images.forEach(function (i) {
        if (m.chan_a == '3/3B (mid infrared)') {
          // Show MSA image if sensor 3 was used.
          if (i.filename.endsWith('-MSA.png')) {
            return;
          }
          if (i.filename.endsWith('-MSA-precip.png')) {
            return;
          }
        }
        if (m.chan_a != '3/3B (mid infrared)') {
          // If no sensor 3 data, then show the thermal IR image.
          if (i.filename.endsWith('-THERM.png')) {
            return;
          }
        }
        var url = DIR_NAME + '/' + i.filename;
        var thumburl = DIR_NAME + '/' + i.thumbfilename;
        if(!i.filename.endsWith("-PRISTINE.png")){
          imageHtml.push([
            '<figure class="col-lg-3 col-md-6 col-xs-6 col-6">',
              '<a target="_blank" rel="group" href="', url, '" data-width="', i.width, '" data-height="', i.height, '" data-toggle="lightbox" data-type="image">',
                '<img class="img-fluid img-responsive" src="', thumburl, '" alt="">',
              '</a>',
              '<div class="caption">',
                i.enhancement,
              '</div>',
            '</figure>'].join(''));
        }

      });
      imageHtml.push('</div>');
      $('#previous_passes').append(imageHtml.join(''));
    });
  });
}

// Gets JSON file for a pass
function getImageMetadata(DIR_NAME, cb) {
  var pattern = new RegExp(".+-[0-9]+[0-9]+\.json$");
  s3.listObjects({Prefix: DIR_NAME}, function(err, data) {
    if (err) {
      return cb('There was an error viewing the directory: ' + err.message);
    }
    if (data && data.Contents && (data.Contents.length == 0)) {
      return cb('directory not found');
    }
    var metadataFiles = data.Contents.filter(function (object) {
      return pattern.test(object.Key);
    });

    var promises = metadataFiles.map(function(md) {
      var params = {
        Bucket: bucketName,
        Key: md.Key
      };
      return s3.getObject(params).promise().then(function(data) {
        var s = JSON.parse(data.Body.toString());
        return s;
      });
    });

    Promise.all(promises).then(function(results) {
      //console.log(results);
      cb(null, results);
    })

  });
}

// Get passes from API
function getDynamoPasses(cb){
  const fetchPromise = fetch(PASS_URL);
fetchPromise.then(response => {
  return response.json();
}).then(passes => {
  const passList = passes.passes.map(satPass => satPass.passDate).join("\n");
  cb(passes.passes);
});
}

// Get upcoming passes to show all passes
function getAllUpcomingPasses() {
  var timeNow = new Date();
  // Load upcoming_passes.json file using a HTTP GET request
  $.get(DIR_NAME + "/upcoming_passes.json", function(data) {
    // Loop through all upcoming passes to find next pass by looking at the end
    // time of each pass  and determining if it is later than the  current time
    // Note - upcoming passes file is in order of time and is loaded the same way
    // Note2 - using end time ensures next pass will not show until current is complete
    for(var i=0;i<data.length;i++) {
      var nextPassTime = data[i];
      var passStartDate = new Date(nextPassTime.start);
      var passEndDate = new Date(nextPassTime.end);
      var passSatLink = '<a target="_blank" href="' + getSatelliteLink([nextPassTime.tle1, nextPassTime.tle2]) + '">' + nextPassTime.satellite + '</a>';
      var curPass;

      if ((!bgSet) && (passEndDate > timeNow)) {
        curPass = 'style=\"background-color: #EDEDED;\"';
        var bgSet = 1;
      } else {
        curPass = '';
      }

      $("#all_passes").append([
        '<div ' + curPass + '>',
        passSatLink,
        '<br>',
        passStartDate.toDateString(),
        '  ',
        '<br>',
        nextPassTime.direction,
        ' at ',
        nextPassTime.elevation,
        '&deg elevation',
        '<br>',
        'capture begins at: ',
        ("0" + passStartDate.getHours()).slice(-2) + ":" + ("0" + passStartDate.getMinutes()).slice(-2),
        '<br>',
        'imagery approx: ',
        ("0" + passEndDate.getHours()).slice(-2) + ":" + ("0" + passEndDate.getMinutes()).slice(-2),
        '</div><br>'].join('')
      );
    }
  });
}

// Gets all upcoming satellite passes for the given LAT / LONG
// This is used to display upcoming pass
function getUpcomingPassInfo() {

  // Load upcoming_passes.json file using a HTTP GET request
  $.get(DIR_NAME + "/upcoming_passes.json", function(data) {
    var now = new Date();
    var processingTime = 240000; // approx 4 minutes to process and upload images.
    // Loop through all upcoming passes to find next pass by looking at the end
    // time of each pass  and determining if it is later than the  current time
    // Note - upcoming passes file is in order of time and is loaded the same way
    // Note2 - using end time ensures next pass will not show until current is complete
    for(var i=0;i<data.length;i++) {
      var passTime = new Date(data[i].end + processingTime);
      if ((!nextPass) && (passTime > now)) {
        nextPass = data[i];
      }
    }
    // Link to satellite for next pass
    var satLink = '<a target="_blank" href="' + getSatelliteLink([nextPass.tle1, nextPass.tle2]) + '">' + nextPass.satellite + '</a>';
    // Start and end time for next pass
    var startDate = new Date(nextPass.start);
    var endDate = new Date(nextPass.end + processingTime);
    // Populates upcoming_passes <div> with next pass information
    $("#upcoming_passes").append([
      '<div>',
      '<h5>next image capture: ',
      satLink,
      ' ',
      nextPass.direction,
      ' at ',
      nextPass.elevation,
      '&deg elevation',
      '</h5>',
      '<h5>capture begins at: ',
      ("0" + startDate.getHours()).slice(-2) + ":" + ("0" + startDate.getMinutes()).slice(-2),
      '</h5>',
      '<h5>imagery approx: ',
      ("0" + endDate.getHours()).slice(-2) + ":" + ("0" + endDate.getMinutes()).slice(-2),
      '</h5>',
      '</div>'].join('')
    );

    // Get location of satellite for next pass for the current time
    lastPositionOfNextPass = tlejs.getLatLon([nextPass.tle1, nextPass.tle2], new Date().getTime());
    // Set mabox access token for Mapbox GL
    mapboxgl.accessToken = MAP_BOX_ACCESS_TOKEN;
    // Intializes a new flyover map
    var flyoverMap = new mapboxgl.Map({
      container: 'flyover_map',
      style: 'mapbox://styles/mapbox/satellite-streets-v10',
      center: [lastPositionOfNextPass.lng, lastPositionOfNextPass.lat],
      pitch: 60,
      bearing: 0,
      zoom: 3
    });
    // Initializes a new static map
    var staticMap = new mapboxgl.Map({
      container: 'static_map',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [0, 0],
      zoom: 0
    });
    // Get satelite location for current time and return
    // Mapbox GL object with LAT / LON for static map
    function getSatLocation() {
      var location = tlejs.getLatLon([nextPass.tle1, nextPass.tle2], new Date().getTime());
      return new mapboxgl.LngLat(location.lng, location.lat);
    }
    // Get satellite location for current time
    // and return flyover map coordinate
    function getSatLocationPoint() {
      var l = getSatLocation();
      return {
        "type": "Point",
        "coordinates": [l.lng, l.lat]
      };
    }

    function getCurrentOrbit() {
      var orbits = tlejs.getGroundTrackLatLng(
        [nextPass.tle1, nextPass.tle2],
        10000,
        new Date().getTime()
      );
      var currentOrbit = orbits[1]; // [lat, lng] ordering
      var r = [];
      // Convert to [lng, lat] ordering as required by MapBox APIs
      for(var i=0;i<currentOrbit.length;i++) {
        var point = currentOrbit[i];
        r.push([point[1], point[0]]);
      }
      return r;
    }

    function getBearing(l) {
      var l2 = lastPositionOfNextPass;
      var bearing = -((Math.atan2(l.lat - l2.lat, l.lng - l2.lng) * 180 / Math.PI) - 90.0);
      lastPositionOfNextPass = l;
      return bearing;
    }

    function getOrbitData() {
      return {
        "type": "FeatureCollection",
        "features": [{
          "type": "Feature",
          "geometry": {
            "type": "LineString",
            "coordinates": getCurrentOrbit()
          }
        }]
      };
    }


    flyoverMap.on('load', function() {
      flyoverMap.addLayer({
        "id": "ground-station",
        "type": "circle",
        "source": {
          "type": "geojson",
          "data": {
            "type": "Point",
            "coordinates": [GROUND_STATION_LON, GROUND_STATION_LAT]
          }
        },
        "paint": {
          "circle-radius": 10,
          "circle-color": "#ff0000"
        }
      });

      setInterval(() => {
        var currentLocation = getSatLocation();
        var bearing = getBearing(currentLocation);
        flyoverMap.setCenter([currentLocation.lng, currentLocation.lat]);
        flyoverMap.setBearing(bearing);
      }, 500);
    });


    staticMap.on('load', function() {
      staticMap.addSource('satellite-location', {
        "type": "geojson",
        "data": getSatLocationPoint()
      });

      staticMap.addSource('current-orbit', {
        "type": "geojson",
        "data": getOrbitData()
      });


      staticMap.addLayer({
        'id': 'orbit',
        'type': 'line',
        'source': 'current-orbit',
        'layout': {
          'line-cap': 'round',
          'line-join': 'round'
        },
        'paint': {
          'line-color': '#eeee00',
          'line-width': 5,
          'line-opacity': .8
        }
      });

      staticMap.addLayer({
        "id": "ground-station",
        "type": "circle",
        "source": {
          "type": "geojson",
          "data": {
            "type": "Point",
            "coordinates": [GROUND_STATION_LON, GROUND_STATION_LAT]
          }
        },
        "paint": {
          "circle-radius": 10,
          "circle-color": "#ff0000"
        }
      });

      staticMap.addLayer({
        "id": "satellites",
        "source": "satellite-location",
        "type": "circle",
        "paint": {
          "circle-radius": 10,
          "circle-color": "#007cbf"
        }
      });

      // Moves static map to center of satellite when function is called
      staticMap.flyTo({
        center: [
          getSatLocationPoint().coordinates[0],
          getSatLocationPoint().coordinates[1]
        ],
      });

      // Move static map to center of satellite every 25 seconds
      setInterval(() => {
        staticMap.flyTo({
          center: [
            getSatLocationPoint().coordinates[0],
            getSatLocationPoint().coordinates[1]
          ],
        });
      }, 25000);

      // Finds satellite location for a given time every half second
      setInterval(() => {
        staticMap.getSource('satellite-location').setData(getSatLocationPoint());
      }, 500);

      // Finds satellite orbit and sets it every minute
      setInterval(() => {
        staticMap.getSource('current-orbit').setData(getOrbitData());
      }, 60000);


    });

  });
}
