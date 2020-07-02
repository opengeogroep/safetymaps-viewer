/*
 *  Copyright (c) 2015 B3Partners (info@b3partners.nl)
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

/**
 * Module which, after activated, listens to click on map, and opens Google
 * StreetView in a new window, then deactivates.
 *
 * Note: does not work on Google Maps Lite!
 * Note: does not work on iOS (web or app), works on Android
 *
 * The GUI should be created by the configuration. See below for the default:
 * dbkjs.options.streetview.onRegister = function() {
 *   // Create a button at a fixed position above zoom in/out buttons shown when
 *   // dbkjs.options.showZoomButtons is true.
 *   // Perhaps parametrize this function in the future to allow more flexible
 *   // button placement.
 *   dbkjs.modules.streetview.createDefaultMobileButton();
 * };
 *
 * API:
 * register(): calls options.onRegister(), which should create GUI
 * activate(): trigger 'activate' event, listens to next onclick on map, open
 *   Google StreetView at click position, call deactivate()
 * deactivate(): stop listening to onclick on map, trigger 'deactivate' event.
 *
 * Do not call activate() or deactive() in the event handlers.
 *
 * For onRegister() suggestions look to the default createDefaultMobileButton():
 * - creates button;
 * - changes cursor to crosshair;
 * - adds btn-primary state to indicate activated state;
 * - listens to deactivate event.
 */

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};
dbkjs.modules.streetview = {
    id: "dbk.module.streetview",
    active: null,
    triggering: null,
    register: function() {
        var me = this;
        me.active = false;
        me.triggering = false;

        this.options = $.extend({
            newWindow: true,
            pinToIncidentLocation: false,
        }, this.options);

        if(dbkjs.options.streetview && typeof dbkjs.options.streetview.onRegister === "function") {
            dbkjs.options.streetview.onRegister();
        } else {
            this.createDefaultMobileButton();
        }

        var oldOnClick = dbkjs.util.onClick;
        dbkjs.util.onClick = function(e) {
            if(!e) {
                return;
            }
            var xy;
            if(e.xy) {
                xy = e.xy;
            } else if(e.changedTouches && e.changedTouches.length > 0) {
                xy = {x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY };
            }
            if(me.active) {
                var lonLat = me.getLonLatFromClick(xy);
                me.openStreetView(lonLat);
                me.deactivate();
            } else {
                oldOnClick(e);
            }
        };

        me.incidentLonLat = null;
        if (me.options.pinToIncidentLocation) {
            $(dbkjs).one("dbkjs_init_complete", function () {
                if (dbkjs.modules.incidents && dbkjs.modules.incidents.controller) {
                    $(dbkjs.modules.incidents.controller).on("new_incident", function (event, commonIncident, incident) {
                        me.incidentLonLat = me.getLonLatFromIncident(commonIncident);
                    });
                    $(dbkjs.modules.incidents.controller).on("end_incident", function () {
                        me.incidentLonLat = null;
                    });
                }
            });
        }
    },
    activate: function() {
        var me = this;

        if (me.options.pinToIncidentLocation && me.incidentLonLat !== null) {
            me.openStreetView(me.incidentLonLat);
            me.deactivate();
        } else {
            this.active = true;
            $(this).triggerHandler('activate');
        }
    },
    deactivate: function() {
        this.active = false;
        $(this).triggerHandler('deactivate');
    },
    getLonLatFromClick: function(xy) {
        var lonLat = dbkjs.map.getLonLatFromPixel(xy);
        Proj4js.defs["EPSG:4236"] = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs ";
        var p = new Proj4js.Point(lonLat.lon, lonLat.lat);
        var t = Proj4js.transform(new Proj4js.Proj(dbkjs.map.getProjection()), new Proj4js.Proj("EPSG:4236"), p);
        var gLonLat = new OpenLayers.LonLat(t.x, t.y);
        return gLonLat;
    },
    getLonLatFromIncident: function(incident) {
        var xy = AGSIncidentService.prototype.getIncidentXY(incident);
        Proj4js.defs["EPSG:4236"] = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs ";
        var p = new Proj4js.Point(xy.x, xy.y);
        var t = Proj4js.transform(new Proj4js.Proj(dbkjs.map.getProjection()), new Proj4js.Proj("EPSG:4236"), p);
        var gLonLat = new OpenLayers.LonLat(t.x, t.y);
        return gLonLat;
    },
    openStreetView: function(lonLat) {
        var url = "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=[y],[x]";
        url = url.replace(/\[x\]/g, lonLat.lon);
        url = url.replace(/\[y\]/g, lonLat.lat);
        if(this.options.newWindow) {
            window.open(url);
        } else {
            window.location.href = url;
        }
    },
    createDefaultMobileButton: function() {
        var me = this;
        var a = $("<a/>")
                .attr("id", "streetview-a")
                .attr("title", "Open StreetView")
                .addClass("btn btn-default olButton")
                .on("click", function() {
                    if(me.active) {
                        dbkjs.modules.streetview.deactivate();
                    } else {
                        $("#map").attr("style", "cursor: crosshair");
                        $("#streetview-a").addClass("btn-primary");
                        dbkjs.modules.streetview.activate();
                    }
                });
        $("<i/>").addClass("fa fa-street-view").appendTo(a);
        a.prependTo("#bottom_left_buttons");

        $(dbkjs.modules.streetview).on('deactivate', function() {
            $("#map").attr("style", "");
            $("#streetview-a").removeClass("btn-primary");
        });
    }
};





