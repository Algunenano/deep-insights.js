var _ = require('underscore');
var cdb = require('cartodb.js');
var placeholderTemplate = require('./placeholder.tpl');
var contentTemplate = require('./content.tpl');
var HistogramView = require('./histogram-view');
var TimeSeriesHeaderView = require('./time-series-header-view');
var DropdownView = require('../dropdown/widget-dropdown-view');
var layerColors = require('../../util/layer-colors');
var analyses = require('../../data/analyses');

/**
 * Widget content view for a time-series
 */
module.exports = cdb.core.View.extend({
  className: 'CDB-Widget-body CDB-Widget-body--timeSeries',

  initialize: function () {
    this._dataviewModel = this.model.dataviewModel;
    this._selectedAmount = 0;
    this._initBinds();
  },

  render: function () {
    this.clearSubViews;
    this.$el.empty();

    var sourceId = this._dataviewModel.get('source').id;
    var letter = layerColors.letter(sourceId);
    var sourceColor = layerColors.getColorForLetter(letter);
    var sourceType = this._dataviewModel.getSourceType() || '';
    var layerName = this._dataviewModel.getLayerName() || '';

    if (this._isDataEmpty() || this._hasError()) {
      this.$el.append(placeholderTemplate({
        hasTorqueLayer: false
      }));
    } else {
      this.$el.append(contentTemplate({
        sourceId: sourceId,
        sourceType: analyses.title(sourceType),
        showSource: this.model.get('show_source') && letter !== '',
        sourceColor: sourceColor,
        layerName: layerName
      }));
      this._createHistogramView();
      this._createHeaderView();
      this._createDropdownView();
      this._updateRange();
    }
    return this;
  },

  _initBinds: function () {
    this._dataviewModel.once('error', function () {
      console.log('the tiler does not support non-torque layers just yet…');
    });

    this.listenTo(this._dataviewModel, 'change:data', this.render);
    this.listenToOnce(this.model, 'change:hasInitialState', this.render);
    this.listenTo(this.model, 'change:lo_index change:hi_index change:min change:max', function () {
      console.groupCollapsed('changes ', this.model.cid);
      console.trace('changes ', this.model.changed);
      console.groupEnd();
    });
  },

  _createHistogramView: function () {
    if (this._histogramView) {
      this._histogramView.remove();
    }

    this._histogramView = new HistogramView({
      timeSeriesModel: this.model,
      dataviewModel: this._dataviewModel,
      rangeFilter: this._dataviewModel.filter,
      displayShadowBars: !this.model.get('normalized'),
      normalized: !!this.model.get('normalized')
    });

    this.addView(this._histogramView);
    this.$('.js-content').append(this._histogramView.render().el);
  },

  _createHeaderView: function () {
    if (this._headerView) {
      this._headerView.remove();
    }

    this._headerView = new TimeSeriesHeaderView({
      dataviewModel: this._dataviewModel,
      rangeFilter: this._dataviewModel.filter,
      timeSeriesModel: this.model,
      showClearButton: true,
      selectedAmount: this._selectedAmount
    });

    if (!this._histogramView) {
      throw new Error('Histogram view must be instantiated before the header view');
    }
    this._headerView.bind('resetFilter', this._histogramView.resetFilter, this._histogramView);
    this.addView(this._headerView);
    this.$('.js-title').append(this._headerView.render().el);
  },

  _createDropdownView: function () {
    if (this._dropdownView) {
      this._dropdownView.remove();
    }

    this._dropdownView = new DropdownView({
      model: this.model,
      target: '.js-actions',
      container: this.$('.js-header'),
      flags: {
        localTimezone: this._dataviewModel.getColumnType() === 'date',
        normalizeHistogram: true,
        canCollapse: false
      }
    });

    this.addView(this._dropdownView);
  },

  _updateRange: function () {
    var min = this.model.get('min');
    var max = this.model.get('max');
    if (_.isFinite(min) && _.isFinite(max)) {
      this._histogramView.selectRange(min, max);
    }
  },

  _logFilter: function () {
    return '' + this.cid + ' ' + this.model.cid + ' min max [' + this.model.get('min') + ' ' + this.model.get('max') + '] lo hi [' + this.model.get('lo_index') + ' ' + this.model.get('hi_index') + ']';
  },

  _appendView: function (view) {
    this.addView(view);
    this.$el.append(view.render().el);
  },

  _isDataEmpty: function () {
    var data = this._dataviewModel.getUnfilteredData();
    return _.isEmpty(data) || _.size(data) === 0;
  },

  _hasError: function () {
    return this._dataviewModel.has('error');
  }
});
