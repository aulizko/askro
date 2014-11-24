![License][license-image]][license-url]
![build status][travis-image]

# Askro

This tool allow you to parse, collect and traverse through the radiation monitoring data provided by ROSATOM SARMS(Sectoral Automated Radiation Monitoring System).

[More][sarms-description-link] [reading][rosatom-safety-report-link] about SARMS.

## Installation

```shell
npm install askro
```

## Data structure

Every request performed by this tool, returns you data in the following structure:

    list // root-object
    |
    `--territories // list of sites where Nuclear Plants are located
       |
       `--sensors // list of sensors that surrounds potential hazardous site
           |
           `--measurements // series of measurements with timestamp and value of radiation level, in microsieverts

Data is structured in a logical way rather then relational.

I've tried to store and analize it in noSQL storage and it was smooth.

## Usage

### Parsing

First, you should initialize parser:

```javascript
var ASKRO = require('askro');
var parser = new ASKRO();
```

Also, you may pass data from previous crawling session into parser (to avoid data duplication):

```javascript
var ASKRO = require('askro');
var parser = new ASKRO({
    territories: ArrayOfTerritoriesFromDB
});
```

To get latest data (this includes one measurement per sensor. Each measurement should be less than two hours old):

```javascript
parser
    .fetchLatest()
    .then(function (parser) {
        console.log(parser.territories[0]); // echoes Saint-Petersburg related data
    });
```

BTW, all async methods implements [Promise/A+](promise-a-plus-link) standard.

To get data for last 24 hours (one measurement per hour):

```javascript
parser.fetch(); // actually, parser.fetch(ASKRO.WEEK) also will work
```

Last week:

```javascript
parser.fetch(ASKRO.WEEK);
```

Last month:

```javascript
parser.fetch(ASKRO.MONTH); // actually, parser.fetch(parser.DAY) also will work
```

To get data in an arbitrary time interval:

```javascript
parser.fetch(startDate, endDate); // where both arguments are instance of global Date object
```

Beware, the more time interval is, the less measurements you will receive. If time interval is more than five days,
provider will return you one measurement per day.

### Data traversing

```javascript
parser.territories; // array of territories
parser.add(territoryFromDB); // if you want to manually add territory from DB
parser.remove(territoryId); // if you are not interested in measurement for specific site
parser.get(territoryId); // if you interested in specific site.
```

When you get access to specific territory object, you may ask it and only it to fetch data.

```javascript
var territory = parser.territories[0];

territory.fetchSeriesOfMeasurements(); // data for all sensors for last 24 hours
territory.fetchSeriesOfMeasurements(ASKRO.WEEK) // same as above, but for last week (one measurement per day)
territory.fetchSeriesOfMeasurements(ASKRO.MONTH) // same as above, but for last month (one measurement per day)
territory.fetchSeriesOfMeasurements(startDate, endDate) // same as above, but for arbitrary time interval
```

Each territory has array of sensors which belongs to it. You can have access for them:

```javascript
territory.sensors // array of sensors
territory.addSensor(sensorFromDB); // to manually add sensor from DB
territory.removeSensor(sensorId); // remove specific sensor if you're not interested in it's measurements
territory.getSensor(sensorId); // get specific Sensor
```

Each sensor has measurements array which contain series of measurements belonging to it.

```javascript
sensor.measurements; // array of {time: Date, value: float} objects
```

**Warning**: Sensor will drop duplicate measurements.

### Cleanup

If you want to remove measurements, you can call method ```cleanMeasurements```.

Each data structure provide such a method:

```javascript
parser.cleanMeasurements(); // clean all measurements for all territories and all sensors
territory.cleanMeasurements(); // remove all measurements for all sensors
sensor.cleanMeasurements(); // erase all measurements collected so far
```

### Real-world example

Say, you want to copy data from provider to your own storage:

```javascript
var _ = require('lodash');
var ASKRO = require('askro');
var parser = new ASKRO();

parser
    .fetchLatest()
    .then(function (parser) {
        // now you get list of all territories and sensors. Time to save them into DB
        return db.territories.insert(parser.territories);
    })
    .then(function () {
        var endDate = new Date();
        var startDate = new Date();
        // I recommend get data from 5 days interval, so provider will return per-hour measurements
        startDate.setDate(startDate.getDate() - 5);

        return parser.fetch(startDate, endDate);
    })
    .then(function (parser) {
        // now you have per-hour measurements for every sensor
        var measurements = _.reduce(
            _.reduce(
                parser.territories,
                function (sensorList, territory) {
                    return territory.sensors.concat(sensorList);
                },
                []
            ),
            function (measurementsList, sensor) {
                return _.map(sensor.measurements, function (measurement) {
                    measurement.sensorId = sensor.id;
                    measurement.territoryId = sensor.territory.id;
                    return measurement;
                }).concat(measurementsList);
            },
            []
        );

        return db.measurements.insert(measurements);
    })
    .then(function (dbResult) {
        // I don't know. Maybe launch it again, but move startDate and endDate into past?
    })
    .catch(function (e) {
        // do something with error
    });
```

## Tests

Just run ```npm test```.


## License

MIT, see [LICENSE][license-url] for details.

[travis-image]: https://travis-ci.org/aulizko/askro.svg?branch=master
[license-image]: http://img.shields.io/npm/l/askro.svg
[license-url]: LICENSE
[sarms-description-link]: http://en.www.skc.ru/control/askro
[rosatom-safety-report-link]: http://ar2013.rosatom.ru/267
[promise-a-plus-link]: https://promisesaplus.com
