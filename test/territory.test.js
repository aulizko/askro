var _ = require('lodash');
var test = require('tape').test;

var Territory = require('../lib/territory');
var Sensor = require('../lib/sensor');
var ValidationError = require('../lib/errors').ValidationError;

var stub = require('./stub').territory;
var rawStub = require('./stub').stubRawTerritory;

var nock = require('nock');

test("Territory", function (t) {
    t.test("should accept DB data", function(t) {
        var territory = new Territory(stub, false);

        t.equal(territory.id, 1);
        t.equal(territory.title, 'Ленинградская АЭС');

        t.end();
    });

    t.test("should convert sensors data from DB into Sensor class instances", function (t) {
        var territory = new Territory(stub, false);

        t.equal(_.isArray(territory.sensors), true, 'sensors attribute should be an array');
        t.equal(territory.sensors.length, 2, 'should contain two sensor instances');
        t.equal(_.every(territory.sensors, function (sensor) {
            return sensor instanceof Sensor;
        }), true, 'every sensors array entry is instance of Sensor class');

        t.end();
    });

    t.test("should accept raw data and parse it", function(t) {
        var territory = new Territory(rawStub);

        t.equal(territory.id, 3);
        t.equal(territory.title, 'Билибинская АЭС');
        t.equal(territory.latitude, 68.0504582723163);
        t.equal(territory.longitude, 166.548492431641);
        t.equal(territory.sensors.length, 2);
        t.ok(territory.validate());

        t.end();
    });

    t.test('validation', function(t) {
        var validationResult = false;
        var territory;

        try {
            territory = new Territory(_.pick(stub, ["title", "latitude", "longitude", "sensors"]), false);
        } catch(e) {
            t.ok(e instanceof ValidationError);
            t.equal(e.message, 'id attribute missing')
        }

        t.notOk(territory);

        territory = new Territory(stub, false);

        territory.title = '';

        try {
            validationResult = territory.validate();
        } catch (e) {
            t.ok(e instanceof ValidationError);
            t.equal(e.message, 'title attribute has falsy value');
        }

        t.notOk(validationResult);

        territory.title = '123';
        territory.sensors[0].id = '';

        try {
            validationResult = territory.validate();
        } catch(e) {
            t.ok(e instanceof ValidationError);
            t.equal(e.message, 'id attribute has falsy value');
        }

        t.notOk(validationResult);

        t.end();
    });

    t.test("Fetch series of measurements", function(t) {
        var responseStub = nock('http://www.russianatom.ru').
            get('/data_source/get_indications_by_id.php?id=27&terr_id=3&order=24').
            replyWithFile(200, __dirname + '/seriesOfMeasurementsResponse.stub.xml').
            get('/data_source/get_indications_by_id.php?id=21&terr_id=3&order=24').
            replyWithFile(200, __dirname + '/seriesOfMeasurementsResponse.stub.xml');

        var territory = new Territory(rawStub);

        territory.fetchSeriesOfMeasurements()
            .then(function () {
                if (!responseStub.isDone()) {
                    t.fail('Not all urls are queried');
                }
                t.end();
            });
    });

    t.end();
});

