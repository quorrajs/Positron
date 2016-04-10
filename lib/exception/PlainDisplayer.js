/**
 * PlainDisplayer.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var fs = require('fs');
var path = require('path');
function PlainDisplayer() {
}

PlainDisplayer.prototype.handleException = function (error, request, response) {
    fs.readFile(path.join(__dirname, 'resources/plain.html'), 'utf-8', function (err, html) {
        if (err) throw err;

        var code = (!error.status || error.status < 400) ? 500 : error.status;
        response.setHeader("Content-Type", "text/html");
        response.writeHead(code);
        response.end(html);
    });
};

module.exports = PlainDisplayer;