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
var Navigation = require('react-router').Navigation;

var personUtils = require('../../core/personutils');
var InputGroup = require('../../components/inputgroup');
var DatePicker = require('../../components/datepicker');
var personUtils = require('../../core/personutils');
var datetimeUtils = require('../../core/datetimeutils');

var AuthenticatedRoute = require('../../core/AuthenticatedRoute');

var GroupActions = require('../../actions/GroupActions');
var AuthStore = require('../../stores/AuthStore');
var GroupStore = require('../../stores/GroupStore');
var trackMetric = require('../../core/trackMetric');

var MODEL_DATE_FORMAT = 'YYYY-MM-DD';

var PatientNew = React.createClass({
  mixins: [AuthenticatedRoute, Navigation],

  formInputs: [
    {
      name: 'isOtherPerson',
      type: 'radios',
      items: [
        {value: 'no', label: 'This is for me, I have type 1 diabetes'},
        {value: 'yes', label: 'This is for someone I care for who has type 1 diabetes'}
      ]
    },
    {
      name: 'fullName',
      placeholder: 'Full name'
    },
    {
      name: 'about',
      type: 'textarea',
      placeholder: 'Share a bit about yourself or this person.'
    },
    {
      name: 'birthday',
      label: 'Birthday',
      type: 'datepicker'
    },
    {
      name: 'diagnosisDate',
      label: 'Diagnosis date',
      type: 'datepicker'
    }
  ],

  getInitialState: function() {
    var user = AuthStore.getLoggedInUser();
    return {
      user: user,
      working: false,
      formValues: {
        isOtherPerson: false,
        fullName: this.getUserFullName(user)
      },
      validationErrors: {},
      notification: null
    };
  },

  getStateFromStores: function() {
    return {
      user: AuthStore.getLoggedInUser(),
      working: GroupStore.isCreating()
    };
  },

  componentWillMount: function() {
    trackMetric('Viewed Profile Create');
  },

  componentDidMount: function() {
    AuthStore.addChangeListener(this.handleStoreChange);
    GroupStore.addChangeListener(this.handleStoreChange);
  },

  componentWillUnmount: function() {
    AuthStore.removeChangeListener(this.handleStoreChange);
    GroupStore.removeChangeListener(this.handleStoreChange);
  },

  handleStoreChange: function() {
    if (!this.isMounted()) {
      return;
    }
    if (this.state.working && !GroupStore.isCreating()) {
      return this.handleCreationSuccess();
    }
    this.setState(this.getStateFromStores());
  },

  getUserFullName: function(user) {
    user = user || this.state.user;
    return personUtils.fullName(user);
  },

  render: function() {
    var subnav = this.renderSubnav();
    var form = this.renderForm();

    return (
      <div className="PatientNew">
        {subnav}
        <div className="container-box-outer PatientNew-contentOuter">
          <div className="container-box-inner PatientNew-contentInner">
            <div className="PatientNew-content">
              {form}
            </div>
          </div>
        </div>
      </div>
    );
  },

  renderSubnav: function() {
    return (
      <div className="container-box-outer">
        <div className="container-box-inner PatientNew-subnavInner">
          <div className="grid PatientNew-subnav">
            <div className="grid-item one-whole">
              <div className="PatientNew-subnavTitle">
                {'Set up data storage'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },

  renderForm: function() {
    return (
        <form className="PatientNew-form">
          <div className="PatientNew-formInputs">
            {this.renderInputs()}
          </div>
          <div className="PatientNew-formActions">
            {this.renderButtons()}
            {this.renderNotification()}
          </div>
        </form>
    );
  },

  renderInputs: function() {
    return _.map(this.formInputs, this.renderInput);
  },

  renderInput: function(input) {
    var name = input.name;
    var value = this.state.formValues[name];

    if (name === 'isOtherPerson') {
      value = this.state.formValues.isOtherPerson ? 'yes' : 'no';
    }

    if (input.type === 'datepicker') {
      return this.renderDatePicker(input);
    }

    return (
      <div key={name} className={'PatientNew-inputGroup PatientNew-inputGroup--' + name}>
        <InputGroup
          name={name}
          label={input.label}
          value={value}
          items={input.items}
          error={this.state.validationErrors[name]}
          type={input.type}
          placeholder={input.placeholder}
          onChange={this.handleInputChange}/>
      </div>
    );
  },

  renderDatePicker: function(input) {
    var name = input.name;
    var classes = 'PatientNew-datePicker PatientNew-inputGroup PatientNew-inputGroup--' + name;
    var error = this.state.validationErrors[name];
    var message;
    if (error) {
      classes = classes + ' PatientNew-datePicker--error';
      message = <div className="PatientNew-datePickerMessage">{error}</div>;
    }

    return (
      <div key={name} className={classes}>
        <div>
          <label className="PatientNew-datePickerLabel">{input.label}</label>
          <DatePicker
            name={name}
            value={this.state.formValues[name]}
            onChange={this.handleInputChange} />
        </div>
        {message}
      </div>
    );
  },

  renderButtons: function() {
    return (
      <div>
        <a href="#/" className="btn btn-secondary PatientNew-cancel">Cancel</a>
        <button
          className="btn btn-primary PatientNew-submit"
          onClick={this.handleSubmit}
          disabled={this.state.working}>
          {this.getSubmitButtonText()}
        </button>
      </div>
    );
  },

  renderNotification: function() {
    var notification = this.state.notification;
    if (notification && notification.message) {
      var type = notification.type || 'alert';
      return (
        <div className={'PatientNew-notification PatientNew-notification--' + type}>
          {notification.message}
        </div>
      );
    }
    return null;
  },

  getSubmitButtonText: function() {
    if (this.state.working) {
      return 'Setting up...';
    }
    return 'Set up';
  },

  handleInputChange: function(attributes) {
    var key = attributes.name;
    var value = attributes.value;
    if (!key) {
      return;
    }

    var formValues = _.clone(this.state.formValues);
    if (key === 'isOtherPerson') {
      var isOtherPerson = (attributes.value === 'yes') ? true : false;
      var fullName = isOtherPerson ? '' : this.getUserFullName();
      formValues = _.assign(formValues, {
        isOtherPerson: isOtherPerson,
        fullName: fullName
      });
    }
    else {
      formValues[key] = value;
    }

    this.setState({formValues: formValues});
  },

  handleSubmit: function(e) {
    if (e) {
      e.preventDefault();
    }

    var formValues = this.state.formValues;

    this.resetFormStateBeforeSubmit(formValues);

    formValues = this.prepareFormValuesForValidation(formValues);

    var validationErrors = this.validateFormValues(formValues);
    if (!_.isEmpty(validationErrors)) {
      return;
    }

    formValues = this.prepareFormValuesForSubmit(formValues);

    this.submitFormValues(formValues);
  },

  resetFormStateBeforeSubmit: function(formValues) {
    this.setState({
      working: true,
      formValues: formValues,
      validationErrors: {},
      notification: null
    });
  },

  prepareFormValuesForValidation: function(formValues) {
    formValues = _.clone(formValues);

    if (this.isDateObjectComplete(formValues.birthday)) {
      formValues.birthday = moment(formValues.birthday)
        .format(MODEL_DATE_FORMAT);
    }
    else {
      formValues.birthday = null;
    }

    if (this.isDateObjectComplete(formValues.diagnosisDate)) {
      formValues.diagnosisDate = moment(formValues.diagnosisDate)
        .format(MODEL_DATE_FORMAT);
    }
    else {
      formValues.diagnosisDate = null;
    }

    if (!formValues.about) {
      formValues = _.omit(formValues, 'about');
    }

    return formValues;
  },

  isDateObjectComplete: function(dateObj) {
    if (!dateObj) {
      return false;
    }
    return !(_.isEmpty(dateObj.year) || _.isEmpty(dateObj.month) || _.isEmpty(dateObj.day));
  },

  validateFormValues: function(formValues) {
    var validationErrors = {};
    var IS_REQUIRED = 'We need this information.';
    var IS_NOT_VALID_DATE = 'Hmm, this date doesn\'t look right.';

    if (!formValues.fullName) {
      validationErrors.fullName = IS_REQUIRED;
    }

    if (!formValues.birthday) {
      validationErrors.birthday = IS_REQUIRED;
    }
    else if (!datetimeUtils.isValidDate(formValues.birthday)) {
      validationErrors.birthday = IS_NOT_VALID_DATE;
    }

    if (!formValues.diagnosisDate) {
      validationErrors.diagnosisDate = IS_REQUIRED;
    }
    else if (!datetimeUtils.isValidDate(formValues.diagnosisDate)) {
      validationErrors.diagnosisDate = IS_NOT_VALID_DATE;
    }

    var maxLength = 256;
    if (formValues.about && formValues.about.length > maxLength) {
      validationErrors.about =
        'Please keep this text under ' + maxLength + ' characters.';
    }

    if (!_.isEmpty(validationErrors)) {
      this.setState({
        working: false,
        validationErrors: validationErrors
      });
    }

    return validationErrors;
  },

  prepareFormValuesForSubmit: function(formValues) {
    var profile = {};
    var patient = {
      birthday: formValues.birthday,
      diagnosisDate: formValues.diagnosisDate
    };

    if (formValues.about) {
      patient.about = formValues.about;
    }

    if (formValues.isOtherPerson) {
      profile.fullName = this.getUserFullName();
      patient.isOtherPerson = true;
      patient.fullName = formValues.fullName;
    }
    else {
      profile.fullName = formValues.fullName;
    }

    profile.patient = patient;

    return {profile: profile};
  },

  submitFormValues: function(formValues) {
    GroupActions.create(formValues);
  },

  handleCreationSuccess: function() {
    this.transitionTo('patient-data', {patientId: this.state.user.userid});
    trackMetric('Created Profile');
  }
});

module.exports = PatientNew;
