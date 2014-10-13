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
  , PADDING = {TOP: 20, RIGHT: 20, BOTTOM: 110, LEFT: 45}
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

console.log(lines)

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

// Data Bar
//
var dataPoint = chart.append('g')
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

// Line
chart
  .append('g')
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

})(window, jQuery, d3);
