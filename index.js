var Utils = require('./lib/utils');
var Sensor = require('./lib/sensor');

var Askro = require('./lib/listOfTerritories');
var askro = new Askro();

var currentDate = new Date();
var dayAgo = new Date();
dayAgo.setDate(currentDate.getDate() - 1);
var dayAfterDay = new Date();
dayAfterDay.setDate(dayAfterDay.getDate() - 2);

askro.
    fetch(dayAgo, currentDate).
    then(function(data) {
        Utils.logInspect(data);
    });

