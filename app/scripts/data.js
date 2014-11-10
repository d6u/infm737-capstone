'use strict';

var thumbnails = [
    {'date':'03-05-2010', 'datetime':'03-05-2010 090000', 'temperature':'98.5'},
    {'date':'12-01-2009', 'datetime':'12-01-2009 085300', 'temperature':'98.4'},
    {'date':'08-24-2009', 'datetime':'08-24-2009 140000', 'temperature':'98.9'},
    {'date':'04-17-2009', 'datetime':'04-17-2009 120000', 'temperature':'99.2'},
    {'date':'11-10-2008', 'datetime':'11-10-2008 080000', 'temperature':'98.2'}
];

var labs = [
    {"date":"03-16-2010","egfr":57},
    {"date":"03-16-2010","egfr":69},
    {"date":"03-16-2010","egfr":57}
];

var vitals1 = [
    {'date':'04-09-2003','datetime':'04-09-2003 094200','temperature':'100','pulse':'88'},
    {'date':'04-09-2003','datetime':'04-09-2003 084200','temperature':'98.6','pulse':'72'},
    {'date':'04-09-2003','datetime':'04-09-2003 114200','temperature':'98','pulse':'60'},
    {'date':'04-04-2003','datetime':'04-04-2003 084100','temperature':'100.6','pulse':'78'},
    {'date':'04-03-2003','datetime':'04-03-2003 084100','temperature':'102.2','pulse':'88'},
    {'date':'10-05-1998','datetime':'10-05-1998 142400'},
    {'date':'10-22-1997','datetime':'10-22-1997 103400','temperature':'98','pulse':'60'}
];

var vitals2 = [
    {'date':'03-05-2010','datetime':'03-05-2010 090000','temperature':'98.5','pulse':'74'},
    {'date':'12-01-2009','datetime':'12-01-2009 085300','temperature':'98.4','pulse':'78'},
    {'date':'08-24-2009','datetime':'08-24-2009 140000','temperature':'98.9','pulse':'82'},
    {'date':'04-17-2009','datetime':'04-17-2009 120000','temperature':'99.2','pulse':'88'},
    {'date':'11-10-2008','datetime':'11-10-2008 080000','temperature':'98.2','pulse':'80'},
    {'date':'06-10-2008','datetime':'06-10-2008 110000','temperature':'98.8','pulse':'82'},
    {'date':'05-20-2008','datetime':'05-20-2008 110000','temperature':'101','pulse':'82'},
    {'date':'05-06-2008','datetime':'05-06-2008 100000','temperature':'99.2','pulse':'82'},
    {'date':'01-30-2008','datetime':'01-30-2008 110000','temperature':'98.8','pulse':'80'},
    {'date':'12-28-2007','datetime':'12-28-2007 090000','temperature':'98.6','pulse':'80'},
    {'date':'11-28-2007','datetime':'11-28-2007 080000','temperature':'98.6','pulse':'80'},
    {'date':'04-24-2007','datetime':'04-24-2007 080000','pulse':'82'},
    {'date':'04-11-2007','datetime':'04-11-2007 074500','pulse':'87'},
    {'date':'03-15-2007','datetime':'03-15-2007 080000','pulse':'92'},
    {'date':'03-16-2005','datetime':'03-16-2005 100000','temperature':'99','pulse':'72'},
    {'date':'03-16-2005','datetime':'03-16-2005 060000','temperature':'102.6','pulse':'88'},
    {'date':'03-15-2005','datetime':'03-15-2005 113000','temperature':'98.2','pulse':'76'},
    {'date':'03-30-2004','datetime':'03-30-2004 213100','temperature':'98.6','pulse':'68'},
    {'date':'04-15-2003','datetime':'04-15-2003 160500','temperature':'98.7','pulse':'72'},
    {'date':'04-07-2003','datetime':'04-07-2003 140500','temperature':'98.6','pulse':'76'},
    {'date':'04-05-2003','datetime':'04-05-2003 151500','temperature':'98.4','pulse':'76'},
    {'date':'04-05-2003','datetime':'04-05-2003 140500','temperature':'101.4','pulse':'82'}
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

var parseDate = d3.time.format('%m-%d-%Y %H%M%S').parse;

/**
 * Convert data into simple format like:
 * {date: Date, <key>: value}
 *
 * @param  {Array}         data  - original data
 * @param  {String|Index}  key   - the index to retrieve the desired value
 * @param  {Boolean}       isNum - if true, convert value to number, default true
 * @return {Array} a simpler clone of original data
 */
function parseData(data, key) {
    var cloneData = clone(data);

    var result = [], i, d, o, n;

    for (i = 0; i < cloneData.length; i++) {
        d = cloneData[i];
        if (d[key] != null) {
            if (d.datetime == null) {
                throw new Error('requires datetime to parse date');
            }
            o = {date: parseDate(d.datetime)};
            n = Number(d[key]);
            if (n !== n) {
                throw new Error(JSON.stringify(d[key])+' is not a number');
            }
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

var temperatureData = parseTemperature(vitals2);
var pulseData = parsePulse(vitals2);
