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
 * Controller for displaying incident info for a specific voertuig when it is
 * ingezet.
 * @param {Object} incidents dbk module
 * @returns {VoertuigInzetController}
 */
function VoertuigInzetController(incidents) {
    var me = this;
    me.service = incidents.service;

    me.button = new AlertableButton("btn_incident", "Incident", "bell-o");
    $(me.button).on('click', function() {
        me.incidentDetailsWindow.show();
        me.zoomToIncident();
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

    me.addConfigControls();

    $(this.service).on('initialized', function() {
        me.enableVoertuignummerTypeahead();
        me.setVoertuignummer(me.voertuignummer, true);
    });
}

/**
 * Add controls to configuration window.
 */
VoertuigInzetController.prototype.addConfigControls = function() {
    var me = this;
    $(dbkjs).one('dbkjs_init_complete', function() {
        var incidentSettings = $("<div><h4>Meldkamerkoppeling</h4><p/>" +
                "<div class='row'><div class='col-xs-12'>Voertuignummer: <input type='text' id='input_voertuignummer'>" +
                "</div></div><p/><p/><hr>");
        incidentSettings.insertAfter($("#settingspanel_b hr:last"));

        $("#input_voertuignummer").on('change', function(e) {
            me.setVoertuignummer($(e.target).val());
        });

        $("#input_voertuignummer")
        .val(me.voertuignummer)
        .on('typeahead:selected', function(e, v) {
            me.setVoertuignummer(v.value);
        });

        if(!me.voertuignummer) {
            // Open config window when voertuignummer not configured
            $("#c_settings").click();

            // Wait for transition to end to set focus
            window.setTimeout(function() { $("#input_voertuignummer").focus(); }, 1000);
        }
    });
};

/**
 * Get and enable typeahead data for voertuignummer config control. Service
 * must be initialized.
 */
VoertuigInzetController.prototype.enableVoertuignummerTypeahead = function() {
    var me = this;
    me.service.getVoertuignummerTypeahead()
    .done(function(datums) {
        $("#input_voertuignummer")
        .typeahead({
            name: 'voertuignummers',
            local: datums,
            limit: 10,
            template: function(d) {
                var s = d.tokens[0] + " " + d.value;
                if(d.tokens[2]) {
                    s += " (" + d.tokens[2] + ")";
                }
                return s;
            }
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
VoertuigInzetController.prototype.setVoertuignummer = function(voertuignummer, noDuplicateCheck) {
    var me = this;
    if(me.voertuignummer === voertuignummer && !noDuplicateCheck) {
        return;
    }
    me.voertuignummer = voertuignummer;
    window.localStorage.setItem("voertuignummer", voertuignummer);

    me.cancelGetInzetInfo();
    me.getInzetInfo();
};

VoertuigInzetController.prototype.cancelGetInzetInfo = function() {
    var me = this;
    if(me.getInzetTimeout) {
        window.clearTimeout(me.getInzetTimeout);
        me.getInzetTimeout = null;
    }
};

VoertuigInzetController.prototype.getInzetInfo = function() {
    var me = this;

    if(!me.voertuignummer) {
        return;
    }

    var responseVoertuignummer = me.voertuignummer;
    me.service.getVoertuigInzet(responseVoertuignummer)
    .always(function() {
        me.getInzetTimeout = window.setTimeout(function() {
            me.getInzetInfo();
        }, 30000);
    })
    .fail(function(e) {
        var msg = "Kan meldkamerinfo niet ophalen: " + e;
        dbkjs.gui.showError(msg);
        me.incidentDetailsWindow.showError(msg);
    })
    .done(function(incidentId) {
        if(responseVoertuignummer !== me.voertuignummer) {
            // Voertuignummer was changed since request was fired off, ignore!
            return;
        }
        if(incidentId) {
            me.inzetIncident(incidentId);
        } else {
            if(me.incidentId) {
                $("#zoom_extent").click();
                dbkjs.util.alert('Inzet beeindigd');
            }
            me.geenInzet();
        }
    });
};

VoertuigInzetController.prototype.geenInzet = function() {
    console.log("geen inzet");
    this.disableIncidentUpdates();
    this.incidentId = null;
    this.incident = null;
    this.incidentDetailsWindow.data(null);
    this.incidentDetailsWindow.hide();
    this.markerLayer.clear();

    this.button.setAlerted(false);
    this.button.setIcon("bell-o");
};

VoertuigInzetController.prototype.inzetIncident = function(incidentId) {
    var me = this;
    if(incidentId !== me.incidentId) {
        console.log("new inzet, incident id " + incidentId);
        me.geenInzet();

        me.incidentId = incidentId;
        var responseIncidentId = incidentId;

        me.service.getAllIncidentInfo(responseIncidentId)
        .fail(function(e) {
            var msg = "Kan incidentinfo niet ophalen: " + e;
            dbkjs.gui.showError(msg);
            me.incidentDetailsWindow.showError(msg);
        })
        .done(function(incident) {
            if(responseIncidentId !== me.incidentId) {
                // Incident was cancelled or changed since request was fired off, ignore
                return;
            }
            console.log("incident info", incident);
            me.incident = incident;
            me.incidentDetailsWindow.data(incident);
            me.markerLayer.addIncident(incident, true);
            me.markerLayer.setZIndexFix();

            me.zoomToIncident();
            me.enableIncidentUpdates();

            me.button.setAlerted(true);
            me.button.setIcon("bell");
        });
    } else {
        console.log("same incident");
    }
};

VoertuigInzetController.prototype.zoomToIncident = function() {
    if(this.incident && this.incident.T_X_COORD_LOC && this.incident.T_Y_COORD_LOC) {
        dbkjs.map.setCenter(new OpenLayers.LonLat(this.incident.T_X_COORD_LOC, this.incident.T_Y_COORD_LOC), dbkjs.options.zoom);
    }
}

VoertuigInzetController.prototype.markerClick = function(incident, marker) {
    this.incidentDetailsWindow.show();
    this.zoomToIncident();
};

VoertuigInzetController.prototype.enableIncidentUpdates = function() {
    var me = this;

    this.disableIncidentUpdates();

    if(!this.incident) {
        return;
    }

    this.updateIncidentTimeout = window.setTimeout(function() {
        me.updateIncident(me.incidentId);
    }, 15000);
};

VoertuigInzetController.prototype.disableIncidentUpdates = function() {
    if(this.updateIncidentTimeout) {
        window.clearTimeout(this.updateIncidentTimeout);
        this.updateIncidentTimeout = null;
    }
};

VoertuigInzetController.prototype.updateIncident = function(incidentId) {
    var me = this;
    if(this.incidentId !== incidentId) {
        // Incident cancelled or changed since timeout was set, ignore
        return;

        me.service.getAllIncidentInfo(incidentId)
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

            // Check if updated, enable alert state if true
            var oldIncident = JSON.toString(me.incident);
            if(oldIncident === JSON.toString(incident)) {
                console.log("incident the same");
            } else {
                console.log("incident updated");

                if(!me.incidentDetailsWindow.isVisible()) {
                    me.button.setAlerted(true);
                }

                me.incident = incident;
                me.incidentDetailsWindow.data(incident, true);

                // Possibly update marker position
                me.markerLayer.clear();
                me.markerLayer.addIncident(incident, true);
                me.markerLayer.setZIndexFix();
            }
        });
    }
};
