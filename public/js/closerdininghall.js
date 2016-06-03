// closerdininghall.js

dewickDistance = {};
dewickDistance.name = "Dewick-Macphie Dining Center";
dewickDistance.latitude = 42.405412;
dewickDistance.longitude = -71.121312;
dewickDistance.distanceFrom = 0;

carmDistance = {};
carmDistance.name = "Carmichael Hall";
carmDistance.latitude = 42.409395;
carmDistance.longitude = -71.122735;
carmDistance.distanceFrom = 0;

getLocation();

// get user location
function getLocation() { // gets user's location
    if (navigator.geolocation) { // checks if navigator.geolocation is supported by browser
        navigator.geolocation.getCurrentPosition(function(position) {
            myLat = position.coords.latitude;
            myLong = position.coords.longitude;
            indicateCloserDiningHall();
            loadBar();
        });
    } else {
        alert("Geolocation is not supported by your web browser. Sorry!");
    }
}

function indicateCloserDiningHall() {
    calcDistance(dewickDistance);
    calcDistance(carmDistance);

    // reveal closer dining hall
    if (dewickDistance.distanceFrom < carmDistance.distanceFrom) {
        $("#dewick").css({ "color": "yellow", "font-weight": "bold" });
    } else if (dewickDistance.distanceFrom > carmDistance.distanceFrom) {
        $("#carm").css({ "color": "yellow", "font-weight": "bold" });
    }
}

function calcDistance(dininghall) {
    var R = 6371; // km 

    // latitude difference
    var x1 = dininghall.latitude - myLat;
    var dLat = x1.toRad();

    // longitude difference
    var x2 = dininghall.longitude - myLong;
    var dLon = x2.toRad();

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(myLat.toRad()) * Math.cos(dininghall.latitude.toRad()) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var kmDistance = R * c;

    dininghall.distanceFrom = kmDistance;
}

Number.prototype.toRad = function() {
    return this * Math.PI / 180;
};
