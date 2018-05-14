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

/* global dbkjs, AGSInscidentService */

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

    var params = OpenLayers.Util.getParameters();
    me.falck = params.webservice === "true" || window.location.pathname === "/opl/";
    me.toonZonderEenheden = incidents.options.toonZonderEenheden;

    me.kb = false;
    $.ajax("kb", { cache: false } )
    .always(function(jqXHR) {
        if(jqXHR.status === 404) {
            console.log("KB access!");
            me.kb = true;
            incidents.options.hideKladblok = true;
        } else if(jqXHR.status !== 403) {
            console.log("Unexpected status: " + jqXHR + " " + jqXHR.statusText, jqXHR.responseText);
        } else {
            console.log("No KB access!");
        }
    });

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

    var selectLayers = [];

    if(!me.ghor) {
        me.vehiclePositionLayer = new VehiclePositionLayer();
        selectLayers.push(me.vehiclePositionLayer.layer);
    } else {
        me.ghorFilterStandard = false;


        $('<a></a>')
        .attr({
            'id': 'btn_standardfilter',
            'class': 'btn btn-default navbar-btn',
            'href': '#',
            'title': 'Filter standaardincidenten'
        })
        .append('<i class="fa fa-filter" style="width: 27.5px"></i>')
        .click(function(e) {
            me.ghorFilterStandardClick();
        })
        .appendTo('#btngrp_3');
    }

    me.markerLayer = new IncidentVectorLayer(true);
    selectLayers.push(me.markerLayer.layer);
    $(me.markerLayer).on('click', function(e, obj) {
        me.selectIncident(obj);
    });
    me.marker = null;

    me.addSelectLayers(selectLayers);

    me.failedUpdateTries = 0;

    me.archivedIncidents = [];

    me.checkFalckEnabledByAuthz()
            .always(function() {
        $(me.service).on('initialized', function() {
            me.addAGSLayers();
            me.getIncidentList();
        });

        window.setInterval(function() {
            me.checkIncidentListOutdated();
        }, 500);
    });
};

IncidentMonitorController.prototype.checkFalckEnabledByAuthz = function() {
    var me = this;
    var d = $.Deferred();

    $.ajax("webservice_enabled", { cache: false } )
    .always(function(jqXHR) {
        if(jqXHR.status === 404) {
            console.log("Webservice enabled by authz!");
            me.falck = true;
            d.resolve();
        } else if(jqXHR.status !== 403) {
            console.log("Unexpected status: " + jqXHR + " " + jqXHR.statusText, jqXHR.responseText);
            d.resolve();
        } else {
            console.log("Webservice not enabled by authz, webservice enabled by param: " + me.falck);
            d.resolve();
        }
    });
    return d.promise();
};

IncidentMonitorController.prototype.UPDATE_INTERVAL_MS = 30000;
IncidentMonitorController.prototype.UPDATE_INTERVAL_ERROR_MS = 5000;
IncidentMonitorController.prototype.UPDATE_TRIES = 3;

IncidentMonitorController.prototype.addSelectLayers = function(layers) {
    dbkjs.selectControl.deactivate();
    dbkjs.selectControl.setLayer(layers);
    dbkjs.selectControl.activate();
};

IncidentMonitorController.prototype.ghorFilterStandardClick = function() {
    var me = this;
    me.ghorFilterStandard = !me.ghorFilterStandard;
    $("a#btn_standardfilter").toggleClass("active", me.ghorFilterStandard).blur();

    me.updateInterface();
};

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
            var layer = new OpenLayers.Layer.ArcGIS93Rest("DBK"+i, l.url, $.extend(l.params || {}, { transparent: "true", token: me.service.token }), { maxResolution: 0.42, visibility: !me.ghor });
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
    var x, y;

    if(!this.incident) {
        return;
    }

    if(this.falck) {
        x = this.incident.IncidentLocatie.XCoordinaat;
        y = this.incident.IncidentLocatie.YCoordinaat;
    } else {
        var xy = AGSIncidentService.prototype.getIncidentXY(this.incident);
        x = xy.x, y = xy.y;
    }

    if(x && y) {
        dbkjs.map.setCenter(new OpenLayers.LonLat(x, y), dbkjs.options.zoom);
    }
};

