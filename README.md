# api-tailor

A tool to swiftly tailor a fitting api

<table>
  <thead>
    <tr>
      <th>Linux</th>
      <th>OSX</th>
      <th>Windows</th>
      <th>Coverage</th>
      <th>Dependencies</th>
      <th>DevDependencies</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td colspan="2" align="center">
        <a href="https://travis-ci.org/nachos/api-tailor"><img src="https://img.shields.io/travis/nachos/api-tailor.svg?style=flat-square"></a>
      </td>
      <td align="center">
        <a href="https://ci.appveyor.com/project/nachos/api-tailor"><img src="https://img.shields.io/appveyor/ci/nachos/api-tailor.svg?style=flat-square"></a>
      </td>
      <td align="center">
<a href='https://coveralls.io/r/nachos/api-tailor'><img src='https://img.shields.io/coveralls/nachos/api-tailor.svg?style=flat-square' alt='Coverage Status' /></a>
      </td>
      <td align="center">
        <a href="https://david-dm.org/nachos/api-tailor"><img src="https://img.shields.io/david/nachos/api-tailor.svg?style=flat-square"></a>
      </td>
      <td align="center">
        <a href="https://david-dm.org/nachos/api-tailor#info=devDependencies"><img src="https://img.shields.io/david/dev/nachos/api-tailor.svg?style=flat-square"/></a>
      </td>
    </tr>
  </tbody>
</table>

## Have a problem? Come chat with us!
[![Join the chat at https://gitter.im/nachos/api-tailor](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/nachos/api-tailor?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## Installation
``` bash
$ [sudo] npm install api-tailor --save
```

## Examples
``` js
var tailor = require('api-tailor');

var client = tailor({
    host: 'http://yourserver.com/api',
    resources: {
      customers: {
        all: {
          method: 'GET',
          path: '/'
        },
        add: {
          method: 'POST',
          path: '/'
        },
        byName: {
          method: 'GET',
          path: '/:name' // url parameter
        },
        downloadLog: {
          method: 'GET',
          path: '/log',
          stream: true // response will return as stream
        },
        uploadLog: {
          method: 'POST',
          path: '/log',
          data: 'form' // data given will be treated as form data
        }
      }
    }
  });

client.customers.all()
  .then(function(customers) {
    // customers -> all data from get request to http://yourserver.com/api/customers/all
  });
  
client.customers.add({ name: 'nacho', address: 'nachos home 25, dip mountain, taco-ville' })
  .then(function() {
    // -> post request to http://yourserver.com/api/customers/
  });
  
client.customers.byName({}, { name: 'nacho' })
  .then(function(customer) {
    // customer -> get request to http://yourserver.com/api/customers/nacho
  });
  
client.customers.downloadLog()
  .then(function(stream) {
    stream.pipe(process.stdout); // stream -> get request to http://yourserver.com/api/customers/log
  });
  
client.customers.uploadLog({file: fs.createReadStream('file.txt')})
  .then(function() {
    // -> post request to http://yourserver.com/api/customers/log
  });
```

### Injectors
Use injectors to intercept outgoing or incoming data and manpulate it.

#### Token Injector Example
```js
  var token;

  client.inject({
    request: function (request) {
      request.headers = request.headers || {};

      if (token) {
        request.headers.Authorization = 'Bearer ' + token;
      }

      return Q.resolve(request);
    }
  });
```

## Run Tests
``` bash
$ npm test
```

## License

[MIT](LICENSE)

<sub><sup>*we never go out of style*</sup></sub>
