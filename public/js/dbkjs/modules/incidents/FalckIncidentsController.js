/*
 *  Copyright (c) 2016 B3Partners (info@b3partners.nl)
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
 * Controller for displaying incident info from Falck service.
 *
 * Events:
 *
 * @param {Object} incidents dbk module
 * @returns {FalckIncidentsController}
 */
function FalckIncidentsController(incidents) {
    var me = this;
    me.first = true;
    me.options = dbkjs.options.incidents;

    me.button = new AlertableButton("btn_incident", "Incident", "bell-o");
    me.button.getElement().prependTo('.layertoggle-btn-group');

    $(me.button).on('click', function() {
        me.incidentDetailsWindow.show();
        //me.zoomToIncident();
    });

    me.incidentDetailsWindow = new IncidentDetailsWindow();
    me.incidentDetailsWindow.createElements("Incident");
    $(me.incidentDetailsWindow).on('show', function() {
        me.button.setAlerted(false);
    });

    me.markerLayer = new IncidentMarkerLayer();
    $(me.markerLayer).on('click', function(incident, marker) {
        me.markerClick(incident, marker);
    });
    me.marker = null;

    me.voertuignummer = window.localStorage.getItem("voertuignummer");

    me.xml = null;

    $('.dbk-title').on('click', function() {
        if(me.selectedDbkFeature) {
            if(dbkjs.options.feature.identificatie !== me.selectedDbkFeature.attributes.identificatie) {
                dbkjs.modules.feature.handleDbkOmsSearch(me.selectedDbkFeature);
            } else {
                dbkjs.modules.feature.zoomToFeature(me.selectedDbkFeature);
            }
        } else {
            me.zoomToIncident();
        }
    });

    $(dbkjs).one("dbkjs_init_complete", function() {
        window.setTimeout(function() {
            me.addConfigControls();
            me.getVoertuignummers();
            me.setVoertuignummer(me.voertuignummer, true);
        }, 1000);
    });
};

/**
 * Add controls to configuration window.
 */
FalckIncidentsController.prototype.addConfigControls = function() {
    var me = this;
    var incidentSettings = $("<div><h4>Meldkamerkoppeling</h4><p/>" +
            "<div class='row'><div class='col-xs-12'>Voertuignummer: <input type='text' id='input_voertuignummer'>" +
            "</div></div><p/><p/><hr>");
    incidentSettings.insertAfter($("#settingspanel_b hr:last"));

    $("#settingspanel").on('hidden.bs.modal', function() {
        me.setVoertuignummer($("#input_voertuignummer").val());
    });

    $("#input_voertuignummer").val(me.voertuignummer);

    if(!me.voertuignummer) {
        // Open config window when voertuignummer not configured
        $("#c_settings").click();

        // Wait for transition to end to set focus
        window.setTimeout(function() { $("#input_voertuignummer").focus(); }, 1000);
    }
};


FalckIncidentsController.prototype.getVoertuignummers = function() {
    var me = this;
    $.ajax(me.options.incidentsUrl + "/eenheid", {
        dataType: "json"
    })
    .done(function(data, textStatus, jqXHR) {
        console.log("Voertuignummers", data);
        $("#input_voertuignummer")
        .typeahead({
            name: 'voertuignummers',
            local: data,
            limit: 10
        });
    });
};


/**
 * Change voertuignummer, persist in browser local storage. Start getting inzet
 * info if not null (service must be initialized). Will cancel previous timeout
 * for getting inzet data, immediately get info for updated voertuignummer.
 *
 * @param {boolean} noDuplicateCheck get info even when argument is the same as
 *   instance variable this.voertuignummer, use when starting up
 */
FalckIncidentsController.prototype.setVoertuignummer = function(voertuignummer, noDuplicateCheck) {
    var me = this;
    if(me.voertuignummer === voertuignummer && !noDuplicateCheck) {
        return;
    }
    me.voertuignummer = voertuignummer;
    window.localStorage.setItem("voertuignummer", voertuignummer);

    me.cancelGetInzetInfo();
    me.getInzetInfo();
};


FalckIncidentsController.prototype.cancelGetInzetInfo = function() {
    var me = this;
    if(me.getInzetTimeout) {
        window.clearTimeout(me.getInzetTimeout);
        me.getInzetTimeout = null;
    }
};

