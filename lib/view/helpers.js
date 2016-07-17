/**
 * helpers.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright Copyright (c) 2015-2016, QuorraJS.
 * @license See LICENSE.txt
 */

var path = require('path');
var str = require('../support/str');

function loadViewHelpers(app) {
    /**
     * Get the path to a versioned Elixir file.
     *
     * @param  {String} file
     * @param  {String} buildDirectory
     * @return {String}
     *
     * @throws Error
     */
    function elixir(file, buildDirectory) {
        if (!buildDirectory) {
            buildDirectory = 'build';
        }

        var manifestPath = path.join(publicPath(buildDirectory), 'rev-manifest.json');
        var manifest = require(manifestPath);


        if (isset(manifest[file])) {
            return '/'+ str.trim(buildDirectory + '/' + manifest[file], '/');
        }


        throw new Error("File " + file + " not defined in asset manifest.");
    }

    /**
     * Get the path to the public folder.
     *
     * @param  {String} asset
     * @return {String}
     */
    function publicPath(asset) {
        return path.join(app.path.public, asset? asset: '');
    }

    return {
        elixir: elixir,
        publicPath: publicPath
    };
}

module.exports = loadViewHelpers;