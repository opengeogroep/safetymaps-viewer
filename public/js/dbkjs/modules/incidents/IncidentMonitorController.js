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
 * Controller for displaying all current incidents.
 *
 * end_incident: inzet for incident was ended (may not trigger for some koppelingen)
 *
 * @param {Object} incidents dbk module
 * @returns {IncidentMonitorController}
 */
function IncidentMonitorController(incidents) {
    var me = this;
    me.service = incidents.service;

    me.createStreetViewButton();

    me.button = new AlertableButton("btn_incidentlist", "Incidentenlijst", "bell-o");
    me.button.getElement().appendTo('#btngrp_3');
    $(me.button).on('click', function() {
        me.incidentListWindow.show();
    });

    $('<a></a>')
    .attr({
        'id': 'btn_openreset',
        'class': 'btn btn-default navbar-btn',
        'href': '#',
        'title': 'Reset'
    })
    .append('<i class="fa fa-repeat" style="width: 27.5px"></i>')
    .click(function(e) {
        me.incidentDetailsWindow.hide();
        if(me.selectedIncidentMarker) {
            me.markerLayer.removeMarker(me.selectedIncidentMarker);
            me.selectedIncidentMarker = null;
        }
        $("#zoom_extent").click();
    })
    .appendTo('#btngrp_3');

    me.incidentListWindow = new IncidentListWindow();
    me.incidentListWindow.createElements("Incidenten");
    $(me.incidentListWindow).on('show', function() {
        me.button.setAlerted(false);
    });
    $(me.incidentListWindow).on('click', function(e, obj) {
        me.selectIncident(obj);
    });

    me.incidentDetailsWindow = new IncidentDetailsWindow();
    me.incidentDetailsWindow.createElements("Incident");
    me.incidentDetailsWindow.setSplitScreen($(window).width() > 700);
    $(window).on('resize', function() {
        me.incidentDetailsWindow.setSplitScreen($(window).width() > 700);
    });
    $(me.incidentDetailsWindow).on('show', function() {
        me.button.setAlerted(false);
    });
    $(me.incidentDetailsWindow).on('hide', function() {
        me.disableIncidentUpdates();
    });

    // Replace "<- Kaart" with button
    me.incidentDetailsWindow.getView().parent().find(".modal-popup-close").remove()
    $("<button class='btn btn-primary' style='float: left; margin: 5px'><i class='fa fa-arrow-left'></i></button>")
    .prependTo(me.incidentDetailsWindow.getView().parent())
    .click(function() {
        me.incidentDetailsWindow.hide();
    });

    me.markerLayer = new IncidentMarkerLayer();
    $(me.markerLayer).on('click', function(e, obj) {
        me.selectIncident(obj);
    });
    me.marker = null;

    $(this.service).on('initialized', function() {
        me.addAGSLayers();
        me.getIncidentList();
    });
}

IncidentMonitorController.prototype.createStreetViewButton = function() {
    var me = this;

    var clicked = false;
    var div = $("<div/>").attr("style", "position: absolute; left: 20px; bottom: 143px; z-index: 3000");
    var a = $("<a/>")
            .attr("id", "streetview-a")
            .attr("title", "Open StreetView")
            .addClass("btn btn-default olButton")
            .attr("style", "display: block; font-size: 24px")
            .on("click", function() {
                if(clicked) {
                    $("#mapc1map1").attr("style", "");
                    $("#streetview-a").removeClass("btn-primary");
                } else {
                    $("#mapc1map1").attr("style", "cursor: crosshair");
                    $("#streetview-a").addClass("btn-primary");
                }
                clicked = !clicked;
            });
    $("<i/>").addClass("fa fa-street-view").appendTo(a);
    a.appendTo(div);
    div.appendTo("#mapc1map1");

    var handler = function(event) {
        if(clicked) {
            $("#streetview-a").click();
            clicked = false;
            var lonLat = dbkjs.map.getLonLatFromPixel(event.xy);
            Proj4js.defs["EPSG:28992"] = "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.237,50.0087,465.658,-0.406857,0.350733,-1.87035,4.0812 +units=m +no_defs";
            Proj4js.defs["EPSG:4236"] = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs ";
            var p = new Proj4js.Point(lonLat.lon, lonLat.lat);
            var t = Proj4js.transform(new Proj4js.Proj("EPSG:28992"), new Proj4js.Proj("EPSG:4236"), p);
            var url = "http://maps.google.nl/maps?q=[y],[x]&z=16&layer=c&cbll=[y],[x]&cbp=12,0,,0,0";
            url = url.replace(/\[x\]/g, t.x);
            url = url.replace(/\[y\]/g, t.y);
            console.log("StreetView URL: " + url);
            window.open(url);
        }
    };

    dbkjs.map.events.register("click", me, handler);
    dbkjs.map.events.register("touchstart", me, handler);
};

/**
 * Add additional AGS layers from config.
 */
