/**
 * writer.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var winston = require('winston');

function logger() {
    var log = new (winston.Logger)();
    log.__proto__ = prototype;
    return log;
}

var prototype = {
    __proto__: winston.Logger.prototype
};

/**
 * Register a file log handler.
 *
 * @param  {Object}  options
 */
prototype.useFiles = function (options) {
    this.add(winston.transports.File, options);
};

/**
 * Register a daily file log handler.
 *
 * @param  {Object}  options
 */
prototype.useDailyFiles = function (options) {
    this.add(winston.transports.DailyRotateFile, options);
};

/**
 * Register a mongo db log handler.
 *
 * @param  {Object}  options
 */
prototype.useMongoDB = function (options) {
    this.add(require('winston-mongodb').MongoDB, options);
};

/**
 * Register a mail log handler.
 *
 * @param  {Object}  options
 */
prototype.useMail = function (options) {
    this.add(require('winston-mail').Mail, options);
};

/**
 * Register a console log handler.
 *
 * @param  {Object}  options
 */
prototype.useConsole = function (options) {
    this.add(winston.transports.Console, options);
};

module.exports = logger;