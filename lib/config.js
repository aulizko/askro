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
 *   SENSOR_MEASUREMENTS_URL: (Function|string|_.TemplateExecutor|any),
 *   SENSOR_MEASUREMENTS_PARAMETRIZED_URL: (Function|string|_.TemplateExecutor|any)
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
    SENSOR_MEASUREMENTS_URL: _.template('http://www.russianatom.ru/' +
    'data_source/get_indications_by_id.php?' +
    'id=<%= sensorId %>&terr_id=<%= territoryId %>&order=<%= timeInterval %>'),
    SENSOR_MEASUREMENTS_PARAMETRIZED_URL: _.template('http://www.russianatom.ru/' +
    'data_source/get_indications_by_id.php?' +
    'id=<%= sensorId %>&terr_id=<%= territoryId %>&from=<%= startDate %>&to=<%= endDate %>&detail=<%= threshold %>')
};
