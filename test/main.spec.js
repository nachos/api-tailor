'use strict';

var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var mockery = require('mockery');
var Q = require('q');

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

describe('api-tailor', function () {
  describe('without configuration', function () {
    var apiTailor = require('../lib');

    it('should throw TypeError', function () {
      var fn = function () {
        apiTailor();
      };

      expect(fn).to.throw(TypeError, 'Config object cannot be empty');
    });
  });

  describe('with invalid configuration', function () {
    var apiTailor = require('../lib');

    it('should throw TypeError - no resource property', function () {
      var fn = function () {
        apiTailor({host: 'nothing'});
      };

      expect(fn).to.throw(TypeError, 'Config object must contain resources');
    });

    it('should throw TypeError - no host property', function () {
      var fn = function () {
        apiTailor({resources: 'nothing'});
      };

      expect(fn).to.throw(TypeError, 'Config object must contain a host');
    });
  });

  describe('with valid configuration', function () {
    var goodConfigObject = {
      host: 'http://www.nachosaddress.com/api',
      resources: {
        data: {
          get: {
            method: 'GET',
            path: '/'
          }
        }
      }
    };

    describe('exports', function () {
      it('should return an object that contains the section, the method as a function, and an inject function', function () {
        var apiTailor = require('../lib');
        var api = apiTailor(goodConfigObject);

        expect(api).to.not.be.empty;
        expect(api.data).to.not.be.empty;
        expect(api.data.get).to.be.a('function');
        expect(api.inject).to.be.a('function');
      });
    });

    describe('action', function () {
      var apiTailor;

      describe('with request error', function () {
        before(function () {
          var requestStub = sinon.stub().yields(new Error('Error number 43'));

          mockery.registerMock('request', requestStub);

          mockery.enable({
            useCleanCache: true,
            warnOnReplace: false,
            warnOnUnregistered: false
          });

          apiTailor = require('../lib');
        });

        after(function () {
          mockery.deregisterMock('request');
          mockery.disable();
        });

        it('should reject', function () {
          var api = apiTailor(goodConfigObject);

          return expect(api.data.get()).to.be.rejected;
        });
      });

      describe('with an invalid address', function () {
        before(function () {
          var requestStub = sinon.stub().yields(null, {statusCode: 500}, null);

          mockery.registerMock('request', requestStub);

          mockery.enable({
            useCleanCache: true,
            warnOnReplace: false,
            warnOnUnregistered: false
          });

          apiTailor = require('../lib');
        });

        after(function () {
          mockery.deregisterMock('request');
          mockery.disable();
        });

        it('should reject', function () {
          var api = apiTailor(goodConfigObject);

          return expect(api.data.get()).to.be.rejected;
        });
      });

      describe('when server returns error', function () {
        before(function () {
          var requestStub = sinon.stub().yields(null, {statusCode: 500}, null);

          mockery.registerMock('request', requestStub);

          mockery.enable({
            useCleanCache: true,
            warnOnReplace: false,
            warnOnUnregistered: false
          });

          apiTailor = require('../lib');
        });

        after(function () {
          mockery.deregisterMock('request');
          mockery.disable();
        });

        it('should reject when server returns status code error', function () {
          var api = apiTailor(goodConfigObject);

          return expect(api.data.get()).to.be.rejectedWith({
            response: {
              statusCode: 500
            },
            body: null
          });
        });
      });

      describe('with valid request', function () {
        var paramConfig = {
          host: 'http://www.nachosaddress.com/api/',
          resources: {
            data: {
              get: {
                method: 'GET',
                path: '/:test'
              }
            }
          }
        };
        var requestStub;

        before(function () {
          requestStub = sinon.stub().yields(null, {statusCode: 201}, JSON.stringify({test: 'data'}));
          mockery.registerMock('request', requestStub);

          mockery.enable({
            useCleanCache: true,
            warnOnReplace: false,
            warnOnUnregistered: false
          });

          apiTailor = require('../lib');
        });

        after(function () {
          mockery.deregisterMock('request');
          mockery.disable();
        });

        it('should replace params in the address', function () {
          var api = apiTailor(paramConfig);

          return api.data.get({}, {test: 'a'})
            .then(function () {
              expect(requestStub).to.have.been.calledWith({
                json: {},
                uri: 'http://www.nachosaddress.com/api/data/a',
                method: 'GET'
              });
            });
        });

        it('should reject when request interceptor fails', function () {
          var api = apiTailor(goodConfigObject);

          api.inject({
            request: function () {
              return Q.reject('This means something wrong happened when intercepting the request');
            }
          });

          return expect(api.data.get()).to.be.rejectedWith('This means something wrong happened when intercepting the request');
        });

        it('should reject when response interceptor fails', function () {
          var api = apiTailor(goodConfigObject);

          api.inject({
            response: function () {
              return Q.reject('This means something wrong happened when intercepting the response');
            }
          });

          return expect(api.data.get()).to.be.rejectedWith('This means something wrong happened when intercepting the response');
        });

        it('should return the proper body object of the message', function () {
          var api = apiTailor(goodConfigObject);

          return expect(api.data.get()).eventually.to.equal(JSON.stringify({test: 'data'}));
        });
      });

      describe('with stream request', function () {
        var streamConfig = {
          host: 'http://www.nachosaddress.com/api/',
          resources: {
            data: {
              post: {
                method: 'POST',
                path: '/',
                data: 'form',
                stream: true
              }
            }
          }
        };
        var requestStub;

        before(function () {
          requestStub = function () {
            return {
              on: function (s, fn) {
                fn({statusCode: 200});

                return {
                  pipe: function () {
                  }
                };
              }
            };
          };

          mockery.registerMock('request', requestStub);

          mockery.enable({
            useCleanCache: true,
            warnOnReplace: false,
            warnOnUnregistered: false
          });

          apiTailor = require('../lib');
        });

        after(function () {
          mockery.deregisterMock('request');
          mockery.disable();
        });

        it('should accept formData', function () {
          var api = apiTailor(streamConfig);

          return expect(api.data.post({test: 'test'})).eventually.to.have.property('pipe');
        });

        it('should return stream', function () {
          var api = apiTailor(streamConfig);

          return expect(api.data.post()).eventually.to.have.property('pipe');
        });
      });
    });

    describe('inject function', function () {
      var apiTailor;

      before(function () {
        mockery.registerMock('request', sinon.stub().yields(null, {statusCode: 200}, null));
        apiTailor = require('../lib');
      });

      after(function () {
        mockery.deregisterMock('request');
      });

      it('should not accept an empty interceptor', function () {
        var injectApi = apiTailor(goodConfigObject);
        var fn = function () {
          injectApi.inject();
        };

        expect(fn).to.throw(TypeError, 'This is not a valid interceptor, it must contain request or response function');
      });

      it('should not accept an interceptor without a function', function () {
        var injectApi = apiTailor(goodConfigObject);
        var fn = function () {
          injectApi.inject({request: 'failThisFunction'});
        };

        expect(fn).to.throw(TypeError, 'This is not a valid interceptor, it must contain request or response function');
      });

      it('should accept only a request function', function () {
        var injectApi = apiTailor(goodConfigObject);
        var fn = function () {
          injectApi.inject({
            request: function () {
            }
          });
        };

        expect(fn).to.not.throw(TypeError);
      });

      it('should accept only a response function', function () {
        var injectApi = apiTailor(goodConfigObject);
        var fn = function () {
          injectApi.inject({
            response: function () {
            }
          });
        };

        expect(fn).to.not.throw(TypeError);
      });
    });
  });
})
;
