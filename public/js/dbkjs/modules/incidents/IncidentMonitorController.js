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
        $("#zoom_extent").click();
    })
    .appendTo('#btngrp_3');

    me.incidentListWindow = new IncidentListWindow();
    me.incidentListWindow.createElements("Incidenten");
    $(me.incidentListWindow).on('show', function() {
        me.button.setAlerted(false);
    });

    me.incidentDetailsWindow = new IncidentDetailsWindow();
    me.incidentDetailsWindow.createElements("Incident");
/*
    $(me.incidentDetailsWindow).on('show', function() {
        me.button.setAlerted(false);
    });
*/
    me.markerLayer = new IncidentMarkerLayer();
    $(me.markerLayer).on('click', function(incident, marker) {
        me.markerClick(incident, marker);
    });
    me.marker = null;

    $(this.service).on('initialized', function() {
        console.log("service init");
        me.addAGSLayers();
    });
}

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

IncidentMonitorController.prototype.markerClick = function(incident, marker) {

    // TODO select incident

    this.incidentDetailsWindow.show();
    this.zoomToIncident();
};

IncidentMonitorController.prototype.enableIncidentUpdates = function() {
    var me = this;

    this.disableIncidentUpdates();

    if(!this.incident) {
        return;
    }

    this.updateIncidentInterval = window.setInterval(function() {
        me.updateIncident(me.incidentId);
    }, 15000);
};

IncidentMonitorController.prototype.disableIncidentUpdates = function() {
    if(this.updateIncidentInterval) {
        window.clearInterval(this.updateIncidentInterval);
        this.updateIncidentInterval = null;
    }
};

IncidentMonitorController.prototype.updateIncident = function(incidentId) {
    var me = this;
    if(this.incidentId !== incidentId) {
        // Incident cancelled or changed since timeout was set, ignore
        return;
    }

    me.service.getAllIncidentInfo(incidentId, false, true)
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
        me.incidentDetailsWindow.data(incident, false, true);

        // Check if updated, enable alert state if true
        var oldIncidentHtml = me.incidentDetailsWindow.getIncidentHtml(me.incident, false, true);
        if(oldIncidentHtml !== me.incidentDetailsWindow.getIncidentHtml(incident, false, true)) {
            if(!me.incidentDetailsWindow.isVisible()) {
                me.button.setAlerted(true);
            }

            me.incident = incident;

            // Possibly update marker position
            me.markerLayer.clear();
            me.markerLayer.addIncident(incident, true);
            me.markerLayer.setZIndexFix();
        }
    });
};
