var test = require('tape').test;
var _ = require('lodash');

var Sensor = require('../lib/sensor');

var stub = require('./stub').sensor;
var rawStub = require('./stub').sensorRawData;
var ValidationError = require('../lib/errors').ValidationError;

var nock = require('nock');

test('Sensor', function (t) {
    // Load data from DB testing
    t.test('should accept data from db', function (t) {
        var s = new Sensor(stub, false);

        t.equal(s.id, '23');
        t.equal(s.longitude, 28.747183);
        t.equal(s.title, 'п. Котельский');
        t.equal(s.latitude, 59.584364);
        t.equal(s.measurements.length, 2);
        t.equal(s.validate(), true);

        t.end();
    });

    // Validation
    t.test('should require safe attributes', function (t) {
        var validationResult = false;
        var s;

        try {
            s = new Sensor(_.pick(stub, ['title', 'latitude', 'longitude', 'measurements']), false);
        } catch (e) {
            t.ok(e instanceof ValidationError);
            t.equal(e.message, 'id attribute missing')
        }

        t.notOk(s);

        s = new Sensor(stub, false);

        s.id = '';

        try {
            validationResult = s.validate();
        } catch (e) {
            t.ok(e instanceof ValidationError);
            t.equal(e.message, 'id attribute has falsy value');
        }

        t.notOk(validationResult);

        s.id = 1;
        s.measurements.push({wrong: true});

        try {
            validationResult = s.validate();
        } catch (e) {
            t.ok(e instanceof ValidationError);
            t.equal(e.message, 'Some measurements are malformed');
        }

        t.notOk(validationResult);

        t.end();
    });

    // Parse raw data from server
    t.test('Raw data parsing', function (t) {
        var s = new Sensor(rawStub);

        t.equal(s.id, '27');
        t.equal(s.longitude, 166.45459);
        t.equal(s.title, 'г. Билибино (м/р «Арктика»)');
        t.equal(s.latitude, 68.06701);
        t.equal(s.measurements.length, 1);
        t.equal(s.validate(), true);

        t.end();
    });

    // test network methods
    t.test('Fetching series of measurements', function (t) {
        nock('http://www.russianatom.ru').
            get('/data_source/get_indications_by_id.php?id=23&terr_id=1&order=24').
            replyWithFile(200, __dirname + '/seriesOfMeasurementsResponse.stub.xml');

        var s = new Sensor(stub, false);

        // clear measurements for easier debugging
        s.measurements.length = 0;
        // add stub territory as territory id is required by data provider
        s.territory = {
            id: 1
        };

        s.fetchSeriesOfMeasurements().
            then(function (sensor) {
                t.equal(sensor.validate(), true);
                t.equal(sensor.measurements.length, 24);
                t.equal(sensor.measurements[0].value, 0.09);
            }).
            then(function () {
                t.end();
            });
    });

    t.test('Different time intervals', function (t) {
        // should throw an error if one of this paths won't be queried
        var responseStub = nock('http://www.russianatom.ru').
            get('/data_source/get_indications_by_id.php?id=23&terr_id=1&order=24').
            replyWithFile(200, __dirname + '/seriesOfMeasurementsResponse.stub.xml').
            get('/data_source/get_indications_by_id.php?id=23&terr_id=1&order=7').
            replyWithFile(200, __dirname + '/seriesOfMeasurementsResponse.stub.xml').
            get('/data_source/get_indications_by_id.php?id=23&terr_id=1&order=30').
            replyWithFile(200, __dirname + '/seriesOfMeasurementsResponse.stub.xml');

        var s = new Sensor(stub, false);

        // clear measurements for easier debugging
        s.measurements.length = 0;
        // add stub territory as territory id is required by data provider
        s.territory = {
            id: 1
        };

        s.fetchSeriesOfMeasurements(Sensor.prototype.DAY).
            then(function (sensor) {
                return sensor.fetchSeriesOfMeasurements(Sensor.prototype.WEEK);
            }).
            then(function (sensor) {
                return sensor.fetchSeriesOfMeasurements(Sensor.prototype.MONTH);
            }).
            then(function () {
                if (!responseStub.isDone()) {
                    t.fail('Not all urls are queried');
                }

                t.end();
            })
    });

    t.test('Fetch specific time frame and see if detail argument being handled correctly', function (t) {
        var dayAgo = new Date(1416486194629000);
        dayAgo.setDate(dayAgo.getDate() - 1);
        var dayAfterDay = new Date(1416486194629000);
        dayAfterDay.setDate(dayAfterDay.getDate() - 2);

        var moreThenAWeekAgo = new Date(1416486194629000);
        moreThenAWeekAgo.setDate(moreThenAWeekAgo.getDate() - 10);

        var moreThenThreeMonthsAgo = new Date(1416486194629000);
        moreThenThreeMonthsAgo.setMonth(moreThenThreeMonthsAgo.getMonth() - 4);

        // here we test automatic "detail" query change
        var responseStub = nock('http://www.russianatom.ru').
            get('/data_source/get_indications_by_id.php?id=23&terr_id=1&from=1416486021829&to=1416486108229&detail=h').
            replyWithFile(200, __dirname + '/seriesOfMeasurementsResponse.stub.xml').
            get('/data_source/get_indications_by_id.php?id=23&terr_id=1&from=1416485330629&to=1416486108229&detail=d').
            replyWithFile(200, __dirname + '/seriesOfMeasurementsResponse.stub.xml').
            get('/data_source/get_indications_by_id.php?id=23&terr_id=1&from=1416475653829&to=1416486108229&detail=m').
            replyWithFile(200, __dirname + '/seriesOfMeasurementsResponse.stub.xml');

        var s = new Sensor(stub, false);

        // clear measurements for easier debugging
        s.measurements.length = 0;
        // add stub territory as territory id is required by data provider
        s.territory = {
            id: 1
        };

        s.fetchSeriesOfMeasurements(dayAfterDay, dayAgo).
            then(function (sensor) {
                return sensor.fetchSeriesOfMeasurements(moreThenAWeekAgo, dayAgo);
            }).
            then(function (sensor) {
                return sensor.fetchSeriesOfMeasurements(moreThenThreeMonthsAgo, dayAgo);
            }).
            then(function () {
                if (!responseStub.isDone()) {
                    t.fail('Not all urls are queried');
                }

                t.end();
            });
    });

    t.end();
});
