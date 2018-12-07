/*
 *  Copyright (c) 2016-2018 B3Partners (info@b3partners.nl)
 *
 *  This file is part of safetymaps-viewer.
 *
 *  safetymaps-viewer is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  safetymaps-viewer is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with safetymaps-viewer. If not, see <http://www.gnu.org/licenses/>.
 */

/* global dbkjs, safetymaps, OpenLayers, Proj4js, jsts, moment, i18n, Mustache, PDFObject */

/**
 * Controller for displaying incident info from AGS for a specific voertuig when it is
 * ingezet.
 *
 * Events:
 * new_incident: when new incident is received
 * end_incident: inzet for incident was ended (may not trigger for some koppelingen)
 *
 * @param {Object} incidents dbk module
 * @returns {AGSIncidentsController}
 */
function AGSIncidentsController(incidents) {
    var me = this;
    me.service = incidents.service;
    me.options = incidents.options;

    me.featureSelector = incidents.featureSelector;

    me.button = new AlertableButton("btn_incident", "Incident", "bell-o");
    me.button.getElement().prependTo('.layertoggle-btn-group');

    $(me.button).on('click', function() {
        me.incidentDetailsWindow.show();
        me.zoomToIncident();
    });

    me.incidentDetailsWindow = new IncidentDetailsWindow();
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

    // XXX to common object (IncidentFeatureSelector?)
    $('#incident_bottom_right').on('click', function() {
        me.zoomToIncident();
        me.incidentDetailsWindow.show();
        if(me.featureSelector.matches.length === 1) {
            safetymaps.selectObject(me.featureSelector.matches[0], false);
        } else {
            safetymaps.deselectObject();
            me.incidentDetailsWindow.showMultipleFeatureMatches();
        }
    });

    $(this.service).on('initialized', function() {
        if(incidents.options.voertuignummerTypeahead) {
            me.enableVoertuignummerTypeahead();
        }
        me.setVoertuignummer(me.voertuignummer, true);
    });
}

/**
 * Add controls to configuration window.
 */
