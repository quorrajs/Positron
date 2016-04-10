/**
 * CompiledRoute.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

/**
 * Constructor.
 *
 * @param {String}      staticPrefix       The static prefix of the compiled route
 * @param {String}      regex              The regular expression to use to match this route
 * @param {Array}       tokens             An array of tokens to use to generate URL for this route
 * @param {Array}       pathVariables      An array of path variables
 * @param {String|null} hostRegex          Host regex
 * @param {Array}       hostTokens         Host tokens
 * @param {Array}       hostVariables      An array of host variables
 * @param {Array}       variables          An array of variables (variables defined in the path and in the host patterns)
 */
function CompiledRoute(staticPrefix, regex, tokens, pathVariables, hostRegex, hostTokens, hostVariables, variables) {
    hostRegex = hostRegex || null;
    hostTokens = hostTokens || [];
    hostVariables = hostVariables || [];
    variables = variables || [];

    this.staticPrefix = staticPrefix.toString();
    this.regex = regex;
    this.tokens = tokens;
    this.pathVariables = pathVariables;
    this.hostRegex = hostRegex;
    this.hostTokens = hostTokens;
    this.hostVariables = hostVariables;
    this.variables = variables;
}


[
    'staticPrefix',
    'regex',
    'tokens',
    'pathVariables',
    'hostRegex',
    'hostTokens',
    'hostVariables',
    'variables'
].forEach(function (method) {
        CompiledRoute.prototype['get' + method.replace(/^[a-z]/, function (m) {
            return m.toUpperCase()
        })] = function () {
            return this[method];
        };
    });

module.exports = CompiledRoute;