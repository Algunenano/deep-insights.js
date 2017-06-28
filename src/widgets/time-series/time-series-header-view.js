var cdb = require('cartodb.js');
var d3 = require('d3');
var template = require('./time-series-header.tpl');
var formatter = require('../../formatter');
var AnimateValues = require('../animate-values.js');
var animationTemplate = require('./animation-template.tpl');

var FORMATTER_TYPES = {
  'number': d3.format(',.0f'),
  'time': d3.time.format('%H:%M'),
  'date': d3.time.format('%x')
};

/**
 * View to reset render range.
 */
module.exports = cdb.core.View.extend({
  className: 'CDB-Widget-header--timeSeries CDB-Widget-contentSpaced',

  events: {
    'click .js-clear': '_onClick'
  },

  options: {
    showClearButton: true
  },

  initialize: function (opts) {
    if (!opts.dataviewModel) throw new Error('dataviewModel is required');
    if (!opts.rangeFilter) throw new Error('rangeFilter is required');
    if (opts.selectedAmount === void 0) throw new Error('selectedAmount is required');

    this._dataviewModel = opts.dataviewModel;
    this._rangeFilter = opts.rangeFilter;
    this._selectedAmount = opts.selectedAmount;
    this._layer = this._dataviewModel.layer;
    this._setupScales();
    this._initBinds();
  },

  render: function () {
    var columnType = this._getColumnType();
    var scale = this._scale;
    var filter = this._rangeFilter;
    var showSelection = !filter.isEmpty();
    var start;
    var end;

    if (showSelection) {
      if (columnType === 'date') {
        var startDate = new Date(scale.invert(filter.get('min')));
        var endDate = new Date(scale.invert(filter.get('max')));

        start = FORMATTER_TYPES['time'](startDate) + ' ' + FORMATTER_TYPES['date'](startDate);
        end = FORMATTER_TYPES['time'](endDate) + ' ' + FORMATTER_TYPES['date'](endDate);
      } else {
        start = FORMATTER_TYPES['number'](scale(filter.get('min')));
        end = FORMATTER_TYPES['number'](scale(filter.get('max')));
      }
    }

    this.$el.html(
      template({
        start: start,
        end: end,
        showClearButton: this.options.showClearButton && showSelection,
        showSelection: showSelection
      })
    );

    this._animateValue();

    return this;
  },

  _animateValue: function () {
    var animator = new AnimateValues({
      el: this.$el
    });
    var property = this._rangeFilter.isEmpty() ? 'totalAmount' : 'filteredAmount';
    var to = this._dataviewModel.get(property);

    animator.animateFromValues.call(this, this._selectedAmount, to, '.js-val', animationTemplate, {
      formatter: formatter.formatNumber,
      templateData: { suffix: ' Selected' }
    });

    this._selectedAmount = to;
  },

  _initBinds: function () {
    this.listenTo(this._dataviewModel, 'change:totalAmount', this._animateValue);
    this.listenTo(this._rangeFilter, 'change', this.render);
  },

  _getColumnType: function () {
    return this._layer.get('column_type') || this._dataviewModel.get('column_type');
  },

  _setupScales: function () {
    var data = this._dataviewModel.get('data');
    var columnType = this._getColumnType();

    if (columnType === 'date') {
      this._scale = d3.time.scale()
        .domain([data[0].start * 1000, data[data.length - 1].end * 1000])
        .range([this._dataviewModel.get('start'), this._dataviewModel.get('end')]);
    } else {
      this._scale = d3.scale.linear()
        .domain([data[0].start, data[data.length - 1].end])
        .range([this._dataviewModel.get('start'), this._dataviewModel.get('end')]);
    }
  },

  _onClick: function () {
    this.trigger('resetFilter', this);
  }
});
