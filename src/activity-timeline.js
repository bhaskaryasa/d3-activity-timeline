"use strict";

// Copyright (c) 2016-2017, Bhaskar Reddy Yasa. All rights reserved.
// License: MIT.
 //
var fd = (function (ns) {
  ns = ns || {};

  ns.Timeline = function (selector) {
    this.margin = {top: 20, right: 30, bottom: 50, left: 100};
    var element = d3.select(selector);
    var bounds = element.node().getBoundingClientRect();
    var width = bounds.width;
    var height = bounds.height;
    if (height <= 0) {
      height = 200;
    }
    if (width <= 0) {
      width = 500;
    }
    this.svg = element
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    this.element = element;
    this.height = height - this.margin.top - this.margin.bottom;
    this.width = width - this.margin.left - this.margin.right;
    this.attributes = {};
    var self = this;
    _.each(selector.attributes, function (e) {
      var name = e.name.replace(/-(.)/g, function (i) {
        return i[1].toUpperCase()
      });
      self.attributes[name] = e.value;
    });
  };

  ns.Timeline.prototype.update = function (data) {
    if (data == null)
      return;

    var dataMin = new Date((_.minBy(data, this.attributes.fromField)[this.attributes.fromField]).getTime() - 10 * 60000);
    var dataMax = _.maxBy(data, this.attributes.toField)[this.attributes.toField];

    var catData = _.groupBy(_.sortBy(data, this.attributes.categoryField), this.attributes.categoryField);

    var catArray = [];
    var grpCount = 0;
    for (var cat in catData) {
      var grpData = _.groupBy(catData[cat], this.attributes.groupField);
      var grpArray = [];
      for (var grp in grpData) {
        grpArray.push({group: grp, data: grpData[grp]});
      }
      if(grpCount < grpArray.length){
        grpCount = grpArray.length;
      }
      catArray.push({category: cat, data: grpArray});
    }
    var catHeight = this.height / catArray.length;

    var scaleX = d3.time.scale()
      .domain([dataMin, dataMax])
      .range([0, this.width]);

    var scaleY = d3.scale.ordinal()
      .rangeBands([0, this.height], 0);

    var tooltip = d3.select("body").append("div")
      .attr("class", "fd-tl-tooltip")
      .style("opacity", 0);

    var popoverElement = d3.select("body").append("div")
      .attr("class", "fd-tl-popover")
      .style("opacity", 0);
    popoverElement.html("<div class='header'></div><div class='content'></div>");
    d3.select("body").on('click', function () {
      popoverElement.transition()
        .duration(500)
        .style("opacity", 0);
    });

    this.svg.selectAll("g")
      .remove();

    var chart = this.svg
      .append("g")
      .attr("class", "fd-timeline")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    var xAxis = d3.svg.axis()
      .scale(scaleX)
      .ticks(d3.time.hour)
      .orient("bottom")
      .tickFormat(d3.time.format("%H"));

    var yAxis = d3.svg.axis()
      .scale(scaleY)
      .orient("left");

    chart.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + this.height + ")")
      .call(xAxis);

    var categoryFormat;
    if (!this.attributes.categoryLabelFormatter) {
      categoryFormat = function (f) {
        return f;
      };
    } else {
      categoryFormat = eval(this.attributes.categoryLabelFormatter);
    }
    if (categoryFormat && categoryFormat instanceof Function) {
      scaleY.domain(_.map(catArray, function (e) {
        return categoryFormat(e)
      }));
    }
    else {
      scaleY.domain(_.map(catArray, function (e) {
        return e.category
      }));
    }

    var ybox = chart.append("g")
      .attr("class", "y axis")
      .call(yAxis);

    var formatHours = d3.time.format(this.attributes.timeLabelFormat);

    var categories = chart.selectAll(".cat-band")  // category bands
      .data(catArray)
      .enter()
      .append("g")
      .attr("class", "cat-band")
      .attr("transform", function (d, i) {
        return "translate(0," + i * catHeight + ")";
      });
    categories.append("line")                   // separator line
      .attr("x2", this.width)
      .attr("style", "stroke:lightgrey;stroke-this.width:0.3px");

    var bars = categories.selectAll("g")
      .data(function (d) {
        return d.data;
      })
      .enter()
      .append("g")            // group band offset
      .attr("transform", function (d, i) {
        return "translate(0, 6)";
      })
      .append("g")           // group bands
      .attr("transform", function (d, i) {
        return "translate(0," + i * (catHeight - 6) / grpCount + ")";
      })
      .selectAll("rect")          // time bars
      .data(function (d) {
        return d.data;
      })
      .enter()
      .append("rect")
      .attr("data-legend", function (d) {
        return d.Type;
      })
      .attr("x", function (d) {
        return scaleX(d.StartTime)
      })
      .attr("width", function (d) {
        return scaleX(d.EndTime) - scaleX(d.StartTime);
      })
      .attr("fill", function (d) {
        return d.Color;
      })
      .attr("height", (catHeight - 12) / grpCount - 3)
      .on("mouseover", function (d) {
        tooltip.transition()
          .duration(200)
          .style("opacity", .9);
        tooltip.html(d.Type + "<br\>" + formatHours(d.StartTime) + "-" + formatHours(d.EndTime))
          .style("left", (d3.event.pageX) + "px")
          .style("top", (d3.event.pageY - 40) + "px")
          .style("background-color", d.Color);
      })
      .on("mouseout", function (d) {
        tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });
    if (this.attributes.barClicked) {
      bars.on("click", function (d) {
        eval(this.attributes.barClicked)(d, d3.event.pageX, d3.event.pageY);
      });
    }

    chart.append("g")
      .attr("class", "legend")
      .attr("transform", "translate(0," + (this.height + 40) + ")")
      .style("font-size", "12px")
      .call(d3.legend);
  };

  return ns;

}(fd));

