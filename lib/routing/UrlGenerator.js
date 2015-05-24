/**
 * UrlGenerator.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, Harish Anchu. All rights reserved.
 * @license Licensed under MIT
 */

function UrlGenerator(routes, request) {
    /**
     * The route collection.
     */
    this.__routes = routes;

    /**
     * The  request instance.
     */
    this.__request;

    this.setRequest(request);
}

/**
 * Set the current request instance.
 *
 * @param  {Object} request
 */
UrlGenerator.prototype.setRequest = function(request) {
    this.__request = request;
};

UrlGenerator.prototype.to = function(path, extra, secure) {
    // First we will check if the URL is already a valid URL. If it is we will not
    // try to generate a new one but will simply return the URL as is, which is
    // convenient since developers do not always have to check if it's valid.
    if (this.isValidUrl(path)) {
        return path;
    }

    var scheme = this.getScheme(secure);

    // Once we have the scheme we will compile the "tail" by collapsing the values
    // into a single string delimited by slashes. This just makes it convenient
    // for passing the array of parameters to this URL as a list of segments.
    var tail = _.map(parseArray(extra), encodeURIComponent).join('/');

    var root = this.getRootUrl(scheme);

    return this.trimUrl(root, path, tail);
};

/**
 * Determine if the given path is a valid URL.
 *
 * @param  {string}  path
 * @return {Boolean}
 */
UrlGenerator.prototype.isValidUrl = function(path)
{
    ['#', '//', 'mailto:', 'tel:'].forEach(function(val){
        if(path.indexOf(val) !== -1){
            return true;
        }
    });

    return isValidUrl(path);
};

module.exports = UrlGenerator;