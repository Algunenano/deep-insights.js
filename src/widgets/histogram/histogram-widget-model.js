var _ = require('underscore');
var WidgetModel = require('../widget-model');

/**
 * Model for a histogram widget
 */
module.exports = WidgetModel.extend({
  defaults: {
    normalized: true
  },

  defaultState: _.extend(
    {
      autoStyle: false,
      normalized: false
    },
    WidgetModel.prototype.defaultState
  ),

  initialize: function (attrs, opts) {
    WidgetModel.prototype.initialize.apply(this, arguments);
    this.on('change:collapsed', this._onCollapsedChange, this);
    this.on('change:style', this._updateAutoStyle, this);
    this.dataviewModel.once('change', function () {
      if (this.get('autoStyle')) {
        this.autoStyle();
      }
    }, this);
  },

  _onCollapsedChange: function (m, isCollapsed) {
    this.dataviewModel.set('enabled', !isCollapsed);
  },

  getState: function () {
    var state = WidgetModel.prototype.getState.call(this);
    var min = this.get('min');
    var max = this.get('max');

    _.isFinite(min)
      ? state.min = min
      : delete state.min;

    _.isFinite(max)
      ? state.max = max
      : delete state.max;

    if (this.get('zoomed') === true) {
      state.zoomed = true;
    }

    return state;
  }
});
