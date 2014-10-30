(function(window, $, d3, undefined) {
'use strict';

var defaultOpt = {
    margin: {
        top: 20,
        right: 50,
        bottom: 120,
        left: 50
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
}

function getUnixDay(date) {
    return Math.ceil(date.getTime() / 1000 / 60 / 60 / 24);
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
    var result = [arr[0]],
        prev = arr[0];
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
        date:      prev.date,
        readings: [prev]
    });

    for (i = 1; i < data.length; i++) {
        d = data[i];
        if (propertyGetter(d) != null) {
            if (getDateStrAsNum(prev.date) === getDateStrAsNum(d.date)) {
                result[result.length - 1].readings.push(d);
            } else {
                result.push({
                    date:       d.date,
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

    this.dataArr = [];
    this.dates = [];

    var _this = this;

    function getXAxisDates() {
        var prev = _this.dates[0],
            i = 1,
            result = [prev];
        while (i < _this.dates.length) {
            if (getUnixDay(_this.dates[i]) - getUnixDay(prev) > 1) {
                result.push({type: 'gap'});
                result.push({type: 'gap'});
                result.push({type: 'gap'});
            }
            result.push(_this.dates[i]);
            prev = _this.dates[i];
            i++;
        }
        return result;
    }

    function parseLine(data, x, y) {
        var result = [],
            prev = data[0],
            prevIndex = 0,
            type = 'solid',
            d,
            xCoord1,
            xCoord2;

        for (var i = 1; i < data.length; i++) {
            d = data[i];
            if (getDateStrAsNum(d.date) - getDateStrAsNum(prev.date) > 1) {
                type = 'dotted';
            }
            xCoord1 = getXAxisDates().indexOf(prevIndex) === -1 ? x(getDateStrAsNum(prev.date)) : x(prevIndex);
            xCoord2 = getXAxisDates().indexOf(i) === -1 ? x(getDateStrAsNum(d.date)) : x(i);
            result.push({
                start: {
                    x: xCoord1,
                    y: y(prev.mean)
                },
                end: {
                    x: xCoord2,
                    y: y(d.mean)
                },
                type: type
            });
            type = 'solid';
            prev = d;
            prevIndex = i;
        }
        return result;
    }

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

    var x  = this.x  = d3.scale.ordinal().rangeBands([0, opts.width], 0, 0.5);
    var y1 = this.y1 = d3.scale.linear().range([opts.height, 0]);
    var y2 = this.y2 = d3.scale.linear().range([opts.height, 0]);
    var y1Inverse = this.y1Inverse = d3.scale.linear().domain([opts.height, 0]);
    var y2Inverse = this.y2Inverse = d3.scale.linear().domain([opts.height, 0]);

    var xAxis = this.xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom')
        .tickFormat(function(d, i) {
            if (getXAxisDates()[i].type === undefined) {
                return getXAxisDates()[i].toDateString();
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
        var xAxisDates = getXAxisDates(),
            length = Math.min(Math.ceil(opts.maxColumns / _this.dataArr.length), xAxisDates.length),
            arr = new Array(length),
            i = arr.length - 1,
            j = xAxisDates.length - 1;
        for (; i >= 0; i--) {
            if (xAxisDates[j].type === undefined) {
                arr[i] = getDateStrAsNum(xAxisDates[j]);
            } else {
                arr[i] = i;
            }
            j -= 1;
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

        if (options.position === 'left') {
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
        } else {
            var yDomain2 = d3.extent(data, function(d) {
                return Number(d.val);
            }).sort(function (a, b) {
                return a - b;
            });
            var rangeY = yDomain2[1] - yDomain2[0];
            yDomain2[0] -= rangeY * 0.1;
            yDomain2[1] += rangeY * 0.1;

            y2.domain(yDomain2);
            y2Inverse.range(yDomain2);

            canvas.append('g')
                .attr({
                    'class': pf+'y '+pf+'axis',
                    'transform': 'translate('+opts.width+',0)'
                })
                .call(yAxis2);
        }

        var y = options.position === 'left' ? y1 : y2;

        // Data Bar
        var dataPoints = canvas.append('g')
            .attr({
                'class': pf+'data-group '+pf+options.classPrefix+'data-group',
                'transform': 'translate('+(x.rangeBand() / 2)+',0)'
            })
            .selectAll('.'+pf+'data-point')
            .data(parseDataSummary(data))
            .enter()
            .append('g')
            .attr({
                'class': pf+'data-point '+pf+options.classPrefix+'data-point',
                'transform': function (d, i) {
                    if (getXAxisDates().indexOf(i) === -1) {
                        return 'translate('+x(getDateStrAsNum(d.date))+',0)';
                    } else {
                        return 'translate('+x(i)+',0)';
                    }
                }
            });

        dataPoints
            .append('path')
            .attr({
                'class': pf+'data-point-bar '+pf+options.classPrefix+'data-point-bar',
                'd': function (d, i) {
                    return getPathForDataPoint(d, i, y);
                }
            });

        var lines = parseLine(parseDataSummary(data), x, y);

        canvas
            .append('g')
            .attr({
                'class': pf+'data-lines '+pf+options.classPrefix+'data-lines',
                'transform': 'translate('+(x.rangeBand() / 2)+',0)'
            })
            .selectAll('.'+pf+'data-line')
            .data(lines)
            .enter()
            .append('line')
            .attr({
                'class': pf+'data-line '+pf+options.classPrefix+'data-line',
                'x1': function(d) {return d.start.x;},
                'y1': function(d) {return d.start.y;},
                'x2': function(d) {return d.end.x;},
                'y2': function(d) {return d.end.y;}
            })
            .classed({
                'dotted': function (d) {
                    return d.type === 'dotted';
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
// chart.drawData(pulseData, {
//     position: 'right',
//     title: 'pulse',
//     classPrefix: 'pulse-',
//     labelFormatter: function (v) {
//         return v;
//     }
// });

return;

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
