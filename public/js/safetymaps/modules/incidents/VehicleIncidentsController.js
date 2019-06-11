/* 
 * Copyright (c) 2019 B3Partners (info@b3partners.nl)
 * 
 * This file is part of safetymaps-viewer.
 * 
 * safetymaps-viewer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * safetymaps-viewer is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 *  along with safetymaps-viewer. If not, see <http://www.gnu.org/licenses/>.
 */

/* global dbkjs, safetymaps, OpenLayers, Proj4js, jsts, moment, i18n, Mustache, PDFObject, IncidentDetailsWindow */

/**
 * Controller for displaying incident info from multiple sources for a specific
 * voertuig when it is ingezet.
 *
 * Events:
 * new_incident: when new incident is received
 * end_incident: inzet for incident was ended (may not trigger for some koppelingen)
 *
 * @param {Object} incidents dbk module
 * @returns {AGSIncidentsController}
 */
function VehicleIncidentsController(incidents) {
    var me = this;
    me.service = incidents.service;
    me.options = incidents.options;

    me.options = $.extend({
        incidentSource: "falckService",
        incidentSourceFallback: "VrhAGS",
        incidentUpdateInterval: 30000,
        activeIncidentUpdateInterval: 15000,
        incidentMonitorCode: null,
        voertuigIM: true,
        eenheden: true,
        eenhedenSource: "VrhAGS",
        eenhedenUpdateInterval: 10000,
        showStatus: false,
        statusUpdateInterval: 15000,
        silentError: false
    }, me.options);
    me.primaryFailing = false;

    me.options.voertuigIM = false; // XXX werkt nog niet met duokoppeling

    me.featureSelector = incidents.featureSelector;

    me.button = new AlertableButton("btn_incident", "Incident", "bell-o");
    me.button.getElement().prependTo('#btngrp_object');

    $(me.button).on('click', function() {
        me.incidentDetailsWindow.show();
        me.zoomToIncident();
    });

    me.incidentDetailsWindow = new IncidentDetailsWindow();
    $(me.incidentDetailsWindow).on('show', function() {
        me.button.setAlerted(false);
        me.button.setFotoAlert(false);
    });

    me.markerLayer = new IncidentMarkerLayer();
    $(me.markerLayer).on('click', function(incident, marker) {
        me.markerClick();
    });
    me.marker = null;

    me.voertuignummer = window.localStorage.getItem("voertuignummer");
    if(me.voertuignummer === "undefined") {
        me.voertuignummer = null;
    }

    if(me.options.incidentSource === "falckService") {
        me.incidentMonitorCode = window.localStorage.getItem("imcode");
        me.checkIncidentMonitor();
    }

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

    // XXX on settings button onclick or settings show event
    window.setTimeout(function() {
        me.addConfigControls();
    }, 2000);

    if(me.options.eenheden) {
        me.vehiclePositionLayer = new VehiclePositionLayer();
        me.vehiclePositionLayer.setShowMoving(false);

        if(me.options.incidentSource === "VrhAGS") {
            dbkjs.selectControl.layers.push(me.vehiclePositionLayer.layer);
        }
    }

    if(me.options.incidentSource === "falckService" || me.options.incidentSourceFallback === "falckService") {
        $(dbkjs).one("dbkjs_init_complete", function() {
            window.setTimeout(function() {
                me.getFalckServiceVoertuignummers();
                me.setVoertuignummer(me.voertuignummer, true);
            }, 2000);
        });
    }

    if(me.options.incidentSource === "vrhAGS" || me.options.incidentSourceFallback === "vrhAGS") {
        $(this.service).on('initialized', function() {
            if(incidents.options.voertuignummerTypeahead) {
                me.enableVrhAGSVoertuignummerTypeahead();
            }
            me.setVoertuignummer(me.voertuignummer, true);
        });
    }

    if(me.options.showStatus) {
        window.setTimeout(function() {
            me.updateStatus();
        }, 2000);
    }
}

