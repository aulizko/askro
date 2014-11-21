"use strict";

var _ = require('lodash');

/**
 * @class
 * Wraps JSON data from server into a tiny class with one great method.
 * @see Territory#fetchSeriesOfMeasurements
 * @see Territory#sensors
 * @param {Object|undefined} [options=undefined] Pre-parsed data for territory (used to load data from DB)
 * @constructor
 */
var Territory = function(options) {
    options = options || {};
    _.assign(this, options);

    /**
     * The main cause why this class even exist.
     * Contains an array of sensors with measurements data stored inside of them
     * @type {Array.<Sensor>}
     */
    this.sensors = [];
};

Territory.prototype = {
    safeAttributes: [
        "id",
        "latitude",
        "longitude",
        "title"
    ],

    /**
     * Loads data from server for each and every sensor this territory have. You may specify what time period you interested in
     * @param {number|Date} timeInterval You can pass in two variants:
     * 1) First, if you need a time period from now, you can pass one of the following values:
     *   24: Server will return measurements for last 24 hours (1 measurement per hour)
     *   7: Server will return measurements for last week (1 measurement per day)
     *   30: Server will return measurements for last month (1 measurement per day)
     * 2) Or you can explicitly specify time frame you are interested in.
     *   If so, you can provide Date object or milliseconds from UNIX epoch start.
     *   This argument will be treated as start date of the time frame you are interested in.
     *   You need to pass second argument for this method if you want to work it with time frame
     * @param {number|Date|*} [endDate=undefined] If you pass this argument,
     * method will assume that you are interested in time frame for sensor's data
     * @returns {Territory|Promise<Territory>|Promise.Thenable<Territory>}
     */
    fetchSeriesOfMeasurements: function(timeInterval, endDate) {
        return Promise.
            all(_.map(this.sensors, function startToFetchDataForSensor(sensor) {
                return sensor.fetchSeriesOfMeasurements(timeInterval, endDate);
            })).
            then(function allSensorsFinishedFetchingData() {
                return this;
            }.bind(this));
    },

    /**
     * Get sensor by it's Id.
     * @param {string} id Id of the Sensor
     * @returns {Sensor|undefined} return Sensor instance if it belongs to territory and was found by it's id, undefined otherwise
     */
    getSensor: function(id) {
        return _.find(this.sensors, function compareSensorById(sensor) {
            return sensor.id == id;
        });
    },

    /**
     * Remove sensor by it's id
     * @param {number} id Id of the Sensor
     * @returns {boolean} Returns true if there was Sensor with provided id and it was deleted, false otherwise
     */
    removeSensor: function(id) {
        var oldLength = this.sensors.length;
        this.sensors = _.filter(this.sensors, function compareSensorsById(sensor) {
            return sensor.id != id;
        });
        
        return this.sensors.length != oldLength;
    },

    /**
     * Stores provided Sensor. If there are sensor with same Id, it will be replaced
     * @param {Sensor} sensor
     */
    addSensor: function(sensor) {
        this.removeSensor(sensor.id);
        sensor.territory = this;
        this.sensors.push(sensor);
    },

    /**
     * Creates Object with safe attributes (without cycling links or methods) which is completely safe to save into DB
     * @returns {{id: string, title: string, longitude: float, latitude: float, sensors: Array.<Sensor>}}
     */
    toJSON: function() {
        var result = _.pick(this, this.safeAttributes);
        result.sensors = _.invoke(this.sensors, "toJSON");
        
        return result;
    },
    /**
     * Returns string representation of the territory
     * @returns {string}
     */
    toString: function() {
        return JSON.stringify(this.toJSON());
    }
};

module.exports = Territory;