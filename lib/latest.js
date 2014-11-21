/*

This module allows you to get list of territories with it's sensors. 
Each territory contains it title, longitude, latitude
Each sensor contains it's title, longitude, latitude and value of the last probe (in microsieverts, μSv)

*/

var _ = require('lodash');

var Promise = require("bluebird");
var request = Promise.promisify(require("request"));

var DOMParser = require('xmldom').DOMParser;
var simpleConvertXML = require('simpleconvert-xml');

var Utils = require('./utils');
var config = require('./config');
var Sensor = require('./sensor');
var Territory = require('./territory');

module.exports = function() {
    return request(config.LAST_MEASUREMENTS_URL).
        spread(function(response, responseBody) {
            if (response.statusCode != 200) {
                throw new Error('Error getting XML from url for latest measurements. Status code: ' + response.statusCode);
            }

            // parse xml to JS object
            var xmlNode = new DOMParser().parseFromString(responseBody);
            return simpleConvertXML.getXMLAsObj(xmlNode);
        }).
        then(function(data) {
            if (data.response.status != 'ok') {
                throw new Error('XML data for latest measurements is not ok. Status: ' + data.response.status);
            }

            // build territory list with embedded sensors that belongs to it
            var territories = data.response.territory_list.territory;
            var sensors = data.response.sensor_list.sensor;
            var objectsList = data.response.object_list.object;
            var helpContents = data.response.helpContents;

            var result = [];

            _.each(territories, function(territory) {
                var convertedTerritory = new Territory({
                    id: Number.parseInt(territory.index, 0)
                });
                
                // get longitude and latitude from objects
                var latLngContainer = _.find(objectsList, function(object) {
                    return object.id == 'o' + territory.index;
                });

                convertedTerritory["latitude"] = Number.parseFloat(latLngContainer.lat);
                convertedTerritory["longitude"] = Number.parseFloat(latLngContainer.lng);

                // get long and descriptive title
                var helpContent = helpContents[latLngContainer.id];
                convertedTerritory["title"] = helpContent.title;

                // get sensors list
                var refSensors = _.filter(sensors, {terrId: convertedTerritory.id + ''});

                _.each(refSensors, function(sensor) {
                    convertedTerritory.addSensor(new Sensor(sensor));
                });

                result.push(convertedTerritory);
            });

            return result;
        }).
        catch(function(err) {
            Utils.logError(err.message || err);
            Utils.logError(err.stack || '');
        });
}