/** @jsx React.DOM */
/* global chai */
/* global sinon */

var React = require('react');
var TestUtils = require('react/lib/ReactTestUtils');
var expect = chai.expect;

// Need to add this line as app.js includes config 
// which errors if window.config does not exist
window.config = {};
var api = require('../../../app/core/api');
var personUtils = require('../../../app/core/personutils');
var router = require('../../../app/router');
var mock = require('../../../mock');

var App = require('../../../app/components/app');


describe('App', function () {
  var context = {
    log: sinon.stub(),
    api: mock.patchApi(api),
    personUtils: personUtils,
    router: router,
    DEBUG: false,
    trackMetric: sinon.stub()
  };

  describe('render', function() {
    it('should render without problems', function () {
      console.warn = sinon.stub();
      console.error = sinon.stub();
      React.withContext(context, function() {
        var elem = TestUtils.renderIntoDocument(<App/>);
        expect(elem).to.be.ok;
        expect(console.warn.callCount).to.equal(0);
        expect(console.error.callCount).to.equal(0);
      });
    });

    it('authenticated state should be false on boot', function () {
      React.withContext(context, function() {
        var elem = TestUtils.renderIntoDocument(<App/>);
        expect(elem.state.authenticated).to.equal(false);
      });
    });

    it('should render login form', function () {
      React.withContext(context, function() {
        var elem = TestUtils.renderIntoDocument(<App/>);
        var form = TestUtils.findRenderedDOMComponentWithClass(elem, 'login-simpleform');
        expect(form).to.be.ok;
      });
    });

    it('should render footer', function () {
      React.withContext(context, function() {
        var elem = TestUtils.renderIntoDocument(<App/>);
        var footer = TestUtils.findRenderedDOMComponentWithClass(elem, 'footer');
        expect(footer).to.be.ok;
      });
    });

    it('should not render a version element when version not set in config', function () {
      React.withContext(context, function() {
        var elem = TestUtils.renderIntoDocument(<App/>);
        var footer = TestUtils.findRenderedDOMComponentWithClass(elem, 'footer');
        var versionElems = TestUtils.scryRenderedDOMComponentsWithClass(footer, 'Navbar-version');
        expect(versionElems.length).to.equal(0);
      });
    });

    it('should render version when version present in config', function () {
      React.withContext(context, function() {
        window.config.VERSION = 1.4;
        var elem = TestUtils.renderIntoDocument(<App/>);
        var footer = TestUtils.findRenderedDOMComponentWithClass(elem, 'footer');
        var version = TestUtils.findRenderedDOMComponentWithClass(footer, 'Navbar-version');
        expect(version).to.be.ok;
      });
    });
  });
});