/**
 * str.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

module.exports = {
    is: is,
    regexQuote: regexQuote,
    ltrim: ltrim,
    rtrim: rtrim,
    trim: trim,
    quickRandom: quickRandom
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

    pattern = regexQuote(pattern);

    // Asterisks are translated into zero-or-more regular expression wildcards
    // to make it convenient to check if the strings starts with the given
    // pattern such as "library/*", making any string check convenient.
    pattern = pattern.replace(/\\\*/g, '.*');
    pattern = new RegExp('^' + pattern + '$');

    return pattern.test(value);
}

function regexQuote(str) {
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
    var rgxtrim = (!chr) ? new RegExp('^\\s+|\\s+$', 'g') : new RegExp('^' + chr + '+|' + chr + '+$', 'g');
    return str.replace(rgxtrim, '');
}

function rtrim(str, chr) {
    var rgxtrim = (!chr) ? new RegExp('\\s+$') : new RegExp(chr + '+$');
    return str.replace(rgxtrim, '');
}

function ltrim(str, chr) {
    var rgxtrim = (!chr) ? new RegExp('^\\s+') : new RegExp('^' + chr + '+');
    return str.replace(rgxtrim, '');
}


/**
 * Generate a "random" alpha-numeric string.
 *
 * Should not be considered sufficient for cryptography, etc.
 *
 * @param  {number} [length]
 * @return {string}
 */
function quickRandom(length) {
    length = length || 16;
    var pool = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

    return str_shuffle(pool.repeat(5)).substr(0, length);
}

function str_shuffle (str) {
    //  discuss at: http://phpjs.org/functions/str_shuffle/
    // original by: Brett Zamir (http://brett-zamir.me)
    //   example 1: shuffled = str_shuffle("abcdef");
    //   example 1: shuffled.length
    //   returns 1: 6

    if (arguments.length === 0) {
        throw new Error('Wrong parameter count for str_shuffle()');
    }

    if (str == null) {
        return ''
    }

    str += ''

    var newStr = '',
        rand, i = str.length

    while (i) {
        rand = Math.floor(Math.random() * i)
        newStr += str.charAt(rand)
        str = str.substring(0, rand) + str.substr(rand + 1)
        i--
    }

    return newStr
}