IncidentMonitorController.prototype.selectIncident = function(obj) {
    var me = this;
    if(me.selectedIncidentMarker) {
        me.markerLayer.removeMarker(me.selectedIncidentMarker);
    }

    me.incident = obj.incident;
    me.incidentId = me.incident.INCIDENT_ID || me.incident.IncidentNummer;
    console.log("Select incident " + me.incidentId + ", addMarker=" + obj.addMarker);
    if(obj.addMarker) {
        me.selectedIncidentMarker = me.markerLayer.addIncident(me.incident, true);
    }
    me.incidentDetailsWindow.data("Ophalen incidentgegevens...");
    me.updateIncident(me.incidentId, me.incident.archief, false);
    $("#t_twitter_title").text("Twitter");
    $("#tab_twitter").html("");
    me.incidentDetailsWindow.show();
    me.incidentRead(me.incidentId);
    me.zoomToIncident();
    if(!obj.addMarker) {
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

IncidentMonitorController.prototype.incidentFilter = function(incident) {
    var me = dbkjs.modules.incidents.controller;
    if(me.ghor) {
        if(incident.inzetEenhedenStats.B.total === 0 && incident.inzetEenhedenStats.A.total === 0) {
            return false;
        }
        if(me.ghorFilterStandard) {
            return !incident.inzetEenhedenStats.standard;
        } else {
            return true;
        }
    } else {
        return me.toonZonderEenheden || (incident.actueleInzet || incident.beeindigdeInzet || incident.inzetEenhedenStats.B.total !== 0);
    }
};

IncidentMonitorController.prototype.updateInterface = function() {
    var me = this;
    if(!me.currentIncidents) {
        return;
    }

    // Filter current and archived with criteria for both
    var archivedFiltered = $.grep(me.archivedIncidents, me.incidentFilter);

    var currentFiltered = $.grep(me.currentIncidents, me.incidentFilter);

    // Active incident: current and actueleInzet
    // Inactive incident: (current and !actueleInzet) or archived
    var active = [];
    var inactive = [];
    $.each(currentFiltered, function(i, incident) {
        if(incident.actueleInzet) {
            active.push(incident);
        } else if(incident.beeindigdeInzet || me.toonZonderEenheden) {
            if(!me.falck) {
                incident.inzetEenhedenStats = me.service.getInzetEenhedenStats(incident, true);
            }
            inactive.push(incident);
        }
    });
    if(!me.falck) {
        // Voeg gearchiveerde incidenten toe aan inactive indien niet al vanuit
        // current incidents met beeindigde inzet
        $.each(archivedFiltered, function(i, incident) {
            var duplicate = false;
            $.each(inactive, function(j, iIncident) {
                if(iIncident.INCIDENT_ID === incident.INCIDENT_ID) {
                    duplicate = true;
                    return false;
                }
            });
            if(!duplicate) {
                inactive.push(incident);
            }
        });
    } else {
        inactive = inactive.concat(archivedFiltered);
        inactive.sort(function(lhs, rhs) {
            return rhs.start.valueOf() - lhs.start.valueOf();
        });
    }

    me.actueleIncidentIds = $.map(active, function(incident) { return incident.INCIDENT_ID || incident.IncidentNummer; });

    if(!me.falck) {
        // Remove duplicate incidents
        inactive = $.grep(inactive, function(incident) {
            return me.actueleIncidentIds.indexOf(incident.INCIDENT_ID) === -1;
        });

        inactive.sort(function(lhs, rhs) {
            return rhs.DTG_START_INCIDENT - lhs.DTG_START_INCIDENT;
        });
    }

    me.incidentListWindow.data(active, inactive, true);
    me.updateMarkerLayer(active);
    me.updateVehiclePositionLayer(active);
};

IncidentMonitorController.prototype.getIncidentList = function() {
    var me = this;

    window.clearTimeout(me.getIncidentListTimeout);
    me.lastGetIncidentList = new Date().getTime();

    if(me.falck) {
        me.getIncidentListFalck();
    } else {
        me.getIncidentListAGS();
    }
}

IncidentMonitorController.prototype.getIncidentListAGS = function() {
    var me = this;

    var dCurrent = me.service.getCurrentIncidents();
    var dArchived = me.service.getArchivedIncidents(dbkjs.options.incidents.cacheArchivedIncidents ? me.archivedIncidents : null);

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
        $.each(currentIncidents.concat(archivedIncidents), function(i, incident) {
            me.normalizeIncidentFields(incident);
        });
        me.processNewArchivedIncidents(archivedIncidents);
        me.currentIncidents = currentIncidents;
        me.updateInterface();
        me.checkUnreadIncidents(me.actueleIncidentIds);
    });
};

