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
        <a href="https://ci.appveyor.com/project/noamokman/api-tailor"><img src="https://img.shields.io/appveyor/ci/nachos/api-tailor.svg?style=flat-square"></a>
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
        byName: {
          method: 'GET',
          path: '/:name'
        }
      }
    }
  });


client.customers.all(); -> get request to http://yourserver.com/api/customers/all
client.customers.byName({ name: 'nacho' }) -> get request to http://yourserver.com/api/customers/nacho
```

## Run Tests
``` bash
  $ npm test
```

## License

[MIT](LICENSE)

<sub><sup>*we never go out of style*</sup></sub>