// d3.legend.js
// (C) 2012 ziggy.jonsson.nyc@gmail.com
// MIT licence
(function() {
  d3.legend = function(g) {
    g.each(function() {
      var g= d3.select(this),
        items = {},
        svg = d3.select(g.property("nearestViewportElement")),
        legendPadding = g.attr("data-style-padding") || 5,
        lb = g.selectAll(".legend-box").data([true]),
        li = g.selectAll(".legend-items").data([true])

      lb.enter().append("rect").classed("legend-box",true)
      li.enter().append("g").classed("legend-items",true)

      svg.selectAll("[data-legend]").each(function() {
        var self = d3.select(this)
        items[self.attr("data-legend")] = {
          pos : self.attr("data-legend-pos") || this.getBBox().y,
          color : self.attr("data-legend-color") != undefined ? self.attr("data-legend-color") : self.style("fill") != 'none' ? self.style("fill") : self.style("stroke")
        }
      })

      items = d3.entries(items).sort(function(a,b) { return a.value.pos-b.value.pos})


      li.selectAll("text")
        .data(items,function(d) { return d.key})
        .call(function(d) { d.enter().append("text")})
        .call(function(d) { d.exit().remove()})
        .attr("y",function(d,i) { return 0})
        .attr("x", function (d, i) { return i*10+"em" })
        .text(function(d) { return d.key})

      li.selectAll("rect")
        .data(items,function(d) { return d.key})
        .call(function(d) { d.enter().append("rect")})
        .call(function(d) { d.exit().remove()})
        .attr("y", function (d, i) { return "-.65em" })
        .attr("x", function (d, i) { return i*10 - 1 + "em" })
        .attr("width",".7em")
        .attr("height", ".7em")
        .style("fill", function (d) { console.log(d.value.color); return d.value.color })

      // Reposition and resize the box
      var lbbox = li[0][0].getBBox();
      lb.attr("x",(lbbox.x-legendPadding))
        .attr("y",(lbbox.y-legendPadding))
        .attr("height",(lbbox.height+2*legendPadding))
        .attr("width",(lbbox.width+2*legendPadding))
    })
    return g
  }
})();
