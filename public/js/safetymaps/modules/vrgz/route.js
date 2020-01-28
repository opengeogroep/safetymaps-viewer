/*
 *  Copyright (c) 2020 B3Partners (info@b3partners.nl)
 *
 *  This file is part of safetymapDBK
 *
 *  safetymapDBK is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  safetymapDBK is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with safetymapDBK. If not, see <http://www.gnu.org/licenses/>.
 *
 */

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};

dbkjs.modules.route = {
    id: "dbkjs.modules.route",
    options: null,
    reloadTimeOut: null,
    routeUrlSimacar: "/simacar_export/Route.txt",
    routeUrlNotResponded: false,  
    register: function () {
        var me = this;
        var pointArray;
        var routeLayer;

        me.options = $.extend({ 
            provider: "simacar",
            routeColor: "blue",
            reloadInterval: 5000
        }, me.options);
        
        window.clearTimeout(me.reloadTimeOut);   
        
        me.getRoute();
    },
    getRoute: function(reload) {
        var me = this;

        if (me.options.provider === "simacar")            
            me.getSimacarRoutesAsPointArray(function (pointArray) {
                me.addRouteLayerToMap(me.createRouteLayer(pointArray), reload);
            });

        me.reloadTimeOut = window.setTimeout(function () {
            if ((!reload && !me.routeUrlNotResponded) || reload)
                me.getRoute(true);
        }, me.options.reloadInterval);
    },
    removeLayerFromMap: function () {
        var layersToRemove = dbkjs.map.getLayersByName("route");

        for(var i = 0; i < layersToRemove.length; i++) {
            dbkjs.map.removeLayer(layersToRemove[i]);
        }
    },
    addRouteLayerToMap: function (routeLayer, reload) {
        var me = this;

        routeLayer.layer.addFeatures(routeLayer.features);

        if (reload)
            me.removeLayerFromMap();

        dbkjs.map.addLayer(routeLayer.layer);
        dbkjs.selectControl.setLayer((dbkjs.selectControl.layers || dbkjs.selectControl.layer).concat([routeLayer.layer]));
    },
    createRouteLayer: function (pointArray) {
        var me = this;
        var features = [];
        var geom = new OpenLayers.Geometry.LineString(pointArray);
        var style = {strokeColor: me.options.routeColor, strokeOpacity: 0.5, strokeWidth: 10};        
        
        features.push(new OpenLayers.Feature.Vector(geom, {}, style));

        var layer = new OpenLayers.Layer.Vector("route", {
            rendererOptions: {
                zIndexing: true
            },
            options: {
                minScale: 10000
            },
            styleMap: new OpenLayers.StyleMap({
                default: new OpenLayers.Style({
                    cursor:"pointer",
                    externalGraphic: "${img}",
                    pointRadius: 18
                }),
                'select': new OpenLayers.Style({
                    pointRadius: 25
                })
            })
        });        

        return { layer: layer, features: features };
    },
    getSimacarRoutesAsPointArray: function (onSuccess) {        
        var me = this;
        var pointArray = [];

        Proj4js.defs["EPSG:32632"] = "+proj=utm +zone=32 +ellps=WGS84 +datum=WGS84 +units=m +no_defs";

        $.ajax(me.routeUrlSimacar, { dataType: "text", cache: false })
        .success(function (response) {
            lines = response.split('\n');
            lines.forEach(function(line, i) {
                if (line !== '') {
                    xy = line.split(';');
                    x = xy[0].trim();
                    y = xy[1].trim();
                    point = new  Proj4js.Point(x, y);
                    trans = Proj4js.transform(new Proj4js.Proj("EPSG:32632"), new Proj4js.Proj(dbkjs.options.projection.code), point);
                    pointArray.push(new OpenLayers.Geometry.Point(trans.x, trans.y));
                }
            });
            onSuccess(pointArray);
        })
        .fail(function () {
            me.routeUrlNotResponded = true;
        });
    }
};