IncidentMonitorController.prototype.getIncidentListFalck = function() {
    var me = this;

    $.ajax('gms/incident', {
        dataType: "json",
        data: {
            extended: true
        },
        cache: false
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        window.clearTimeout(me.getIncidentListTimeout);
        me.getIncidentListTimeout = window.setTimeout(function() {
            me.getIncidentList();
        }, me.UPDATE_INTERVAL_ERROR_MS);

        me.failedUpdateTries = me.failedUpdateTries + 1;

        console.log("Error getting incident list, try: " + me.failedUpdateTries + ", error: " + AGSIncidentService.prototype.getAjaxError(jqXHR, textStatus, errorThrown));

        // Only show error after number of failed tries
        if(me.failedUpdateTries > me.UPDATE_TRIES) {
            var msg = "Kan incidentenlijst niet ophalen na " + me.failedUpdateTries + " pogingen: " + e;
            dbkjs.gui.showError(msg);
            me.button.setIcon("bell-slash");
            me.incidentListWindow.showError(msg);
        }
    })
    .done(function(data) {
        window.clearTimeout(me.getIncidentListTimeout);
        me.getIncidentListTimeout = window.setTimeout(function() {
            me.getIncidentList();
        }, me.UPDATE_INTERVAL_MS);

        me.failedUpdateTries = 0;
        me.button.setIcon("bell-o");
        $('#systeem_meldingen').hide(); // XXX

        me.incidents = data;
        me.processFalckIncidents();
        me.updateInterface();
        me.checkUnreadIncidents(me.actueleIncidentIds);
    });
};

IncidentMonitorController.prototype.processFalckIncidents = function() {
    var me = this;

    me.currentIncidents = [];
    me.archivedIncidents = [];

    $.each(me.incidents, function(i, incident) {
        me.normalizeIncidentFields(incident);

        if(incident.Actueel) {
            me.currentIncidents.push(incident);
        } else {
            // Zorg dat niet direct 'endIncident' wordt afgevuurd bij bekijken niet-actueel incident
            incident.archief = true;
            me.archivedIncidents.push(incident);
        }
    });
};

IncidentMonitorController.prototype.normalizeIncidentFields = function(incident) {
    if(this.falck) {
        FalckIncidentsController.prototype.normalizeIncidentFields(incident);
    } else {
        AGSIncidentService.prototype.normalizeIncidentFields(incident);
    }
};

IncidentMonitorController.prototype.processNewArchivedIncidents = function(archivedIncidents) {
    var me = this;

    if(!dbkjs.options.incidents.cacheArchivedIncidents) {
        me.archivedIncidents = archivedIncidents;
        return;
    }

    console.log("Huidig aantal gearchiveerde incidenten: " + me.archivedIncidents.length + ", nieuw ontvangen: " + archivedIncidents.length);
    me.archivedIncidents = archivedIncidents.concat(me.archivedIncidents);

    // Remove old archived incidents (start incident more than 24 hours ago)
    var cutoff = new moment().subtract(24, 'hours');
    me.archivedIncidents = $.grep(me.archivedIncidents, function(incident) {
        var incidentStart = me.service.getAGSMoment(incident.DTG_START_INCIDENT);
        if(incidentStart.isBefore(cutoff)) {
            console.log("Verwijder oud incident begonnen op " + incidentStart.format("D-M-YYYY HH:mm") + " voor 24u cutoff van " + cutoff.format("D-M-YYYY HH:mm"));
        }
        return !incidentStart.isBefore(cutoff);
    });
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

    var incidentIds = $.map(incidents, function(i) { return i.id; });

    me.service.getVehiclePositions(incidentIds)
    .done(function(features) {
        me.vehiclePositionLayer.features(features);
    });
};

IncidentMonitorController.prototype.enableIncidentUpdates = function() {
    var me = this;

    this.disableIncidentUpdates();

    if(!this.incident) {
        return;
    }

    this.updateIncidentInterval = window.setInterval(function() {
        me.updateIncident(me.incidentId, me.incident.archief, true);
    }, 15000);
};

IncidentMonitorController.prototype.disableIncidentUpdates = function() {
    if(this.updateIncidentInterval) {
        window.clearInterval(this.updateIncidentInterval);
        this.updateIncidentInterval = null;
    }
};

