'use strict';

// just a helper method bucket that designed to be mixed in other classes;
var _ = require('lodash');
/**
 * Extends provided object with few usefull methods
 * @param {object} extensibleObject Object to extend
 * @param {string} storeName Name of the inner storage
 * @param {object} customOptions Some method that may override provided by default
 */
var List = function (extensibleObject, storeName, customOptions) {
    _.assign(extensibleObject, {
        /**
         * Adds item into inner store.
         * Duplicate items are overrided
         * @param {{id: string|number}} item Item to add
         */
        add: function (item) {
            this.remove(item.id);
            this[storeName].push(item);
        },
        /**
         * Returns item by its id
         * @param {string|number} id Id of the item
         * @return {object|null} Item or null
         */
        get: function (id) {
            return _.find(this[storeName], function (item) {
                return this.compare(item, id);
            }, this);
        },
        /**
         * Removes item from storage if such an item with provided id exists
         * @param {string|number} id
         * @return {boolean} True if item has found and removed, false otherwise
         */
        remove: function (id) {
            var oldLength = this[storeName].length;
            this[storeName] = _.filter(this[storeName], function (item) {
                return !this.compare(item, id);
            }, this);

            return this[storeName].length !== oldLength;
        },
        /**
         * Compares if id of the item is equal provided id
         * @param {object} item Item to evaluate
         * @param {string|number} id Id to compare
         * @return {boolean} Return true if id of the item equal to provided id, false otherwise
         */
        compare: function (item, id) {
            if (typeof item.id === 'string') {
                id = String(id);
            } else {
                id = Number(id);
            }
            return item.id === id;
        }
    }, customOptions || {});
};

module.exports = List;
