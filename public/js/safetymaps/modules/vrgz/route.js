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
    states: {
        INIT: 0,
        ACTIVE: 1,
        INACTIVE: 2
    },
    currentState: null,
    providers: {
        SIMACAR: "simacar"
    },
    routeUrlNotResponding: false,  
    register: function () {
        var me = this;

        me.currentState = me.states.INIT;
        me.options = $.extend({ 
            provider: "simacar",
            routeColor: "blue",
            routeUrlSimacar: "/simacar_export/Route.txt",
            reloadInterval: 5000
        }, me.options);
        
        window.clearTimeout(me.reloadTimeOut);   
        
        me.getRoute(false);
    },
    getRoute: function(reload) {
        var me = this;

        if (me.currentState == me.states.INACTIVE && me.routeUrlNotResponding){
            return;
        }

        $.ajax(me.options.routeUrlSimacar, { 
            dataType: "text", 
            cache: false 
        })
        .fail(function(xhr, status, error) {
            if (me.currentState == me.states.INIT ) {
                me.currentState = me.states.INACTIVE;
            }
            me.routeUrlNotResponding = true;
        })
        .done(function(data) {
            me.currentState = me.states.ACTIVE;
            me.routeUrlNotResponding = false;
            me.handleRoute(data, reload);
        })
        .always(function () {
            window.setTimeout(function () {
                me.getRoute(true);
            }, me.options.reloadInterval);
        });
    },
    handleRoute: function(data, reload) {
        var me = this;
        var pointArray = [];

        switch(me.options.provider){
            case me.providers.SIMACAR:
                pointArray = me.transformSimacarRoutesIntoPointArray(data);
        }

        this.addOrUpdateRouteLayer(pointArray); 
    },
    addOrUpdateRouteLayer: function (pointArray) {
        var me = this;
        var routeLayers = dbkjs.map.getLayersByName("route");
        var routeFeatures = me.createRouteFeatures(pointArray);

        if(routeLayers !== null && routeLayers.length > 0) {
            for(var i = 0; i < routeLayers.length; i++) {
                routeLayers[i].removeAllFeatures();
                routeLayers[i].addFeatures(routeFeatures);
            }
        }
        else {
            me.addRouteLayerToMap(me.createRouteLayer(), routeFeatures);
        }
    },
    addRouteLayerToMap: function (routeLayer, routeFeatures) {
        routeLayer.addFeatures(routeFeatures);

        dbkjs.map.addLayer(routeLayer);
        dbkjs.selectControl.setLayer((dbkjs.selectControl.layers || dbkjs.selectControl.layer).concat([routeLayer]));
    },
    createRouteFeatures: function (pointArray) {
        var me = this;
        var features = [];
        var geom = new OpenLayers.Geometry.LineString(pointArray);
        var style = {strokeColor: me.options.routeColor, strokeOpacity: 0.5, strokeWidth: 10};        
        
        features.push(new OpenLayers.Feature.Vector(geom, {}, style));

        return features;
    },
    createRouteLayer: function () {
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

        return layer;
    },
    transformSimacarRoutesIntoPointArray: function (data) {
        var me = this;
        var pointArray = [];

        Proj4js.defs["EPSG:32632"] = "+proj=utm +zone=32 +ellps=WGS84 +datum=WGS84 +units=m +no_defs";

        lines = data.split('\n');
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

        return pointArray;
    }
};