IncidentMonitorController.prototype.updateIncident = function(incidentId, archief, isUpdate) {
    var me = this;
    if(this.incidentId !== incidentId) {
        // Incident cancelled or changed since timeout was set, ignore
        return;
    }

    console.log("Get incident info for " + incidentId + ", archief=" + archief);

    if(me.falck) {
        me.updateIncidentFalck(incidentId, archief, isUpdate);
    } else {
        me.updateIncidentAGS(incidentId, archief, isUpdate);
    }
};

IncidentMonitorController.prototype.updateIncidentFalck = function(incidentId, archief, isUpdate) {
    var me = this;

    $.ajax('gms/incident/' + incidentId, {
        dataType: "json",
        data: {
            extended: true
        },
        cache: false
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        var msg = "Kan incidentinfo niet updaten: " + AGSIcidentService.prototype.getAjaxError(jqXHR, textStatus, errorThrown);
        dbkjs.gui.showError(msg);
        // Leave incidentDetailsWindow contents with old info

    })
    .done(function(data) {

        if(me.incidentId !== data[0].IncidentNummer) {
            return;
        }

        me.incident = data[0];
        me.normalizeIncidentFields(me.incident);

        if(!archief && !me.incident.Actueel) {
            me.endIncident();
            return;
        }

        me.incidentDetailsWindow.data(me.incident, true, true);

        // Do not update tweets every time incident data updated, reduce number
        // of API calls to avoid API limits
        if(!isUpdate && !!dbkjs.modules.incidents.options.showTwitter) {
            me.loadTweets(incidentId, me.incident);
        }
    });
};

IncidentMonitorController.prototype.updateIncidentAGS = function(incidentId, archief, isUpdate) {
    var me = this;

    me.service.getAllIncidentInfo(incidentId, archief, false, !me.kb)
    .fail(function(e) {
        var msg = "Kan incidentinfo niet updaten: " + e;
        dbkjs.gui.showError(msg);
        // Leave incidentDetailsWindow contents with old info
    })
    .done(function(incident) {
        if(incident === null) {
            me.endIncident();
            return;
        }
        if(me.incidentId !== incidentId) {
            // Incident cancelled or changed since request was fired off, ignore
            return;
        }

        me.incident = incident;
        me.normalizeIncidentFields(me.incident);

        // Always update window, updates moment.fromNow() times
        me.incidentDetailsWindow.data(incident, true, true);

        // Do not update tweets every time incident data updated, reduce number
        // of API calls to avoid API limits
        if(!isUpdate && !!dbkjs.modules.incidents.options.showTwitter) {
            me.loadTweets(incidentId, incident);
        }
    });
};

IncidentMonitorController.prototype.endIncident = function() {
    var me = this;
    me.disableIncidentUpdates();
    me.incidentId = null;
    me.incident = null;
    me.incidentDetailsWindow.hide();
    $("#zoom_extent").click();
};

