/**
 * RouteCompiler.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var str = require('../support/str.js');
var _ = require('lodash');
var xregexp = require('xregexp');

var CompiledRoute = require('./CompiledRoute');

/**
 * This string defines the characters that are automatically considered separators in front of
 * optional placeholders (with default and no static text following). Such a single separator
 * can be left out together with the optional placeholder from matching and generating URLs.
 */
const SEPARATORS = '/,;.:-_~+*=@|';

function compilePattern(route, pattern, isHost) {
    var tokens = [];
    var variables = [];
    var matches = [];
    var pos = 0;
    var defaultSeparator = isHost ? '.' : '/';

    // Match all variables enclosed in "{}" and iterate over them. But we only want to match the innermost variable
    // in case of nested "{}", e.g. {foo{bar}}. This in ensured because \w does not match "{" or "}" itself.
    var matchRegex = /\{\w+\}/g;
    var match;
    while ((match = matchRegex.exec(pattern)) && matches.push(match[0])) {
        var varName = match[0].slice(1, -1);
        // get all static text preceding the current variable
        var precedingText = pattern.substr(pos, match.index - pos);
        pos = matchRegex.lastIndex;
        var precedingChar = precedingText.length > 0 ? precedingText.substr(-1) : '';
        var isSeparator = '' !== precedingChar && true == !!~SEPARATORS.indexOf(precedingChar);

        if (!isNaN(varName)) {
            throw new Error('Variable name ' + varName + ' cannot be numeric in route pattern ' + pattern + '. Please use a ' +
            'different name.');
        }
        if (!!~variables.indexOf(varName)) {
            throw new Error('Route pattern ' + varName + ' cannot reference variable name ' + pattern + ' more than once.');
        }

        if (isSeparator && precedingText.length > 1) {
            tokens.push(['text', precedingText.slice(0, -1)]);
        } else if (!isSeparator && precedingText.length > 0) {
            tokens.push(['text', precedingText]);
        }

        var regexp = route.getRequirement(varName);
        if (null === regexp) {
            var followingPattern = pattern.substr(pos).toString();
            // Find the next static character after the variable that functions as a separator. By default, this separator and '/'
            // are disallowed for the variable. This default requirement makes sure that optional variables can be matched at all
            // and that the generating-matching-combination of URLs unambiguous, i.e. the params used for generating the URL are
            // the same that will be matched. Example: new Route('/{page}.{_format}', array('_format' => 'html'))
            // If {page} would also match the separating dot, {_format} would never match as {page} will eagerly consume everything.
            // Also even if {_format} was not optional the requirement prevents that {page} matches something that was originally
            // part of {_format} when generating the URL, e.g. _format = 'mobile.html'.
            var nextSeparator = findNextSeparator(followingPattern);
            regexp = '[^' + str.regexQuote(defaultSeparator) + (defaultSeparator !== nextSeparator && ''
            !== nextSeparator ? str.regexQuote(nextSeparator) : '') + ']+';

            //@todo: note
            // Unfortunately Javascript regex doesn't support possessive quantifier
            /*if (('' !== nextSeparator && ! followingPattern.match(/^\{\w+\}/)) || '' === followingPattern) {
             // When we have a separator, which is disallowed for the variable, we can optimize the regex with a possessive
             // quantifier. This prevents useless backtracking and improves performance by 20% for matching those patterns.
             // Given the above example, there is no point in backtracking into {page} (that forbids the dot) when a dot must follow
             // after it. This optimization cannot be applied when the next char is no real separator or when the next variable is
             // directly adjacent, e.g. '/{x}{y}'.
             regexp += '+';
             }*/
        }

        tokens.push(['variable', isSeparator ? precedingChar : '', regexp, varName]);
        variables.push(varName);
    }

    if (pos < pattern.length) {
        tokens.push(['text', pattern.substr(pos)]);
    }

    var i;
    // find the first optional token
    var firstOptional = Number.MAX_SAFE_INTEGER;
    if (!isHost) {
        var token;
        for (i = tokens.length - 1; i >= 0; i--) {
            token = tokens[i];
            if ('variable' === token[0] && route.hasDefault(token[3])) {
                firstOptional = i;
            } else {
                break;
            }
        }
    }

    // compute the matching regexp
    regexp = '';
    var nbToken = tokens.length;
    for (i = 0; i < nbToken; i++) {
        regexp += computeRegexp(tokens, i, firstOptional);
    }

    return {
        'staticPrefix': 'text' === tokens[0][0] ? tokens[0][1] : '',
        'regex': xregexp('^' + regexp + '$'),
        'tokens': tokens.reverse(),
        'variables': variables
    };
}

