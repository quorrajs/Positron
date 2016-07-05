/**
 * helpers.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var str = require('./str.js');

Number.MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991;

String.prototype.repeat = String.prototype.repeat || function (num) {
    return new Array(num + 1).join(this);
};

if (typeof parseObject == 'undefined') {
    global.parseObject = function (element) {
        element = element instanceof Object ? element : {0: element};
        return element;
    }
}

if (typeof parseArray == 'undefined') {
    global.parseArray = function (element) {
        return [].concat(element);
    }
}

if (typeof isset == 'undefined') {
    /**
     * Determine if a variable is set and is not NULL
     *
     * @return bool
     */
    global.isset = function () {
        //  discuss at: http://phpjs.org/functions/isset/
        // original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // improved by: FremyCompany
        // improved by: Onno Marsman
        // improved by: Rafał Kukawski
        //   example 1: isset( undefined, true);
        //   returns 1: false
        //   example 2: isset( 'Kevin van Zonneveld' );
        //   returns 2: true

        var a = arguments,
            l = a.length,
            i = 0,
            undef;

        if (l === 0) {
            throw new Error('Empty isset');
        }

        while (i !== l) {
            if (a[i] === undef || a[i] === null) {
                return false;
            }
            i++;
        }
        return true;
    }
}

if (typeof isObject == 'undefined') {
    global.isObject = function (variable) {
        return typeof variable === 'object';
    }
}

if (typeof key == 'undefined') {
    global.key = function (arr) {
        //  discuss at: http://phpjs.org/functions/key/
        // original by: Brett Zamir (http://brett-zamir.me)
        //    input by: Riddler (http://www.frontierwebdev.com/)
        // bugfixed by: Brett Zamir (http://brett-zamir.me)
        //        note: Uses global: php_js to store the array pointer
        //   example 1: array = {fruit1: 'apple', 'fruit2': 'orange'}
        //   example 1: key(array);
        //   returns 1: 'fruit1'

        this.php_js = this.php_js || {};
        this.php_js.pointers = this.php_js.pointers || [];
        var indexOf = function (value) {
            for (var i = 0, length = this.length; i < length; i++) {
                if (this[i] === value) {
                    return i;
                }
            }
            return -1;
        };
        // END REDUNDANT
        var pointers = this.php_js.pointers;
        if (!pointers.indexOf) {
            pointers.indexOf = indexOf;
        }

        if (pointers.indexOf(arr) === -1) {
            pointers.push(arr, 0);
        }
        var cursor = pointers[pointers.indexOf(arr) + 1];
        if (Object.prototype.toString.call(arr) !== '[object Array]') {
            var ct = 0;
            for (var k in arr) {
                if (ct === cursor) {
                    return k;
                }
                ct++;
            }
            return false; // Empty
        }
        if (arr.length === 0) {
            return false;
        }
        return cursor;
    }
}

if (typeof current == 'undefined') {
    global.current = function (arr) {
        //  discuss at: http://phpjs.org/functions/current/
        // original by: Brett Zamir (http://brett-zamir.me)
        //        note: Uses global: php_js to store the array pointer
        //   example 1: transport = ['foot', 'bike', 'car', 'plane'];
        //   example 1: current(transport);
        //   returns 1: 'foot'

        this.php_js = this.php_js || {};
        this.php_js.pointers = this.php_js.pointers || [];
        var indexOf = function (value) {
            for (var i = 0, length = this.length; i < length; i++) {
                if (this[i] === value) {
                    return i;
                }
            }
            return -1;
        };
        // END REDUNDANT
        var pointers = this.php_js.pointers;
        if (!pointers.indexOf) {
            pointers.indexOf = indexOf;
        }
        if (pointers.indexOf(arr) === -1) {
            pointers.push(arr, 0);
        }
        var arrpos = pointers.indexOf(arr);
        var cursor = pointers[arrpos + 1];
        if (Object.prototype.toString.call(arr) === '[object Array]') {
            return arr[cursor] || false;
        }
        var ct = 0;
        for (var k in arr) {
            if (ct === cursor) {
                return arr[k];
            }
            ct++;
        }
        return false; // Empty
    }
}

if (typeof isNull == 'undefined') {
    global.isNull = function (variable) {
        return (variable === null);
    }
}

