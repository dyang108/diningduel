function loadBar() {
    // calculate score change ratio based on distance
    var carmFactor = 1 + (1 / (10 * carmDistance.distanceFrom + 1));
    var dewickFactor = 1 + (1 / (10 * dewickDistance.distanceFrom + 1));
    var inc = 0;
    if (carmResults < 0) {
        if (dewickResults < carmResults) {
            inc = Math.abs(dewickResults * 2);
        } else {
            inc = Math.abs(carmResults * 2);
        }
    } else if (dewickResults < 0) {
        inc = Math.abs(dewickResults * 2);
    }

    if (carmResults === 0 || dewickResults === 0) {
        inc += Math.abs(Math.max(carmResults, dewickResults));
    }


    carmResults += inc;
    dewickResults += inc;
    if (carmResults === 0 && dewickResults === 0) {
        carmResults += 1;
        dewickResults += 1;
    }

    carmResults *= carmFactor;
    dewickResults *= dewickFactor;
    totalResults = carmResults + dewickResults;

    carmPerc = carmResults / totalResults * 100;
    carmScore = carmPerc;
    carmPerc = keepAboveFifteen(carmPerc);
    $("#carm").css("width", (carmPerc - 0.2) + "%");

    dewPerc = 100 - carmPerc;
    dewScore = 100 - carmScore;
    dewPerc = keepAboveFifteen(dewPerc);
    $("#dewick").css("width", (dewPerc - 0.2) + "%");

    if (dewPerc < 27) {
        $('#dewick').html('Dew');
    } else {
        $('#dewick').html('Dewick');
    }

    if (carmDistance.distanceFrom < dewickDistance.distanceFrom) {
        $("#carm").popover({
            placement: "bottom",
            container: 'body',
            trigger: mq.matches ? "": "hover",
            content: function () {
                return "The score of Carm is " + Math.round(carmScore) + ". You are also closer to Carm!";
            }
        });
        $("#dewick").popover({
            placement: "bottom",
            container: 'body',
            trigger: mq.matches ? "": "hover",
            content: function () {
                return "The score of Dewick is " + Math.round(dewScore) + ".";
            }
        });
    } else if (carmDistance.distanceFrom > dewickDistance.distanceFrom) {
        $("#carm").popover({
            placement: "bottom",
            container: 'body',
            trigger: mq.matches ? "" : "hover",
            content: function () {
                return "The score of Carm is " + Math.round(carmScore) + ".";
            }
        });
        $("#dewick").popover({
            placement: "bottom",
            container: 'body',
            trigger: mq.matches ? "" : "hover",
            content: function () {
                return "The score of Dewick is " + Math.round(dewScore) + ". You are also closer to Dewick!";
            }
        });
    }
    window.onscroll= function(){
        $("#carm").popover("hide");
        $("#dewick").popover("hide");
    };
}

function keepAboveFifteen(perc) {
    if (perc < 15) {
        return 15;
    } else if (perc > 85) {
        return 85;
    } else {
        return perc;
    }
}
