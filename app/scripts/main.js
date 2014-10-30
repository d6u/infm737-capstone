(function(window, $, d3, undefined) {
'use strict';

var defaultOpt = {
    margin: {
        top: 20,
        right: 45,
        bottom: 120,
        left: 45
    },
    width: 800,
    height: 300,
    graph: {
        outterRadius: 6,
        innerRadius: 4
    },
    maxColumns: 61,
    classPrefix: 'raptor-'
}

var _extend = $.extend;

function getDateStrAsNum(date) {
    var str = '' +
            date.getUTCFullYear() +
            padStr(date.getUTCMonth() + 1, 2) +
            padStr(date.getUTCDate(), 2);
    return Number(str);
    // return Math.ceil(date.getTime() / 1000 / 60 / 60 / 24);
}

var parseDate = d3.time.format('%Y%m%d %Z').parse;

function getDateFromDateStr(datetamp) {
    return parseDate(padStr(datetamp, 8) + ' +0000');
    // return new Date(datetamp * 24 * 60 * 60 * 1000);
}

function padStr(n, width, z) {
    z = z || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

var _map = Array.prototype.map;

function uniq(arr, isSame) {
    arr.sort();
    var result = [arr[0]], prev = arr[0];
    for (var i = 1; i < arr.length; i++) {
        if (!isSame(prev, arr[i])) {
            result.push(arr[i]);
            prev = arr[i];
        }
    }
    return result;
}

function parseDataSummary(data) {
    var result = [], prev, i, d, j, r;

    function propertyGetter(d) {
        return d.val;
    }

    prev = data[0];

    result.push({
        day:       prev.date.toDateString(),
        readings: [prev]
    });

    for (i = 1; i < data.length; i++) {
        d = data[i];
        if (propertyGetter(d) != null) {
            if (getDateStrAsNum(prev.date) === getDateStrAsNum(d.date)) {
                result[result.length - 1].readings.push(d);
            } else {
                // if (getDateStrAsNum(d.date) - getDateStrAsNum(prev.date) > 1) {
                //     for (j = 0; j < 3; j++) {
                //         result.push({type: 'gap'});
                //     }
                // }
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

var RaptorChart = function (sel, opts) {
    if (opts == null) opts = {};
    this.opts = opts = _extend(true, {}, defaultOpt, opts);
    this.sel = sel;

    var _this = this;

    var pf  = opts.classPrefix;
    var svg = this.svg = d3.select(sel)
        .append('svg')
        .attr({
            'class': pf+'svg',
            'width': opts.width + opts.margin.left + opts.margin.right,
            'height': opts.height + opts.margin.top + opts.margin.bottom
        });

    var canvas = this.canvas = svg.append('g')
        .attr({
            'class': pf+'canvas',
            'transform': 'translate('+opts.margin.left+','+opts.margin.top+')'
        });

    this.dates = [];
    this.dataArr = [];

    var x  = this.x  = d3.scale.ordinal().rangeBands([0, opts.width], 0, 0.5);
    var y1 = this.y1 = d3.scale.linear().range([opts.height, 0]);
    var y2 = this.y2 = d3.scale.linear().range([opts.height, 0]);
    var y1Inverse = this.y1Inverse = d3.scale.linear().domain([opts.height, 0]);
    var y2Inverse = this.y2Inverse = d3.scale.linear().domain([opts.height, 0]);

    var xAxis = this.xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d, i) {
            if (_this.dates[i] !== undefined) {
                return _this.dates[i].toDateString();
            }
        });

    canvas.append('g')
        .attr({
            'class': pf+'x '+pf+'axis',
            'transform': 'translate(0,'+opts.height+')'
        });

    var yAxis1 = this.yAxis1 = d3.svg.axis()
        .scale(y1)
        .orient('left')
        .ticks(10);

    var yAxis2 = this.yAxis2 = d3.svg.axis()
        .scale(y2)
        .orient('right')
        .ticks(10);

    function getXDomain() {
        var length = Math.min(Math.ceil(opts.maxColumns / _this.dataArr.length), _this.dates.length);
        var arr = [];
        for (var i = 0; i < length; i++) {
            arr.push(i);
        }
        return arr;
    }

    /**
     *
     * @param  {Object} d {mean: Number, max: Number, min: Number}
     * @param  {Number} i index
     * @return {String}   string of path
     */
    function getPathForDataPoint(d, i, y) {
        var w1 = opts.graph.outterRadius,
            w2 = opts.graph.innerRadius;
        return 'M'+(-w1)+' '+y(d.max)+
            'a'+w1+' '+w1+' 0 0 1 '+w1*2+' 0'+
            'L'+w1+' '+y(d.min)+
            'a'+w1+' '+w1+' 0 0 1 '+(-w1*2)+' 0Z '+
            'M'+(-w2)+' '+y(d.mean)+
            'a'+w2/2+' '+w2/2+' 0 0 1 '+w2*2+' 0'+
            'a'+w2/2+' '+w2/2+' 0 0 1 '+(-w2*2)+' 0Z';
    }

    this.mergeDates = function (dates) {
        dates.sort(function (a, b) {
            return getDateStrAsNum(a) - getDateStrAsNum(b);
        });

        var t1, t2;

        for (var i = 0; i < this.dates.length; i++) {
            t1 = getDateStrAsNum(this.dates[i]);
            t2 = getDateStrAsNum(dates[0]);
            if (t2 < t1) {
                t1.splice(i, 0, getDateFromDateStr(t2));
                dates.shift();
            } else if (t2 === t1) {
                dates.shift();
            }
        }

        this.dates = uniq(this.dates.concat(dates.map(function (d) {
            return getDateFromDateStr(getDateStrAsNum(d));
        })), function (a, b) {
            return getDateStrAsNum(a) === getDateStrAsNum(b);
        });

        // Update x axis
        x.domain(getXDomain());
        canvas.select('g.'+pf+'x.'+pf+'axis').call(xAxis)
            .selectAll('text')
            .style({
                'text-anchor': 'end'
            })
            .attr('transform', 'translate(-13,10) rotate(-90)');
    }

    /**
     * Drew the data onto the chart
     * @param  {Array}  data
     * @param  {Object} options
     * @return {}
     */
    this.drawData = function (data, options) {
        data.sort(function (a, b) {
            return getDateStrAsNum(a.date) - getDateStrAsNum(b.date);
        });

        this.mergeDates(data.map(function (d) {
            return d.date;
        }));

        var yDomain1 = d3.extent(data, function(d) {
            return Number(d.val);
        }).sort(function (a, b) {
            return a - b;
        });
        var rangeY = yDomain1[1] - yDomain1[0];
        yDomain1[0] -= rangeY * 0.1;
        yDomain1[1] += rangeY * 0.1;

        y1.domain(yDomain1);
        y1Inverse.range(yDomain1);

        canvas.append('g')
            .attr({
                'class': pf+'y '+pf+'axis'
            })
            .call(yAxis1);

        // Data Bar
        var dataPoints = canvas.append('g')
            .attr({
                'class': pf+'data-group '+pf+options.classPrefix+'data-group'
                // 'transform': 'translate(0,0)'
            })
            .selectAll('.'+pf+'data-point')
            .data(parseDataSummary(data))
            .enter()
            .append('g')
            .attr({
                'class': pf+'data-point '+pf+options.classPrefix+'data-point',
                'transform': function (d, i) {
                    return 'translate('+(x(i) + x.rangeBand() / 2)+',0)';
                }
            });

        dataPoints
            .append('path')
            .attr({
                'class': pf+'data-point-bar '+pf+options.classPrefix+'data-point-bar',
                'd': function (d, i) {
                    return getPathForDataPoint(d, i, y1);
                }
            });
    };
}

window.RaptorChart = RaptorChart;

var chart = new RaptorChart('#temperature');
chart.drawData(temperatureData, {
    position: 'left',
    title: 'temperature',
    classPrefix: 'temperature-',
    labelFormatter: function (v) {
        return v + '&deg;F';
    }
});
// chart.drawData(pulseData);

return;

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
        return a.date.getDateStrAsNum() - b.date.getDateStrAsNum();
    });
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



// Chart
//
var vitalsClean  = cleanVitalData(vitals);
var temperatures = parseDataSummary(vitalsClean, temperatureGetter);
var pulses       = parseDataSummary(vitalsClean, pulseGetter);

///////



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

///////


chart.append('g')
    .attr('class', 'y axis')
    .attr('transform', 'translate('+INNER_WIDTH+',0)')
    .call(yAxis2);

// Line
//
// var temperatureLeft = (x.rangeBand() - BAR.WIDTH * NUM_DATA_GROUP - BAR.INNER_MARGIN * (NUM_DATA_GROUP - 1)) / 2;
// var pulseLeft = temperatureLeft + BAR.WIDTH + BAR.INNER_MARGIN;

var temperatureLeft = (x.rangeBand() - BAR.WIDTH) / 2;
var pulseLeft       = (x.rangeBand() - BAR.WIDTH) / 2;

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

//////

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
            var leftTopX        = 0
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

}(window, jQuery, d3));
