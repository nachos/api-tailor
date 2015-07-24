'use strict';

var urljoin = require('url-join');
var _ = require('lodash');
var debug = require('debug')('apiTailor');
var Q = require('q');

/**
 * Generate a client object from the given config
 * @param {object} config - the entire data about the api, including the host and resources
 * @returns {object} a client object with all resources as functions
 */
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
        var routePath = route.path;

        _.forEach(params, function (value, key) {
          routePath = routePath.replace(':' + key, value);
        });

        var requestObject = {
          uri: urljoin(config.host, key, routePath),
          method: route.method,
          json: data
        };
        var requests = _.pluck(_.filter(interceptors, 'request'), 'request');

        debug('Created the request object: %s', JSON.stringify(requestObject));

        return requests.reduce(Q.when, Q.resolve(requestObject)).then(function (interceptedRequest) {
          var deferred = Q.defer();
          var request = require('request');

          request(interceptedRequest, function (err, response, body) {
            if (err) {
              return deferred.reject(err);
            }

            var responseObject = {response: response, body: body};
            var responses = _.pluck(_.filter(interceptors, 'response'), 'response');

            responses.reduce(Q.when, Q.resolve(responseObject)).then(function (interceptedResponse) {
              if (interceptedResponse.response.statusCode >= 400) {
                debug('Request failed with error code %s', interceptedResponse.response.statusCode);

                return deferred.reject(JSON.stringify(responseObject));
              }

              debug('Done, returning %j', interceptedResponse.body);
              deferred.resolve(interceptedResponse.body);
            }).catch(function (err) {
              return deferred.reject(err);
            });
          });

          return deferred.promise;
        });
      };
    });
  });

  return _.merge(api, {
    inject: function (interceptor) {
      if (!interceptor || ((!interceptor.request || !_.isFunction(interceptor.request)) && (!interceptor.response || !_.isFunction(interceptor.response)))) {
        throw new TypeError('This is not a valid interceptor, it must contain request or response function');
      }

      interceptors.push(interceptor);
    }
  });
};