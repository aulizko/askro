/*
 Just a wrapper around territory's data
 */
var _ = require('lodash');

var Territory = function(options) {
    options = options || {};
    _.assign(this, options);
    
    this.sensors = [];
};

Territory.prototype = {
    safeAttributes: [
        "id",
        "latitude",
        "longtitude",
        "title"
    ],
    
    getSensor: function(id) {
        return _.find(this.sensors, function(sensor) {
            return sensor.id == id;
        });
    },
    
    removeSensor: function(id) {
        var oldLength = this.sensors.length;
        this.sensors = _.filter(this.sensors, function(sensor) {
            return sensor.id != id;
        });
        
        return this.sensors.length != oldLength;
    },
    
    addSensor: function(sensor) {
        this.removeSensor(sensor.id);
        sensor.territory = this;
        this.sensors.push(sensor);
    },
    
    toJSON: function() {
        var result = _.pick(this, this.safeAttributes);
        result.sensors = _.invoke(this.sensors, "toJSON");
        
        return result;
    },
    
    toString: function() {
        return JSON.stringify(this.toJSON());
    }
}

module.exports = Territory;