AGSIncidentsController.prototype.addConfigControls = function() {
    var me = this;
    $(dbkjs).one('dbkjs_init_complete', function() {
        var incidentSettings = $(
                "<div><h4>Meldkamerkoppeling</h4><p/>" +
                    "<div class='container' style='width: 400px; margin-left: 0px'>" +
                        "<div class='row'>" +
                            "<div class='col-xs-4'>Voertuignummer:</div>" +
                            "<div class='col-xs-6'><input type='text' disabled id='input_voertuignummer'></div>" +
                            "<div class='col-xs-2'><button class='btn btn-primary' id='btn_enable_voertuignummer'>Wijzigen</button></div>" +
                        "</div>" +
                        "<div class='row ' id='cfg_voertuignummercode' style='visibility: hidden; margin-top: 10px'>" +
                            "<div class='col-xs-4'>Beveiligingscode:</div>" +
                            "<div class='col-xs-6'><input id='cfg_input_code' type='password' autocapitalize='none'></div>" +
                            "<div class='col-xs-2'><button class='btn btn-primary' id='cfg_btn_codeok'>OK</button></div>" +
                        "</div>" +
                    "</div>" +
                "</div>" +
                "<hr>");

        incidentSettings.insertAfter($("#settingspanel_b hr:last"));

        function enableVoertuignummerInput() {
            var input = $("#input_voertuignummer");
            input.removeAttr("disabled");
            input.css("background-color", "");
            input.focus();
        }

        $("#btn_enable_voertuignummer").on('click', function() {
            var input = $("#input_voertuignummer");
            if(input.prop("disabled")) {
                if(!me.options.voertuignummerCode) {
                    enableVoertuignummerInput();
                } else {
                    $("#cfg_voertuignummercode").css("visibility", "visible");
                    $("#cfg_input_code").focus();
                    $("#btn_enable_voertuignummer").hide();
                }
            } else {
                enableVoertuignummerInput();
            }
        });

        $("#cfg_btn_codeok").on('click', function() {
            if($("#cfg_input_code").val() !== me.options.voertuignummerCode) {
                alert('Ongeldige code');
            } else {
                enableVoertuignummerInput();
                $("#cfg_voertuignummercode").css("visibility", "hidden");
                $("#cfg_input_code").val("");
            }
        });

        $("#settingspanel").on('hidden.bs.modal', function() {
            me.setVoertuignummer($("#input_voertuignummer").val());
            $("#input_voertuignummer").attr("disabled", "disabled");
            $("#input_voertuignummer").css("background-color", "transparent");
            $("#btn_enable_voertuignummer").show();
        });

        $("#input_voertuignummer").val(me.voertuignummer);

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
AGSIncidentsController.prototype.enableVoertuignummerTypeahead = function() {
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
AGSIncidentsController.prototype.setVoertuignummer = function(voertuignummer, noDuplicateCheck) {
    var me = this;
    if(me.voertuignummer === voertuignummer && !noDuplicateCheck) {
        return;
    }
    me.voertuignummer = voertuignummer;
    window.localStorage.setItem("voertuignummer", voertuignummer);

    me.cancelGetInzetInfo();
    me.getInzetInfo();
};

AGSIncidentsController.prototype.cancelGetInzetInfo = function() {
    var me = this;
    if(me.getInzetTimeout) {
        window.clearTimeout(me.getInzetTimeout);
        me.getInzetTimeout = null;
    }
};

AGSIncidentsController.prototype.getInzetInfo = function() {
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
        dbkjs.util.showError(msg);
        me.button.setIcon("bell-slash");
        me.incidentDetailsWindow.showError(msg);
    })
    .done(function(incidentId) {
        $('#systeem_meldingen').hide();
        me.button.setIcon("bell-o");

        if(responseVoertuignummer !== me.voertuignummer) {
            // Voertuignummer was changed since request was fired off, ignore!
            return;
        }
        if(incidentId) {
            me.inzetIncident(incidentId);
        } else {
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

AGSIncidentsController.prototype.geenInzet = function(triggerEvent) {
    this.disableIncidentUpdates();
    this.incidentId = null;
    this.incident = null;
    this.incidentDetailsWindow.data("Er is momenteel geen incident waarvoor dit voertuig is ingezet.");
    this.incidentDetailsWindow.hide();
    this.markerLayer.clear();
    if(this.featureSelector) {
        this.featureSelector.hideBalkRechtsonder();
    }
    this.button.setAlerted(false);
    this.button.setIcon("bell-o");

    if(triggerEvent) {
        $(this).triggerHandler("end_incident");
        safetymaps.deselectObject();
        this.incidentDetailsWindow.hideMultipleFeatureMatches();
    }
};

AGSIncidentsController.prototype.inzetIncident = function(incidentId) {
    var me = this;
    if(incidentId !== me.incidentId) {
        me.geenInzet(false);

        me.incidentId = incidentId;
        var responseIncidentId = incidentId;

        me.service.getAllIncidentInfo(responseIncidentId, false, false)
        .fail(function(e) {
            var msg = "Kan incidentinfo niet ophalen: " + e;
            dbkjs.util.showError(msg);
            me.button.setIcon("bell-slash");
            me.incidentDetailsWindow.showError(msg);
        })
        .done(function(incident) {
            if(responseIncidentId !== me.incidentId) {
                // Incident was cancelled or changed since request was fired off, ignore
                return;
            }
            me.incident = incident;
            me.incidentDetailsWindow.data(incident, true);
            me.markerLayer.addIncident(incident, false, true);
            me.markerLayer.setZIndexFix();

            dbkjs.modules.safetymaps_creator.unselectObject();
            me.zoomToIncident();

            var x = incident.T_X_COORD_LOC;
            var y = incident.T_Y_COORD_LOC;
            var commonIncidentObject = {
                postcode: incident.POSTCODE,
                woonplaats: incident.PLAATS_NAAM_NEN,
                huisnummer: Number(incident.HUIS_PAAL_NR),
                huisletter: incident.HUISLETTER,
                toevoeging: incident.HUIS_NR_TOEV,
                straat: incident.NAAM_LOCATIE1,
                x: x,
                y: y
            };
            me.featureSelector.findAndSelectMatches(commonIncidentObject, me.incidentDetailsWindow);
            me.featureSelector.updateBalkRechtsonder();

            me.incidentDetailsWindow.show();

            me.enableIncidentUpdates();

            me.button.setIcon("bell");

            $(me).triggerHandler("new_incident", [commonIncidentObject]);
        });
    }
};

AGSIncidentsController.prototype.zoomToIncident = function() {
    if(this.incident && this.incident.T_X_COORD_LOC && this.incident.T_Y_COORD_LOC) {
        dbkjs.map.setCenter(new OpenLayers.LonLat(this.incident.T_X_COORD_LOC, this.incident.T_Y_COORD_LOC), dbkjs.options.zoom);
    }
};

AGSIncidentsController.prototype.markerClick = function(incident, marker) {
    this.incidentDetailsWindow.show();
    this.zoomToIncident();
};

AGSIncidentsController.prototype.enableIncidentUpdates = function() {
    var me = this;

    this.disableIncidentUpdates();

    if(!this.incident) {
        return;
    }

    this.updateIncidentInterval = window.setInterval(function() {
        me.updateIncident(me.incidentId);
    }, 15000);
};

AGSIncidentsController.prototype.disableIncidentUpdates = function() {
    if(this.updateIncidentInterval) {
        window.clearInterval(this.updateIncidentInterval);
        this.updateIncidentInterval = null;
    }
};

AGSIncidentsController.prototype.updateIncident = function(incidentId) {
    var me = this;
    if(this.incidentId !== incidentId) {
        // Incident cancelled or changed since timeout was set, ignore
        return;
    }

    me.service.getAllIncidentInfo(incidentId, false, false)
    .fail(function(e) {
        var msg = "Kan incidentinfo niet updaten: " + e;
        dbkjs.util.showError(msg);
        // Leave incidentDetailsWindow contents with old info
    })
    .done(function(incident) {
        if(me.incidentId !== incidentId) {
            // Incident cancelled or changed since request was fired off, ignore
            return;
        }

        // Always update window, updates moment.fromNow() times
        me.incidentDetailsWindow.data(incident, true, true);

        // Check if updated, enable alert state if true
        var oldIncidentHtml = me.incidentDetailsWindow.getIncidentHtml(me.incident, false, true);
        if(oldIncidentHtml !== me.incidentDetailsWindow.getIncidentHtml(incident, false, true)) {
            $(dbkjs).trigger("incidents.updated");
            if(!me.incidentDetailsWindow.isVisible()) {
                me.button.setAlerted(true);
            }

            me.incident = incident;

            // Possibly update marker position
            me.markerLayer.addIncident(incident, true, true);
            me.markerLayer.setZIndexFix();
        }
    });
};
