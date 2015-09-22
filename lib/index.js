'use strict';

var request = require('request');
var pathToRegexp = require('path-to-regexp');
var urljoin = require('url-join');
var _ = require('lodash');
var debug = require('debug')('apiTailor');
var Q = require('q');

/**
 * Generate a client object from the given config
 *
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

  debug('creating api-tailor with following configuration: %j', config);

  var interceptors = [];
  var api = _.mapValues(config.resources, function (routes, key) {
    return _.mapValues(routes, function (route) {
      return function (data, params) {
        debug('starting action with args: %j', arguments);
        var toPath = pathToRegexp.compile(route.path);
        var routePath = toPath(params || {});

        var requestObject = {
          uri: urljoin(config.host, key, routePath),
          method: route.method
        };

        requestObject[route.data === 'form' ? 'formData' : 'json'] = data;

        var requests = _.pluck(_.filter(interceptors, 'request'), 'request');

        debug('created the request object: %j', requestObject);

        return requests.reduce(Q.when, Q.resolve(requestObject))
          .then(function (interceptedRequest) {
            var deferred = Q.defer();
            var responses = _.pluck(_.filter(interceptors, 'response'), 'response');

            var handleResponse = function (responseObject) {
              return responses.reduce(Q.when, Q.resolve(responseObject))
                .then(function (interceptedResponse) {
                  if (interceptedResponse.response.statusCode >= 400) {
                    debug('Request failed with error code %s', interceptedResponse.response.statusCode);

                    deferred.reject(responseObject);

                    return;
                  }

                  return interceptedResponse;
                }).catch(function (err) {
                  deferred.reject(err);
                });
            };

            if (route.stream) {
              debug('handle stream route');

              var stream = request(interceptedRequest)
                .on('response', function (response) {
                  var responseObject = {response: response};

                  debug('got stream response: %j', responseObject);

                  handleResponse(responseObject)
                    .then(function () {
                      debug('Done, returning %j', stream);
                      deferred.resolve(stream);
                    });
                });
            }
            else {
              request(interceptedRequest, function (err, response, body) {
                if (err) {
                  return deferred.reject(err);
                }

                var responseObject = {
                  response: response,
                  body: body
                };

                handleResponse(responseObject)
                  .then(function (interceptedResponse) {
                    debug('Done, returning %j', interceptedResponse.body);
                    deferred.resolve(interceptedResponse.body);
                  });
              });
            }

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