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
    me.ghor = incidents.options.ghor;

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
        me.getIncidentList();
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
        me.setAllIncidentsRead();
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
    $(me.incidentDetailsWindow).on('hide', function() {
        me.disableIncidentUpdates();
    });

    // Replace "<- Kaart" with button
    me.incidentDetailsWindow.getView().parent().find(".modal-popup-close").remove();
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

    if(!me.ghor) {
        me.vehiclePositionLayer = new VehiclePositionLayer();
    }

    me.failedUpdateTries = 0;

    $(this.service).on('initialized', function() {
        me.addAGSLayers();
        me.getIncidentList();
    });

    window.setInterval(function() {
        me.checkIncidentListOutdated();
    }, 500);
}

IncidentMonitorController.prototype.UPDATE_INTERVAL_MS = 30000;
IncidentMonitorController.prototype.UPDATE_INTERVAL_ERROR_MS = 5000;
IncidentMonitorController.prototype.UPDATE_TRIES = 3;

IncidentMonitorController.prototype.setAllIncidentsRead = function() {
    var me = this;
    me.button.setAlerted(false);
    me.readCurrentIncidentIds = me.currentIncidentIds ? me.currentIncidentIds : [];
};

IncidentMonitorController.prototype.checkUnreadIncidents = function(newCurrentIncidentIds) {
    var me = this;
    if(!me.currentIncidentIds) {
        // First incident list
        me.currentIncidentIds = newCurrentIncidentIds;
        me.readCurrentIncidents = [];

        if(me.currentIncidentIds.length > 0) {
            me.button.setAlerted(true);
        }
        console.log("First incident list, ids: " + me.currentIncidentIds);
    } else {
        $.each(newCurrentIncidentIds, function(i, incidentId) {
            if(me.currentIncidentIds.indexOf(incidentId) === -1) {
                // New incident
                console.log("New incident ", incidentId);
                me.button.setAlerted(true);
                return false;
            }
        });
        me.currentIncidentIds = newCurrentIncidentIds;
    }
};

IncidentMonitorController.prototype.incidentRead = function(incidentId) {
    var me = this;
    if(!me.readCurrentIncidentIds || me.readCurrentIncidentIds.indexOf(incidentId) === -1) {
        // Incident was not read before
        console.log("Incident shown which was not shown before: " + incidentId);
        if(!me.readCurrentIncidentIds) {
            me.readCurrentIncidentIds = [incidentId];
        } else {
            me.readCurrentIncidentIds.push(incidentId);
        }

        // Check if all incidents are now read
        var allRead = true;
        $.each(me.currentIncidentIds, function(i, checkIncidentId) {
            if(me.readCurrentIncidentIds.indexOf(checkIncidentId) === -1) {
                allRead = false;
                return false;
            }
        });
        if(allRead) {
            console.log("All incident ids read");
            me.button.setAlerted(false);
        }
    }
};

/**
 * Add additional AGS layers from config.
 */
IncidentMonitorController.prototype.addAGSLayers = function() {
    var me = this;

    $("#baselayerpanel_b").append('<hr/><label><input type="checkbox" ' + (me.ghor ? '' : 'checked' )+ ' onclick="dbkjs.modules.incidents.controller.setAGSLayersVisibility(event.target.checked)">Toon DBK\'s</label>');

    me.additionalLayers = [];
    if(dbkjs.options.incidents.ags.agsLayers) {
        $.each(dbkjs.options.incidents.ags.agsLayers, function(i, l) {
            var layer = new OpenLayers.Layer.ArcGIS93Rest("DBK"+i, l, { transparent: "true", layers: "hide:0,25", token: me.service.token }, { maxResolution: 0.42, visibility: !me.ghor });
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
    me.incidentRead(me.incidentId);
    me.zoomToIncident();
    if(!me.archief) {
        me.enableIncidentUpdates();
    } else {
        me.disableIncidentUpdates();
    }
};

IncidentMonitorController.prototype.checkIncidentListOutdated = function() {
    var me = this;
    var lastUpdate = new Date().getTime() - me.lastGetIncidentList;
    if(lastUpdate > me.UPDATE_INTERVAL_MS + 5000) {
        console.log("incident list outdated, last updated " + (lastUpdate/1000.0) + "s ago, updating now");
        me.getIncidentList();
    }
};

IncidentMonitorController.prototype.getIncidentList = function() {
    var me = this;

    window.clearTimeout(me.getIncidentListTimeout);
    me.lastGetIncidentList = new Date().getTime();

    var dCurrent = me.service.getCurrentIncidents();
    var dArchived = me.service.getArchivedIncidents(me.highestArchiveIncidentId);

    $.when(dCurrent, dArchived)
    .fail(function(e) {
        window.clearTimeout(me.getIncidentListTimeout);
        me.getIncidentListTimeout = window.setTimeout(function() {
            me.getIncidentList();
        }, me.UPDATE_INTERVAL_ERROR_MS);

        me.failedUpdateTries = me.failedUpdateTries + 1;

        console.log("Error getting incident list, try: " + me.failedUpdateTries + ", error: " + e);

        // Only show error after number of failed tries
        if(me.failedUpdateTries > me.UPDATE_TRIES) {
            var msg = "Kan incidentenlijst niet ophalen na " + me.failedUpdateTries + " pogingen: " + e;
            dbkjs.gui.showError(msg);
            me.button.setIcon("bell-slash");
            me.incidentListWindow.showError(msg);
        }
    })
    .done(function(currentIncidents, archivedIncidents) {
        window.clearTimeout(me.getIncidentListTimeout);
        me.getIncidentListTimeout = window.setTimeout(function() {
            me.getIncidentList();
        }, me.UPDATE_INTERVAL_MS);

        me.failedUpdateTries = 0;
        me.button.setIcon("bell-o");
        $('#systeem_meldingen').hide(); // XXX
        me.processNewArchivedIncidents(archivedIncidents);
        me.incidentListWindow.data(currentIncidents, me.archivedIncidents, true);
        // TODO: only me.incidentListWindow.actueleIncidentIds ?
        me.updateMarkerLayer(currentIncidents);
        me.updateVehiclePositionLayer(currentIncidents);
        me.checkUnreadIncidents(me.incidentListWindow.actueleIncidentIds);
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

IncidentMonitorController.prototype.updateVehiclePositionLayer = function(incidents) {
    var me = this;
    if(me.ghor) {
        return;
    }

    var vehicles = {};
    var haveInzet = false;
    $.each(incidents, function(i, incident) {
        if(incident.actueleInzet) {
            $.each(incident.inzetBrandweerEenheden, function(j, inzet) {
                if(inzet.DTG_EIND_ACTIE === null) {
                    vehicles[inzet.CODE_VOERTUIGSOORT + " " + inzet.ROEPNAAM_EENHEID] = inzet;
                    haveInzet = true;
                }
            });
        }
    });

    //if(haveInzet) {
        me.service.getVehiclePositions()
        .done(function(features) {
            me.vehiclePositionLayer.features(features);
        });
    //} else {
    //    me.vehiclePositionLayer.features([]);
    //}
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