IncidentMonitorController.prototype.addAGSLayers = function() {
    var me = this;

    $("#baselayerpanel_b").append('<hr/><label><input type="checkbox" checked onclick="dbkjs.modules.incidents.controller.setAGSLayersVisibility(event.target.checked)">Toon DBK\'s</label>');

    me.additionalLayers = [];
    if(dbkjs.options.incidents.ags.agsLayers) {
        $.each(dbkjs.options.incidents.ags.agsLayers, function(i, l) {
            var layer = new OpenLayers.Layer.ArcGIS93Rest("DBK"+i, l, { transparent: "true", layers: "hide:0,25", token: me.service.token }, { maxResolution: 0.42 });
            dbkjs.map.addLayer(layer);
            me.additionalLayers.push(layer);
        });
    }

    $(me.service).on('token', function(e, token) {
        $.each(me.additionalLayers, function(i, l) {
            l.params.TOKEN = token;
        });
    });
};

IncidentMonitorController.prototype.setAGSLayersVisibility = function(visible) {
    $.each(this.additionalLayers, function(i, l) {
        l.setVisibility(visible);
    });
};

IncidentMonitorController.prototype.zoomToIncident = function() {
    if(this.incident && this.incident.T_X_COORD_LOC && this.incident.T_Y_COORD_LOC) {
        dbkjs.map.setCenter(new OpenLayers.LonLat(this.incident.T_X_COORD_LOC, this.incident.T_Y_COORD_LOC), dbkjs.options.zoom);
    }
};

IncidentMonitorController.prototype.selectIncident = function(obj) {
    var me = this;
    if(me.selectedIncidentMarker) {
        me.markerLayer.removeMarker(me.selectedIncidentMarker);
    }

    me.incident = obj.incident;
    me.archief = !!obj.archief;
    if(obj.addMarker) {
        me.selectedIncidentMarker = me.markerLayer.addIncident(me.incident, true);
    }
    me.incidentId = obj.incident.INCIDENT_ID;
    me.incidentDetailsWindow.data("Ophalen incidentgegevens...");
    me.updateIncident(me.incidentId, me.archief);
    me.incidentDetailsWindow.show();
    me.zoomToIncident();
    if(!me.archief) {
        me.enableIncidentUpdates();
    } else {
        me.disableIncidentUpdates();
    }
};

IncidentMonitorController.prototype.getIncidentList = function() {
    var me = this;

    var dCurrent = me.service.getCurrentIncidents();
    var dArchived = me.service.getArchivedIncidents(me.highestArchiveIncidentId);

    $.when(dCurrent, dArchived)
    .always(function() {
        me.getIncidentListTimeout = window.setTimeout(function() {
            me.getIncidentList();
        }, 30000);
    })
    .fail(function(e) {
        var msg = "Kan incidentenlijst niet ophalen: " + e;
        dbkjs.gui.showError(msg);
        me.button.setIcon("bell-slash");
        me.incidentListWindow.showError(msg);
    })
    .done(function(currentIncidents, archivedIncidents) {
        me.processNewArchivedIncidents(archivedIncidents);
        me.incidentListWindow.data(currentIncidents, me.archivedIncidents, true);
        me.updateMarkerLayer(currentIncidents);
    });
};

IncidentMonitorController.prototype.processNewArchivedIncidents = function(archivedIncidents) {
    var me = this;

    // Save highest ID to request only new archived incidents with higher ID
    // next time
    me.highestArchiveIncidentId = archivedIncidents.highestIncidentId;

    // Update archived incident list
    me.archivedIncidents = archivedIncidents.incidents.concat(me.archivedIncidents ? me.archivedIncidents : []);

    // Remove old archived incidents (start incident more than 24 hours ago)
    var cutoff = new moment().subtract(24, 'hours');
    var list = [];
    $.each(me.archivedIncidents, function(i, incident) {
        var incidentStart = me.service.getAGSMoment(incident.DTG_START_INCIDENT);
        if(!incidentStart.isBefore(cutoff)) {
            list.push(incident);
        }
    });
    me.archivedIncidents = list;
};

IncidentMonitorController.prototype.updateMarkerLayer = function(incidents) {
    var me = this;
    me.markerLayer.clear();
    $.each(incidents, function(i, incident) {
        if(incident.actueleInzet) {
            me.markerLayer.addIncident(incident, false);
        }
    });
    if(me.selectedIncidentMarker) {
        me.selectedIncidentMarker = me.markerLayer.addIncident(me.incident, true);
    }
    me.markerLayer.setZIndexFix();
};

IncidentMonitorController.prototype.enableIncidentUpdates = function() {
    var me = this;

    this.disableIncidentUpdates();

    if(!this.incident) {
        return;
    }

    this.updateIncidentInterval = window.setInterval(function() {
        me.updateIncident(me.incidentId, me.archief);
    }, 15000);
};

IncidentMonitorController.prototype.disableIncidentUpdates = function() {
    if(this.updateIncidentInterval) {
        window.clearInterval(this.updateIncidentInterval);
        this.updateIncidentInterval = null;
    }
};

IncidentMonitorController.prototype.updateIncident = function(incidentId, archief) {
    var me = this;
    if(this.incidentId !== incidentId) {
        // Incident cancelled or changed since timeout was set, ignore
        return;
    }

    me.service.getAllIncidentInfo(incidentId, archief, false)
    .fail(function(e) {
        var msg = "Kan incidentinfo niet updaten: " + e;
        dbkjs.gui.showError(msg);
        // Leave incidentDetailsWindow contents with old info
    })
    .done(function(incident) {
        if(me.incidentId !== incidentId) {
            // Incident cancelled or changed since request was fired off, ignore
            return;
        }

        // Always update window, updates moment.fromNow() times
        me.incidentDetailsWindow.data(incident, true, true);
    });
};
