/** @jsx React.DOM */
var _ = require('lodash');
var bows = require('bows');
var moment = require('moment');
var React = require('react');

// tideline dependencies & plugins
var tidelineBlip = require('tideline/plugins/blip');
var chartWeeklyFactory = tidelineBlip.twoweek;

var Header = require('./header');
var Footer = require('./footer');

var tideline = {
  log: bows('Two Weeks')
};

var Weekly = React.createClass({
  chartType: 'weekly',
  log: bows('Weekly View'),
  propTypes: {
    bgPrefs: React.PropTypes.object.isRequired,
    chartPrefs: React.PropTypes.object.isRequired,
    imagesBaseUrl: React.PropTypes.string.isRequired,
    initialDatetimeLocation: React.PropTypes.string,
    patientData: React.PropTypes.object.isRequired,
    onClickRefresh: React.PropTypes.func.isRequired,
    onSwitchToDaily: React.PropTypes.func.isRequired,
    onSwitchToSettings: React.PropTypes.func.isRequired,
    onSwitchToWeekly: React.PropTypes.func.isRequired,
    trackMetric: React.PropTypes.func.isRequired,
    updateChartPrefs: React.PropTypes.func.isRequired,
    updateDatetimeLocation: React.PropTypes.func.isRequired,
    uploadUrl: React.PropTypes.string.isRequired
  },
  getInitialState: function() {
    return {
      atMostRecent: false,
      inTransition: false,
      showingValues: false,
      title: ''
    };
  },
  render: function() {
    /* jshint ignore:start */
    return (
      <div id="tidelineMain" className="grid">
        {this.isMissingSMBG() ? this.renderMissingSMBGHeader() : this.renderHeader()}
        <div className="container-box-outer patient-data-content-outer">
          <div className="container-box-inner patient-data-content-inner">
            <div className="patient-data-content">
              {this.isMissingSMBG() ? this.renderMissingSMBGMessage() : this.renderChart()}
            </div>
          </div>
        </div>
        <Footer
         chartType={this.isMissingSMBG() ? 'no-data' : this.chartType}
         onClickValues={this.toggleValues}
         onClickRefresh={this.props.onClickRefresh}
         showingValues={this.state.showingValues}
        ref="footer" />
      </div>
      );
    /* jshint ignore:end */
  },
  renderChart: function() {
    /* jshint ignore:start */
    return (
      <WeeklyChart
        bgClasses={this.props.bgPrefs.bgClasses}
        bgUnits={this.props.bgPrefs.bgUnits}
        imagesBaseUrl={this.props.imagesBaseUrl}
        initialDatetimeLocation={this.props.initialDatetimeLocation}
        patientData={this.props.patientData}
        // handlers
        onDatetimeLocationChange={this.handleDatetimeLocationChange}
        onMostRecent={this.handleMostRecent}
        onClickValues={this.toggleValues}
        onSelectSMBG={this.handleSelectSMBG}
        onTransition={this.handleInTransition}
        ref="chart" />
    );
    /* jshint ignore:end */
  },
  renderHeader: function() {
    /* jshint ignore:start */
    return (
      <Header
        chartType={this.chartType}
        atMostRecent={this.state.atMostRecent}
        inTransition={this.state.inTransition}
        title={this.state.title}
        iconBack={'icon-back-down'}
        iconNext={'icon-next-up'}
        iconMostRecent={'icon-most-recent-up'}
        onClickBack={this.handlePanBack}
        onClickMostRecent={this.handleClickMostRecent}
        onClickNext={this.handlePanForward}
        onClickOneDay={this.handleClickOneDay}
        onClickSettings={this.props.onSwitchToSettings}
        onClickTwoWeeks={this.handleClickTwoWeeks}
      ref="header" />
    );
    /* jshint ignore:end */
  },
  renderMissingSMBGHeader: function() {
    /* jshint ignore:start */
    return (
      <Header
        chartType={this.chartType}
        atMostRecent={this.state.atMostRecent}
        inTransition={this.state.inTransition}
        title={''}
        onClickOneDay={this.handleClickOneDay}
        onClickSettings={this.props.onSwitchToSettings}
        onClickTwoWeeks={this.handleClickTwoWeeks}
      ref="header" />
    );
    /* jshint ignore:end */
  },
  renderMissingSMBGMessage: function() {
    var self = this;
    var handleClickUpload = function() {
      self.props.trackMetric('Clicked Partial Data Upload, No SMBG');
    };
    /* jshint ignore:start */
    return (
      <div className="patient-data-message patient-data-message-loading">
        <p>{'It looks like you don\'t have any BG meter data yet!'}</p>
        <p>{'To see all your data together, please '}
          <a
            href={this.props.uploadUrl}
            target="_blank"
            onClick={handleClickUpload}>upload</a>
          {' your insulin pump data and CGM data at the same time.'}</p>
        <p>{'Or if you already have, try '}
          <a href="" onClick={this.props.onClickRefresh}>refreshing</a>
          {'.'}
        </p>
      </div>
    );
    /* jshint ignore:end */
  },
  formatDate: function(datetime) {
    return moment(datetime).utc().format('MMMM Do');
  },
  getTitle: function(datetimeLocationEndpoints) {
    return this.formatDate(datetimeLocationEndpoints[0]) + ' - ' + this.formatDate(datetimeLocationEndpoints[1]);
  },
  isMissingSMBG: function() {
    var data = this.props.patientData;
    if (_.isEmpty(data.grouped.smbg)) {
      return true;
    }
    return false;
  },
  // handlers
  handleClickMostRecent: function(e) {
    if (e) {
      e.preventDefault();
    }
    this.setState({showingValues: false});
    this.refs.chart.goToMostRecent();
  },
  handleClickOneDay: function(e) {
    if (e) {
      e.preventDefault();
    }
    var datetime;
    if (this.refs.chart) {
      datetime = this.refs.chart.getCurrentDay();
    }
    this.props.onSwitchToDaily(datetime);
  },
  handleClickTwoWeeks: function(e) {
    if (e) {
      e.preventDefault();
    }
    return;
  },
  handleDatetimeLocationChange: function(datetimeLocationEndpoints) {
    this.setState({
      datetimeLocation: datetimeLocationEndpoints[1],
      title: this.getTitle(datetimeLocationEndpoints)
    });
    this.props.updateDatetimeLocation(this.refs.chart.getCurrentDay());
  },
  handleInTransition: function(inTransition) {
    this.setState({
      inTransition: inTransition
    });
  },
  handleMostRecent: function(atMostRecent) {
    this.setState({
      atMostRecent: atMostRecent
    });
  },
  handlePanBack: function(e) {
    if (e) {
      e.preventDefault();
    }
    this.refs.chart.panBack();
  },
  handlePanForward: function(e) {
    if (e) {
      e.preventDefault();
    }
    this.refs.chart.panForward();
  },
  handleSelectSMBG: function(datetime) {
    this.props.onSwitchToDaily(datetime);
  },
  toggleValues: function(e) {
    if (e) {
      e.preventDefault();
    }
    if (this.state.showingValues) {
      this.refs.chart.hideValues();
    }
    else {
      this.refs.chart.showValues();
    }
    this.setState({showingValues: !this.state.showingValues});
  }
});