FalckIncidentsController.prototype.getInzetInfo = function() {
    var me = this;

    if(!me.voertuignummer) {
        return;
    }

    $.ajax(me.options.incidentsUrl + "/eenheid/" + me.voertuignummer, {
        dataType: "json"
    })
    .always(function() {
        me.getInzetTimeout = window.setTimeout(function() {
            me.getInzetInfo();
        }, 30000);
    })
    .fail(function(e) {
        var msg = "Kan meldkamerinfo niet ophalen: " + e;
        dbkjs.gui.showError(msg);
        me.button.setIcon("bell-slash");
        me.incidentDetailsWindow.showError(msg);
    })
    .done(function(data, textStatus, jqXHR) {
        $('#systeem_meldingen').hide();
        me.button.setIcon("bell-o");

        data = data[0];
        var incidenten = data.Incidenten;
        if(incidenten && incidenten.length > 0) {
            console.log("Got incidents for voertuig " + me.voertuignummer + ": " + incidenten);
            me.inzetIncident(incidenten[incidenten.length-1]);
        } else {
            console.log("No incidents for voertuig " + me.voertuignummer);
            me.incidentDetailsWindow.showError("Laatst informatie opgehaald op " + new moment().format("LLL") + " voor voertuignummer " + responseVoertuignummer + ".");

            if(me.incidentId) {
                $("#zoom_extent").click();

                // Wait for layer loading messages to clear...
                window.setTimeout(function() {
                    dbkjs.util.alert('Melding', 'Inzet beeindigd');
                    window.setTimeout(function() {
                        $('#systeem_meldingen').hide();
                    }, 10000);
                }, 3000);
                me.geenInzet(true);
            }
        }
    });
};

FalckIncidentsController.prototype.geenInzet = function(triggerEvent) {
    this.disableIncidentUpdates();
    this.incidentId = null;
    this.incident = null;
    this.incidentDetailsWindow.data("Er is momenteel geen incident waavoor dit voertuig is ingezet.");
    this.incidentDetailsWindow.hide();
    this.markerLayer.clear();

    this.button.setAlerted(false);
    this.button.setIcon("bell-o");

    if(triggerEvent) {
        $(me).triggerHandler("end_incident");
    }
};

FalckIncidentsController.prototype.inzetIncident = function(incidentId) {
    var me = this;
    if(incidentId !== me.incidentId) {
        me.geenInzet(false);

        me.incidentId = incidentId;

        $.ajax(me.options.incidentsUrl + "/incident/" + incidentId, {
            dataType: "json"
        })
        .fail(function(e) {
            var msg = "Kan incidentinfo niet ophalen: " + e;
            dbkjs.gui.showError(msg);
            me.button.setIcon("bell-slash");
            me.incidentDetailsWindow.showError(msg);
        })
        .done(function(incident) {
            incident = incident[0];
            me.incident = incident;
            console.log("Got incident data", incident);
            me.incidentDetailsWindow.data(incident, false);
            me.markerLayer.addIncident(incident, false, true);
            //me.markerLayer.setZIndexFix();
            //me.updateBalkrechtsonder(XXX);
            //dbkjs.protocol.jsonDBK.deselect();
            //me.selectIncidentDBK(incident);
            //me.zoomToIncident();
            //me.incidentDetailsWindow.show();
            //me.enableIncidentUpdates();

            me.button.setIcon("bell");

            $(me).triggerHandler("new_incident", incident);
        });
    }
};


FalckIncidentsController.prototype.zoomToIncident = function() {
    if(this.incident && this.incident.T_X_COORD_LOC && this.incident.T_Y_COORD_LOC) {
        dbkjs.map.setCenter(new OpenLayers.LonLat(this.incident.T_X_COORD_LOC, this.incident.T_Y_COORD_LOC), dbkjs.options.zoom);
    }
};

FalckIncidentsController.prototype.markerClick = function(incident, marker) {
    this.incidentDetailsWindow.show();
    this.zoomToIncident();
};

FalckIncidentsController.prototype.enableIncidentUpdates = function() {
    var me = this;

    this.disableIncidentUpdates();

    if(!this.incident) {
        return;
    }

    this.updateIncidentInterval = window.setInterval(function() {
        me.updateIncident(me.incidentId);
    }, 15000);
};

FalckIncidentsController.prototype.disableIncidentUpdates = function() {
    if(this.updateIncidentInterval) {
        window.clearInterval(this.updateIncidentInterval);
        this.updateIncidentInterval = null;
    }
};

FalckIncidentsController.prototype.updateBalkrechtsonder = function(title) {
    $('.dbk-title')
        .text(title)
        .css('visibility', 'visible');
};

