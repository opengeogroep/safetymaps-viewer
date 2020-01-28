/*
 *  Copyright (c) 2020 Safety C&T (info@safetyct.com)
 *  Copyright (c) 2020 B3Partners (info@b3partners.nl)
 *
 *  This file is part of safetymaps-viewer
 *
 *  safetymaps-viewer is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  safetymaps-viewer is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with safetymaps-viewer. If not, see <http://www.gnu.org/licenses/>.
 *
 */

/* global window, OpenLayers, Proj4js */

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};

dbkjs.modules.route = {
    id: "dbkjs.modules.route",
    options: null,
    reloadTimeOut: null,
    providers: {
        SIMACAR: "simacar"
    },
    register: function () {
        var me = this;

        me.options = $.extend({
            provider: "simacar",
            routeColor: "blue",
            routeUrlSimacar: "/simacar_export/Route.txt",
            reloadInterval: 5000,
            retryTimeout: 30000,
            log: false
        }, me.options);

        me.createLayer();

        Proj4js.defs["EPSG:32632"] = "+proj=utm +zone=32 +ellps=WGS84 +datum=WGS84 +units=m +no_defs";

        me.getRoute(false);
    },
    createLayer: function () {
        var me = this;
        this.layer = new OpenLayers.Layer.Vector("route", {
            rendererOptions: {
                zIndexing: true
            },
            options: {
                minScale: 10000
            },
            styleMap: new OpenLayers.StyleMap({
                default: new OpenLayers.Style({
                    strokeColor: me.options.routeColor,
                    strokeOpacity: 0.5,
                    strokeWidth: 10
                })
            })
        });
        dbkjs.map.addLayer(this.layer);
    },
    getRoute: function() {
        var me = this;

        me.getRouteFromProvider()
        .done(function(features) {
            me.updateRoute(features);
            me.reloadTimeout = window.setTimeout(function() {
                me.getRoute();
            }, me.options.reloadInterval);
        })
        .fail(function(error) {
            console.log("route: error retrieving route, retrying in " + me.options.retryTimeout / 1000 + "s...", error);

            me.reloadTimeout = window.setTimeout(function() {
                me.getRoute();
            }, me.options.retryTimeout);
        });
    },
    getRouteFromProvider: function() {
        var me = this;

        var p = $.Deferred();

        switch(me.options.provider){
            case me.providers.SIMACAR:
                me.getSimacarRouteFeature(p);
                break;
            default:
                p.reject('invalid provider ' + me.options.provider);
        }

        return p.promise();
    },
    /**
     * @param {type} features Empty array for no route, array with LineString features for a valid route or null if route is not changed
     */
    updateRoute: function (features) {
        if(features) {
            this.layer.removeAllFeatures();
            this.layer.addFeatures(features);
        }
    },
    getSimacarRouteFeature: function (promise) {
        var me = this;

        $.ajax(me.options.routeUrlSimacar, {
            dataType: "text",
            cache: false
        })
        .done(function(data) {
            var pointArray = [];

            var projSource = new Proj4js.Proj("EPSG:32632");
            var projDest = new Proj4js.Proj(dbkjs.options.projection.code);

            var lines = data.split('\n');
            lines.forEach(function(line, i) {
                if (line !== '') {
                    var xy = line.split(';');
                    var x = xy[0].trim();
                    var y = xy[1].trim();
                    var point = new Proj4js.Point(x, y);
                    var trans = Proj4js.transform(projSource, projDest, point);
                    pointArray.push(new OpenLayers.Geometry.Point(trans.x, trans.y));
                }
            });

            var geom = new OpenLayers.Geometry.LineString(pointArray);
            var features = [new OpenLayers.Feature.Vector(geom)];
            promise.resolve(features);
        })
        .fail(function(jqXHR) {
            promise.reject("XHR error on " + me.options.routeUrlSimacar + ": " + jqXHR.status + ": " + jqXHR.statusText);
        });
    }
};
