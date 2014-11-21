var Utils = require('./lib/utils');
var Sensor = require('./lib/sensor');

var getLatestTerritoriesList = require('./lib/latest');

getLatestTerritoriesList().
    then(function(territories) {
        var currentDate = new Date();
        var threeMonthAgo = new Date();
        threeMonthAgo.setMonth(currentDate.getMonth() - 1);
        return territories[0].fetchSeriesOfMeasurements(threeMonthAgo, currentDate);
    }).
    then(function(data) {
        Utils.logInspect(data);
    });

