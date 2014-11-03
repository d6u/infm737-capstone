(function(window, $, d3, undefined) {
'use strict';

window.RaptorChart = (function () {
    var _extend   = $.extend;

    var defaultOpt = {
        margin: {
            top: 20,
            right: 50,
            bottom: 120,
            left: 60
        },
        width: 800,
        height: 300,
        graph: {
            outterRadius: 6,
            innerRadius: 4
        },
        classPrefix: 'raptor-',
        maxColumns: 61,
        enableDateGap: true
    };

    function parseDataSummary(data) {
        var result = [], prev, i, d, r;

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
            if (prev.date.getDateStrAsNum() === d.date.getDateStrAsNum()) {
                result[result.length - 1].readings.push(d);
            } else {
                result.push({
                    date:      d.date,
                    readings: [d]
                });
            }
            prev = d;
        }

        for (i = 0; i < result.length; i++) {
            r      = result[i];
            r.max  = d3.max( r.readings, propertyGetter);
            r.min  = d3.min( r.readings, propertyGetter);
            r.mean = d3.mean(r.readings, propertyGetter);
        }

        return result;
    }

    function translateStr(x, y) {
        return 'translate(' + x + ',' + y + ')';
    }

    // (String: prefixes ...) -> (String: classNames ...) -> String
    function prefixClass() {
        var prefixes = [], aggregator = '';
        for (var i = 0; i < arguments.length; i++) {
            aggregator += arguments[i];
            prefixes.push(aggregator);
        }
        return function () {
            var result = [];
            for (var j = 0; j < prefixes.length; j++) {
                for (var k = 0; k < arguments.length; k++) {
                    result.push(prefixes[j] + arguments[k]);
                }
            }
            return result.join(' ');
        };
    }

    Date.prototype.getDateStr = function () {
        function padStr(n, w, z) {
            z = z || '0';
            n = n + '';
            return n.length >= w ? n : new Array(w - n.length + 1).join(z) + n;
        }
        return '' + this.getUTCFullYear() + padStr(this.getUTCMonth() + 1, 2) + padStr(this.getUTCDate(), 2);
    };

    Date.prototype.getDateStrAsNum = function () {
        return Number(this.getDateStr());
    };

    Date.prototype.getUnixDay = function () {
        return Math.ceil(this.getTime() / 1000 / 60 / 60 / 24);
    };

    Date.parseDateStr = function (datetamp) {
        var parseDate = d3.time.format('%Y%m%d %Z').parse;
        return parseDate(datetamp + ' +0000');
    };

    return function (sel, opts) {
        opts             = opts || {};
        this.opts        = opts = _extend(true, {}, defaultOpt, opts);
        this.sel         = sel;
        this.summaryData = {};
        this.dates       = [];

        var _this  = this;
        var pf     = opts.classPrefix;
        var mainPf = prefixClass(pf);
        var svg    = d3.select(sel).append('svg')
            .attr({
                'class':  mainPf('svg'),
                'width':  opts.width  + opts.margin.left + opts.margin.right,
                'height': opts.height + opts.margin.top  + opts.margin.bottom
            });
        var canvas = svg.append('g')
            .attr({
                'class':     mainPf('canvas'),
                'transform': translateStr(opts.margin.left, opts.margin.top)
            });

        var x  = d3.scale.ordinal().rangeBands([0, opts.width], 0, 0.5);
        x.fromDate = function (date) {
            var xDomain = x.domain(), d;
            for (var i = 0; i < xDomain.length; i++) {
                d = xDomain[i];
                if (d.toDateString && d.getDateStr() === date.getDateStr()) {
                    return this(d);
                }
            }
        };

        var y1 = d3.scale.linear().range([opts.height, 0]);
        var y2 = d3.scale.linear().range([opts.height, 0]);
        var y1Inverse = d3.scale.linear().domain([opts.height, 0]);
        var y2Inverse = d3.scale.linear().domain([opts.height, 0]);

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient('bottom')
            .tickFormat(function(d) {
                if (d.toDateString) {
                    return d.toDateString();
                }
            });

        var xAxisG = canvas.append('g')
            .attr({
                'class':     mainPf('x', 'axis'),
                'transform': translateStr(0, opts.height)
            });

        var yAxis1 = this.yAxis1 = d3.svg.axis()
            .scale(y1)
            .orient('left');

        var yAxis2 = this.yAxis2 = d3.svg.axis()
            .scale(y2)
            .orient('right');

        function parseLine(summary, x, y) {
            var result = [],
                prev = summary[0],
                prevIndex = 0,
                type = 'solid',
                d,
                xCoord1,
                xCoord2;

            for (var i = 1; i < summary.length; i++) {
                d = summary[i];
                if (d.date.getUnixDay() - prev.date.getUnixDay() > 1) {
                    type = 'dotted';
                }
                xCoord1 = x.fromDate(prev.date);
                xCoord2 = x.fromDate(d.date);
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

        /**
         *
         * @param  {Object} d {mean: Number, max: Number, min: Number}
         * @param  {Number} i index
         * @return {String}   string of path
         */
        function getPathForDataPoint(d, y) {
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

        function mergeDates (dates) {
            /**
             * @return {Array} [Date, 1, 2, 3, Date, Date, 6, 7, 8, Date]
             */
            function getXDomain(dates) {
                if (!opts.enableDateGap) {
                    return dates;
                }
                var prev   = dates[0],
                    result = [prev],
                    j = 1;
                for (var i = 1; i < dates.length; i++) {
                    if (dates[i].getUnixDay() - prev.getUnixDay() > 1) {
                        result.push(j++);
                        result.push(j++);
                        result.push(j++);
                    }
                    result.push(dates[i]);
                    prev = dates[i];
                    j += 1;
                }
                return result;
            }

            var t1, t2;

            for (var i = 0; i < _this.dates.length; i++) {
                t1 = _this.dates[i].getDateStrAsNum();
                t2 = dates[0].getDateStrAsNum();
                if (t2 < t1) {
                    t1.splice(i, 0, Date.parseDateStr(t2));
                    dates.shift();
                } else if (t2 === t1) {
                    dates.shift();
                }
            }

            _this.dates = _this.dates.concat(
                dates.map(function (d) {
                    return Date.parseDateStr(d.getDateStr());
                })
            );

            x.domain(getXDomain(_this.dates));
            xAxisG.transition().duration(300).call(xAxis);
            xAxisG.selectAll('text').style({'text-anchor': ''});
        }

        this.drawData = function (data, options) {
            data.sort(function (a, b) {
                return a.date.getDateStrAsNum() - b.date.getDateStrAsNum();
            });

            var summary = parseDataSummary(data);
            this.summaryData[options.id] = summary;

            mergeDates(summary.map(function (d) {
                return d.date;
            }));

            function parseYScale(position, data, y, yInverse, yAxis, canvas) {

                function addDomainMargin(domain) {
                    var range = domain[1] - domain[0];
                    domain[0] -= range * 0.1;
                    domain[1] += range * 0.1;
                    return domain;
                }

                var yDomain = d3.extent(data, function(d) {
                    return Number(d.val);
                }).sort(function (a, b) {
                    return a - b;
                });

                addDomainMargin(yDomain);

                y.domain(yDomain);
                yInverse.range(yDomain);

                if (options.labelFormatter) {
                    yAxis.tickFormat(options.labelFormatter);
                }

                if (options.yAxisTickCount != null) {
                    yAxis.ticks(options.yAxisTickCount);
                }

                canvas.append('g')
                    .attr({
                        'class': mainPf('y', 'axis', 'axis-' + position),
                        'transform': position === 'right' ? translateStr(opts.width, 0) : null
                    })
                    .call(yAxis);
            }

            var y, groupPf = prefixClass(pf, options.classPrefix);

            if (options.position === 'left') {
                parseYScale(options.position, data, y1, y1Inverse, yAxis1, canvas);
                y = y1;
            } else {
                parseYScale(options.position, data, y2, y2Inverse, yAxis2, canvas);
                y = y2;
            }

            var dataPoints = canvas.append('g')
                .attr({
                    'class':     groupPf('data-group'),
                    'transform': translateStr(x.rangeBand() / 2, 0)
                })
                .selectAll('.' + pf + 'data-point')
                .data(summary)
                .enter()
                .append('g')
                .attr({
                    'class':     groupPf('data-point'),
                    'transform': function (d) {
                        return translateStr(x.fromDate(d.date), 0);
                    }
                });

            dataPoints
                .append('path')
                .attr({
                    'class': groupPf('data-point-bar'),
                    'd': function (d) {
                        return getPathForDataPoint(d, y);
                    }
                });

            var lines = parseLine(summary, x, y);

            canvas
                .append('g')
                .attr({
                    'class':     groupPf('data-lines'),
                    'transform': translateStr(x.rangeBand() / 2, 0)
                })
                .selectAll('.' + pf + 'data-line')
                .data(lines)
                .enter()
                .append('line')
                .attr({
                    'class': groupPf('data-line'),
                    'x1': function(d) { return d.start.x; },
                    'y1': function(d) { return d.start.y; },
                    'x2': function(d) { return d.end.x;   },
                    'y2': function(d) { return d.end.y;   }
                })
                .classed({
                    'dotted': function (d) {
                        return d.type === 'dotted';
                    }
                });

            var cursorLine, cursorTooltip1, cursorTooltip2;

            svg.on('mousemove', function() {
                var coord = d3.mouse(this);
                var x = coord[0] - opts.margin.left - 1, y = coord[1] - opts.margin.top - 2;

                if (0 < x && x < opts.width &&
                    0 < y && y < opts.height) {

                    // Mouse move within area of charts
                    if (!cursorLine) {
                        cursorLine = canvas.append('line')
                            .classed({'cursor-line': true, show: true})
                            .attr({
                                x1: 0,
                                x2: opts.width,
                                y1: y,
                                y2: y
                            });
                    } else {
                        cursorLine.classed({show: true}).attr({y1: y, y2: y});
                    }

                    if (!cursorTooltip1) {
                        cursorTooltip1 = makeTooltip(canvas, x, y);
                    }

                    cursorTooltip1.classed({hide: false});
                    cursorTooltip1.setTransform(x - 20, y);
                    cursorTooltip1.setVal(options.labelFormatter(roundTemperature(y1Inverse(y))));

                    if (!cursorTooltip2) {
                        cursorTooltip2 = makeTooltip(canvas, x, y, null, true);
                    }

                    cursorTooltip2.classed({hide: false});
                    cursorTooltip2.setTransform(x + 20, y);
                    cursorTooltip2.setVal(roundTemperature(y2Inverse(y)));

                } else {
                    if (cursorLine) {
                        cursorLine.classed({show: false});
                    }
                    if (cursorTooltip1) {
                        cursorTooltip1.classed({hide: true});
                    }

                    if (cursorTooltip2) {
                        cursorTooltip2.classed({hide: true});
                    }
                }
            });
        };

        var TOOPTIP_WIDTH       = 40,
            TOOPTIP_HEIGHT      = 15,
            TOOPTIP_OFFSET      = 3,
            TOOPTIP_ARROW_WIDTH = 5;

        function calcTooltipTransform(x, y) {
            return 'translate('+(x - TOOPTIP_WIDTH - TOOPTIP_OFFSET)+','+
                (y - TOOPTIP_HEIGHT - TOOPTIP_OFFSET)+')';
        }

        function makeTooltip(parent, x, y, val, isFlip) {
            var tooltip = parent.append('g').classed({tooltip: true});

            tooltip.append('path')
                .attr('d', function() {
                    var leftTopX      = 0,
                        leftTopY      = 0,
                        rightTopX     = TOOPTIP_WIDTH,
                        rightTopY     = 0,
                        rightBottom1X = TOOPTIP_WIDTH,
                        rightBottom1Y = TOOPTIP_HEIGHT - TOOPTIP_ARROW_WIDTH,
                        rightBottomX  = TOOPTIP_WIDTH + TOOPTIP_OFFSET,
                        rightBottomY  = TOOPTIP_HEIGHT + TOOPTIP_OFFSET,
                        rightBottom2X = TOOPTIP_WIDTH - TOOPTIP_ARROW_WIDTH,
                        rightBottom2Y = TOOPTIP_HEIGHT,
                        leftBottomX   = 0,
                        leftBottomY   = TOOPTIP_HEIGHT;
                    return 'M'+leftTopX+','+leftTopY+
                        'L'+rightTopX+','+rightTopY+
                        'L'+rightBottom1X+','+rightBottom1Y+
                        'L'+rightBottomX+','+rightBottomY+
                        'L'+rightBottom2X+','+rightBottom2Y+
                        'L'+leftBottomX+','+leftBottomY;
                })
                .attr('transform', isFlip ?
                    'rotate(180) translate('+(-(TOOPTIP_WIDTH+TOOPTIP_OFFSET)*2)+','+(-(TOOPTIP_HEIGHT+TOOPTIP_OFFSET)*2)+')' :
                    '');

            tooltip.append('text')
                .attr({
                    'text-anchor': 'middle',
                    x: TOOPTIP_WIDTH / 2,
                    y: TOOPTIP_HEIGHT / 2 + 3
                })
                .attr('transform', isFlip ?
                    'translate('+(TOOPTIP_WIDTH+TOOPTIP_OFFSET+3)+','+(TOOPTIP_HEIGHT+TOOPTIP_OFFSET+3)+')' :
                    '')
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

        function roundTemperature(t) {
            return Math.round(t * 10) / 10;
        }
    };
}());

return;

//////

// dataPoint.on('mouseover', function(d, i) {
//     var _this = d3.select(this);
//     if (d.type !== 'gap') {
//         this.__tooltip__ = [];
//         if (d.max != null) {
//             this.__tooltip__.push(makeTooltip(_this, x(i) + x.rangeBand() / 2,
//                 y(d.max), roundTemperature(d.max)));
//         }
//         if (d.mean != null) {
//             this.__tooltip__.push(makeTooltip(_this, x(i) + x.rangeBand() / 2,
//                 y(d.mean), roundTemperature(d.mean)));
//         }
//         if (d.min != null) {
//             this.__tooltip__.push(makeTooltip(_this, x(i) + x.rangeBand() / 2,
//                 y(d.min), roundTemperature(d.min)));
//         }
//     }
// })
// .on('mouseout', function() {
//     if (this.__tooltip__) {
//         for (var i = 0; i < this.__tooltip__.length; i++) {
//             this.__tooltip__[i].remove();
//         }
//     }
// });

}(window, jQuery, d3));
