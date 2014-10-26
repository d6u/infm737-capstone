(function(window, $, d3, undefined) {
'use strict';

var vitals = [
    {
        'date': '04-09-2003',
        'datetime':'04-09-2003 084200',
        'temperature':'98.6',
        'pulse':'72'
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
    }];

var chartSelector = '#temperature';

// Constants
//
var PADDING = {TOP: 20, RIGHT: 35, BOTTOM: 120, LEFT: 40},
    WIDTH   = 960,
    HEIGHT  = 400,
    INNER_WIDTH  = WIDTH - PADDING.LEFT - PADDING.RIGHT,
    INNER_HEIGHT = HEIGHT - PADDING.TOP - PADDING.BOTTOM,
    BAR = {
        INNER_MARGIN: 1,
        CIRCLE_STROKE_WIDTH: 2,
        WIDTH: 15
    },
    MAX_DATA_COUNT = 61,
    NUM_DATA_GROUP = 2;

// Helper
//
var parseDate = d3.time.format('%m-%d-%Y %H%M%S').parse;

Date.prototype.getUnixDay = function() {
    return Math.ceil(this.getTime() / 1000 / 60 / 60 / 24);
};

// Clone data to break references to original objects
function clone(obj) {
    if(obj == null || typeof(obj) != 'object') {
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

/**
 * Remove data point with no temperature and no pulse data,
 * parse temperature and pulse into number,
 * parse date string inte date object,
 * and return a sorted clone of the new data points by it's date with
 * ASC order.
 *
 * @param  {Array} original
 * @return {Array}
 */
function cleanVitalData(original) {
    var result = [], i, d;
    for (i = 0; i < original.length; i++) {
        d = original[i];
        if (d.temperature != null && d.pulse != null) {
            result.push(d);
        }
        if (d.temperature != null) {
            d.temperature = Number(d.temperature);
        }
        if (d.pulse != null) {
            d.pulse = Number(d.pulse);
        }
    }
    return clone(result).map(function (d) {
        d.date = parseDate(d.datetime);
        d.datetime = null;
        return d;
    }).sort(function (a, b) {
        return a.date.getUnixDay() - b.date.getUnixDay();
    });
}

function parseDataSummary(original, propertyGetter) {
    var result = [], prev, i, d, j, r;

    prev = original[0];

    result.push({
        day:       prev.date.toDateString(),
        readings: [prev]
    });

    for (i = 1; i < original.length; i++) {
        d = original[i];
        if (propertyGetter(d) != null) {
            if (prev.date.getUnixDay() === d.date.getUnixDay()) {
                result[result.length - 1].readings.push(d);
            } else {
                if (d.date.getUnixDay() - prev.date.getUnixDay() > 1) {
                    for (j = 0; j < 3; j++) {
                        result.push({type: 'gap'});
                    }
                }
                result.push({
                    day:       d.date.toDateString(),
                    readings: [d]
                });
            }
            prev = d;
        }
    }

    for (i = 0; i < result.length; i++) {
        if (result[i].type !== 'gap') {
            r      = result[i];
            r.max  = d3.max( r.readings, propertyGetter);
            r.min  = d3.min( r.readings, propertyGetter);
            r.mean = d3.mean(r.readings, propertyGetter);
        }
    }

    return result;
}

function temperatureGetter(d) {
    return d.temperature;
}

function pulseGetter(d) {
    return d.pulse;
}

function roundTemperature(v) {
    return Math.round(v * 10) / 10;
}

var _map = Array.prototype.map;

/**
 * Return the numbered domain for x axis
 *
 * @return {[type]} [description]
 */
function getXDomain() {
    var length = Math.min.apply(Math, _map.call(arguments, function (d) {
        return d.length;
    }).concat([Math.ceil(MAX_DATA_COUNT / NUM_DATA_GROUP)]));
    var arr = [];
    for (var i = 0; i < length; i++) {
        arr.push(i);
    }
    return arr;
}

// Chart
//
var vitalsClean  = cleanVitalData(vitals);
var temperatures = parseDataSummary(vitalsClean, temperatureGetter);
var pulses       = parseDataSummary(vitalsClean, pulseGetter);

var x = d3.scale.ordinal()
    .domain(getXDomain(temperatures, pulses))
    .rangeBands([0, INNER_WIDTH], 0, 0.5);

var yDomain = d3.extent(vitals, function(d) {
    return Number(d.temperature);
}).sort(function (a, b) {
    return a - b;
});
yDomain[0] -= 1;
yDomain[1] += 1;

var yDomain2 = d3.extent(vitals, function(d) {
    return Number(d.pulse);
}).sort(function (a, b) {
    return a - b;
});
yDomain2[0] -= 1;
yDomain2[1] += 1;

var y = d3.scale.linear()
    .domain(yDomain)
    .range([INNER_HEIGHT, 0]);

var yInverse = d3.scale.linear()
    .domain([INNER_HEIGHT, 0])
    .range(yDomain);

var y2 = d3.scale.linear()
    .domain(yDomain2)
    .range([INNER_HEIGHT, 0]);

var yInverse2 = d3.scale.linear()
    .domain([INNER_HEIGHT, 0])
    .range(yDomain2);

function parseLine(data, groupIndex) {
    var result = [],
        prev = data[0],
        prevIndex = 0,
        type = 'solid',
        d;
    var yScale = groupIndex === 0 ? y : y2;

    for (var i = 1; i < data.length; i++) {
        d = data[i];
        if (d.type === 'gap') {
            type = 'dotted';
        } else {
            result.push({
                start: {
                    x: x(prevIndex),
                    y: yScale(prev.mean)
                },
                end: {
                    x: x(i),
                    y: yScale(d.mean)
                },
                type: type
            });
            type = 'solid';
            prev = d;
            prevIndex = i;
        }
    }
    return result;
}

var temperatureLines = parseLine(temperatures, 0);
var pulseLines       = parseLine(pulses, 1);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient('bottom')
    .tickFormat(function(d, i) {
        if (temperatures[i] !== undefined) {
            return temperatures[i].day;
        }
    });

var yAxis = d3.svg.axis()
    .scale(y)
    .orient('left')
    .ticks(8);

var yAxis2 = d3.svg.axis()
    .scale(y2)
    .orient('right')
    .ticks(8);

var chart = d3.select(chartSelector)
    .append('svg')
    .attr('class', 'svg-canvas')
    .attr('width', WIDTH)
    .attr('height', HEIGHT)
    .append('g')
    .attr('transform', 'translate('+PADDING.LEFT+','+PADDING.TOP+')');

chart.append('g')
    .attr('class', 'x axis')
    .attr('transform', 'translate(0,'+INNER_HEIGHT+')')
    .call(xAxis)
    .selectAll('text')
    .style({
        'text-anchor': 'end'
    })
    .attr('transform', 'translate(-13,10) rotate(-90)');

chart.append('g')
    .attr('class', 'y axis')
    .call(yAxis);

chart.append('g')
    .attr('class', 'y axis')
    .attr('transform', 'translate('+INNER_WIDTH+',0)')
    .call(yAxis2);

// Line
//
var temperatureLeft = (x.rangeBand() - BAR.WIDTH * NUM_DATA_GROUP - BAR.INNER_MARGIN * (NUM_DATA_GROUP - 1)) / 2;
var pulseLeft = temperatureLeft + BAR.WIDTH + BAR.INNER_MARGIN;

chart
    .append('g')
    .attr('class', 'lines temperatures')
    .attr('transform', 'translate('+(temperatureLeft + BAR.WIDTH / 2)+',0)')
    .selectAll('.connection-line')
    .data(temperatureLines)
    .enter()
    .append('line')
    .classed({
        'connection-line': true,
        'dotted': function (d) {
            return d.type === 'dotted';
        }
    })
    .attr('x1', function(d) {return d.start.x;})
    .attr('y1', function(d) {return d.start.y;})
    .attr('x2', function(d) {return d.end.x;})
    .attr('y2', function(d) {return d.end.y;});

chart
    .append('g')
    .attr('class', 'lines pulses')
    .attr('transform', 'translate('+(pulseLeft + BAR.WIDTH / 2)+',0)')
    .selectAll('.connection-line')
    .data(pulseLines)
    .enter()
    .append('line')
    .classed({
        'connection-line': true,
        'dotted': function (d) {
            return d.type === 'dotted';
        }
    })
    .attr('x1', function(d) {return d.start.x;})
    .attr('y1', function(d) {return d.start.y;})
    .attr('x2', function(d) {return d.end.x;})
    .attr('y2', function(d) {return d.end.y;});

// Data Bar
//
var dataPoint = chart.append('g')
    .classed({bars: true})
    .attr({
        'class':     'bars temperatures',
        'transform': 'translate('+temperatureLeft+',0)'
    })
    .selectAll('.data-point')
    .data(temperatures)
    .enter()
    .append('g')
    .classed({'data-point': true});

dataPoint
    .append('path')
    .classed({'data-bar': true})
    .attr('d', function(d, i) {
        if (d.type !== 'gap') {
            var w1 = BAR.WIDTH,
                x1 = x(i) + BAR.INNER_MARGIN,
                x2 = x1 + w1,
                x3 = x1 + BAR.CIRCLE_STROKE_WIDTH,
                w2 = w1 - BAR.CIRCLE_STROKE_WIDTH * 2;
            return 'M'+x1+' '+y(d.max)+
                'a'+w1/2+' '+w1/2+' 0 0 1 '+w1+' 0'+
                'L'+x2+' '+y(d.min)+
                'a'+w1/2+' '+w1/2+' 0 0 1 '+(-w1)+' 0Z'+
                'M'+x3+' '+y(d.mean)+
                'a'+w2/2+' '+w2/2+' 0 0 1 '+w2+' 0'+
                'a'+w2/2+' '+w2/2+' 0 0 1 '+(-w2)+' 0Z';
        }
    });

var dataPoint2 = chart.append('g')
    .attr({
        'class':     'bars pulses',
        'transform': 'translate('+pulseLeft+',0)'
    })
    .selectAll('.data-point')
    .data(pulses)
    .enter()
    .append('g')
    .classed({'data-point': true});

dataPoint2
    .append('path')
    .classed({'data-bar': true})
    .attr('d', function(d, i) {
        if (d.type !== 'gap') {
            var w1 = BAR.WIDTH,
                x1 = x(i) + BAR.INNER_MARGIN,
                x2 = x1 + w1,
                x3 = x1 + BAR.CIRCLE_STROKE_WIDTH,
                w2 = w1 - BAR.CIRCLE_STROKE_WIDTH * 2;
            return 'M'+x1+' '+y2(d.max)+
                'a'+w1/2+' '+w1/2+' 0 0 1 '+w1+' 0'+
                'L'+x2+' '+y2(d.min)+
                'a'+w1/2+' '+w1/2+' 0 0 1 '+(-w1)+' 0Z'+
                'M'+x3+' '+y2(d.mean)+
                'a'+w2/2+' '+w2/2+' 0 0 1 '+w2+' 0'+
                'a'+w2/2+' '+w2/2+' 0 0 1 '+(-w2)+' 0Z';
        }
    });

// Add mouse interactivity
//
var canvas = d3.selectAll('.svg-canvas');
var TOOPTIP_WIDTH         = 30
    , TOOPTIP_HEIGHT      = 15
    , TOOPTIP_OFFSET      = 3
    , TOOPTIP_ARROW_WIDTH = 5;

function calcTooltipTransform(x, y) {
    return 'translate('+(x - TOOPTIP_WIDTH - TOOPTIP_OFFSET)+','+
        (y - TOOPTIP_HEIGHT - TOOPTIP_OFFSET)+')';
}

function makeTooltip(parent, x, y, val) {
    var tooltip = parent.append('g').classed({tooltip: true});

    tooltip.append('path')
        .attr('d', function() {
            var leftTopX      = 0
                , leftTopY      = 0
                , rightTopX     = TOOPTIP_WIDTH
                , rightTopY     = 0
                , rightBottom1X = TOOPTIP_WIDTH
                , rightBottom1Y = TOOPTIP_HEIGHT - TOOPTIP_ARROW_WIDTH
                , rightBottomX  = TOOPTIP_WIDTH + TOOPTIP_OFFSET
                , rightBottomY  = TOOPTIP_HEIGHT + TOOPTIP_OFFSET
                , rightBottom2X = TOOPTIP_WIDTH - TOOPTIP_ARROW_WIDTH
                , rightBottom2Y = TOOPTIP_HEIGHT
                , leftBottomX   = 0
                , leftBottomY   = TOOPTIP_HEIGHT;
            return 'M'+leftTopX+','+leftTopY+
                'L'+rightTopX+','+rightTopY+
                'L'+rightBottom1X+','+rightBottom1Y+
                'L'+rightBottomX+','+rightBottomY+
                'L'+rightBottom2X+','+rightBottom2Y+
                'L'+leftBottomX+','+leftBottomY;
        });

    tooltip.append('text')
        .attr({
            'text-anchor': 'middle',
            x: TOOPTIP_WIDTH / 2,
            y: TOOPTIP_HEIGHT / 2 + 3
        })
        .text(val);

    tooltip.setTransform = function(x, y) {
        this.attr('transform', calcTooltipTransform(x, y));
    };

    tooltip.setTransform(x, y);

    tooltip.setVal = function(val) {
        this.selectAll('text').text(val);
    };

    tooltip.setVal(val);

    return tooltip;
}

var cursorLine, cursorTooltip;

canvas.on('mousemove', function() {
    var coord = d3.mouse(this);
    var x = coord[0], y = coord[1] - 2; // Adjust for minor offset

    if (PADDING.LEFT < x && x < WIDTH - PADDING.RIGHT &&
        PADDING.TOP < y && y < HEIGHT - PADDING.BOTTOM) {

        // Mouse move within area of charts
        if (!cursorLine) {
            cursorLine = canvas.append('line')
                .classed({'cursor-line': true, show: true})
                .attr({
                    x1: PADDING.LEFT,
                    x2: WIDTH - PADDING.RIGHT,
                    y1: y,
                    y2: y
                });
        } else {
            cursorLine.classed({show: true}).attr({y1: y, y2: y});
        }

        if (!cursorTooltip) {
            cursorTooltip = makeTooltip(canvas, x, y);
        }

        cursorTooltip.classed({hide: false});
        cursorTooltip.setTransform(x, y);
        cursorTooltip.setVal(roundTemperature(yInverse(y)));

    } else {
        if (cursorLine) {
            cursorLine.classed({show: false});
        }
        if (cursorTooltip) {
            cursorTooltip.classed({hide: true});
        }
    }
});

dataPoint.on('mouseover', function(d, i) {
    var _this = d3.select(this);
    if (d.type !== 'gap') {
        this.__tooltip__ = [];
        if (d.max != null) {
            this.__tooltip__.push(makeTooltip(_this, x(i) + x.rangeBand() / 2,
                y(d.max), roundTemperature(d.max)));
        }
        if (d.mean != null) {
            this.__tooltip__.push(makeTooltip(_this, x(i) + x.rangeBand() / 2,
                y(d.mean), roundTemperature(d.mean)));
        }
        if (d.min != null) {
            this.__tooltip__.push(makeTooltip(_this, x(i) + x.rangeBand() / 2,
                y(d.min), roundTemperature(d.min)));
        }
    }
})
.on('mouseout', function() {
    if (this.__tooltip__) {
        for (var i = 0; i < this.__tooltip__.length; i++) {
            this.__tooltip__[i].remove();
        }
    }
});

})(window, jQuery, d3);
