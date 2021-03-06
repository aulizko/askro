'use strict';

var _ = require('lodash');
var Promise = require('bluebird');

var Sensor = require('./sensor');
var config = require('./config');
var ValidationError = require('./errors').ValidationError;

/**
 * @class
 * Wraps JSON data from server into a tiny class with one great method.
 * @see Territory#fetchSeriesOfMeasurements
 * @see Territory#sensors
 * @param {Object|undefined} [options=undefined] Pre-parsed data for territory (used to load data from DB)
 * @param {boolean} [fromRawData=true] Determines, whether first param is raw data or not.
 * If you do skip this param, it is assumed to be true.
 * @constructor
 */
var Territory = function (options, fromRawData) {
    // let's assume that API user should explicitly pass "false" value into fromRawData
    // if he don't want to parse it
    if (fromRawData === false) {
        options = options || {};
        _.assign(this, _.cloneDeep(options));
    } else {
        this.__parseAndSaveRawData(options);
    }

    if (!this.sensors) {
        /**
         * The main cause why this class even exist.
         * Contains an array of sensors with measurements data stored inside of them
         * @type {Array.<Sensor>}
         */
        this.sensors = [];
    }

    if (this.sensors.length) {
        this.__fixSensorsIfNeeded();
    }

    this.validate();
};

Territory.prototype = {
    safeAttributes: [
        'id',
        'latitude',
        'longitude',
        'title'
    ],

    /**
     * Loads data from server for each and every sensor this territory have.
     * @param {number|Date} [timeInterval=24] You can pass in two variants:
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
    fetchSeriesOfMeasurements: function (timeInterval, endDate) {
        var queued = [];
        var parallel = config.concurrent;
        // Control concurrency level. Borrowed from http://promise-nuggets.github.io/articles/16-map-limit.html

        var sensorMeasurementsPromises = _.map(this.sensors, function startToFetchDataForSensor(sensor) {
            // How many items must download before fetching the next?
            // The queued, minus those running in parallel, plus one of
            // the parallel slots.
            var mustComplete = Math.max(0, queued.length - parallel + 1);
            // when enough items are complete, queue another request for an item
            var download = Promise.some(queued, mustComplete).
                then(function launchSensorDataLoad() {
                    return sensor.fetchSeriesOfMeasurements(timeInterval, endDate);
                });

            queued.push(download);

            return download;
        });

        // synonym to Async.mapSeries
        return Promise.
            all(sensorMeasurementsPromises).
            then(function () {
                return this;
            }.bind(this));
    },

    cleanMeasurements: function () {
        _.invoke(this.sensors, 'cleanMeasurements');
    },

    /**
     * Creates Object with safe attributes (without cycling links or methods) which is completely safe to save into DB
     * @returns {{id: string, title: string, longitude: float, latitude: float, sensors: Array.<Sensor>}}
     */
    toJSON: function () {
        var result = _.pick(this, this.safeAttributes);
        result.sensors = _.invoke(this.sensors, 'toJSON');

        return result;
    },
    /**
     * Returns string representation of the territory
     * @returns {string}
     */
    toString: function () {
        return JSON.stringify(this.toJSON());
    },

    /**
     * Runs for each sensors entry and check if it is Sensor class instance.
     * If not, tries to convert it into Sensor instance
     * @private
     */
    __fixSensorsIfNeeded: function () {
        this.sensors = _.map(this.sensors, function convertSuspiciousDataIntoSensor(sensorData) {
            if (sensorData instanceof Sensor) {
                return sensorData;
            } else {
                var sensor = new Sensor(sensorData, false);
                sensor.territory = this;
                return sensor;
            }
        }, this);
    },

    /**
     * Converts fresh piece of JSONified XML from data server into internal goodies.
     * @param {{
     *   index: string,
     *   title: string,
     *   lng: string,
     *   lat: string,
     *   sensors: Array.<{id: string, name: string, lng: string, lat: string, time: string, value: string}>
     * }} rawData Fresh piece of JSONified XML data from server
     * @private
     */
    __parseAndSaveRawData: function (rawData) {
        if (rawData.index) {
            this.id = Number.parseInt(rawData.index, 0);
        }

        if (rawData.lat) {
            this.latitude = parseFloat(rawData.lat);
        }

        if (rawData.lng) {
            this.longitude = parseFloat(rawData.lng);
        }

        if (rawData.title) {
            this.title = rawData.title.trim();
        }

        if (rawData.sensors && _.isArray(rawData.sensors)) {
            this.sensors = [];

            _.each(rawData.sensors, function (rawSensorData) {
                var sensor = new Sensor(rawSensorData);
                sensor.territory = this;
                this.add(sensor);
            }, this);
        }
    },

    /**
     * Validates current instance
     * @return {boolean} true If current instance is valid, false otherwise
     */
    validate: function () {
        _.each(this.safeAttributes, function checkForSafeAttribute(attribute) {
            if (!(attribute in this)) {
                throw new ValidationError(attribute + ' attribute missing');
            }
            if (!this[attribute]) {
                throw new ValidationError(attribute + ' attribute has falsie value');
            }

            if (!_.every(this.sensors, function validateSensor(sensor) {
                    return sensor.validate();
                })) {
                throw new ValidationError('Some measurements are malformed');
            }
        }, this);

        return true;
    }
};

// mix list itnterface
require('./listInterface')(Territory.prototype, 'sensors');

module.exports = Territory;