var WeeklyChart = React.createClass({
  chartOpts: ['bgUnits'],
  log: bows('Weekly Chart'),
  propTypes: {
    bgUnits: React.PropTypes.string.isRequired,
    imagesBaseUrl: React.PropTypes.string.isRequired,
    initialDatetimeLocation: React.PropTypes.string,
    patientData: React.PropTypes.object.isRequired,
    // handlers
    onDatetimeLocationChange: React.PropTypes.func.isRequired,
    onMostRecent: React.PropTypes.func.isRequired,
    onClickValues: React.PropTypes.func.isRequired,
    onSelectSMBG: React.PropTypes.func.isRequired,
    onTransition: React.PropTypes.func.isRequired
  },
  componentDidMount: function() {
    this.mountChart(this.getDOMNode());
    this.initializeChart(this.props.patientData, this.props.initialDatetimeLocation);
  },
  componentWillUnmount: function() {
    this.unmountChart();
  },
  mountChart: function(node, chartOpts) {
    this.log('Mounting...');
    chartOpts = chartOpts || {imagesBaseUrl: this.props.imagesBaseUrl};
    this.chart = chartWeeklyFactory(node, _.assign(chartOpts, _.pick(this.props, this.chartOpts)));
    this.bindEvents();
  },
  unmountChart: function() {
    this.log('Unmounting...');
    this.chart.destroy();
  },
  bindEvents: function() {
    this.chart.emitter.on('inTransition', this.props.onTransition);
    this.chart.emitter.on('navigated', this.handleDatetimeLocationChange);
    this.chart.emitter.on('mostRecent', this.props.onMostRecent);
    this.chart.emitter.on('selectSMBG', this.props.onSelectSMBG);
  },
  initializeChart: function(data, datetimeLocation) {
    this.log('Initializing...');
    if (_.isEmpty(data)) {
      throw new Error('Cannot create new chart with no data');
    }

    if (datetimeLocation) {
      this.chart.load(data, datetimeLocation);
    }
    else {
      this.chart.load(data);
    }
  },
  render: function() {
    /* jshint ignore:start */
    return (
      <div id="tidelineContainer" className="patient-data-chart"></div>
      );
    /* jshint ignore:end */
  },
  // handlers
  handleDatetimeLocationChange: function(datetimeLocationEndpoints) {
    this.setState({
      datetimeLocation: datetimeLocationEndpoints[1]
    });
    this.props.onDatetimeLocationChange(datetimeLocationEndpoints);
  },
  getCurrentDay: function() {
    return this.chart.getCurrentDay().toISOString();
  },
  goToMostRecent: function() {
    this.chart.clear();
    this.bindEvents();
    this.chart.load(this.props.patientData);
  },
  hideValues: function() {
    this.chart.hideValues();
  },
  panBack: function() {
    this.chart.panBack();
  },
  panForward: function() {
    this.chart.panForward();
  },
  showValues: function() {
    this.chart.showValues();
  }
});

module.exports = Weekly;
