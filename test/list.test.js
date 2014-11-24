'use strict';

var ListOfTerritories = require('../lib/listOfTerritories');
var test = require('tape').test;
var territoryDataStub = require('./stub').territory;

var path = require('path');

var Territory = require('../lib/territory');
var _ = require('lodash');

var nock = require('nock');

test('List', function (t) {
    t.test('should appreciate any custom property that has passed in', function (t) {
        var list = new ListOfTerritories({
            some: 1
        });

        t.ok(list.some, 'custom property should not be undefined');
        t.equal(list.some, 1, 'custom property should be equal to 1');

        t.end();
    });

    t.test('should be able to overwrite any default config settings', function (t) {
        var list = new ListOfTerritories({
            DAY: 23
        });

        t.equal(list.DAY, 23, 'day should have 23 hours now');

        t.end();
    });

    t.test('should accept array of JSONified territories and convert them into Territory instances', function (t) {
        var list = new ListOfTerritories({
            territories: [territoryDataStub]
        });

        t.ok(list.territories, 'territories attribute should be ok');
        t.equal(_.isArray(list.territories), true, 'territories attribute should be array');
        t.equal(list.territories.length, 1, 'territories should have one and only one entry');
        t.equal(list.territories[0] instanceof Territory, true,
            'territory entries should be instances of Territory class');

        t.end();
    });

    t.test('should fetch latest measurements', function (t) {
        var responseStub = nock('http://www.russianatom.ru').
            get('/data_source/last_indications.php').
            replyWithFile(200, path.join(__dirname, '/latest.measurements.stub.xml'));

        var list = new ListOfTerritories();

        list.fetchLatest().
            then(function (list) {
                // Data parsing are testing in other places
                // So this is just sanity test
                t.equal(list.territories.length, 17);
                t.equal(list.territories[0].title, 'Ленинградская АЭС');
            }).
            then(function () {
                if (!responseStub.isDone()) {
                    t.fail('Not all urls are queried');
                }

                t.end();
            });
    });

    t.test('should fetch data for each sensor if asked to get series of measurements', function (t) {
        var responseStub = nock('http://www.russianatom.ru').
            filteringPath(function (path) {
                var replacement = path.replace(/id=[^&]+/g, 'id=23');
                replacement = replacement.replace(/terr_id=\d+/, 'terr_id=1');
                replacement = replacement.replace(/order=\d+/, 'order=24');

                return replacement;
            }).
            get('/data_source/get_indications_by_id.php?id=23&terr_id=1&order=24').
            replyWithFile(200, path.join(__dirname, 'seriesOfMeasurementsResponse.stub.xml'));

        var list = new ListOfTerritories({
            territories: [territoryDataStub]
        });

        list.territories[0].sensors.length = 1;

        list.fetch().
            then(function (list) {
                t.equal(list.territories.length, 1);
                t.equal(list.territories[0].title, 'Ленинградская АЭС');
                t.equal(list.territories[0].sensors[0].measurements[0].value, 0.095);
            }).
            then(function () {
                if (!responseStub.isDone()) {
                    t.fail('Not all urls are queried');
                }

                t.end();
            });
    });

    t.test('add', function (t) {
        var list = new ListOfTerritories();

        list.add(new Territory(territoryDataStub, false));

        t.equal(list.territories.length, 1);
        t.equal(list.territories[0].id, 1);

        // should not allow duplication of data
        list.add(new Territory(territoryDataStub, false));

        t.equal(list.territories.length, 1);
        t.equal(list.territories[0].id, 1);

        t.end();
    });

    t.test('remove', function (t) {
        var list = new ListOfTerritories({
            territories: [territoryDataStub]
        });

        var oldListLength = list.territories.length;

        // remove with wrong id
        var deletionResult = list.remove(2);
        t.notOk(deletionResult);
        t.equal(list.territories.length, oldListLength);

        deletionResult = list.remove(1);
        t.ok(deletionResult);
        t.equal(list.territories.length, 0);

        t.end();
    });

    t.test('get', function (t) {
        var list = new ListOfTerritories({
            territories: [territoryDataStub]
        });

        t.notOk(list.get('123'), 'should return undefined if there is not territory with provided id');

        t.equal(list.get('1').title, 'Ленинградская АЭС');

        t.end();
    });

    t.test('toJSON', function (t) {
        var list = new ListOfTerritories({
            territories: [territoryDataStub]
        });

        t.deepEqual(list.toJSON(), [
            {
                id: 1,
                latitude: 59.852586487905,
                longitude: 29.0841979980469,
                title: 'Ленинградская АЭС',
                sensors: [
                    {
                        id: '28',
                        title: 'остров Сескар',
                        longitude: 28.402556,
                        latitude: 59.99593,
                        measurements: [
                            {
                                time: new Date('Fri Nov 21 2014 03:00:00 GMT+0400 (MSK)'),
                                value: 0.095
                            }
                        ]
                    },
                    {
                        id: '23',
                        title: 'п. Котельский',
                        longitude: 28.747183,
                        latitude: 59.584364,
                        measurements: [
                            {
                                time: new Date('Fri Nov 21 2014 03:00:00 GMT+0400 (MSK)'),
                                value: 0.1
                            },
                            {
                                time: new Date('Fri Nov 21 2014 04:00:00 GMT+0400 (MSK)'),
                                value: 0.1
                            }
                        ]
                    }
                ]
            }
        ]);

        t.end();
    });

    t.test('toString', function (t) {
        var list = new ListOfTerritories({
            territories: [territoryDataStub]
        });

        t.equal(list.toString(), '[{"id":1,"latitude":59.852586487905,"longitude":29.0841979980469,' +
        '"title":"Ленинградская АЭС","sensors":[{"id":"28","title":"остров Сескар","longitude":28.402556,' +
        '"latitude":59.99593,"measurements":[{"time":"2014-11-20T23:00:00.000Z","value":0.095}]},' +
        '{"id":"23","title":"п. Котельский","longitude":28.747183,"latitude":59.584364,' +
        '"measurements":[{"time":"2014-11-20T23:00:00.000Z","value":0.1},' +
        '{"time":"2014-11-21T00:00:00.000Z","value":0.1}]}]}]');

        t.end();
    });

    t.test('cleanMeasurements', function (t) {
        var list = new ListOfTerritories({
            territories: [territoryDataStub]
        });

        list.cleanMeasurements();

        _.every(list.territories, function iterateThroughTerritories(territory) {
            return _.every(territory.sensors, function iterateThroughSensors(sensor) {
                return sensor.measurements.length === 0;
            });
        });

        t.end();
    });

    t.end();
});
