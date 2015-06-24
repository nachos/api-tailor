'use strict';

var expect = require('chai').expect;
var apiTailor = require('../lib');

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
  });
});
