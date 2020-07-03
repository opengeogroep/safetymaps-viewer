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

/**
 * Module which, after activated, listens to click on map, and opens Google
 * Earth in a new window, then deactivates.
 *
 * The GUI should be created by the configuration. See below for the default:
 * dbkjs.options.earthview.onRegister = function() {
 *   // Create a button at a fixed position above zoom in/out buttons shown when
 *   // dbkjs.options.showZoomButtons is true.
 *   // Perhaps parametrize this function in the future to allow more flexible
 *   // button placement.
 *   dbkjs.modules.earthview.createDefaultMobileButton();
 * };
 *
 * API:
 * register(): calls options.onRegister(), which should create GUI
 * activate(): trigger 'activate' event, listens to next onclick on map, open
 *   Google earthview at click position, call deactivate()
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
dbkjs.modules.earthview = {
    id: "dbk.module.earthview",
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

        if(dbkjs.options.earthview && typeof dbkjs.options.earthview.onRegister === "function") {
            dbkjs.options.earthview.onRegister();
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
                me.openEarthView(lonLat);
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
            me.openEarthView(me.incidentLonLat);
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
    openEarthView: function(lonLat) {
        //var url = "https://earth.google.com/web/@[y],[x],4.1972381a,216.26807046d,35y,0h,45t,0r/data=KAI"; // Long adres for auto zoom and helicopterview but without location marker
        var url = "https://earth.google.com/web/search/[y],[x]"; // Simple adres with animated search and location marker
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
                .attr("id", "earthview-a")
                .attr("title", "Open earthview")
                .addClass("btn btn-default olButton")
                .on("click", function() {
                    if(me.active) {
                        dbkjs.modules.earthview.deactivate();
                    } else {
                        $("#map").attr("style", "cursor: crosshair");
                        $("#earthview-a").addClass("btn-primary");
                        dbkjs.modules.earthview.activate();
                    }
                });
        $("<i/>").addClass("fa fa-globe").appendTo(a);
        a.prependTo("#bottom_left_buttons");

        $(dbkjs.modules.earthview).on('deactivate', function() {
            $("#map").attr("style", "");
            $("#earthview-a").removeClass("btn-primary");
        });
    }
};





