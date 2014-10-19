(function(window, $, d3, undefined) {
'use strict';

// Data: chartThumbnail
//
var temperatures = [
  {created_at: '2011-09-01T18:48:00.000Z', temperature: 98.6 },
  {created_at: '2011-09-01T22:48:00.000Z', temperature: 99.8 },
  {created_at: '2011-10-03T06:48:00.000Z', temperature: 97.6 },
  {created_at: '2011-10-03T17:48:00.000Z', temperature: 101.2},
  {created_at: '2011-10-03T22:48:00.000Z', temperature: 98.6 },
  {created_at: '2011-10-05T22:48:00.000Z', temperature: 103.4},
  {created_at: '2011-10-06T09:48:00.000Z', temperature: 102.1},
  {created_at: '2011-10-06T20:48:00.000Z', temperature: 98.6 },
  {created_at: '2011-10-06T22:48:00.000Z', temperature: 99.8 },
  {created_at: '2011-10-07T13:48:00.000Z', temperature: 97.6 },
  {created_at: '2011-10-07T15:48:00.000Z', temperature: 101.2},
  {created_at: '2011-10-07T22:48:00.000Z', temperature: 98.6 },
  {created_at: '2011-10-08T09:48:00.000Z', temperature: 103.4},
  {created_at: '2011-10-08T22:48:00.000Z', temperature: 102.1}];

// Constants
//
var MAX_DATA_COUNT = 71
  , PADDING = {TOP: 20, RIGHT: 20, BOTTOM: 125, LEFT: 45}
  , WIDTH   = 960
  , HEIGHT  = 400
  , INNER_WIDTH  = WIDTH - PADDING.LEFT - PADDING.RIGHT
  , INNER_HEIGHT = HEIGHT - PADDING.TOP - PADDING.BOTTOM
  , BAR_PADDING  = 1
  , CIRCLE_STROKE_WIDTH = 2;

// Helper
//
Date.prototype.getUnixDay = function() {
  return Math.ceil(this.getTime() / 1000 / 60 / 60 / 24);
};

function clone(obj) {
  if(obj == null || typeof(obj) != 'object')
    return obj;

  var temp = obj.constructor(); // changed

  for(var key in obj) {
    if(obj.hasOwnProperty(key)) {
      temp[key] = clone(obj[key]);
    }
  }
  return temp;
}

function temperatureAccessor(d) {
  return d.temperature;
}

function parseData(raw) {
  var data    = clone(raw)
    , results = []
    , prev;

  for (var i = 0; i < data.length; i++) {
    var d = data[i];
    d.date = new Date(d.created_at);
  }

  prev = data[0];

  results.push({
    day:       prev.date.toDateString(),
    readings: [prev]
  });

  for (var i = 1; i < data.length; i++) {
    var d = data[i];
    if (prev.date.getUnixDay() === d.date.getUnixDay()) {
      results[results.length - 1].readings.push(d);
    } else {
      if (d.date.getUnixDay() - prev.date.getUnixDay() > 1) {
        for (var j = 0; j < 3; j++) {
          results.push({type: 'gap'});
        }
      }
      results.push({
        day:       d.date.toDateString(),
        readings: [d]
      });
    }
    prev = d;
  }

  for (var i = 0; i < results.length; i++) {
    if (results[i].type !== 'gap') {
      var r  = results[i];
      r.max  = d3.max( r.readings, temperatureAccessor);
      r.min  = d3.min( r.readings, temperatureAccessor);
      r.mean = d3.mean(r.readings, temperatureAccessor);
    }
  }

  return results;
}

function roundTemperature(v) {
  return Math.round(v * 10) / 10;
}

// Chart
//
var data = parseData(temperatures);

var chart = d3.select('#temperature')
  .append('svg')
  .classed({canvas: true})
  .attr('width', WIDTH)
  .attr('height', HEIGHT)
  .append('g')
  .attr('transform', 'translate('+PADDING.LEFT+','+PADDING.TOP+')');

var x = d3.scale.ordinal()
  .domain((function() {
    var arr = [];
    for (var i = 0; i < MAX_DATA_COUNT; i++) {
      arr.push(i);
    }
    return arr;
  })())
  .rangeBands([0, INNER_WIDTH], 0, 0.5);

var yDomain = d3.extent(temperatures, function(d) {return d.temperature;});
yDomain[0] -= 1;
yDomain[1] += 1;

var y = d3.scale.linear()
  .domain(yDomain)
  .range([INNER_HEIGHT, 0]);

var yInverse = d3.scale.linear()
  .domain([INNER_HEIGHT, 0])
  .range(yDomain);

var lines = (function(data) {
  var results = []
    , prev = data[0]
    , prevIndex = 0
    , type;

  for (var i = 1; i < data.length; i++) {
    var d = data[i];
    if (d.type === 'gap') {
      type = 'dotted';
    } else {
      if (type === 'dotted') {
        results.push({
          start: {
            x: x(prevIndex) + x.rangeBand() / 2,
            y: y(prev.mean)
          },
          end: {
            x: x(i) + x.rangeBand() / 2,
            y: y(d.mean)
          }
        });

        type = null;
      }
      prev = d;
      prevIndex = i;
    }
  }

  return results;
})(data);

var xAxis = d3.svg.axis()
  .scale(x)
  .orient('bottom')
  .tickFormat(function(d, i) {
    if (data[i] !== undefined) {
      return data[i].day;
    }
  });

var yAxis = d3.svg.axis()
  .scale(y)
  .orient('left')
  .ticks(8);

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

// Line
chart
  .append('g')
  .classed({lines: true})
  .selectAll('.connection-line')
  .data(lines)
  .enter()
  .append('line')
  .classed({
    'connection-line': true,
    dotted: true
  })
  .attr('x1', function(d) {return d.start.x})
  .attr('y1', function(d) {return d.start.y})
  .attr('x2', function(d) {return d.end.x})
  .attr('y2', function(d) {return d.end.y});

// Data Bar
//
var dataPoint = chart.append('g')
  .classed({bars: true})
  .selectAll('.data-point')
  .data(data)
  .enter()
  .append('g')
  .classed({'data-point': true});

dataPoint
  .append('rect')
  .classed({'mouseover-bar': true})
  .attr('x', function(d, i) {return x(i);})
  .attr('width', function() {return x.rangeBand();})
  .attr('y', 0)
  .attr('height', function(d) {return INNER_HEIGHT;});

dataPoint
  .append('path')
  .classed({'data-bar': true})
  .attr('d', function(d, i) {
    if (d.type !== 'gap') {
      var w1 = x.rangeBand() - BAR_PADDING * 2
        , x1 = x(i) + BAR_PADDING
        , x2 = x1 + w1
        , x3 = x1 + CIRCLE_STROKE_WIDTH
        , w2 = w1 - CIRCLE_STROKE_WIDTH * 2;
      return 'M'+x1+' '+y(d.max)+
        'a'+w1/2+' '+w1/2+' 0 0 1 '+w1+' 0'+
        'L'+x2+' '+y(d.min)+
        'a'+w1/2+' '+w1/2+' 0 0 1 '+(-w1)+' 0Z'+
        'M'+x3+' '+y(d.mean)+
        'a'+w2/2+' '+w2/2+' 0 0 1 '+w2+' 0'+
        'a'+w2/2+' '+w2/2+' 0 0 1 '+(-w2)+' 0Z';
    }
  });

// Add mouse interactivity
//
var canvas = d3.selectAll('.canvas');
var TOOPTIP_WIDTH       = 30
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
  }

  tooltip.setTransform(x, y);

  tooltip.setVal = function(val) {
    this.selectAll('text').text(val);
  }

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