if (typeof microtime == 'undefined') {
    // Return current Unix timestamp with microseconds
    global.microtime = function (get_as_float) {
        //  discuss at: http://phpjs.org/functions/microtime/
        // original by: Paulo Freitas
        //   example 1: timeStamp = microtime(true);
        //   example 1: timeStamp > 1000000000 && timeStamp < 2000000000
        //   returns 1: true

        var now = new Date()
                .getTime() / 1000;
        var s = parseInt(now, 10);

        return (get_as_float) ? now : (Math.round((now - s) * 1000) / 1000) + ' ' + s;
    }
}

/*if ( typeof get_class == 'undefined') {
 global.get_class = function(obj) {
 // http://kevin.vanzonneveld.net
 // +   original by: Ates Goral (http://magnetiq.com)
 // +   improved by: David James
 // +   improved by: David Neilsen
 // *     example 1: get_class(new (function MyClass() {}));
 // *     returns 1: "MyClass"
 // *     example 2: get_class({});
 // *     returns 2: "Object"
 // *     example 3: get_class([]);
 // *     returns 3: false
 // *     example 4: get_class(42);
 // *     returns 4: false
 // *     example 5: get_class(window);
 // *     returns 5: false
 // *     example 6: get_class(function MyFunction() {});
 // *     returns 6: false
 if (obj && typeof obj === 'object' &&
 Object.prototype.toString.call(obj) !== '[object Array]' &&
 obj.constructor && obj !== this.window) {
 var arr = obj.constructor.toString().match(/function\s*(\w+)/);

 if (arr && arr.length === 2) {
 return arr[1];
 }
 }

 return false;
 }
 }*/

if (typeof arrayFillKeys == 'undefined') {
    global.arrayFillKeys = function (keys, value) {
        //  discuss at: http://phpjs.org/functions/arrayFillKeys/
        // original by: Brett Zamir (http://brett-zamir.me)
        // bugfixed by: Brett Zamir (http://brett-zamir.me)
        //   example 1: keys = {'a': 'foo', 2: 5, 3: 10, 4: 'bar'}
        //   example 1: arrayFillKeys(keys, 'banana')
        //   returns 1: {"foo": "banana", 5: "banana", 10: "banana", "bar": "banana"}

        var retObj = {},
            key = '';

        for (key in keys) {
            retObj[keys[key]] = value;
        }

        return retObj;
    }

}

if (typeof objectGet == 'undefined') {
    /**
     * Get an object key value where key specified in dot notation.
     *
     * @param obj
     * @param path
     * @returns {*}
     */
    global.objectGet = function (obj, path) {
        var pathArray = path.split('.');
        for (var i = 0; i < pathArray.length; i++) {
            obj = obj[pathArray[i]];
            if (!isset(obj))
                break;
        }
        return obj;
    };
}

if (typeof isValidUrl == 'undefined') {
    var reWeburl = new RegExp(
        "^" +
            // protocol identifier
        "(?:(?:https?|ftp)://)" +
            // user:pass authentication
        "(?:\\S+(?::\\S*)?@)?" +
        "(?:" +
            // IP address exclusion
            // private & local networks
        "(?!(?:10|127)(?:\\.\\d{1,3}){3})" +
        "(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})" +
        "(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})" +
            // IP address dotted notation octets
            // excludes loopback network 0.0.0.0
            // excludes reserved space >= 224.0.0.0
            // excludes network & broacast addresses
            // (first & last IP address of each class)
        "(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])" +
        "(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}" +
        "(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))" +
        "|" +
            // host name
        "(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)" +
            // domain name
        "(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*" +
            // TLD identifier
        "(?:\\.(?:[a-z\\u00a1-\\uffff]{2,}))" +
        ")" +
            // port number
        "(?::\\d{2,5})?" +
            // resource path
        "(?:/\\S*)?" +
        "$", "i"
    );
    global.isValidUrl = function (url) {
        return url.match(reWeburl) !== null;
    }
}

if (typeof pullAt == 'undefined') {
    global.pullAt = function (obj, index) {
        var value = obj[index];

        if(Array.isArray(obj)) {
            if(isNaN(index)) {
                delete obj[index];
            } else {
                obj.splice(index, 1);
            }
        } else if(!isset(value) && !isNaN(index)) {
            var keys = Object.keys(obj);

            value = obj[keys[0]];
            delete obj[keys[0]];
        } else {
            delete obj[index];
        }

        return value;
    };
}


