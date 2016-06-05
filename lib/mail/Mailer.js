/**
 * Mailer.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var str = require('../support/str');
var async = require('async');
var _ = require('lodash');

function Mailer(transporter) {

    /**
     * The view factory instance.
     *
     * @protected
     */
    this.__views;

    /**
     * The Node Mailer instance.
     *
     * @protected
     */
    this.__transporter = transporter;

}

/**
 * Set the view service implementation.
 *
 * @param views
 */
Mailer.prototype.setViewService = function (views) {
    this.__views = views;
};

/**
 * Send a new message when only a plain part.
 *
 * @param  {string}  view
 * @param  {object}   data
 * @param  {object}   options
 * @param  {function}   callback
 */
Mailer.prototype.plain = function (view, data, options, callback) {
    this.send({'text': view}, data, options, callback);
};

/**
 * Send a new message using a view.
 *
 * @param  {String|Array}  view
 * @param  {object}  data
 * @param  {object}  options
 * @param  {function} callback
 * @return void
 */
Mailer.prototype.send = function (view, data, options, callback) {
    // First we need to parse the view, which could either be a string or an array
    // containing both an HTML and plain text versions of the view which should
    // be used when sending an e-mail. We will extract both of them out here.
    view = this.__parseView(view);

    // Now we will render view files and attach to Nodemailer options object
    this.__addContent(options, view.html, view.text, data, function (err) {
        if (err) {
            callback(err);
        } else {
            this.__transporter.sendMail(options, callback);
        }
    }.bind(this));
};

/**
 * Parse the given view name or array.
 *
 * @param  {String|Array}  view
 * @return {Object}
 *
 * @throws Error
 */
Mailer.prototype.__parseView = function (view) {
    if (_.isString(view)) {
        return {html: view, text: null};
    } else if (isObject(view)) {
        return view;
    }

    throw new Error("Invalid view.");
};

/**
 * Add the content to a given Nodemailer options object.
 *
 * @param  {object} options
 * @param  {String} html
 * @param  {String} text
 * @param  {String} data
 * @param  {function} callback
 * @return void
 */
Mailer.prototype.__addContent = function (options, html, text, data, callback) {
    var tasks = [];
    if (isset(html)) {
        tasks.push(function (CB) {
            this.__getView(html, data, function (err, data) {
                if (err) {
                    CB(err);
                } else {
                    options.html = data;

                    CB();
                }
            });
        }.bind(this));
    }

    if (isset(text)) {
        tasks.push(function (CB) {
            this.__getView(text, data, function (err, data) {
                if (err) {
                    CB(err);
                } else {
                    options.text = data;

                    CB();
                }
            });
        }.bind(this));
    }

    async.parallel(tasks, callback);
};

/**
 * Render the given view.
 *
 * @param  {String}  view
 * @param  {Array}  data
 * @param  {function}  callback
 * @return {object}
 */
Mailer.prototype.__getView = function (view, data, callback) {
    this.__views.render(view, data, callback)
};

module.exports = Mailer;