'use strict';

var _ = require('lodash');

var Promise = require('bluebird');
var request = Promise.promisify(require('request'));

var DOMParser = require('xmldom').DOMParser;
var simpleConvertXML = require('simpleconvert-xml');

var Territory = require('./territory');

var config = require('./config');

/**
 * @class
 * Container for territories. Implements standard List methods, like add, remove, get.
 * @see ListOfTerritories#territories
 * @see ListOfTerritories#fetchLatest
 * @see ListOfTerritories#fetch
 * @param {Object} [data=undefined] You may initialize list with data from DB.
 * @constructor
 */
var ListOfTerritories = function (data) {
    // Populate current instance with constants and settings
    _.assign(this, config);

    // Populate current instance with data from DB.
    // Bonus! This also will rewrite any settings that came from config.
    data = data || {};
    _.assign(this, data);

    if (!this.territories) {
        /**
         * Direct access to territories array.
         * @see Territory
         * You may use or modify it without any caution, it is not used any "special" way internally.
         * @type {Array.<Territory>}
         */
        this.territories = [];
    }

    if (this.territories.length) {
        this.__fixTerritoriesIfNeeded();
    }
};

ListOfTerritories.prototype = {
    /**
     * Stores territory. If there are territory with same Id, it will be replaced
     * @param {Territory} territory Territory to store
     */
    add: function (territory) {
        this.remove(territory.id);
        this.territories.push(territory);
    },

    /**
     * Remove territory by it's id
     * @param {number} id Id of the Territory
     * @returns {boolean} Returns true if there was Territory with provided id and it was deleted, false otherwise
     */
    remove: function (id) {
        id = Number(id);
        var oldLength = this.territories.length;
        this.territories = _.filter(this.territories, function iterateThroughTerritories(territory) {
            return territory.id !== id;
        });

        return this.territories.length !== oldLength;
    },

    /**
     * Get territory by it's Id.
     * @param {number|string} id Id of the territory
     * @returns {Territory|undefined} return Territory instance if it belongs to territory and was found by it's id,
     * undefined otherwise
     */
    get: function (id) {
        id = Number(id);
        return _.find(this.territories, function iterateThroughTerritories(territory) {
            return territory.id === Number.parseInt(id, 0);
        });
    },

    /**
     * Fetches latest measurements from data source and stores it into territories array
     * @returns {ListOfTerritories|Promise<ListOfTerritories>} returns instance of itself
     */
    fetchLatest: function () {
        return request(this.LAST_MEASUREMENTS_URL).
            spread(function parsingResponseFromLastMeasurementUrl(response, responseBody) {
                if (response.statusCode !== 200) {
                    throw new Error('Error getting XML from url for latest measurements. Status code: ' +
                    response.statusCode);
                }
                // parse xml to JS object
                var xmlNode = new DOMParser().parseFromString(responseBody);
                return simpleConvertXML.getXMLAsObj(xmlNode);
            }).
            bind(this).
            then(function convertingJsonDataIntoInstancesOfTerritoryAndSensorClasses(data) {
                if (data.response.status !== 'ok') {
                    throw new Error('XML data for latest measurements is not ok. Status: ' + data.response.status);
                }

                // shorthands
                var territories = data.response.territory_list.territory;
                var sensors = data.response.sensor_list.sensor;
                var objectsList = data.response.object_list.object;
                var helpContents = data.response.helpContents;

                if (_.isUndefined(territories) ||
                        _.isUndefined(sensors) ||
                        _.isUndefined(objectsList) ||
                        _.isUndefined(helpContents)) {

                    throw new Error('Malformed data');
                }

                _.each(territories, function convertingTerritory(territory) {
                    var rawData = _.pick(territory, 'index');

                    // get longitude and latitude from objects
                    var latLngContainer = _.find(objectsList, function findLatitudeLongitudeContainerById(object) {
                        // yup, it's for real. I don't know why but objectsList are identified by "o" + territory.id
                        return object.id === 'o' + territory.index;
                    });

                    _.assign(rawData, _.pick(latLngContainer, ['lat', 'lng']));

                    // get long and descriptive title
                    var helpContent = helpContents[latLngContainer.id];
                    rawData.title = helpContent.title;

                    // get sensors list that belongs to current territory
                    rawData.sensors = _.filter(sensors, {terrId: String(rawData.index)});

                    var convertedTerritory = new Territory(rawData);

                    this.add(convertedTerritory);
                }, this);

                return this;
            });
    },
    /**
     * Loads data from server for each and every territory this list have.
     * Each of territories will load their sensors and measurements.
     * Duplicate measurements are removed.
     *
     * You may specify what time period you interested in
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
     * @returns {ListOfTerritories|Promise<ListOfTerritories>|Promise.Thenable<ListOfTerritories>} itself
     */
    fetch: function (timeInterval, endDate) {
        var promise;
        if (this.territories.length === 0) { // fresh start
            promise = this.fetchLatest();
        } else {
            promise = Promise.resolve();
        }

        return promise.
            then(function () {
                return Promise.
                    all(_.map(this.territories, function startToFetchDataForTerritory(territory) {
                        return territory.fetchSeriesOfMeasurements(timeInterval, endDate);
                    }));
            }.bind(this)).
            then(function () {
                return this;
            }.bind(this));
    },
    /**
     * Creates Object with safe attributes (without cycling links or methods) which is completely safe to save into DB.
     * Basically, it is an array of territories, converted to json
     * @returns {Array.<{id: string, title: string, longitude: float, latitude: float, sensors: Array.<Sensor>}>}
     */
    toJSON: function () {
        return _.invoke(this.territories, 'toJSON');
    },
    /**
     * Returns string representation of the list of the territories
     * @returns {string}
     */
    toString: function () {
        return JSON.stringify(this.toJSON());
    },

    /**
     * Runs for each territories entry and check if it is Territory class instance.
     * If not, tries to convert it into Territory instance
     * @private
     */
    __fixTerritoriesIfNeeded: function () {
        this.territories = _.map(this.territories, function convertSuspiciousDataIntoTerritory(territoryData) {
            if (territoryData instanceof Territory) {
                return territoryData;
            } else {
                return new Territory(territoryData, false);
            }
        });
    }
};

module.exports = ListOfTerritories;
