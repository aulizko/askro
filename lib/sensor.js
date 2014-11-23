'use strict';

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

var DOMParser = require('xmldom').DOMParser;
var simpleConvertXML = require('simpleconvert-xml');

var _ = require('lodash');
var config = require('./config');

var ValidationError = require('./errors').ValidationError;

/**
 * @class
 * Simple wrapper around json data
 * The only reason why it is even here is to provide nice and clean API to get additional data from the server.
 * @see Sensor#fetchSeriesOfMeasurements for details.
 *
 * @param {object} options The options which will populate fresh copy of Sensor.
 * 1) You may provide already parsed and prepared data (if, say, you loading data from DB),
 * but in that case you should explicitly set second param to false.
 * 2) You may pass parsed JSON from data-provider (russianatom.ru website, for now)
 * @param {boolean} [fromRawData=true] Determines, whether first param is raw data or not.
 * If you do skip this param, it is assumed to be true.
 * @constructor
 */
var Sensor = function (options, fromRawData) {
    // let's assume that API user should explicitly pass "false" value into fromRawData
    // if he don't want to parse it
    if (fromRawData === false) {
        options = options || {};
        _.assign(this, _.cloneDeep(options));
    } else {
        this.__parseAndSaveRawData(options);
    }

    this.validate();

    /**
     * Link to territory which sensor belongs to
     * @type {Territory}
     */
    this.territory = undefined;
};

Sensor.prototype = {
    safeAttributes: [
        'id',
        'title',
        'longitude',
        'latitude',
        'measurements'
    ],

    /**
     * Loads data from server for current sensor. You may specify what time period you interested in.
     * Duplicate measurements are removed.
     *
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
     * method will assume that you are interested in time frame for series of measurements
     * @returns {Sensor|Promise<Sensor>|Promise.Thenable<Sensor>}
     */
    fetchSeriesOfMeasurements: function (timeInterval, endDate) {
        var startDate = null;
        var threshold = 'h';
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
            // service won't send you hourly data
            if (timeDiff >= config.FIVE_DAYS_IN_MILLISECONDS / 1000) {
                threshold = 'd';
            }
            // if diff between start and end dates are more then 90 days,
            // service won't send you daily data
            if (timeDiff >= config.NINETY_DAYS_IN_MILLISECONDS / 1000) {
                threshold = 'm';
            }
        }

        // get measurements for the last 24 hours by default
        if (!timeInterval) {
            timeInterval = this.DAY;
        }

        var url;

        if (startDate && endDate && threshold) {
            url = this.buildSensorMeasurementsParametrizedUrl({
                sensorId: this.id,
                territoryId: this.territory.id,
                startDate: startDate,
                endDate: endDate,
                threshold: threshold
            });
        } else {
            url = this.buildSensorMeasurementsUrl({
                timeInterval: timeInterval,
                sensorId: this.id,
                territoryId: this.territory.id
            });
        }

        return request(url).
            bind(this).
            spread(function parseResponseForMeasurementSeriesRequest(response, responseBody) {
                if (response.statusCode !== 200) {
                    throw new Error('Error getting XML for sensor\'s measurements. Status code: ' +
                    response.statusCode);
                }

                // parse xml to JS object
                var xmlNode = new DOMParser().parseFromString(responseBody);
                return simpleConvertXML.getXMLAsObj(xmlNode);
            }).
            then(function convertParsedDataIntoMeasurementsObjects(data) {
                if (data.response.status !== 'ok') {
                    throw new Error('XML data for sensor\'s measurements is not ok. Status: ' + data.response.status);
                }

                this.measurements = this.measurements.concat(_.map(data.response.archive.date,
                        function convertingValueAndDateFromJsonIntoObjects(measurement) {
                            return this.__convertValueAndTimeFromRawData(measurement);
                        }, this)
                );

                this.measurements = _.uniq(
                    this.measurements,
                    true,
                    this.__measurementIdentity
                );

                this.measurements = _.sortBy(this.measurements, this.__measurementIdentity);

                this.validate();

                return this;
            });
    },

    /**
     * There is only one unique attribute for measure - it's timestamp
     * So for sorting purposes let's use it as an identity
     * @param {{time: date, value: number}} measurement The measurement item
     * @returns {number}
     * @private
     */
    __measurementIdentity: function (measurement) {
        return measurement.time.getTime();
    },

    /**
     * Converts fresh piece of JSONified XML from data server into internal goodies.
     * @param {{id: string, name: string, lng: string, lat: string, time: string, value: string}} rawData From server
     * @private
     */
    __parseAndSaveRawData: function (rawData) {
        if (rawData.id) {
            this.id = rawData.id.substr(rawData.id.indexOf('_') !== -1 ? rawData.id.indexOf('_') + 1 : 0);
        }

        if (rawData.name) {
            this.title = rawData.name.trim();
        }

        if (rawData.lng) {
            this.longitude = parseFloat(rawData.lng);
        }

        if (rawData.lat) {
            this.latitude = parseFloat(rawData.lat);
        }

        /**
         * The main part of the sensor data - series of measurement
         * Value are measured in in microsieverts, SI μSv
         * @type {Array.<{time: Date, value: number}>}
         */
        this.measurements = [];

        if (rawData.time && rawData.value) {
            this.measurements.push(this.__convertValueAndTimeFromRawData(rawData));
        }
    },
    /**
     * Converts time (from UNIX epoch seconds into Date object) and value (from μR to μSv)
     * @param {{time: string, value: string}} rawData
     * @returns {{time: Date, value: number}}
     * @private
     */
    __convertValueAndTimeFromRawData: function (rawData) {
        return {
            time: new Date(Number.parseInt(rawData.time, 0) * 1000),
            // To convert μR to μSv we need to divide by 100.0
            value: parseFloat(rawData.value) / 100.0
        };
    },
    /**
     * Creates Object with safe attributes (without cycling links or methods) which is completely safe to save into DB
     * @returns {{id: string, title: string, longitude: float, latitude: float, measurements: Array}}
     */
    toJSON: function () {
        return _.pick(this, this.safeAttributes);
    },
    /**
     * Returns string representation of the sensor
     * @returns {string}
     */
    toString: function () {
        return JSON.stringify(this.toJSON());
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

            if (!_.every(this.measurements, function validateMeasurement(measurement) {
                    return _.isDate(measurement.time) && _.isNumber(measurement.value);
                })) {
                throw new ValidationError('Some measurements are malformed');
            }
        }, this);

        return true;
    }
};

_.assign(Sensor.prototype, {}, config);

module.exports = Sensor;
