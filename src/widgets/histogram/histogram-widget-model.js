var WidgetModel = require('../widget-model');
var AutoStylerFactory = require('../auto-style/factory');
var _ = require('underscore');

/**
 * Model for a histogram widget
 */
module.exports = WidgetModel.extend({

  defaultState: _.extend(
    {
      autoStyle: false,
      normalized: false,
      min: null,
      max: null
    },
    WidgetModel.prototype.defaultState
  ),

  initialize: function (attrs, opts) {
    WidgetModel.prototype.initialize.apply(this, arguments);
    this.autoStyler = AutoStylerFactory.get(this.dataviewModel);
    this.on('change:collapsed', this._onCollapsedChange, this);
    this.dataviewModel.once('change', function () {
      if (this.get('autoStyle')) {
        this.autoStyle();
      } else {
        this.autoStyler.set('palette', null);
      }
    }, this);
  },

  _onCollapsedChange: function (m, isCollapsed) {
    this.dataviewModel.set('enabled', !isCollapsed);
  },

  autoStyle: function () {
    var style = this.autoStyler.getStyle();
    this.dataviewModel.layer.set('cartocss', style);
    this.set('autoStyle', true);
  },

  cancelAutoStyle: function () {
    this.dataviewModel.layer.restoreCartoCSS();
    this.autoStyler.set('palette', null);
    this.set('autoStyle', false);
  }

});
