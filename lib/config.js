'use strict';

var _ = require('lodash');

var millisecondsInTwentyFourHours = 24 * 60 * 60 * 1000;

/**
 * Just parameters, used internally
 * @enum
 * @type {{
 *   LAST_MEASUREMENTS_URL: string,
 *   DAY: number, WEEK: number,
 *   MONTH: number,
 *   FIVE_DAYS_IN_MILLISECONDS: number,
 *   NINETY_DAYS_IN_MILLISECONDS: number,
 *   MILLISECONDS_IN_TWENTY_FOUR_HOURS: number,
 *   buildSensorMeasurementsUrl: (Function|string|_.TemplateExecutor|any),
 *   buildSensorMeasurementsParametrizedUrl: (Function|string|_.TemplateExecutor|any),
 *   userAgent: string,
 *   concurrent: number
 * }}
 */
module.exports = {
    LAST_MEASUREMENTS_URL: 'http://www.russianatom.ru/data_source/last_indications.php',
    DAY: 24,
    WEEK: 7,
    MONTH: 30,
    FIVE_DAYS_IN_MILLISECONDS: 5 * millisecondsInTwentyFourHours,
    NINETY_DAYS_IN_MILLISECONDS: 90 * millisecondsInTwentyFourHours,
    MILLISECONDS_IN_TWENTY_FOUR_HOURS: millisecondsInTwentyFourHours,
    buildSensorMeasurementsUrl: _.template('http://www.russianatom.ru/' +
    'data_source/get_indications_by_id.php?' +
    'id=<%= sensorId %>&terr_id=<%= territoryId %>&order=<%= timeInterval %>'),
    buildSensorMeasurementsParametrizedUrl: _.template('http://www.russianatom.ru/' +
    'data_source/get_indications_by_id.php?' +
    'id=<%= sensorId %>&terr_id=<%= territoryId %>&from=<%= startDate %>&to=<%= endDate %>&detail=<%= threshold %>'),
    userAgent: 'OpenData Node.js Robot',
    // how much connection launch in parallel
    concurrent: 4
};