/**
 * Returns the next static character in the Route pattern that will serve as a separator.
 *
 * @param {String} pattern The route pattern
 *
 * @return string The next static character that functions as separator (or empty string when none available)
 */
function findNextSeparator(pattern) {
    if ('' == pattern) {
        // return empty string if pattern is empty or false (false which can be returned by substr)
        return '';
    }
    // first remove all placeholders from the pattern so we can find the next real static character
    pattern = pattern.replace(/\{\w+\}/g, '');

    return isset(pattern[0]) && (-1 != SEPARATORS.indexOf(pattern[0])) ? pattern[0] : '';
}
/**
 * Computes the regexp used to match a specific token. It can be static text or a subpattern.
 *
 * @param {Array}  tokens        The route tokens
 * @param {Number} index         The index of the current token
 * @param {Number} firstOptional The index of the first optional token
 *
 * @return string The regexp pattern for a single token
 */
function computeRegexp(tokens, index, firstOptional) {
    var token = tokens[index];
    if ('text' === token[0]) {
        // Text tokens
        return str.regexQuote(token[1]);
    } else {
        // Variable tokens
        if (0 === index && 0 === firstOptional) {
            // When the only token is an optional variable token, the separator is required
            return str.regexQuote(token[1]) + '(?P<' + token[3] + '>' + token[2] + ')?';
        } else {
            var regexp = str.regexQuote(token[1]) + '(?P<' + token[3] + '>' + token[2] + ')';
            if (index >= firstOptional) {
                // Enclose each optional token in a subpattern to make it optional.
                // "?:" means it is non-capturing, i.e. the portion of the subject string that
                // matched the optional subpattern is not passed back.
                regexp = "(?:" + regexp;
                var nbTokens = tokens.length;
                if (nbTokens - 1 == index) {
                    // Close the optional subpatterns
                    regexp += ")?".repeat(nbTokens - firstOptional - (0 === firstOptional ? 1 : 0));
                }
            }

            return regexp;
        }
    }
}

var routeCompiler = {
    /**
     * Compiles the current route instance.
     *
     * @param route A Route instance
     *
     * @return CompiledRoute A CompiledRoute instance
     */
    compile: function (route) {
        var staticPrefix = null;
        var hostVariables = [];
        var pathVariables = [];
        var variables = [];
        var tokens = [];
        var regex = null;
        var hostRegex = null;
        var hostTokens = [];
        var host;

        if ('' !== (host = route.domain())) {
            var result = compilePattern(route, host, true);

            hostVariables = result['variables'];
            variables = variables.concat(hostVariables);

            hostTokens = result['tokens'];
            hostRegex = result['regex'];
        }

        var path = route.getPath();

        result = compilePattern(route, path, false);

        staticPrefix = result['staticPrefix'];

        pathVariables = result['variables'];
        variables = variables.concat(pathVariables);

        tokens = result['tokens'];
        regex = result['regex'];

        return new CompiledRoute(
            staticPrefix,
            regex,
            tokens,
            pathVariables,
            hostRegex,
            hostTokens,
            hostVariables,
            _.uniq(variables)
        );
    }

};

module.exports = routeCompiler;