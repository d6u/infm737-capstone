'use strict';

var vitals = [
    {
        'date': '04-09-2003',
        'datetime':'04-09-2003 094200',
        'temperature':'100',
        'pulse': '88'
    }, {
        'date': '04-09-2003',
        'datetime':'04-09-2003 084200',
        'temperature':'98.6',
        'pulse':'72'
    }, {
        'date': '04-09-2003',
        'datetime':'04-09-2003 114200',
        'temperature':'98',
        'pulse':'60'
    }, {
        'date':'04-04-2003',
        'datetime':'04-04-2003 084100',
        'temperature':'100.6',
        'pulse':'78'
    }, {
        'date':'04-03-2003',
        'datetime':'04-03-2003 084100',
        'temperature':'102.2',
        'pulse':'88'
    }, {
        'date':'10-05-1998',
        'datetime':'10-05-1998 142400'
    }, {
        'date':'10-22-1997',
        'datetime':'10-22-1997 103400',
        'temperature':'98',
        'pulse':'60'
    }
];

/**
 * Create a clone of object, works only with array and plain object type,
 * not working with type such as Date
 *
 * @param  {Object} obj
 * @return {Object} a clone of original obj
 */
function clone(obj) {
    if(obj == null || typeof(obj) !== 'object') {
        return obj;
    }
    var temp = obj.constructor();
    for(var key in obj) {
        if(obj.hasOwnProperty(key)) {
            temp[key] = clone(obj[key]);
        }
    }
    return temp;
}

var parseDateD3 = d3.time.format('%m-%d-%Y %H%M%S %Z').parse;
function parseDate(str) {
    return parseDateD3(str + ' -0400');
}

/**
 * Convert data into simple format like:
 * {date: Date, <key>: value}
 *
 * @param  {Array}         data  - original data
 * @param  {String|Index}  key   - the index to retrieve the desired value
 * @param  {Boolean}       isNum - if true, convert value to number, default true
 * @return {Array} a simpler clone of original data
 */
function parseData(data, key, isNum) {
    var cloneData = clone(data);

    var result = [], i, d, o, n;

    for (i = 0; i < cloneData.length; i++) {
        d = cloneData[i];
        if (d[key] != null) {
            if (d.datetime == null) throw new Error('requires datetime to parse date');
            o = {date: parseDate(d.datetime)};
            n = Number(d[key]);
            if (n !== n) throw new Error(JSON.stringify(d[key])+' is not a number');
            o.val = n;
            result.push(o);
        }
    }

    return result;
}

function parseTemperature(data) {
    return parseData(data, 'temperature');
}

function parsePulse(data) {
    return parseData(data, 'pulse');
}

var temperatureData = parseTemperature(vitals);
var pulseData = parsePulse(vitals);
