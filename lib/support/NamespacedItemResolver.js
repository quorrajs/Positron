/**
 * NamespacedItemResolver.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var _ = require('lodash');

function NamespacedItemResolver() {

    /**
     * A cache of the parsed items.
     *
     * @var {Array}
     */
    this.__parsed = [];

}

/**
 * Parse a key into namespace, group, and item.
 *
 * @param  {string} key
 * @return {Array}
 */
NamespacedItemResolver.prototype.parseKey = function (key) {
    // If we've already parsed the given key, we'll return the cached version we
    // already have, as this will save us some processing. We cache off every
    // key we parse so we can quickly return it on all subsequent requests.
    if (isset(this.__parsed[key])) {
        return this.__parsed[key];
    }

    var segments = key.split('.');
    var parsed;

    // If the key does not contain a double colon, it means the key is not in a
    // namespace, and is just a regular configuration item. Namespaces are a
    // tool for organizing configuration items for things such as modules.
    if (key.indexOf('::') === -1) {
        parsed = this.__parseBasicSegments(segments);
    }
    else {
        parsed = this.__parseNamespacedSegments(key);
    }

    // Once we have the parsed array of this key's elements, such as its groups
    // and namespace, we will cache each array inside a simple list that has
    // the key and the parsed array for quick look-ups for later requests.
    return this.__parsed[key] = parsed;
};

/**
 * Parse an array of basic segments.
 *
 * @param  {Array} segments
 * @return {Array}
 * @protected
 */
NamespacedItemResolver.prototype.__parseBasicSegments = function (segments) {
    // The first segment in a basic array will always be the group, so we can go
    // ahead and grab that segment. If there is only one total segment we are
    // just pulling an entire group out of the array and not a single item.
    var group = segments[0];

    if (segments.length == 1) {
        return {
            namespace: null,
            group: group,
            item: null
        };
    }

    // If there is more than one segment in this group, it means we are pulling
    // a specific item out of a groups and will need to return the item name
    // as well as the group so we know which item to pull from the arrays.
    else {
        var item = (segments.slice(1)).join('.');

        return {
            namespace: null,
            group: group,
            item: item
        };
    }
};

/**
 * Parse an array of namespaced segments.
 *
 * @param  {string} key
 * @return {Array}
 * @protected
 */
NamespacedItemResolver.prototype.__parseNamespacedSegments = function (key) {
    var output = key.split('::');
    // output[0] - namespace
    // output[1] - item

    // First we'll just explode the first segment to get the namespace and group
    // since the item should be in the remaining segments. Once we have these
    // two pieces of data we can proceed with parsing out the item's value.
    var itemSegments = output.split('.');

    var groupAndItem = this.__parseBasicSegments(itemSegments);

    return _.merge({namespace: output[0]}, groupAndItem);
};

/**
 * Set the parsed value of a key.
 *
 * @param  {string} key
 * @param  {Array}  parsed
 * @return void
 */
NamespacedItemResolver.prototype.setParsedKey = function (key, parsed) {
    this.__parsed[key] = parsed;
};

module.exports = NamespacedItemResolver;