VehicleIncidentsController.prototype.checkIncidentMonitor = function() {
    var me = this;

    me.incidentMonitor = me.options.voertuigIM && me.options.incidentMonitorCode && me.options.incidentMonitorCode === me.incidentMonitorCode;

    if(me.incidentMonitor) {
        if(me.incidentMonitorController) {
            me.incidentMonitorController.enable();
        } else {
            dbkjs.options.incidents = {
                /* XXX */
                incidentListFunction: me.options.incidentListFunction
            };

            me.incidentMonitorController = new IncidentMonitorController(me);
            me.incidentMonitorController.incidentListWindow.setSplitScreen(false);

            $(dbkjs).on("setting_changed_splitscreen", function() {
                // Incident list always fullscreen independent of global setting
                me.incidentMonitorController.incidentListWindow.setSplitScreen(false);
            });

            $(me.incidentMonitorController).on("incident_selected", function() { me.incidentMonitorIncidentSelected.apply(me, arguments); });
        }
    } else {
        if(me.incidentMonitorController) {
            me.incidentMonitorController.disable();
        }
    }
};

VehicleIncidentsController.prototype.incidentMonitorIncidentSelected = function(event, click) {
    var me = this;

    safetymaps.deselectObject();
    console.log("IM incident selected", arguments);
    me.inzetIncident(click.incident.IncidentNummer, true);

};

/**
 * Add controls to configuration window.
 */
VehicleIncidentsController.prototype.addConfigControls = function() {
    var me = this;

    var incidentCodeHtml = "";

    if(me.options.voertuigIM) {

        incidentCodeHtml =
                "<div><h4>Incidentmonitor</h4><p/>" +
                    "<div class='container' style='width: 400px; margin-left: 0px'>" +
                        "<div class='row'>" +
                            "<div class='col-xs-4'>Activatiecode:</div>" +
                            "<div class='col-xs-6'><input id='input_incidentmonitorcode' type='password' disabled autocapitalize='none'></div>" +
                            "<div class='col-xs-2'><input type='button' class='btn btn-primary' id='btn_incidentmonitorcode' value='Wijzigen'></div>" +
                        "</div>" +
                    "</div>" +
                "</div>";
    }

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
            incidentCodeHtml +
            "<hr>");
    incidentSettings.insertAfter($("#settingspanel_b hr:last"));

    if(me.options.voertuigIM) {
        $("#input_incidentmonitorcode").addClass(me.incidentMonitor ? "check" : "cross");

        $("#btn_incidentmonitorcode").click(function() {
            var btn = $("#btn_incidentmonitorcode");
            var input = $("#input_incidentmonitorcode");
            if(btn.val() === "OK") {
                me.incidentMonitorCode = input.val();
                window.localStorage.setItem("imcode", me.incidentMonitorCode);
                me.checkIncidentMonitor();
                input.addClass(me.incidentMonitor ? "check" : "cross");
                input.attr("disabled", "true");
                btn.val("Wijzigen");
            } else {
                btn.val("OK");
                input.removeClass("check").removeClass("cross");
                input.removeAttr("disabled").focus();
            }
        });
    }

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
};

