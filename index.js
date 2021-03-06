// jscs:disable safeContextKeyword
(function () {
    'use strict';

    var regionManager = require('./region/manager'),
        uniqueId = 0;

    /**
     * Search view in context
     *
     * @param {object} context
     * @returns {Backbone.View}
     * @private
     */
    var _getView = function (context) {
        if (context) {
            while (context && !context.view && context.__parent__) {
                context = context.__parent__;
            }

            return context ? context.view : null;
        }
    };

    /**
     * Try to fetch view from every source
     *
     *  1. If view was passed as option to helper
     *  2. Try get from current context
     *  3. Try get from parent context
     *
     * @param {{}} context
     * @param {{hash: {view: Backbone.View}, data: {root: object, _parent: object}}} options
     * @returns {*}
     */
    var getView = function (context, options) {
        var hash = options.hash,
            view;

        if (hash.view) {
            view = hash.view;
        } else {
            view = _getView(context);

            if (!view && options.data && options.data.root) {
                view = _getView(options.data.root);
            }
            if (!view && options.data && options.data._parent) {
                view = _getView(options.data._parent.root);
            }
        }

        return view;
    };

    /**
     * Helper which allow to specify region from template
     *
     * Usage:
     *
     *   {{region "myRegion"}}
     *   {{region "myAsyncRegion" async=true}}
     *   {{region "myAsyncRegion" regionClass=(require "./SomeRegionClass")}}
     *   {{region "myAsyncRegion" regionType="replace_region"}}
     *
     * @param {string} name
     * @param {{hash: {tagName: string, tag: string, async: boolean, regionClass: string, regionType: string}}} options
     * @returns {Handlebars.SafeString}
     */
    var regionHelper = function (name, options) {
        var id = 'region' + (++uniqueId),
            selector = '#' + id,
            hash = options.hash,
            tagName = hash.tagName || hash.tag || 'div',
            regionClass = regionManager.getRegion(hash),
            Handlebars = regionHelper.options.Handlebars;

        name = name || id;

        var view = getView(this, options);

        if (view) {
            view.regionManager.addRegion(name, {
                selector: selector,
                regionClass: regionClass,
                parentEl: function () {
                    return view.$el;
                }
            });
        } else {
            console.warn('Cannot find "view" for region "' + name + '"');
        }

        return new Handlebars.SafeString('<' + tagName + ' id=' + id + '></' + tagName + '>');
    };

    /**
     * Pass view to template context
     *
     * @param {function} original
     * @returns {Function}
     */
    var injectView = function (original) {
        return function (data) {
            data = original.call(this, data);
            data.view = this;

            return data;
        };
    };

    /**
     * Register helper system wide
     *
     * @param {{Handlebars: Handlebars, Marionette: Marionette, registerHelper: boolean}} [options]
     */
    regionHelper.register = function (options) {
        options = options || {};

        var Handlebars = options.Handlebars || window.Handlebars,
            Marionette = options.Marionette || window.Marionette,
            ViewProto = Marionette.View.prototype;

        regionHelper.options = options;

        if (options.registerHelper || typeof options.registerHelper === 'undefined') {
            Handlebars.registerHelper('region', regionHelper);
            ViewProto.mixinTemplateHelpers = injectView(ViewProto.mixinTemplateHelpers);
        }

        // Register default region
        require('./region/ReplaceRegion');
    };

    regionHelper.getView = getView;

    module.exports = regionHelper;

})();
