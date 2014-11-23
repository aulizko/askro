'use strict';

var sensorStub = {
    id: '23',
    title: 'п. Котельский',
    longitude: 28.747183,
    latitude: 59.584364,
    measurements: [
        {time: new Date('Fri Nov 21 2014 03:00:00 GMT+0400 (MSK)'), value: 0.1},
        {time: new Date('Fri Nov 21 2014 04:00:00 GMT+0400 (MSK)'), value: 0.1}
    ]
};

var sensorRawDataStub = {
    time: '1416652260',
    value: '12.25',
    name: 'г. Билибино (м/р «Арктика»)',
    icon: 'green',
    zoomShow: '7',
    lng: '166.45459',
    lat: '68.06701',
    terrId: '3',
    id: '3_27'
};

exports.sensor = sensorStub;

exports.sensorRawData = sensorRawDataStub;

// Stub for territory
// Means that or something similar should come from database
exports.territory = {
    id: 1,
    sensors: [
        {
            id: '28',
            title: 'остров Сескар',
            longitude: 28.402556,
            latitude: 59.99593,
            measurements: [
                {time: new Date('Fri Nov 21 2014 03:00:00 GMT+0400 (MSK)'), value: 0.095}
            ]
        },
        sensorStub
    ],
    latitude: 59.852586487905,
    longitude: 29.0841979980469,
    title: 'Ленинградская АЭС'
};

var stubRawTerritory = {
    index: '3',
    title: 'Билибинская АЭС',
    lng: '166.548492431641',
    lat: '68.0504582723163',
    sensors: [
        {
            time: '1416652260',
            value: '12.25',
            name: 'г. Билибино (м/р «Арктика»)',
            icon: 'green',
            zoomShow: '7',
            lng: '166.45459',
            lat: '68.06701',
            terrId: '3',
            id: '3_27'
        },
        {
            time: '1416652320',
            value: '12',
            name: 'пятая площадка Билибинской АЭС',
            icon: 'green',
            zoomShow: '7',
            lng: '166.49679',
            lat: '68.05741',
            terrId: '3',
            id: '3_21'
        }
    ]
};

exports.stubRawTerritory = stubRawTerritory;
