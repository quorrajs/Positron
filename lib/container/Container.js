/**
 * Container.js
 *
 * @author: Harish Anchu <harishanchu@gmail.com>
 * @copyright 2015, QuorraJS. All rights reserved.
 * @license Licensed under MIT
 */

var _ = require('lodash');

function Container() {
    /**
     * The registered type aliases.
     *
     * @var Object
     * @protected
     */
    this.__aliases = {};

    /**
     * The container's shared instances.
     *
     * @var Object
     * @protected
     */
    this.__instances = {};

    /**
     * The container's bindings.
     *
     * @var Object
     * @protected
     */
    this.__bindings = {};
}


// ******************** todo: refactor make ************* //




/**
 * Resolve the given type from the container.
 *
 * @param  {string}  abstract
 * @param  {Array}   parameters
 * @param  {boolean}   isConstructor
 * @param  {boolean}   isSingleton
 * @return {*}
 */
Container.prototype.make = function (abstract, parameters, isConstructor, isSingleton) {
    if (!isset(parameters)) {
        parameters = [];
    }

    if (!isset(isConstructor)) {
        isConstructor = false;
    }

    if (!isset(isSingleton)) {
        isSingleton = false;
    }

    abstract = this.__getAlias(abstract);

    // If an instance of the type is currently being managed as a singleton we'll
    // just return an existing instance instead of instantiating new instances
    // so the developer can keep using the same objects instance every time.
    if (isset(this.__instances[abstract])) {
        return this.__instances[abstract];
    }

    var concrete = this.__getConcrete(abstract);

    // We're ready to instantiate an instance of the concrete type registered for
    // the binding. This will instantiate the types
    var object;
    if (this.__isBuildable(concrete, abstract)) {
        object = this.build(concrete, parameters, isConstructor);
    }
    else {
        object = this.make(concrete, parameters, isConstructor, isSingleton);
    }

    // If the requested type is registered as a singleton we'll want to cache off
    // the instances in "memory" so we can return it later without creating an
    // entirely new instance of an object on each subsequent request for it.
    if (this.isShared(abstract) || isSingleton) {
        this.__instances[abstract] = object;
    }

    return object;
};

/**
 * Get the alias for an abstract if available.
 *
 * @param  {string}  abstract
 * @return string
 * @protected
 */
Container.prototype.__getAlias = function(abstract) {
    return isset(this.__aliases[abstract]) ? this.__aliases[abstract] : abstract;
};

/**
 * Get the concrete type for a given abstract.
 *
 * @param  {string} abstract
 * @return {*}  concrete
 * @protected
 */
Container.prototype.__getConcrete = function(abstract) {
    // If we don't have a registered resolver or concrete for the type, we'll just
    // assume each type is a concrete name and will attempt to resolve it as is
    // since the container should be able to resolve concretes automatically.
    if (!isset(this.__bindings[abstract])) {
        return abstract;
    }
    else {
        return this.__bindings[abstract]['concrete'];
    }
};

/**
 * Determine if the given concrete is buildable.
 *
 * @param  {*} concrete
 * @param  {string} abstract
 * @return bool
 * @protected
 */
Container.prototype.__isBuildable = function(concrete, abstract) {
    return concrete === abstract;
};

/**
 * Instantiate a concrete instance of the given type.
 *
 * @param  {string} concrete
 * @param  {Array} parameters
 * @param  {string} isConstructor
 * @return {*}
 */
Container.prototype.build = function (concrete, parameters, isConstructor) {
    if (!isset(parameters)) {
        parameters = [];
    }

    if (!isset(constructor)) {
        constructor = false;
    }


    // If the concrete type is actually a Closure, we will just execute it and
    // hand back the results of the functions, which allows functions to be
    // used as resolvers for more fine-tuned resolution of these objects.
    concrete = require(concrete);
    if (_.isFunction(concrete)) {
        if(!isConstructor) {
            return concrete(this, parameters);
        } else {
            return new concrete(parameters);
        }

    }
};

/**
 * Determine if a given type is shared.
 *
 * @param  {string} abstract
 * @return {bool}
 */
Container.prototype.isShared = function (abstract) {
    var shared;
    if (isset(this.__bindings[abstract]) && isset(this.__bindings[abstract]['shared'])) {
        shared = this.__bindings[abstract]['shared'];
    }
    else {
        shared = false;
    }

    return isset(this.__instances[abstract]) || shared === true;
};

// ******************** todo: refactor make ************* //













module.exports = Container;