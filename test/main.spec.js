'use strict';

var chai = require('chai');
var expect = chai.expect;
var apiTailor = require('../lib');
var sinon = require('sinon');
var mockery = require('mockery');
var Q = require('q');

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

    it('Should return an object that contains the section, the method as a function, and an inject function', function () {
      var api = apiTailor(goodConfigObject);

      expect(api).to.not.be.empty;
      expect(api.data).to.not.be.empty;
      expect(api.data.get).to.be.a('function');
      expect(api.inject).to.be.a('function');
    });

    describe('get', function () {
      describe('with non existing address', function () {
        it('Should reject', function () {
          var api = apiTailor(goodConfigObject);

          return expect(api.data.get()).to.be.rejected;
        });
      });

      describe('when server returns error', function () {
        beforeEach(function () {
          mockery.registerMock('request', sinon.stub().yields(null, { statusCode: 500 }, null));
        });

        afterEach(function () {
          mockery.deregisterMock('request');
        });

        it('Should reject when server returns status code error', function () {
          var api = apiTailor(goodConfigObject);

          return expect(api.data.get()).to.be.rejectedWith(JSON.stringify({response: { statusCode: 500 }, body: null}));
        });
      });

      describe('with valid request', function () {
        var paramConfig = { host: 'http://www.nachosaddress.com/api/', resources: { data: { get: { method: 'GET', path: '/:test'} } } };
        var requestStub;

        before(function () {
          requestStub = sinon.stub().yields(null, { statusCode: 201 }, JSON.stringify({ test: 'data' }));
          mockery.registerMock('request', requestStub);
        });

        after(function () {
          mockery.deregisterMock('request');
        });

        it('Should replace params in the address', function (done) {
          var api = apiTailor(paramConfig);

          api.data.get({ test: 'a' }).then(function () {
            expect(requestStub).to.have.been.calledWith({ json: undefined, uri: 'http://www.nachosaddress.com/api/data/a', method: 'GET' });
            done();
          });
        });

        it('Should reject when request interceptor fails', function () {
          var api = apiTailor(goodConfigObject);

          api.inject({ request: function () {
            return Q.reject('This means something wrong happened when intercepting the request');
          }});

          return expect(api.data.get()).to.be.rejectedWith('This means something wrong happened when intercepting the request');
        });

        it('Should reject when response interceptor fails', function () {
          var api = apiTailor(goodConfigObject);

          api.inject({ response: function () {
            return Q.reject('This means something wrong happened when intercepting the response');
          }});

          return expect(api.data.get()).to.be.rejectedWith('This means something wrong happened when intercepting the response');
        });

        it('Should return the proper body object of the message', function () {
          var api = apiTailor(goodConfigObject);

          return expect(api.data.get()).eventually.to.equal(JSON.stringify({ test: 'data' }));
        });
      });
    });

    describe('Inject function', function () {
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
          }});
        };

        expect(fn).to.not.throw(TypeError);
      });

      it('Should accept only a response function', function () {
        var injectApi = apiTailor(goodConfigObject);
        var fn = function () {
          injectApi.inject({ response: function () {
          }});
        };

        expect(fn).to.not.throw(TypeError);
      });
    });
  });
});