IncidentMonitorController.prototype.loadTweets = function(incidentId, incident) {
    var me = this;

    if(typeof window.twttr === 'undefined') {
        window.twttr = (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0],
                t = window.twttr || {};
            if (d.getElementById(id)) return t;
            js = d.createElement(s);
            js.id = id;
            js.src = "https://platform.twitter.com/widgets.js";
            fjs.parentNode.insertBefore(js, fjs);
            t._e = [];
            t.ready = function(f) {
                t._e.push(f);
            };
            return t;
        }(document, "script", "twitter-wjs"));
        twttr.ready(function(twttr) {
            me.loadTweets(incidentId, incident);
        });
    }

    var pos = AGSIncidentService.prototype.getIncidentXY(incident);

    var p = new Proj4js.Point(pos.x, pos.y);
    var t = Proj4js.transform(new Proj4js.Proj(dbkjs.options.projection.code), new Proj4js.Proj("EPSG:4326"), p);

    console.log("Loading tweets for incident, geo=", t);

    $("#t_twitter_title").text("Twitter (...)");

    var terms = [];
    var address;
    if(me.falck) {
        var l = incident.IncidentLocatie;
        address = '"' + l.NaamLocatie1 + '"';
        if(l.Plaatsnaam) {
            terms.push(l.Plaatsnaam === "'s-Gravenhage" ? "Den Haag" : l.Plaatsnaam);
        }
        if(l.NaamLocatie2 && l.NaamLocatie1 !== l.NaamLocatie2) {
            terms = terms.concat(l.NaamLocatie2.split(" "));
        }
    } else {
        address = '"' + incident.NAAM_LOCATIE1 + '"';
        if(incident.PLAATS_NAAM) {
            terms.push(incident.PLAATS_NAAM === "'s-Gravenhage" ? "Den Haag" : incident.PLAATS_NAAM);
        }
        if(incident.PLAATS_NAAM_NEN) {
            terms.push(incident.PLAATS_NAAM_NEN === "'s-Gravenhage" ? "Den Haag" : incident.PLAATS_NAAM_NEN);
            }
        if(incident.NAAM_LOCATIE2 && incident.NAAM_LOCATIE1 !== incident.NAAM_LOCATIE2) {
            terms = terms.concat(incident.NAAM_LOCATIE2.split(" "));
        }
    }

    if(incident.classificaties) {
        var classificaties = incident.classificaties.split(", ");
        $.each(classificaties, function(i, c) {
            var classificatieTerms = {
                "Alarm": true,
                "Brandgerucht": "brand brandweer rook",
                "Stormschade": "storm",
                "Onweer": true,
                "Windstoten": true,
                "Brand": "brand brandweer rook",
                "Heidebrand": true,
                "Liftopsluiting": "lift",
                "Vuurwerk": true,
                "Veenbrand": true,
                "Dier in problemen": true,
                "Bosbrand": true,
                "Nacontrole": true,
                "Nablussen": true,
                "Brandweer": true,
                "Wateroverlast": true,
                "Gladheid/Sneeuw": true,
                "Persoon te water": true,
                "Vervuild wegdek": true,
                "Rookmelder": true,
                "Duinbrand": true,
                "Stank": true,
                "Verontreiniging": true,
                "Ongeval": true,
                "Loslopende dieren": true,
                "Gladheid": true,
                "Voertuig te water": true,
                "Reanimatie": true
            };
            var v = classificatieTerms[c];
            if(typeof v !== "undefined") {
                if(typeof v === "string") {
                    terms = terms.concat(v.split(" "));
                } else {
                    terms.push(c);
                }
            }
        });
    }
    var karakteristieken = [];

    if(incident.karakteristiek) {
        $.each(incident.karakteristiek, function(i, k) {
            karakteristieken.push({ naam: k.NAAM_KARAKTERISTIEK, values: k.ACTUELE_KAR_WAARDE.split("/") });
        });
    }
    if(incident.Karakteristieken) {
        $.each(incident.Karakteristieken, function(i, k) {
            karakteristieken.push({ naam: k.Naam, values: k.Waarden });
        });
    }

    $.each(karakteristieken, function(i, k) {
        var karakteristiekenTerms = [
            "Soort dier",
            "Soort voertuig",
            "OMS oorzaak",
            "Soort bedrijf/Inst.",
            "Onderdeel gebouw",
            "Soort stormschade",
            "Soort ongeval",
            "Soort vaartuig",
            "Soort lucht",
            "Inzet brw",
            "Soort persoon.",
            "Soort brandstof"
        ];
        if(karakteristiekenTerms.indexOf(k.naam) !== -1) {
            terms = terms.concat(k.values);
        }
        if(k.naam === "GRIP") {
            terms.push("GRIP");
        }
    });

    function checkSoort(soort) {
        if(soort && soort.indexOf("MMT") !== -1) {
            terms.push("MMT");
            terms.push("heli");
            return false;
        }
    }
    if(incident.inzetEenheden) {
        $.each(incident.inzetEenheden, function(i, e) {
            return checkSoort(e.CODE_VOERTUIGSOORT);
        });
    }
    if(incident.BetrokkenEenheden) {
        $.each(incident.BetrokkenEenheden, function(i, e) {
            return checkSoort(e.InzetRol);
        });
    }

    var start = me.falck ? new moment(incident.BrwDisciplineGegevens.StartDTG) : AGSIncidentService.prototype.getAGSMoment(incident.DTG_START_INCIDENT);
    var params = {
        incidentId: incidentId,
        location: t.y + "," + t.x,
        startTime: start.format("X"),
        terms: JSON.stringify(terms),
        address: address
    };
    if(incident.DTG_EINDE_INCIDENT) {
        params.endTime = AGSIncidentService.prototype.getAGSMoment(incident.DTG_EINDE_INCIDENT).format("X");
    }

    // Remove fixed height used for keeping previous scrollTop
    $("#tab_twitter").css("height", "");

    $.ajax((dbkjs.options.incidents.twitterUrlPrefix ? dbkjs.options.incidents.twitterUrlPrefix : "") + "action/twitter", {
        dataType: "json",
        data: params
    }).fail(function(jqXHR, textStatus, errorThrown) {
        $("#t_twitter_title").text("Twitter (!)")
        $("#tab_twitter").text(me.service.getAjaxError(jqXHR, textStatus, errorThrown));
    }).done(function(data) {
        console.log("Twitter search response", data);

        // Fix height to scrollTop does not get reset when clearing div
        $("#tab_twitter").css("height", $("#tab_twitter").height());
        $("#tab_twitter").html("");

        if(!data.result) {
            $("#tab_twitter").html("Fout in server-component bij ophalen tweets");
        } else if(data.response.errors) {
            $("#tab_twitter").html(JSON.stringify(data.response.errors));
        } else {
            var statuses = data.response.statuses;

            var tweets = 0;

            var endCutoff = null;
            if(incident.DTG_EINDE_INCIDENT) {
                endCutoff = AGSIncidentService.prototype.getAGSMoment(incident.DTG_EINDE_INCIDENT);
            }
            if(incident.EindeDTG) {
                endCutoff = new moment(incident.EindeDTG);
            }

            var displayedTweets = [];
            var ignoredAccounts = dbkjs.options.incidents.twitterIgnoredAccounts || [];

            function filterTweet(status) {
                return ignoredAccounts.indexOf(status.user.screen_name) !== -1 || status.user.screen_name.toLowerCase().indexOf("p2000") !== -1;
            }

            function twitterMoment(date) {
                return new moment(date, "ddd MMM DD HH:mm:ss ZZ YYYY", "en");
            }

            $.each(statuses, function(i, status) {
                var createdAt = twitterMoment(status.created_at);
                if(createdAt.isAfter(start) && (!endCutoff || createdAt.isBefore(endCutoff))) {
                    if(status.geo && displayedTweets.indexOf(status.text) === -1) {
                        if(!filterTweet(status)) {
                            displayedTweets.push(status.text);
                            var p2 = new Proj4js.Point(status.geo.coordinates[1], status.geo.coordinates[0]);
                            var t2 = Proj4js.transform(new Proj4js.Proj("EPSG:4326"), new Proj4js.Proj(dbkjs.options.projection.code), p2);
                            var distance = Math.sqrt(Math.pow(t2.x - pos.x, 2) + Math.pow(t2.y - pos.y, 2))
                            console.log("Tweet " + status.text + " at " + t2.x + "," + t2.y + ", distance " + distance + "m");
                            var el = $("<div id='tweet_" + status.id + "'>Afstand: " + Math.round(distance) + " meter</div>");
                            el.appendTo("#tab_twitter");
                            twttr.widgets.createTweet(status.id_str, document.getElementById("tweet_" + status.id),  { conversation: "none", width: 530, lang: "nl" } );
                            tweets++;
                        } else {
                            console.log("Filtering geo tweet user: " + status.user.screen_name, status);
                        }
                    }
                }
            });
            if(data.responseTerms && data.responseTerms.statuses.length > 0) {
                $("<div id='tweet_" + status.id + "'>Tweets tijdens incident op basis van zoektermen <i>" + address + ", " + terms.join(", ") + "</i></div>").appendTo("#tab_twitter");
                $.each(data.responseTerms.statuses, function(i, status) {
                    var createdAt = twitterMoment(status.created_at);
                    if(createdAt.isAfter(start) /*&& (!endCutoff || createdAt.isBefore(endCutoff))*/) {
                        var text = status.retweeted_status ? status.retweeted_status.text : status.text;
                        if(displayedTweets.indexOf(text) === -1) {
                            if(!filterTweet(status) && (!status.retweeted_status || !filterTweet(status.retweeted_status))) {
                                displayedTweets.push(text);
                                console.log("Tweet matching terms: " + text, status);
                                twttr.widgets.createTweet(status.id_str, document.getElementById("tab_twitter"),  { conversation: "none", width: 530, lang: "nl" } );
                                tweets++;
                            } else {
                                console.log("Filtering search term tweet user: " + status.user.screen_name, status);
                            }
                        }
                    }
                });
            } else {
                $("<div id='tweet_" + status.id + "'>Geen tweets tijdens incident gevonden op basis van zoektermen <i>" + address + ", " + terms.join(", ") + "</i></div>").appendTo("#tab_twitter");
            }

            $("#t_twitter_title").text("Twitter (" + tweets + ")");

        }

    });
};
