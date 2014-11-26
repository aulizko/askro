'use strict';

var test = require('tape').test;
var _ = require('lodash');
var listMixin = require('../lib/listInterface');

test('Abstract List', function (t) {
    t.test('duck typing', function (t) {
        var toExtend = {
            storage: []
        };

        listMixin(toExtend, 'storage');

        t.ok(_.isFunction(toExtend.add));
        t.ok(_.isFunction(toExtend.get));
        t.ok(_.isFunction(toExtend.remove));
        t.ok(_.isFunction(toExtend.compare));

        t.end();
    });

    t.test('add', function (t) {
        var toExtend = {
            storage: []
        };

        listMixin(toExtend, 'storage');

        toExtend.add({
            id: 11
        });

        t.equal(toExtend.storage.length, 1);

        toExtend.add({
            id: 11
        });

        t.equal(toExtend.storage.length, 1, 'should ignore duplicates');

        toExtend.add({
            id: 31
        });

        t.equal(toExtend.storage.length, 2);

        t.end();
    });

    t.test('remove', function (t) {
        var toExtend = {
            storage: [{
                id: 11
            }]
        };

        listMixin(toExtend, 'storage');

        var removalResult = toExtend.remove(32);

        t.notOk(removalResult);

        t.equal(toExtend.storage.length, 1);

        // should cast id type
        removalResult = toExtend.remove('11');

        t.ok(removalResult);

        t.equal(toExtend.storage.length, 0);

        t.end();
    });

    t.test('get', function (t) {
        var toExtend = {
            storage: [{
                id: 11
            }]
        };

        listMixin(toExtend, 'storage');

        var getResult = toExtend.get('31');

        t.ok(_.isUndefined(getResult));

        t.equal(toExtend.storage.length, 1); // erm... just to be sure :)

        getResult = toExtend.get('11'); // to ensure typecast

        t.deepEqual(getResult, {
            id: 11
        });

        t.equal(toExtend.storage.length, 1);

        t.end();
    });

    t.test('compare', function (t) {
        var toExtend = {
            storage: [{
                id: 11
            }]
        };

        listMixin(toExtend, 'storage');

        t.notOk(toExtend.compare(toExtend.storage[0]), 32);

        t.ok(toExtend.compare(toExtend.storage[0], 11));

        t.end();
    });

    t.end();
});