VehicleIncidentsController.prototype.getFalckServiceVoertuignummers = function() {
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
 * Get and enable typeahead data for voertuignummer config control. Service
 * must be initialized.
 */
VehicleIncidentsController.prototype.enableVrhAGSVoertuignummerTypeahead = function() {
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
VehicleIncidentsController.prototype.setVoertuignummer = function(voertuignummer, noDuplicateCheck) {
    var me = this;
    if(me.voertuignummer === voertuignummer && !noDuplicateCheck) {
        return;
    }
    me.voertuignummer = voertuignummer;
    window.localStorage.setItem("voertuignummer", voertuignummer);
    $(me).triggerHandler("voertuigNummerUpdated", [true]);
    me.cancelGetInzetInfo();
    me.getInzetInfo();
    me.updateStatus();
};

VehicleIncidentsController.prototype.cancelGetInzetInfo = function() {
    var me = this;
    if(me.getInzetTimeout) {
        window.clearTimeout(me.getInzetTimeout);
        me.getInzetTimeout = null;
    }
};

VehicleIncidentsController.prototype.getInzetInfo = function() {
    var me = this;

    if(!me.voertuignummer) {
        me.button.setIcon("bell-o");
        me.geenInzet(false);
        return;
    }

    // Nu geen meerdere voertuignummers...

    //var nummers = me.voertuignummer.split(/[,\s]+/);

    me.getVoertuigIncidenten(me.voertuignummer)
    .fail(function(msg) {
        me.handleInzetInfo(msg);
    })
    .done(function(inzetInfo) {
        me.handleInzetInfo(inzetInfo);
    });
};

VehicleIncidentsController.prototype.handleInzetInfo = function(inzetInfo) {
    var me = this;

    me.getInzetTimeout = window.setTimeout(function() {
        me.getInzetInfo();
    }, inzetInfo.incident ? me.options.activeIncidentUpdateInterval : me.options.incidentUpdateInterval);

    if(me.incidentMonitorController) {
        me.incidentMonitorController.markerLayer.layer.setVisibility(true);
    }

    $('#systeem_meldingen').hide();
    me.button.setIcon("bell-o");

    if(typeof inzetInfo === "string") {
        var msg = "Kan meldkamerinfo niet ophalen: " + inzetInfo;
        if(!me.options.silentError) {
            dbkjs.util.showError(msg);
            me.button.setIcon("bell-slash");
        }
        me.incidentDetailsWindow.showError(msg);
    } else if(inzetInfo.incidenten === null || inzetInfo.incidenten === 0) {
        if(!me.incidentFromIncidentList) {
            me.incidentDetailsWindow.showError("Geen actief incident voor voertuig " + me.voertuignummer + ". Laatst informatie opgehaald op " + new moment().format("LLL") + ".");
        }

        if(me.incidentNummer && !me.incidentFromIncidentList) {
            me.inzetBeeindigd('Inzet beeindigd');
        }
    } else {
        if(me.incidentMonitorController) {
            me.incidentMonitorController.markerLayer.layer.setVisibility(false);
        }

        me.inzetIncident(inzetInfo, false);
    }
};

VehicleIncidentsController.prototype.updateStatus = function() {
    var me = this;

    if(me.options.incidentSource === "VrhAGS") {
        me.showStatusVrhAGS();
    } else if(me.options.incidentSource === "falckService") {
        me.showStatusSafetymapsService();
    }
};

VehicleIncidentsController.prototype.showStatusVrhAGS = function() {
    var me = this;
    window.clearTimeout(me.updateStatusTimer);

    me.service.getVoertuigStatus(me.voertuignummer)
    .always(function() {
        $("#status").remove();

        me.updateStatusTimer = window.setTimeout(function() {
            me.updateStatus();
        }, me.options.statusUpdateInterval);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.log("Fout bij ophalen eenheidstatus", arguments);
    })
    .done(function(status) {
        console.log("VrhAGS voertuigstatus", status);

        if(status) {
            var id = status.T_ACT_STATUS_CODE_EXT_BRW;
            var code = status.T_SYS_STATUS_AFK_BRW;

            if(code === "KZ") {
                code = "OK";
            }

            $("<div id='status'>" + id + ": " + code + "</div>").prependTo("body");
        }
    });
};

VehicleIncidentsController.prototype.showStatusSafetymapsService = function() {
    var me = this;

    var statusById = {
        0: { desc: "Noodsignaal" },
        1: { code: "EI", desc: "Eigen initiatief" },
        2: { code: "AS", desc: "Aanvraag spraakcontact" },
        3: { code: "I",  desc: "Informatievraag" },
        4: { code: "UT", desc: "Aanvang rit / uitruk / aanrijdend" },
        5: { code: "TP", desc: "Ter plaatse" },
        6: { code: "NV", desc: "Aanrijdend naar bestemming" },
        7: { code: "IR", desc: "Binnenkort beschikbaar" },
        8: { code: "BS", desc: "Vrij. aanrijdend naar post / standplaats / kazerne" },
        9: { code: "KZ", desc: "Op post" },
        10: { code: "VI", desc: "Vertraagd inzetbaar" },
        11: { code: "BD", desc: "Buiten dienst" },
        12: { code: "BI", desc: "Binnenkort in dienst" },
        13: { code: "A0", desc: "Aanvraag privegesprek" },
        14: { code: "U",  desc: "Urgente aanvraag spraakcontact" },
        15: { code: "OV", desc: "Opdracht verstrekt" },
        16: { code: "OG", desc: "Alarmering ontvangen" }
    };

    window.clearTimeout(me.updateStatusTimer);

    $.ajax(me.options.incidentsUrl + "/eenheidstatus/" + me.voertuignummer, {
        dataType: "json"
    })
    .always(function() {
        $("#status").remove();

        me.updateStatusTimer = window.setTimeout(function() {
            me.updateStatus();
        }, me.options.statusUpdateInterval);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.log("Fout bij ophalen eenheidstatus", arguments);
    })
    .done(function(data) {
        var status = null;
        $.each(data, function(i, d) {
            if(d.Roepnaam === me.voertuignummer) {
                status = d;
                return false;
            }
        });
        if(status) {
            var statusInfo = statusById[status.StatusCode];
            if(statusInfo) {
                console.log("Voertuigstatus: " + status.StatusCode + ": " + statusInfo.code + ", " + statusInfo.desc);
                $("<div id='status'>" + status.StatusCode + ": " + statusInfo.code + "</div>").prependTo("body");
            }
        }
    });
};

VehicleIncidentsController.prototype.getVoertuigIncidenten = function(nummer) {
    var me = this;

    var p = $.Deferred();

    var primary;
    var fallback = $.Deferred().reject("geen fallback geconfigureerd").promise();
    if(me.options.incidentSource === "VrhAGS") {
        primary = me.getVoertuigIncidentVrhAGS(nummer);
        if(me.options.incidentSourceFallback === "falckService") {
            fallback = me.getVoertuigIncidentSMCT(nummer);
        } else {
            me.options.incidentSourceFallback = null;
        }
    } else {
        primary = me.getVoertuigIncidentSMCT(nummer);
        if(me.options.incidentSourceFallback === "VrhAGS") {
            if(!me.service.initialized) {
                console.log("Fallback VrhAGS not initialized, not querying");

                // Optie: na tijd wachten opnieuw proberen te initialiseren...

                fallback = $.Deferred().reject("Fallback niet geinitialiseerd").promise();
            } else {
                fallback = me.getVoertuigIncidentVrhAGS(nummer);
            }
        } else {
            me.options.incidentSourceFallback = null;
        }
    }

    $.whenAll(primary, fallback)
    .then(function(primaryInfo, fallbackInfo) {
        console.log("All services success, primary: " + primaryInfo.source + ":" + JSON.stringify(primaryInfo.incidenten) + ", fallback: " + fallbackInfo.source + ":" + JSON.stringify(fallbackInfo.incidenten));

        // XXX als incident mist bij primary maar wel bij fallback
        // TODO


        p.resolve(primaryInfo);
    }, function(primaryInfo, fallbackInfo) {
        if(me.options.incidentSourceFallback === null && primary.state() === "resolved") {
            console.log("Primary service success, no fallback configured: " + primaryInfo.source + ":" + JSON.stringify(primaryInfo.incidenten));
            p.resolve(primaryInfo);
        } else if(primary.state() === "resolved") {
            console.log("Primary service success, fallback failed: " + primaryInfo.source + ":" + JSON.stringify(primaryInfo.incidenten));
            p.resolve(primaryInfo);
        } else {
            console.log("Primary (or fallback too if configured) failed, primary state: " + primary.state() + " = " + JSON.stringify(primaryInfo) + ", fallback state: " + fallback.state() + " = " + JSON.stringify(fallbackInfo));

            if(fallback.state() === "resolved") {
                console.log("Using fallback service");
                p.resolve(fallbackInfo);
            } else {
                console.log("Primary failed and either no fallback configured or both services failed!");
                p.reject("Fout bij ophalen incidentinformatie");
            }
        }
    });

    return p.promise();
};
/**
 *
 * @param {type} nummer voertuignummer
 * @returns null if no incidents from service, string if Ajax error, or array of incidents for eenheid
 */
VehicleIncidentsController.prototype.getVoertuigIncidentSMCT = function(nummer) {
    var me = this;

    var p = $.Deferred();
    $.ajax(me.options.incidentsUrl + "/eenheid/" + nummer, {
        dataType: "json"
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        p.reject(safetymaps.utils.getAjaxError(jqXHR, textStatus, errorThrown));
    })
    .done(function(data) {
        data = data[0];
        var incidenten = data && data.Incidenten && data.Incidenten.length > 0 ? data.Incidenten : null;

        if(incidenten && incidenten.length > 0) {
            console.log("SMCT: Got incidents for voertuig " + nummer + ": " + incidenten);

            $.ajax(me.options.incidentsUrl + "/incident/" + incidenten[incidenten.length-1], {
                dataType: "json",
                data: {
                    extended: false
                }
            })
            .fail(function(e) {
                console.log("SMCT: Error getting incident data", arguments);
                p.reject();
            })
            .done(function(data) {
                var incidentInfo = { source: "SMCT", incidenten: incidenten, incident: data[0]};
                me.normalizeIncidentFields(incidentInfo);
                p.resolve(incidentInfo);
            });

        } else {
            console.log("SMCT: No incidents for voertuig " + nummer);
            p.resolve({ source: "SMCT", incidenten: incidenten});
        }
    });
    return p;
};

/**
 *
 * @param {type} nummer voertuignummer
 * @returns null if no incidents from service, string if Ajax error, or array of incidents for eenheid
 */
VehicleIncidentsController.prototype.getVoertuigIncidentVrhAGS = function(nummer) {
    var me = this;

    var p = $.Deferred();

    me.service.getVoertuigInzet(nummer)
    .fail(function(jqXHR, textStatus, errorThrown) {
        p.reject(safetymaps.utils.getAjaxError(jqXHR, textStatus, errorThrown));
    })
    .done(function(incidentId) {
        if(incidentId ) {
            console.log("VrhAGS: Got incident for voertuig " + nummer + ": " + incidentId);

            me.service.getAllIncidentInfo(incidentId, false, false)
            .fail(function(e) {
                console.log("VrhAGS: Error getting incident data", arguments);
                p.reject();
            })
            .done(function(incident) {
                var incidentInfo = { source: "VrhAGS", incidenten: [incident.NR_INCIDENT], incident: incident};
                me.normalizeIncidentFields(incidentInfo);
                p.resolve(incidentInfo);
            });
        } else {
            console.log("VrhAGS: No incidents for voertuig " + nummer);
            p.resolve({ source: "VrhAGS", incidenten: null});
        }
    });
    return p;
};

VehicleIncidentsController.prototype.updateVehiclePositions = function() {
    var me = this;
    window.clearTimeout(me.updateVehicleTimeout);

    if(me.incidentNummer) {
        if(me.options.eenhedenSource === "VrhAGS") {
            me.service.getVehiclePositions([me.incident.INCIDENT_ID])
            .always(function() {
                me.updateVehicleTimeout = window.setTimeout(function() {
                    me.updateVehiclePositions();
                }, me.options.eenhedenUpdateInterval);
            })
            .done(function(features) {
                console.log("Vehicle positions for incident", features);
                if(!features) {
                    features = [];
                }
                me.vehiclePositionLayer.features(features);
            });
        } else {
            console.log("eenhedenSource not supported: " + me.options.eenhedenSource);
        }
    }
};

VehicleIncidentsController.prototype.geenInzet = function(triggerEvent) {
    this.incidentNummer = null;
    this.incident = null;
    this.incidentDetailsWindow.hide();
    this.markerLayer.clear();
    this.vehiclePositionLayer.features([]);
    window.clearTimeout(this.updateVehicleTimeout);
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

VehicleIncidentsController.prototype.inzetIncident = function(incidentInfo, fromIncidentList) {
    console.log("inzetIncident", incidentInfo);

    var me = this;

    // XXX update als incidentInfo.incident.nummer !== me.incidentNummer, is met timeout 30s...

    var oldIncident = me.incident;

    if(!me.incidentFromIncidentList) {
        me.button.setIcon("bell");
    }

    if(incidentInfo.incident.nummer !== me.incidentNummer) {
        me.geenInzet(false);

        me.incidentInfo = incidentInfo;
        me.incident = incidentInfo.incident;
        var incident = me.incident;
        me.incidentNummer = incident.nummer;

        me.incidentFromIncidentList = fromIncidentList;

        me.incidentDetailsWindow.data(incident, true);

        if(!me.incidentFromIncidentList) {
            me.markerLayer.addIncident(incident, false, true);
            me.markerLayer.setZIndexFix();
        } else {
            me.incidentMonitorController.markerLayer.layer.setVisibility(true);

            // XXX AGS IM
            me.incidentFromIncidentListWasActive = incident.Actueel && !incident.beeindigdeInzet;
        }

        dbkjs.modules.safetymaps_creator.unselectObject();
        me.zoomToIncident();

        me.featureSelector.findAndSelectMatches(incident, me.incidentDetailsWindow);
        me.featureSelector.updateBalkRechtsonder(me.getBalkrechtsonderTitle());

        me.incidentDetailsWindow.show();

        if(me.options.eenheden) {
            me.updateVehiclePositions();
        }

        $(me).triggerHandler("new_incident", [incident, incidentInfo]);
    } else { // update
        
        // XXX IM?
/*
        if(me.incidentFromIncidentList) {
            me.incidentDetailsWindow.show();
        }
*/

        // XXX IM
/*
        if(me.incidentFromIncidentList && me.incidentFromIncidentListWasActive) {
            if(!incident.Actueel || incident.beeindigdeInzet) {
                me.inzetBeeindigd('Incident (of brandweerinzet) beeindigd');
                return;
            }
        }
*/
        me.incidentInfo = incidentInfo;
        me.incident = incidentInfo.incident;
        var incident = me.incident;

        // Always update window, updates moment.fromNow() times
        me.incidentDetailsWindow.data(incident, true, /* restoreScrollTop = */ true);

        // Check if updated, enable alert state if true

        // XXX
        var oldIncidentHtml, newIncidentHtml;
        if(incidentInfo.source === "SMCT") {
            oldIncidentHtml = me.incidentDetailsWindow.getIncidentHtmlFalck(oldIncident, true, true);
            newIncidentHtml = me.incidentDetailsWindow.getIncidentHtmlFalck(incident, true, true);
        } else {
            oldIncidentHtml = me.incidentDetailsWindow.getIncidentHtml(oldIncident, true, true);
            newIncidentHtml = me.incidentDetailsWindow.getIncidentHtml(incident, true, true);
        }
        if(oldIncidentHtml !== newIncidentHtml) {
            $(dbkjs).trigger("incidents.updated");
            if(!me.incidentDetailsWindow.isVisible()) {
                me.button.setAlerted(true);
            }

            if(!me.incidentFromIncidentList) {
                // Possibly update marker position
                me.markerLayer.addIncident(incident, false, true);
                me.markerLayer.setZIndexFix();
            }

            me.featureSelector.updateBalkRechtsonder(me.getBalkrechtsonderTitle());
        }

        // Check if position updated
        var oldX = null, oldY = null;
        if(oldIncident.x && oldIncident.y) {
            oldX = oldIncident.x;
            oldY = oldIncident.y;
        }

        if(incident.x && incident.y && (incident.x !== oldX || incident.y !== oldY)) {

            if(!me.incidentFromIncidentList) {
                // This function uses coords in me.incident, updated in previous if stmt
                me.markerLayer.addIncident(incident, false, true);
                me.markerLayer.setZIndexFix();
            }
            me.zoomToIncident();

            me.featureSelector.findAndSelectMatches(incident, me.incidentDetailsWindow);
        }
    }
};

VehicleIncidentsController.prototype.inzetBeeindigd = function(melding) {
    var me = this;
    $("#zoom_extent").click();

    // Wait for layer loading messages to clear...
    window.setTimeout(function() {
        dbkjs.util.alert('Melding', melding);
        window.setTimeout(function() {
            $('#systeem_meldingen').hide();
        }, 10000);
    }, 3000);
    me.geenInzet(true);
};

VehicleIncidentsController.prototype.zoomToIncident = function() {
    if(this.incident && this.incident.x && this.incident.y) {
        dbkjs.map.setCenter(new OpenLayers.LonLat(this.incident.x, this.incident.y), dbkjs.options.zoom);
    }
};

VehicleIncidentsController.prototype.getBalkrechtsonderTitle = function() {
    var me = this;

    if(!me.incident.incidentBrwDisciplineGegevens) {
        // geen titleOverride, gebruikt common properties
        return null;
    }

    var c = [];
    var m = me.incident.BrwDisciplineGegevens;
    if(m.Meldingsclassificatie1) {
        c.push(m.Meldingsclassificatie1);
    }
    if(m.Meldingsclassificatie2) {
        c.push(m.Meldingsclassificatie2);
    }
    if(m.Meldingsclassificatie3) {
        c.push(m.Meldingsclassificatie3);
    }

    var title = "<i class='fa fa-bell'/> <span style='font-weight: bold; color: " + me.incidentDetailsWindow.getPrioriteitColor(m.Prioriteit) + "'>P " + me.incident.BrwDisciplineGegevens.Prioriteit + "</span> " + c.join(", ") + " - " +
            dbkjs.util.htmlEncode(me.incidentDetailsWindow.getIncidentAdres(me.incident, false)) +
            " " + dbkjs.util.htmlEncode(me.incident.IncidentLocatie.Plaatsnaam);

    /*
     * Requested by Dennis: dont show units in the rightbottom bar.
     *
    var displayEenheden = [];
    var extraCount = 0;
    $.each(me.incident.BetrokkenEenheden, function(i, e) {
        if(e.Discipline !== "B" || me.voertuignummer === e.Roepnaam) {
            return;
        }
        if(displayEenheden.length === 4) {
            extraCount++;
        } else {
            displayEenheden.push(e.Roepnaam);
        }
    });
    if(displayEenheden.length > 0) {
        title += ", " + displayEenheden.join(" ");
        if(extraCount > 0) {
            title += " <b>+" + extraCount + "</b>";
        }
    }
    */

    return title;
};

VehicleIncidentsController.prototype.markerClick = function() {
    this.incidentDetailsWindow.show();
    this.zoomToIncident();
};

VehicleIncidentsController.prototype.normalizeIncidentFields = function(incidentInfo) {
    var incident = incidentInfo.incident;
    if(incidentInfo.source === "SMCT") {

        incident.id = incident.IncidentId; // Used for IncidentMonitorController.updateVehiclePositionLayer()
        incident.nummer = incident.IncidentNummer;

        incident.x = incident.IncidentLocatie.XCoordinaat;
        incident.y = incident.IncidentLocatie.YCoordinaat;

        var l = incident.IncidentLocatie;
        incident.postcode = l.Postcode;
        incident.woonplaats = l.Plaatsnaam;
        incident.huisnummer = l.Huisnummer;
        incident.huisletter = l.Letter;
        incident.toevoeging = l.HnToevoeging;
        incident.straat = l.NaamLocatie1;

        incident.actueleInzet = false;
        incident.inzetEenhedenStats = {
            "B": {
                "total": 0
            },
            "P": {
                "total": 0
            },
            "A": {
                "total": 0
            }
        };

        incident.beeindigdeInzet = false;
        $.each(incident.BetrokkenEenheden, function(j, eenheid) {
            if(eenheid.Discipline === "B" && eenheid.IsActief) {
                incident.actueleInzet = true;
            }
        });
        $.each(incident.BetrokkenEenheden, function(j, eenheid) {
            // Bij actuele inzet niet inactieve eenheden tellen, wel bij incidenten
            // waarbij inzet beeindigd is (gearchiveerd)
            if(incident.actueleInzet) {
                if(!eenheid.IsActief) {
                    return;
                }
            }
            incident.inzetEenhedenStats[eenheid.Discipline].total++;
            var inzetRol = eenheid.InzetRol;
            if(inzetRol) {
                var soortCount = incident.inzetEenhedenStats[eenheid.Discipline][inzetRol];
                if(typeof soortCount === "undefined") {
                    soortCount = 0;
                }
                incident.inzetEenhedenStats[eenheid.Discipline][inzetRol] = soortCount + 1;
            }
        });
        incident.beeindigdeInzet = incident.inzetEenhedenStats.B.total > 0 && !incident.actueleInzet;

        incident.locatie = IncidentDetailsWindow.prototype.getIncidentAdres(incident);
        incident.start = new moment(incident.BrwDisciplineGegevens.StartDTG);
        incident.prio = incident.BrwDisciplineGegevens.Prioriteit;
        incident.plaats = incident.IncidentLocatie.Plaatsnaam;
        incident.classificaties = IncidentDetailsWindow.prototype.getIncidentClassificatiesFalck(incident);

        // TODO eenheden: roepnaam, discipline, soort(inzet), kazerne, actief, evt einde inzet, evt start inzet

        // TODO karakteristieken

        // TODO xy
    } else if(incidentInfo.source === "VrhAGS") {
        incident.id = incident.INCIDENT_ID; // Used for IncidentMonitorController.updateVehiclePositionLayer()
        incident.nummer = incident.NR_INCIDENT;

        incident.x = incident.T_X_COORD_LOC;
        incident.y = incident.T_Y_COORD_LOC;

        incident.postcode = incident.POSTCODE;
        incident.woonplaats = incident.PLAATS_NAAM_NEN;
        incident.huisnummer = Number(incident.HUIS_PAAL_NR);
        incident.huisletter = incident.HUISLETTER;
        incident.toevoeging = incident.HUIS_NR_TOEV;
        incident.straat = incident.NAAM_LOCATIE1;
    } else {
        throw "Unknown incident source: " + incidentInfo.source;
    }
};
