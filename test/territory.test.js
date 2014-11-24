'use strict';

var _ = require('lodash');
var test = require('tape').test;

var path = require('path');

var Territory = require('../lib/territory');
var Sensor = require('../lib/sensor');
var ValidationError = require('../lib/errors').ValidationError;

var stub = require('./stub').territory;
var rawStub = require('./stub').stubRawTerritory;

var nock = require('nock');

test('Territory', function (t) {
    t.test('should accept DB data', function (t) {
        var territory = new Territory(stub, false);

        t.equal(territory.id, 1);
        t.equal(territory.title, 'Ленинградская АЭС');

        t.end();
    });

    t.test('should convert sensors data from DB into Sensor class instances', function (t) {
        var territory = new Territory(stub, false);

        t.equal(_.isArray(territory.sensors), true, 'sensors attribute should be an array');
        t.equal(territory.sensors.length, 2, 'should contain two sensor instances');
        t.equal(_.every(territory.sensors, function (sensor) {
            return sensor instanceof Sensor;
        }), true, 'every sensors array entry is instance of Sensor class');

        t.end();
    });

    t.test('should accept raw data and parse it', function (t) {
        var territory = new Territory(rawStub);

        t.equal(territory.id, 3);
        t.equal(territory.title, 'Билибинская АЭС');
        t.equal(territory.latitude, 68.0504582723163);
        t.equal(territory.longitude, 166.548492431641);
        t.equal(territory.sensors.length, 2);
        t.ok(territory.validate());

        t.end();
    });

    t.test('validation', function (t) {
        var validationResult = false;
        var territory;

        try {
            territory = new Territory(_.pick(stub, ['title', 'latitude', 'longitude', 'sensors']), false);
        } catch (e) {
            t.ok(e instanceof ValidationError);
            t.equal(e.message, 'id attribute missing');
        }

        t.notOk(territory);

        territory = new Territory(stub, false);

        territory.title = '';

        try {
            validationResult = territory.validate();
        } catch (e) {
            t.ok(e instanceof ValidationError);
            t.equal(e.message, 'title attribute has falsie value');
        }

        t.notOk(validationResult);

        territory.title = '123';
        territory.sensors[0].id = '';

        try {
            validationResult = territory.validate();
        } catch (e) {
            t.ok(e instanceof ValidationError);
            t.equal(e.message, 'id attribute has falsie value');
        }

        t.notOk(validationResult);

        t.end();
    });

    t.test('Fetch series of measurements', function (t) {
        var stubFilePath = path.join(__dirname, 'seriesOfMeasurementsResponse.stub.xml');
        var responseStub = nock('http://www.russianatom.ru').
            get('/data_source/get_indications_by_id.php?id=27&terr_id=3&order=24').
            replyWithFile(200, stubFilePath).
            get('/data_source/get_indications_by_id.php?id=21&terr_id=3&order=24').
            replyWithFile(200, stubFilePath);

        var territory = new Territory(rawStub);

        territory.fetchSeriesOfMeasurements()
            .then(function () {
                if (!responseStub.isDone()) {
                    t.fail('Not all urls are queried');
                }
                t.end();
            });
    });

    t.test('toJSON method', function (t) {
        var territory = new Territory(stub, false);
        t.deepEqual(territory.toJSON(), {
            id: 1,
            latitude: 59.852586487905,
            longitude: 29.0841979980469,
            sensors: [
                {
                    id: '28',
                    latitude: 59.99593,
                    longitude: 28.402556,
                    measurements: [
                        {
                            time: new Date('Fri Nov 21 2014 03:00:00 GMT+0400 (MSK)'),
                            value: 0.095
                        }
                    ],
                    title: 'остров Сескар'
                },
                {
                    id: '23',
                    latitude: 59.584364,
                    longitude: 28.747183,
                    measurements: [
                        {
                            time: new Date('Fri Nov 21 2014 03:00:00 GMT+0400 (MSK)'),
                            value: 0.1
                        },
                        {
                            time: new Date('Fri Nov 21 2014 04:00:00 GMT+0400 (MSK)'),
                            value: 0.1
                        }
                    ],
                    title: 'п. Котельский'
                }
            ],
            title: 'Ленинградская АЭС'
        });

        t.end();
    });

    t.test('toString', function (t) {
        var territory = new Territory(stub, false);
        t.equal(territory.toString(), '{"id":1,"latitude":59.852586487905,"longitude":29.0841979980469,' +
        '"title":"Ленинградская АЭС","sensors":[{"id":"28","title":"остров Сескар","longitude":28.402556,' +
        '"latitude":59.99593,"measurements":[{"time":"2014-11-20T23:00:00.000Z","value":0.095}]},{"id":"23",' +
        '"title":"п. Котельский","longitude":28.747183,"latitude":59.584364,"measurements":[{' +
        '"time":"2014-11-20T23:00:00.000Z","value":0.1},{"time":"2014-11-21T00:00:00.000Z","value":0.1}]}]}');

        t.end();
    });

    t.test('getSensor', function (t) {
        var territory = new Territory(stub, false);

        t.notOk(territory.getSensor('132'));

        t.equal(territory.getSensor('28').latitude, 59.99593);

        t.end();
    });

    t.test('removeSensor', function (t) {
        var territory = new Territory(stub, false);

        var beforeDeletionSensorsCount = territory.sensors.length;

        // if there is not such a sensor
        var deletionResult = territory.removeSensor('3112');

        t.notOk(deletionResult);
        t.equal(territory.sensors.length, beforeDeletionSensorsCount);

        // should work as predicted
        deletionResult = territory.removeSensor('23');
        t.ok(deletionResult);
        t.equal(territory.sensors.length, beforeDeletionSensorsCount - 1);
        t.equal(territory.sensors[0].id, '28');

        t.end();
    });

    t.test('addSensor', function (t) {
        var territory = new Territory(stub, false);

        var sensor = territory.sensors[0];
        territory.sensors.length = 0;

        // add new sensor
        territory.addSensor(sensor);
        t.equal(territory.sensors.length, 1);
        t.equal(territory.sensors[0].id, sensor.id);

        // add new sensor with the same id and look into sensors count
        territory.addSensor(sensor);
        t.equal(territory.sensors.length, 1);
        t.equal(territory.sensors[0].id, sensor.id);

        // this method adds a link to territory to the sensor
        t.equal(territory.sensors[0].territory, territory);

        t.end();
    });

    t.end();
});
