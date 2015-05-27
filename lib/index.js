'use strict';

var request = require('request');
var urljoin = require('url-join');
var _ = require('lodash');

module.exports = function (config) {
  return _.mapValues(config.resources, function (routes, key) {
    return _.mapValues(routes, function(route){
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

        _.forEach(params, function(value, key) {
          routePath = routePath.replace(':'+key, value);
        });

        request({
          uri: urljoin(config.host, key, routePath),
          method: route.method,
          json: data
        }, function (err, response, body) {
          if (err) {
            return cb(err);
          }
          else if (response.statusCode !== 200) {
            return cb({response: response, body: body});
          }

          cb(null, body);
        });
      };
    });
  });
};