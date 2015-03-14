/**
 * str.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */
module.exports = {
    is: is,
    regexQuote: regexQuote,
    ltrim: ltrim,
    rtrim: rtrim,
    trim: trim,
    isString: isString
};

/**
 * Determine if a given string matches a given pattern.
 *
 * @param {string} pattern
 * @param {string} value
 * @return bool
 */
function is(pattern, value) {
    if (pattern == value) return true;

    pattern = regexQuote(pattern, '/');

    // Asterisks are translated into zero-or-more regular expression wildcards
    // to make it convenient to check if the strings starts with the given
    // pattern such as "library/*", making any string check convenient.
    pattern = pattern.replace('/\*/g', '.*') + '\\z';
    pattern = new RegExp('^' + pattern);

    return pattern.test(value);
}

function regexQuote(str, delimiter) {
    // @todo: remove delimiter argument from all the method usages.
    //  discuss at: http://phpjs.org/functions/preg_quote/
    // original by: booeyOH
    // improved by: Ates Goral (http://magnetiq.com)
    // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // improved by: Brett Zamir (http://brett-zamir.me)
    // bugfixed by: Onno Marsman

    return String(str)
//        .replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]', 'g'), '\\$&');
        .replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\/-]', 'g'), '\\$&');
}

function trim(str, chr) {
    chr = regexQuote(chr);
    var rgxtrim = (!chr) ? new RegExp('^\\s+|\\s+$', 'g') : new RegExp('^'+chr+'+|'+chr+'+$', 'g');
    return str.replace(rgxtrim, '');
}

function rtrim(str, chr) {
    var rgxtrim = (!chr) ? new RegExp('\\s+$') : new RegExp(chr+'+$');
    return str.replace(rgxtrim, '');
}

function ltrim(str, chr) {
    var rgxtrim = (!chr) ? new RegExp('^\\s+') : new RegExp('^'+chr+'+');
    return str.replace(rgxtrim, '');
}

function isString(str) {
    return typeof str === 'string';
}