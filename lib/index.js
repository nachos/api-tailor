'use strict';

var urljoin = require('url-join');
var _ = require('lodash');
var async = require('async');
var debug = require('debug')('apiTailor');
var Q = require('q');

module.exports = function (config) {
  if (!config) {
    throw new TypeError('Config object cannot be empty');
  }

  if (!config.resources) {
    throw new TypeError('Config object must contain resources');
  }

  if (!config.host) {
    throw new TypeError('Config object must contain a host');
  }

  debug('creating api-tailor with following configuration: %s', JSON.stringify(config));
  var interceptors = [];
  var api = _.mapValues(config.resources, function (routes, key) {
    return _.mapValues(routes, function (route) {
      return function (params, data) {
        var deferred = Q.defer();
        var routePath = route.path;

        _.forEach(params, function (value, key) {
          routePath = routePath.replace(':' + key, value);
        });

        var requestObject = {
          uri: urljoin(config.host, key, routePath),
          method: route.method,
          json: data
        };

        debug('Created the request object: %s', JSON.stringify(requestObject));

        var requests = [
          function (cb) {
            cb(null, requestObject);
          }
        ].concat(_.pluck(_.filter(interceptors, 'request'), 'request'));

        async.waterfall(requests, function (err, interceptedRequest) {
          if (err) {
            return deferred.reject(err);
          }

          var request = require('request');

          request(interceptedRequest, function (err, response, body) {
            if (err) {
              return deferred.reject(err);
            }

            var responseObject = {response: response, body: body};

            var responses = [
              function (cb) {
                cb(null, responseObject);
              }
            ].concat(_.pluck(_.filter(interceptors, 'response'), 'response'));

            async.waterfall(responses, function (err, interceptedResponse) {
              if (err) {
                return deferred.reject(err);
              }

              if (interceptedResponse.response.statusCode >= 400) {
                debug('Request failed with error code %s', interceptedResponse.response.statusCode);

                return deferred.reject(JSON.stringify(responseObject));
              }

              debug('Done, returning %s', interceptedResponse. body);
              deferred.resolve(interceptedResponse.body);
            });

            interceptors.shift();
          });
        });

        return deferred.promise;
      };
    });
  });

  return _.merge(api, {
    inject: function (interceptor) {
      if (!interceptor || ((!interceptor.request || !_.isFunction(interceptor.request)) && (!interceptor.response || !_.isFunction(interceptor.response)))) {
        throw new TypeError('This is not a valid interceptor, it must contain request or response function');
      }

      interceptors.push(interceptor);
      debug('added the interceptor');
    }
  });
};