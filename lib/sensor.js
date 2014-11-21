/*
  Wrap sensor's data into an object with a few usable methods
 */
var Promise = require("bluebird");
var request = Promise.promisify(require("request"));

var DOMParser = require('xmldom').DOMParser;
var simpleConvertXML = require('simpleconvert-xml');
 
var _ = require('lodash');
var config = require('./config');
var Utils = require('./utils');

var Sensor = function(options, fromRawData) {
    // let's assume that API user should explicitly pass "false" value into fromRawData
    // if he don't want to parse it
    if (fromRawData === false) {
        options = options || {};
        _.assign(this, options);
    } else {
        this.__parseAndSaveRawData(options);
    }
};

Sensor.prototype = {
    safeAttributes: [
        "id",
        "title",
        "longtitude",
        "latitude"
    ],
    
    getSeriesOfMeasurements: function(timeInterval, endDate) {
        var startDate = null;
        var treshold = 'h';
        if (endDate && timeInterval) {
            startDate = _.isDate(timeInterval) ? timeInterval.getTime() / 1000 : timeInterval;
            endDate = _.isDate(endDate) ? endDate.getTime() / 1000 : endDate;
            
            // just to be more concise
            if (startDate > endDate) {
                var temp = endDate;
                endDate = startDate;
                startDate = temp;
            }
            
            var timeDiff = endDate - startDate;
            // if diff between start and end dates are more then five days, 
            // service won't allow hourly detalization
            if (timeDiff >= config.FIVE_DAYS_IN_MILLISECONDS / 1000) {
                treshold = 'd';
            }
            // if diff between start and end dates are more then 90 days, 
            // service won't allow daily detalization
            if (timeDiff >= config.NINETY_DAYS_IN_MILLISECONDS / 1000) {
                treshold = 'm';
            }
        }
        
        // get measurements for the last 24 hours by default
        if (!timeInterval) {
            timeInterval = this.DAY;
        }
        
        var url;
        
        if (startDate && endDate && treshold) {
            url = this.SENSOR_MEASUREMENTS_PARAMETRIZED_URL({
                    sensorId: this.id,
                    territoryId: this.territory.id,
                    startDate: startDate,
                    endDate: endDate,
                    treshold: treshold
                })
        } else {
            url = this.SENSOR_MEASUREMENTS_URL({
                    timeInterval: timeInterval,
                    sensorId: this.id,
                    territoryId: this.territory.id
                });
        }
        
        return request(url).
            bind(this).
            then(function(data) {
                var response = data[0];
                var responseBody = data[1];
                
                if (response.statusCode != 200) {
                    throw new Error('Error getting XML for sensor\'s measurements. Status code: ' + response.statusCode);
                }
                
                // parse xml to JS object
                var xmlNode = new DOMParser().parseFromString(responseBody);
                return simpleConvertXML.getXMLAsObj(xmlNode);
            }).
            then(function(data) {
                if (data.response.status != 'ok') {
                    throw new Error('XML data for sensor\'s measurements is not ok. Status: ' + data.response.status);
                }
                
                this.measurements = this.measurements.concat(_.map(data.response.archive.date, 
                    function(measurement) {
                        return this.__convertValueAndTimeFromRawData(measurement);
                    }, this)
                );
                
                this.measurements = _.uniq(
                    this.measurements, 
                    true,
                    this.__measurementIdentity
                );
                
                this.measurements = _.sortBy(this.measurements, this.__measurementIdentity);
                
                return this.measurements;
            });
    },
    
    // There is only one uniq attribute for measure - it's timestamp
    // So for sorting purposes let's use it as an identity
    __measurementIdentity: function(measurement) {
        return measurement.time.getTime();
    },
    
    __parseAndSaveRawData: function(rawData) {
        if (rawData.id) {
            this.id = rawData.id.substr(rawData.id.indexOf('_') + 1);
        }
        
        if (rawData.name) {
            this.title = rawData.name;
        }
        
        if (rawData.lng) {
            this.longtitude = Number.parseFloat(rawData.lng);
        }
        
        if (rawData.lat) {
            this.latitude = Number.parseFloat(rawData.lat);
        }
        
        this.measurements = [];
        
        if (rawData.time && rawData.value) {
            this.measurements.push(this.__convertValueAndTimeFromRawData(rawData));
        }
    },
    __convertValueAndTimeFromRawData: function(rawData) {
        return {    
            time: new Date(Number.parseInt(rawData.time, 0) * 1000),
            // To convert μR to μSv we need to divide by 100.0
            value: Number.parseFloat(rawData.value) / 100.0
        }
    },
    
    toJSON: function() {
        return _.pick(this, this.safeAttributes);
    },
    toString: function() {
        return JSON.stringify(this.toJSON());
    }
}

_.assign(Sensor.prototype, config);

module.exports = Sensor;