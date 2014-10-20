/** @jsx React.DOM */
/**
 * Copyright (c) 2014, Tidepool Project
 *
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the associated License, which is identical to the BSD 2-Clause
 * License as published by the Open Source Initiative at opensource.org.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the License for more details.
 *
 * You should have received a copy of the License along with this program; if
 * not, you can obtain one from Tidepool Project at tidepool.org.
 */

var React = require('react');
var _ = require('lodash');
var moment = require('moment');
var bows = require('bows');

var config = require('../../config');

var utils = require('../../core/utils');
var Header = require('../../components/chart').header;
var Daily = require('../../components/chart').daily;
var Weekly = require('../../components/chart').weekly;
var Settings = require('../../components/chart').settings;

var nurseShark = require('tideline/plugins/nurseshark/');

var Messages = require('../../components/messages');

var TidelineDataStore = require('../../stores/TidelineDataStore');

var PatientData = React.createClass({
  propTypes: {
    patientId: React.PropTypes.string,
    isUserPatient: React.PropTypes.bool,
    queryParams: React.PropTypes.object.isRequired,
    uploadUrl: React.PropTypes.string,
    onRefresh: React.PropTypes.func,
    onFetchMessageThread: React.PropTypes.func,
    onSaveComment: React.PropTypes.func,
    onEditMessage: React.PropTypes.func,
    onCreateMessage: React.PropTypes.func,
    onUpdatePatientData: React.PropTypes.func,
    trackMetric: React.PropTypes.func.isRequired
  },

  getInitialState: function() {
    var params = this.props.queryParams;
    var state = {
      chartPrefs: {
        hiddenPools: {
          // pass null here to *completely* disable the tabular display of basal settings
          basalSettings: null
        }
      },
      chartType: 'daily',
      createMessage: null,
      createMessageDatetime: null,
      datetimeLocation: null,
      initialDatetimeLocation: null,
      messages: null
    };

    return _.assign(state, this.getStateFromStores());
  },

  getStateFromStores: function(props) {
    props = props || this.props;
    var patientData = TidelineDataStore.getForGroup(props.patientId);
    return {
      patientData: patientData,
      fetchingPatientData: TidelineDataStore.isFetchingForGroup(props.patientId),
      bgPrefs: {
        bgClasses: patientData ? patientData.bgClasses : null,
        bgUnits: patientData ? patientData.bgUnits : null
      }
    };
  },

  componentWillMount: function() {
    var params = this.props.queryParams;

    if (!_.isEmpty(params)) {
      this.setState({
        chartPrefs: {
          hiddenPools: {
            basalSettings: params.showbasalsettings ?  true : null
          },
          bolusRatio: params.dynamicCarbs ? 0.5 : 0.35,
          dynamicCarbs: params.dynamicCarbs
        }
      });
    }
  },

  componentDidMount: function() {
    TidelineDataStore.addChangeListener(this.handleStoreChange);
  },

  componentWillUnmount: function() {
    TidelineDataStore.removeChangeListener(this.handleStoreChange);
  },

  componentWillReceiveProps: function(nextProps) {
    this.setState(this.getStateFromStores(nextProps));
  },

  handleStoreChange: function() {
    this.setState(this.getStateFromStores());
  },

  log: bows('PatientData'),

  render: function() {
    var patientData = this.renderPatientData();
    var messages = this.renderMessagesContainer();

    /* jshint ignore:start */
    return (
      <div className="patient-data js-patient-data-page">
        {messages}
        {patientData}
      </div>
    );
    /* jshint ignore:end */
  },

  renderPatientData: function() {
    if (this.state.fetchingPatientData) {
      return this.renderLoading();
    }

    if (this.isEmptyPatientData() || this.isInsufficientPatientData()) {
      return this.renderNoData();
    }

    return this.renderChart();
  },

  renderEmptyHeader: function() {
    /* jshint ignore:start */
    return (
      <Header
        chartType={'no-data'}
        inTransition={false}
        atMostRecent={false}
        title={'Data'}
        ref="header" />
      );
    /* jshint ignore:end */
  },

  renderLoading: function() {
    var header = this.renderEmptyHeader();
    /* jshint ignore:start */
    return (
      <div>
        {header}
        <div className="container-box-outer patient-data-content-outer">
          <div className="container-box-inner patient-data-content-inner">
            <div className="patient-data-content">
              <div className="patient-data-message patient-data-message-loading">
                Loading data...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
    /* jshint ignore:end */
  },

  renderNoData: function() {
    var content = 'This patient doesn\'t have any data yet.';
    var header = this.renderEmptyHeader();

    var self = this;
    var handleClickUpload = function() {
      self.props.trackMetric('Clicked No Data Upload');
    };

    if (this.props.isUserPatient) {
      /* jshint ignore:start */
      content = (
        <div>
          <p>{'It looks like you don\'t have any data yet!'}</p>
          <p>
            <a
              href={this.props.uploadUrl}
              target="_blank"
              onClick={handleClickUpload}>Upload your data</a>
            {' or if you already have, try '}
            <a href="" onClick={this.handleClickRefresh}>refreshing</a>
            {'.'}
          </p>
        </div>
      );
      /* jshint ignore:end */
    }

    /* jshint ignore:start */
    return (
      <div>
        {header}
        <div className="container-box-outer patient-data-content-outer">
          <div className="container-box-inner patient-data-content-inner">
            <div className="patient-data-content">
              <div className="patient-data-message patient-data-message-loading">
                {content}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
    /* jshint ignore:end */
  },

  isEmptyPatientData: function() {
    var patientDataLength =
      utils.getIn(this.state.patientData, ['data', 'length'], 0);
    return !Boolean(patientDataLength);
  },

  isInsufficientPatientData: function() {
    // add additional checks against data and return false iff:
    // only one datapoint
    var data = this.state.patientData.data;
    if (data.length === 1) {
      this.log('Sorry, you need more than one datapoint.');
      return true;
    }

    // only two datapoints, less than 24 hours apart
    var start = moment(data[0].normalTime);
    var end = moment(data[data.length - 1].normalTime);
    if (end.diff(start, 'days') < 1) {
      this.log('Sorry, your data needs to span at least a day.');
      return true;
    }

    // only messages data
    if (_.reject(data, function(d) { return d.type === 'message'; }).length === 0) {
      this.log('Sorry, tideline is kind of pointless with only messages.');
      return true;
    }
    return false;
  },

  renderChart: function() {
    switch (this.state.chartType) {
      case 'daily':
        /* jshint ignore:start */
        return (
          <Daily
            bgPrefs={this.state.bgPrefs}
            chartPrefs={this.state.chartPrefs}
            imagesBaseUrl={config.IMAGES_ENDPOINT + '/tideline'}
            initialDatetimeLocation={this.state.initialDatetimeLocation}
            patientData={this.state.patientData}
            onClickRefresh={this.handleClickRefresh}
            onCreateMessage={this.handleShowMessageCreation}
            onShowMessageThread={this.handleShowMessageThread}
            onSwitchToDaily={this.handleSwitchToDaily}
            onSwitchToSettings={this.handleSwitchToSettings}
            onSwitchToWeekly={this.handleSwitchToWeekly}
            updateChartPrefs={this.updateChartPrefs}
            updateDatetimeLocation={this.updateDatetimeLocation}
            ref="tideline" />
          );
        /* jshint ignore:end */
      case 'weekly':
        /* jshint ignore:start */
        return (
          <Weekly
            bgPrefs={this.state.bgPrefs}
            chartPrefs={this.state.chartPrefs}
            imagesBaseUrl={config.IMAGES_ENDPOINT + '/tideline'}
            initialDatetimeLocation={this.state.initialDatetimeLocation}
            patientData={this.state.patientData}
            onClickRefresh={this.handleClickRefresh}
            onSwitchToDaily={this.handleSwitchToDaily}
            onSwitchToSettings={this.handleSwitchToSettings}
            onSwitchToWeekly={this.handleSwitchToWeekly}
            trackMetric={this.props.trackMetric}
            updateChartPrefs={this.updateChartPrefs}
            updateDatetimeLocation={this.updateDatetimeLocation}
            uploadUrl={this.props.uploadUrl}
            ref="tideline" />
          );
        /* jshint ignore:end */
      case 'settings':
        /* jshint ignore:start */
        return (
          <Settings
            bgPrefs={this.state.bgPrefs}
            chartPrefs={this.state.chartPrefs}
            patientData={this.state.patientData}
            onClickRefresh={this.handleClickRefresh}
            onSwitchToDaily={this.handleSwitchToDaily}
            onSwitchToSettings={this.handleSwitchToSettings}
            onSwitchToWeekly={this.handleSwitchToWeekly}
            trackMetric={this.props.trackMetric}
            uploadUrl={this.props.uploadUrl}
            ref="tideline" />
          );
        /* jshint ignore:end */
    }
  },

  renderMessagesContainer: function() {
    /* jshint ignore:start */
    if (this.state.createMessageDatetime) {
      return (
        <Messages
          createDatetime={this.state.createMessageDatetime}
          patientId={this.props.patientId}
          onClose={this.closeMessageCreation}
          onSave={this.props.onCreateMessage}
          onNewMessage={this.handleMessageCreation}
          onEdit={this.handleEditMessage} />
      );
    } else if(this.state.messages) {
      return (
        <Messages
          messages={this.state.messages}
          patientId={this.props.patientId}
          onClose={this.closeMessageThread}
          onSave={this.handleReplyToMessage}
          onEdit={this.handleEditMessage} />
      );
    }
    /* jshint ignore:end */
  },

  closeMessageThread: function(){
    this.setState({ messages: null });
    this.refs.tideline.closeMessageThread();
    this.props.trackMetric('Closed Message Thread Modal');
  },

  closeMessageCreation: function(){
    this.setState({ createMessageDatetime: null });
    this.refs.tideline.closeMessageThread();
    this.props.trackMetric('Closed New Message Modal');
  },

  handleMessageCreation: function(message){
    var data = this.refs.tideline.createMessageThread(nurseShark.reshapeMessage(message));
    this.props.onUpdatePatientData(data);
    this.props.trackMetric('Created New Message');
  },

  handleReplyToMessage: function(comment, cb) {
    var reply = this.props.onSaveComment;
    if (reply) {
      reply(comment, cb);
    }
    this.props.trackMetric('Replied To Message');
  },

  handleEditMessage: function(message, cb) {
    var edit = this.props.onEditMessage;
    if (edit) {
      edit(message, cb);
    }
    var data = this.refs.tideline.editMessageThread(nurseShark.reshapeMessage(message));
    this.props.onUpdatePatientData(data);
    this.props.trackMetric('Edit To Message');
  },

  handleShowMessageThread: function(messageThread) {
    var self = this;

    var fetchMessageThread = this.props.onFetchMessageThread;
    if (fetchMessageThread) {
      fetchMessageThread(messageThread,function(thread){
        self.setState({ messages: thread });
      });
    }

    this.props.trackMetric('Clicked Message Icon');
  },

  handleShowMessageCreation: function(datetime) {
    this.setState({ createMessageDatetime : datetime });
    this.props.trackMetric('Clicked Message Pool Background');
  },

  handleSwitchToDaily: function(datetime) {
    this.setState({
      chartType: 'daily',
      initialDatetimeLocation: datetime || this.state.datetimeLocation
    });
    this.props.trackMetric('Clicked Switch To One Day', {
      fromChart: this.state.chartType
    });
  },

  handleSwitchToWeekly: function(datetime) {
    this.setState({
      chartType: 'weekly',
      initialDatetimeLocation: datetime || this.state.datetimeLocation
    });
    this.props.trackMetric('Clicked Switch To Two Week', {
      fromChart: this.state.chartType
    });
  },

  handleSwitchToSettings: function(e) {
    if (e) {
      e.preventDefault();
    }
    this.setState({
      chartType: 'settings'
    });
    this.props.trackMetric('Clicked Switch To Settings', {
      fromChart: this.state.chartType
    });
  },

  handleClickRefresh: function(e) {
    this.handleRefresh(e);
    this.props.trackMetric('Clicked No Data Refresh');
  },

  handleRefresh: function(e) {
    if (e) {
      e.preventDefault();
    }

    var refresh = this.props.onRefresh;
    if (refresh) {
      this.setState({title: this.DEFAULT_TITLE});
      refresh();
    }
  },

  updateChartPrefs: function(newChartPrefs) {
    var currentPrefs = _.clone(this.state.chartPrefs);
    _.assign(currentPrefs, newChartPrefs);
    this.setState({
      chartPrefs: currentPrefs
    }, function() {
      // this.log('Global example state changed:', JSON.stringify(this.state));
    });
  },

  updateDatetimeLocation: function(datetime) {
    this.setState({
      datetimeLocation: datetime
    }, function() {
      // this.log('Global example state changed:', JSON.stringify(this.state));
    });
  }
});

module.exports = PatientData;
