// numSource.js


function getRandom(min, max) {
	return Math.random() * (max - min) + min;
}

function keepAboveTwentyFive(perc) {

	if (perc < 25) {
		return 25;
	} else if (perc > 75) {
		return 75;
	} else {
		return perc;
	}
}