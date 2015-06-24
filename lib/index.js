'use strict';

var request = require('request');
var urljoin = require('url-join');
var _ = require('lodash');
var async = require('async');
var debug = require('debug')('api:tailor');

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

  debug('creating api-tailor with following configuration: %s', config);
  var interceptors = [];
  var api = _.mapValues(config.resources, function (routes, key) {
    return _.mapValues(routes, function (route) {
      return function (params, data, cb) {
        if (typeof params === 'function') {
          cb = params;
          params = {};
          data = {};
        }

        else if (typeof data === 'function') {
          cb = data;
          data = {};
        }

        cb = cb || _.noop;

        var routePath = route.path;

        _.forEach(params, function (value, key) {
          routePath = routePath.replace(':' + key, value);
        });

        var requestObject = {
          uri: urljoin(config.host, key, routePath),
          method: route.method,
          json: data
        };

        var requests = [
          function (cb) {
            cb(null, requestObject);
          }
        ].concat(_.pluck(_.filter(interceptors, 'request'), 'request'));

        async.waterfall(requests, function (err, interceptedRequest) {
          if (err) {
            return cb(err);
          }

          request(interceptedRequest, function (err, response, body) {
            if (err) {
              return cb(err);
            }

            var responseObject = {response: response, body: body};

            var responses = [
              function (cb) {
                cb(null, responseObject);
              }
            ].concat(_.pluck(_.filter(interceptors, 'response'), 'response'));

            async.waterfall(responses, function (err, interceptedResponse) {
              if (err) {
                return cb(err);
              }

              if (interceptedResponse.response.statusCode >= 400) {
                return cb(responseObject);
              }

              cb(null, interceptedResponse.body);
            });

            interceptors.shift();
          });
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
      debug('added the interceptor');
    }
  });
};