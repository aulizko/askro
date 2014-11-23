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

    t.end();
});
