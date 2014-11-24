'use strict';

var List = require('./lib/listOfTerritories');
var Territory = require('./lib/territory');
var Sensor = require('./lib/sensor');
var ValidationError = require('./lib/errors').ValidationError;
var config = require('./lib/config');
var _ = require('lodash');

// Expose guts to outside API user
List.Sensor = Sensor;
List.Territory = Territory;
List.ValidationError = ValidationError;
_.assign(List, config);

module.exports = require('./lib/listOfTerritories');
