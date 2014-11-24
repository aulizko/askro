'use strict';

var List = require('./lib/listOfTerritories');
var Territory = require('./lib/territory');
var Sensor = require('./lib/sensor');
var ValidationError = require('./lib/errors').ValidationError;
// Expose guts to outside API user
List.Sensor = Sensor;
List.Territory = Territory;
List.ValidationError = ValidationError;

module.exports = require('./lib/listOfTerritories');
