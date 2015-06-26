'use strict';

var chai = require('chai');
var expect = chai.expect;
var apiTailor = require('../lib');
var sinon = require('sinon');
var mockery = require('mockery');

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
mockery.enable({ useCleanCache: true,
  warnOnReplace: false,
  warnOnUnregistered: false});

describe('api-tailor', function () {
  describe('With invalid configuration', function () {
    it('Should reject no configuration', function () {
      var fn = function () {
        apiTailor();
      };

      expect(fn).to.throw(TypeError, 'Config object cannot be empty');
    });

    it('Should reject no resource property', function () {
      var fn = function () {
        apiTailor({ host: 'nothing' });
      };

      expect(fn).to.throw(TypeError, 'Config object must contain resources');
    });

    it('Should reject no host property', function () {
      var fn = function () {
        apiTailor({ resources: 'nothing' });
      };

      expect(fn).to.throw(TypeError, 'Config object must contain a host');
    });
  });

  describe('With proper configuration', function () {
    var goodConfigObject = { host: 'http://www.nachosaddress.com/api', resources: { data: { get: { method: 'GET', path: '/'} } } };

    describe('Injection function', function () {
      it('Should not accept an empty interceptor', function () {
        var injectApi = apiTailor(goodConfigObject);
        var fn = function () {
          injectApi.inject();
        };

        expect(fn).to.throw(TypeError, 'This is not a valid interceptor, it must contain request or response function');
      });

      it('Should not accept an interceptor without a function', function () {
        var injectApi = apiTailor(goodConfigObject);
        var fn = function () {
          injectApi.inject({ request: 'failThisFunction' });
        };

        expect(fn).to.throw(TypeError, 'This is not a valid interceptor, it must contain request or response function');
      });

      it('Should accept only a request function', function () {
        var injectApi = apiTailor(goodConfigObject);
        var fn = function () {
          injectApi.inject({ request: function () {
          } });
        };

        expect(fn).to.not.throw(TypeError);
      });

      it('Should accept only a response function', function () {
        var injectApi = apiTailor(goodConfigObject);
        var fn = function () {
          injectApi.inject({ response: function () {
          } });
        };

        expect(fn).to.not.throw(TypeError);
      });
    });

    it('Should return an object that contains the section, the method as a function, and an inject function', function () {
      var api = apiTailor(goodConfigObject);

      expect(api).to.not.be.empty;
      expect(api.data).to.not.be.empty;
      expect(api.data.get).to.be.a('function');
      expect(api.inject).to.be.a('function');
    });

    it('Should replace params in the address', function (done) {
      var paramConfig = { host: 'http://www.nachosaddress.com/api/', resources: { data: { get: { method: 'GET', path: '/:test'} } } };
      var api = apiTailor(paramConfig);

      var requestStub = sinon.stub().yields(null, { statusCode: 201 }, JSON.stringify({ test: 'data' }));

      mockery.registerMock('request', requestStub);
      api.data.get({ test: 'a' }).then(function () {
        mockery.deregisterMock('request');
        expect(requestStub).to.have.been.calledWith({ json: undefined, uri: 'http://www.nachosaddress.com/api/data/a', method: 'GET' });
        done();
      });
    });

    it('Should reject for non-existent address', function () {
      var api = apiTailor(goodConfigObject);

      return expect(api.data.get()).to.be.rejected;
    });

    it('Should reject when request interceptor fails', function () {
      var api = apiTailor(goodConfigObject);

      api.inject({ request: function (requestObject, cb) {
        cb('This means something wrong happened when intercepting the request', requestObject);
      }});

      return expect(api.data.get()).to.be.rejectedWith('This means something wrong happened when intercepting the request');
    });

    describe('When request passes', function () {
      before(function () {
        mockery.registerMock('request', sinon.stub().yields(null, { statusCode: 201 }, JSON.stringify({ test: 'data' })));
      });

      after(function () {
        mockery.deregisterMock('request');
      });

      it('Should reject when response interceptor fails', function () {
        var api = apiTailor(goodConfigObject);

        api.inject({ response: function (requestObject, cb) {
          cb('This means something wrong happened when intercepting the response', requestObject);
        }});

        return expect(api.data.get()).to.be.rejectedWith('This means something wrong happened when intercepting the response');
      });

      it('Should return the proper body object of the message', function () {
        var api = apiTailor(goodConfigObject);

        return expect(api.data.get()).eventually.to.equal(JSON.stringify({ test: 'data' }));
      });
    });

    describe('When request returns status code error', function () {
      before(function () {
        mockery.registerMock('request', sinon.stub().yields(null, { statusCode: 401 }, null));
      });

      after(function () {
        mockery.deregisterMock('request');
      });

      it('Should reject when invoked', function () {
        var api = apiTailor(goodConfigObject);

        return expect(api.data.get()).to.be.rejectedWith(JSON.stringify({response: { statusCode: 401 }, body: null}));
      });
    });
  });
});
