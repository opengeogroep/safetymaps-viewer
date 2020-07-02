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
 * new_incident: when new incident is received, also fired when clicking lower right bar
 * end_incident: inzet for incident was ended, or voertuignummer was changed
 */
function VehicleIncidentsController(options, featureSelector) {
    var me = this;
    me.featureSelector = featureSelector;
    me.options = me.defaultOptions(options);

    me.checkAuthorizations();

    me.primaryFailing = false;
    me.handlingInzetInfo = false;

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

    me.checkLinkifyWords();
    me.checkCrsLinks();

    me.markerLayer = new IncidentMarkerLayer();
    $(me.markerLayer).on('click', function(incident, marker) {
        me.markerClick();
    });
    me.marker = null;

    if(!me.options.eigenVoertuignummerAuthorized) {
        me.voertuignummer = me.options.userVoertuignummer;
    } else {
        me.voertuignummer = window.localStorage.getItem("voertuignummer");
        // Empty string not set to default - means disable!
        if(me.voertuignummer === "undefined" || me.voertuignummer === null || me.voertuignummer === "") {
            me.voertuignummer = me.options.userVoertuignummer;
        }
    }
    window.localStorage.setItem("voertuignummer", me.voertuignummer);

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

    me.vehiclePositionLayer = new VehiclePositionLayer({
        showInzetRol: me.options.vehiclesShowInzetRol
    });
    if(me.options.showVehicles) {
        dbkjs.selectControl.layers.push(me.vehiclePositionLayer.layer);

        $(dbkjs).one("dbkjs_init_complete", function() {
            me.vehiclePositionLayer.raiseLayers();
        });
    }

    if(me.options.incidentSource === "VrhAGS" || me.options.incidentSourceFallback === "VrhAGS") {
        // Initialize AGS service
        this.service = new AGSIncidentService(me.options.apiPath + "vrhAGS", me.options.apiPath + "vrhAGSEenheden");

        this.service.initialize(me.options.apiPath + "vrhAGSToken", null, null)
        .fail(function(e) {
            console.log("VrhAGS service failed to initialize", arguments);
            return;
        });
    }

    me.incidentMonitorCode = window.localStorage.getItem("imcode");
    // Create incidentmonitor after setting this.service
    me.checkIncidentMonitor();

    $(dbkjs).one("dbkjs_init_complete", function() {
        window.setTimeout(function() {
            me.setVoertuignummer(me.voertuignummer, true);
            me.options.showStatus && me.updateStatus();
        }, 2000);
    });
}

VehicleIncidentsController.prototype.defaultOptions = function(options) {
    return $.extend({
        // Set to crossdomain URL for onboard in customize.js
        apiPath: dbkjs.options.urls && dbkjs.options.urls.apiPath ? dbkjs.options.urls.apiPath : "api/",

        // Supported: 'SafetyConnect', 'VrhAGS'
        incidentSource: 'SafetyConnect',
        incidentSourceFallback: null,
        incidentUpdateInterval: 30000,
        activeIncidentUpdateInterval: 15000,
        logStatus: false,

        // Show eenheden for ingezet incident?
        showVehicles: true,
        vehiclesUpdateInterval: 30000,
        vehiclesShowInzetRol: true,
        vehiclesShowSpeed: true,
        vehiclesShowVehiclePopup: false,
        vehiclePopupTemplate: "<div style='font-size: 12px; overflow: hidden'>Pos. van {{PositionTimeFromNow}}<br>Status: {{Status}}<br>Mobile ID: {{MobileID}}</div>",
        logVehicles: false,

        // ViewerApiActionBean sets this to true for users with incidentmonitor role
        incidentMonitorAuthorized: false,
        // ViewerApiActionBean sets this to true for users with incidentmonitor_kladblok role
        incidentMonitorKladblokAuthorized: false,
        // User can only enable IM entering this code, if set
        incidentMonitorCode: null,
        // Show eenheden for active incidents? Defaults to showVehicles option
        incidentMonitorShowVehicles: null,
        // Show option for showing unassigned but moving vehicles (gray icon) in settings page?
        incidentMonitorEnableUnassignedVehicles: false,

        // ViewerApiActionBean sets this to value set by admin for user
        userVoertuignummer: null,
        // ViewerApiActionBean sets this to true for users with eigen_voertuignummer role
        eigenVoertuignummerAuthorized: false,
        // User can only change voertuignummer if eigenVoertuignummerAuthorized is true
        // and entering this code, if set
        voertuignummerCode: null,

        showStatus: true,
        statusUpdateInterval: 15000,
        showFoto: true,

        // Change icon to bell with cross and show error message or just show
        // error message in details window
        silentError: false,

        // Customize incident monitor incident list: specify functions or names
        // of functions
        incidentListFooterFunction: null,
        incidentListFunction: null
    }, options);
};

VehicleIncidentsController.prototype.checkAuthorizations = function() {
    var authorized = false;
    if(this.options.incidentSource === "VrhAGS") {
        authorized = this.options.sourceVrhAGSAuthorized;
    } else if(this.options.incidentSource === "SafetyConnect") {
        authorized = this.options.sourceSafetyConnectAuthorized;
    }
    if(!authorized && this.options.incidentSourceFallback) {
        if(this.options.incidentSourceFallback === "VrhAGS" && this.options.sourceVrhAGSAuthorized) {
            authorized = true;
            console.log("Primary incident source SC not authorized, using fallback source VrhAGS");
            this.options.incidentSource = "VrhAGS";
            this.options.incidentSourceFallback = null;
        }
        if(this.options.incidentSourceFallback === "SafetyConnect" && this.options.sourceSafetyConnectAuthorized) {
            authorized = true;
            console.log("Primary incident source VrhAGS not authorized, using fallback source SC");
            this.options.incidentSource = "SafetyConnect";
            this.options.incidentSourceFallback = null;
        }
    }
    if(!authorized) {
        throw new Error("Not authorized for incident source " + this.options.incidentSource);
    }
}

VehicleIncidentsController.prototype.checkLinkifyWords = function() {
    var me = this;
    if(me.options.linkifyWords && me.options.linkifyIFrame) {
        me.incidentDetailsWindow.setLinkifyWords(me.options.linkifyWords);
        me.externalIFrameWindow = safetymaps.infoWindow.addWindow("external", "Inzetbank", false);//new SplitScreenWindow("externalIFrame");// new ModalWindow("externalIFrame");
        var div = $("<div style='width: 100%; height: 100%'>Klik op een woord bij een incident om meer informatie op te vragen...</div>");
        //me.externalIFrameWindow.createElements("Informatie");

        $(me).on("new_incident", function() {
            safetymaps.infoWindow.removeTab("incident", "external");
        });

        $(me.incidentDetailsWindow).on("linkifyWordClicked", function(e, word) {
            var term = me.options.linkifyWords[word.toLowerCase()];
            if(typeof term !== "string") {
                term = word;
            }
            $(div).html("<iframe src='" + me.options.linkifyIFrame.replace("[term]", term) + "' style='width: 100%; height: 100%'></iframe>");
            if($("#tab_external").length === 0) {
                safetymaps.infoWindow.addTab("incident", "external", "Inzetbank", "external", div, null);
            }
            $("#tab_external").css("height", "95%");
            safetymaps.infoWindow.showTab("incident", "external", true);

            //me.externalIFrameWindow.show();
        });
    }
};

VehicleIncidentsController.prototype.checkCrsLinks = function() {
    var me = this;
    if(me.options.crsLinkEnabled && me.options.crsLinkUrl) {
        var div = $("<div style='width: 100%; height: 100%'></div>");
        me.incidentDetailsWindow.crsLinkEnabled = true;
        $(me.incidentDetailsWindow).on("crsLinkClicked", function(e, link) {
            window.open(`${ me.options.crsLinkUrl.replace("[kenteken]", link) }`);
        });
    }
}

VehicleIncidentsController.prototype.checkIncidentMonitor = function() {
    var me = this;

    me.incidentMonitor = false;
    if(me.options.incidentMonitorAuthorized) {
        if(!me.options.incidentMonitorCode) {
            me.incidentMonitor = true;
        } else {
            me.incidentMonitor = me.options.incidentMonitorCode === me.incidentMonitorCode;
        }
    }

    if(me.incidentMonitor) {
        if(me.incidentMonitorController) {
            me.incidentMonitorController.enable();
        } else {

            var incidentMonitorOptions = {
                showVehicles: me.options.incidentMonitorShowVehicles !== null ? me.options.incidentMonitorShowVehicles : me.options.showVehicles,
                showInzetRol: me.options.vehiclesShowInzetRol,
                enableUnassignedVehicles: me.options.incidentMonitorEnableUnassignedVehicles,
                incidentListFunction: me.options.incidentListFunction,
                incidentListFooterFunction: me.options.incidentListFooterFunction,
                agsService: me.service,
                incidentSource: me.options.incidentSource,
                vehicleSource: me.options.vehicleSource,
                vehicleSourceURL: me.options.vehicleSourceURL,
                logVehicles: me.options.logVehicles,
                twitterUrlPrefix: me.options.twitterUrlPrefix,
                twitterIgnoredAccounts: me.options.twitterIgnoredAccounts,
                logTwitter: me.options.logTwitter,
                showSpeed: me.options.showSpeed
            };

            me.incidentMonitorController = new IncidentMonitorController(incidentMonitorOptions);
            me.incidentMonitorController.incidentListWindow.setSplitScreen(false);

            $(dbkjs).on("setting_changed_splitscreen", function() {
                // Incident list always fullscreen independent of global setting
                me.incidentMonitorController.incidentListWindow.setSplitScreen(false);
            });

            $(me.incidentMonitorController).on("incident_selected", function() { me.incidentMonitorIncidentSelected.apply(me, arguments); });
            $(me.incidentMonitorController).on("incident_empty", function () { 
                if (me.inzetInfo) {
                    me.inzetBeeindigd('Incident beeindigd'); 
                }
            });
        }
    } else {
        if(me.incidentMonitorController) {
            me.incidentMonitorController.disable();
        }
    }
};

VehicleIncidentsController.prototype.incidentMonitorIncidentSelected = function(event, inzetInfo) {
    var me = this;

    var openedIncident = (me.incident && me.incident !== null);
    var openedIncidentIsEnded = (openedIncident && me.incident.beeindigdeInzet);
    var selectedIncidentIsEnded = inzetInfo.incident.beeindigdeInzet;

    if (openedIncident && !openedIncidentIsEnded && selectedIncidentIsEnded) {
        this.inzetBeeindigd('Incident beeindigd');
    } else {
        this.inzetInfo = inzetInfo;
        this.inzetIncident(inzetInfo, true);
    }
};

/**
 * Add controls to configuration window.
 */
VehicleIncidentsController.prototype.addConfigControls = function() {
    var me = this;

    var incidentCodeHtml = "";

    if(me.options.incidentMonitorAuthorized && me.options.incidentMonitorCode) {
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
                        "<div class='col-xs-2' style='height: 34px'><button class='btn btn-primary' id='btn_enable_voertuignummer'>Wijzigen</button></div>" +
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

    $("#btn_enable_voertuignummer").toggle(me.options.eigenVoertuignummerAuthorized);
    if(!me.options.eigenVoertuignummerAuthorized || !me.options.voertuignummerCode) {
        $("#cfg_voertuignummercode").hide();
    }

    if(me.options.incidentMonitorAuthorized && me.options.incidentMonitorCode) {
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
                $("#btn_enable_voertuignummer").hide();
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

        if(me.options.eigenVoertuignummerAuthorized) {
            $("#input_voertuignummer").attr("disabled", "disabled");
            $("#btn_enable_voertuignummer").show();
        }
    });

    $("#input_voertuignummer").val(me.voertuignummer);

    me.enableVoertuignummerTypeahead();

    if(!me.voertuignummer && me.options.eigenVoertuignummerAuthorized) {
        // Open config window when voertuignummer not configured
        $("#c_settings").click();
    }
};

VehicleIncidentsController.prototype.enableVoertuignummerTypeahead = function() {
    var me = this;
    if(me.options.incidentSource === "SafetyConnect") {
        $.ajax(me.options.apiPath + "safetyconnect/eenheid", {
            dataType: "json",
            xhrFields: { withCredentials: true }, crossDomain: true
        })
        .done(function(data, textStatus, jqXHR) {
            me.options.logVehicles && me.options.logVehicles && console.log("SC: Voertuignummers", data);
            $("#input_voertuignummer")
            .typeahead({
                name: 'voertuignummers',
                local: data,
                limit: 10
            });
        });
    } else if(me.options.incidentSource === "VrhAGS") {
        me.service.whenInitialized()
        .done(function() {
            me.service.getVoertuignummerTypeahead()
            .done(function(datums) {
                me.options.logVehicles && console.log("VrhAGS: Voertuignummers", datums);
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
        });
    }
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
    
    var voertuignummers;
    if (!voertuignummer || voertuignummer === '') {
        voertuignummers = [""];
    } else {
        voertuignummers = voertuignummer.split(/[,; ]+/);
    }
    me.voertuignummers = voertuignummers;

    me.voertuignummer = me.voertuignummers[0];
    window.localStorage.setItem("voertuignummer", voertuignummer);

    me.cancelGetInzetInfo();
    me.incident && me.geenInzet();

    me.getInzetInfo();
    me.updateStatus();
};

VehicleIncidentsController.prototype.resetVoertuignummer = function (voertuignummer) {
    this.voertuignummer = voertuignummer;
}

VehicleIncidentsController.prototype.cancelGetInzetInfo = function() {
    var me = this;
    if(me.getInzetTimeout) {
        window.clearTimeout(me.getInzetTimeout);
        me.getInzetTimeout = null;
    }
};

VehicleIncidentsController.prototype.getInzetInfo = function() {
    var me = this;

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

    me.handlingInzetInfo = true;
    me.inzetInfo = inzetInfo;

    var interval = me.options.incidentUpdateInterval;
    if(typeof inzetInfo === "object" && inzetInfo.incident) {
        interval = me.options.activeIncidentUpdateInterval;
    }
    if (me.getInzetTimeout) {
        window.clearTimeout(me.getInzetTimeout);
    }
    me.getInzetTimeout = window.setTimeout(function() {
        me.getInzetInfo();
    }, interval);

    if(me.incidentMonitorController) {
        me.incidentMonitorController.markerLayer.layer.setVisibility(true);
    }

    $('#systeem_meldingen').hide();
    me.button.setIcon("bell-o");

    $("#inzetSource").remove();
    var inzetSourceMsg;
    if(typeof inzetInfo === "string") {
        inzetSourceMsg = "Bron incidentgegevens: geen bronnen bereikbaar, verbindingsprobleem?";
    } else {
        inzetSourceMsg = "Bron incidentgegevens: " + (inzetInfo.source === "VrhAGS" ? "ArcGIS GMS replica VRH" : "SC&T SafetyConnect webservice");
    }
    $("<div id='inzetSource'>" + inzetSourceMsg + "</div>").appendTo("#settingspanel_b");

    if(typeof inzetInfo === "string") {
        var msg = "Kan meldkamerinfo niet ophalen: " + inzetInfo;
        if(!me.options.silentError) {
            dbkjs.util.showError(msg);
            me.button.setIcon("bell-slash");
        }
        me.incidentDetailsWindow.showError(msg);

        return;
    }

    var openedIncident = (me.incident && me.incident !== null);
    var openedIncidentIsEnded = (openedIncident && me.incident.beeindigdeInzet)
    var openedIncidentIsForVehicle = (openedIncident && (me.incident.BetrokkenEenheden && me.incident.BetrokkenEenheden.filter(function (be) {
            return be.Roepnaam === me.voertuignummer && be.IsActief;
        }).length > 0));
    var incidentFoundForVehicle = (inzetInfo.incidenten !== null && inzetInfo.incidenten !== 0);
    var vehicleCount = me.voertuignummers.length;
    var currentVehicleIndex = me.voertuignummers.indexOf(me.voertuignummer);

    if (!openedIncident && !incidentFoundForVehicle) {
        me.incidentDetailsWindow.showError("Geen actief incident voor voertuig " + me.voertuignummer + ". Laatst informatie opgehaald op " + new moment().format("LLL") + ".");

        if (vehicleCount > 1 && currentVehicleIndex < (vehicleCount - 1)) {
            me.resetVoertuignummer(me.voertuignummers[currentVehicleIndex + 1]);
            me.getInzetTimeout && window.clearTimeout(me.getInzetTimeout);
            me.getInzetInfo();
        } 
        else if (vehicleCount > 1 && currentVehicleIndex === (vehicleCount - 1)) {
            me.resetVoertuignummer(me.voertuignummers[0]);
        }
    } 
    else if (!openedIncident && incidentFoundForVehicle) {
        me.incidentMonitorController && me.incidentMonitorController.markerLayer.layer.setVisibility(false);
        me.inzetIncident(inzetInfo, false);
        me.handlingInzetInfo = false;
    } 
    else if (openedIncident && openedIncidentIsEnded && !incidentFoundForVehicle) {
        me.incidentMonitorController.tryGetIncident();
        me.handlingInzetInfo = false;
    } 
    else if (openedIncident && openedIncidentIsEnded && incidentFoundForVehicle) { 
        me.incidentMonitorController && me.incidentMonitorController.markerLayer.layer.setVisibility(false);
        me.inzetIncident(inzetInfo, false);
        me.handlingInzetInfo = false;
    } 
    else if (openedIncident && !openedIncidentIsEnded && !openedIncidentIsForVehicle && !incidentFoundForVehicle) {
        me.incidentMonitorController.tryGetIncident();
        me.handlingInzetInfo = false;
    } 
    else if (openedIncident && !openedIncidentIsEnded && !openedIncidentIsForVehicle && incidentFoundForVehicle) {
        me.incidentMonitorController && me.incidentMonitorController.markerLayer.layer.setVisibility(false);
        me.inzetIncident(inzetInfo, false);
        me.handlingInzetInfo = false;
    } 
    else if (openedIncident && !openedIncidentIsEnded && openedIncidentIsForVehicle && !incidentFoundForVehicle) {
        me.inzetBeeindigd('Inzet beeindigd');
        me.handlingInzetInfo = false;
    } 
    else if (openedIncident && !openedIncidentIsEnded && openedIncidentIsForVehicle && incidentFoundForVehicle) {
        me.incidentMonitorController && me.incidentMonitorController.markerLayer.layer.setVisibility(false);
        me.inzetIncident(inzetInfo, false);
        me.handlingInzetInfo = false;
    }
};

VehicleIncidentsController.prototype.updateStatus = function() {
    var me = this;

    if(!me.voertuignummer) {
        $("#status").remove();
        return;
    }

    // When there is more then 1 voertuignummer configured it's possible that
    // me.getInzetInfo is still busy and the correct voertuignummer 
    // is not yet set in me.voertuignummer. 

    if (me.handleInzetInfo === true) {
        return;
    }

    // When switched to fallback source, also get status from fallback source
    // by using the same source for status as was used for inzet info

    if(me.inzetInfo && me.inzetInfo.source) {
        if(me.inzetInfo.source === "VrhAGS") {
            me.showStatusVrhAGS();
        } else {
            me.showStatusSC();
        }
    } else {
        // When no inzetInfo known yet use the primary source for status

        if(me.options.incidentSource === "VrhAGS") {
            me.showStatusVrhAGS();
        } else if(me.options.incidentSource === "SafetyConnect") {
            me.showStatusSC();
        }
    }
};

VehicleIncidentsController.prototype.showStatusVrhAGS = function() {
    var me = this;
    window.clearTimeout(me.updateStatusTimer);

    if(!me.service) {
        return;
    }

    me.service.getVoertuigStatus(me.voertuignummer)
    .always(function() {
        $("#status").remove();

        me.updateStatusTimer = window.setTimeout(function() {
            me.updateStatus();
        }, me.options.statusUpdateInterval);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.log("VrhAGS: Fout bij ophalen eenheidstatus", arguments);
    })
    .done(function(status) {
        if(status) {
            me.options.logStatus && console.log("VrhAGS: Voertuigstatus", status);
            var id = status.T_ACT_STATUS_CODE_EXT_BRW;
            var code = status.T_ACT_STATUS_AFK_BRW;

            switch(code) {
                case "UT": code = "UG"; break;
                case "KZ": code = "OK"; break;
                case "IR": code = "NI"; break;
            }

            $("<div id='status'>" + id + ": " + code + "</div>").prependTo("body");
        }
    });
};

VehicleIncidentsController.prototype.showStatusSC = function() {
    var me = this;

    window.clearTimeout(me.updateStatusTimer);

    $.ajax(me.options.apiPath + "safetyconnect/eenheidstatus/" + me.voertuignummer, {
        dataType: "json",
        xhrFields: { withCredentials: true }, crossDomain: true
    })
    .always(function() {
        $("#status").remove();

        me.updateStatusTimer = window.setTimeout(function() {
            me.updateStatus();
        }, me.options.statusUpdateInterval);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.log("SC: Fout bij ophalen eenheidstatus", arguments);
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
            me.options.logStatus && console.log("SC: Voertuigstatus", status);
            // Do not show code, SafetyConnect webservice puts it in StatusAfkorting and maps different codes
            $("<div id='status'>" + status.StatusAfkorting + "</div>").prependTo("body");
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
        if(me.options.incidentSourceFallback === "SafetyConnect") {
            fallback = me.getVoertuigIncidentSC(nummer);
        } else {
            me.options.incidentSourceFallback = null;
        }
    } else {
        primary = me.getVoertuigIncidentSC(nummer);
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

        if((!primaryInfo.incidenten || primaryInfo.incidenten.length === 0) && (fallbackInfo.incidenten && fallbackInfo.incidenten.length > 0)) {
            console.log("Fallback source has incident missing at primary source, using fallback source");
            p.resolve(fallbackInfo);
        } else {
            p.resolve(primaryInfo);
        }
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
VehicleIncidentsController.prototype.getVoertuigIncidentSC = function(nummer) {
    var me = this;

    var p = $.Deferred();
    $.ajax(me.options.apiPath + "safetyconnect/eenheid/" + nummer, {
        dataType: "json",
        data: {
            excludeManuallyCreated: me.options.excludeManuallyCreatedIncidents
        },
        xhrFields: { withCredentials: true }, crossDomain: true
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        p.reject(safetymaps.utils.getAjaxError(jqXHR, textStatus, errorThrown));
    })
    .done(function(data) {
        data = data[0];
        var incidenten = data && data.Incidenten && data.Incidenten.length > 0 ? data.Incidenten : null;

        if(incidenten && incidenten.length > 0) {
            console.log("SC: Got incidents for voertuig " + nummer + ": " + incidenten);

            $.ajax(me.options.apiPath + "safetyconnect/incident/" + incidenten[incidenten.length-1], {
                dataType: "json",
                data: {
                    extended: false
                },
                xhrFields: { withCredentials: true }, crossDomain: true
            })
            .fail(function(e) {
                console.log("SC: Error getting incident data", arguments);
                p.reject();
            })
            .done(function(data) {
                if(data.length === 0 || !data[0].IncidentId) {
                    console.log("SC: Error getting incident data (empty result)", arguments);
                    p.reject();
                    return;
                }
                try {
                    var incidentInfo = { source: "SafetyConnect", incidenten: incidenten, incident: data[0]};
                    me.normalizeIncidentFields(incidentInfo);
                    p.resolve(incidentInfo);
                } catch(e) {
                    console.log("SC: Error processing incident", e, data);
                    p.reject();
                }
            });

        } else {
            console.log("SC: No incidents for voertuig " + nummer);
            p.resolve({ source: "SafetyConnect", incidenten: incidenten});
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

    me.service.whenInitialized()
    .done(function() {
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
    });
    return p;
};

VehicleIncidentsController.prototype.updateVehiclePositions = function() {
    var me = this;
    window.clearTimeout(me.updateVehicleTimeout);

    if(me.incidentNummer) {
        // When switched to fallback source, also get vehicle positions from fallback source
        // by using the same source for vehicles as was used for inzet info

        if(me.inzetInfo && me.inzetInfo.source) {
            if(me.inzetInfo.source === "VrhAGS") {
                me.updateVehiclePositionsVrhAGS();
            } else {
                me.updateVehiclePositionsSC();
            }
        } else {
            // noInzetInfo/incidentNummer then no vehicle positions
        }
    }
};

VehicleIncidentsController.prototype.updateVehiclePositionsVrhAGS = function() {
    var me = this;
    me.service.getVehiclePositions([me.incident.INCIDENT_ID])
    .always(function() {
        me.updateVehicleTimeout = window.setTimeout(function() {
            me.updateVehiclePositions();
        }, me.options.vehiclesUpdateInterval);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        console.log("VrhAGS: Error updating vehicle positions", jqXHR, textStatus, errorThrown);
    })
    .done(function(features) {
        me.options.logVehicles && console.log("VrhAGS: Vehicle positions for incident", features);
        if(!features) {
            features = [];
        }
        $.each(features, function(i, f) {
             var dateTime = moment(f.attributes.PosDate + " " + f.attributes.PosTime, "DD-MM-YYYY HH:mm:ss");
             f.attributes.PositionTimeFromNow = dateTime.fromNow();
        });
        me.vehiclePositionLayer.features(features);
    });
};

VehicleIncidentsController.prototype.updateVehiclePositionsSC = function() {
    var me = this;
    $.ajax(me.options.apiPath + "safetyconnect/eenheidlocatie", {
        dataType: "json",
        data: {
            extended: false
        },
        xhrFields: { withCredentials: true }, crossDomain: true
    })
    .always(function() {
        me.updateVehicleTimeout = window.setTimeout(function() {
            me.updateVehiclePositions();
        }, me.options.vehiclesUpdateInterval);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        console.log("SC: Error updating vehicle positions", jqXHR, textStatus, errorThrown);
    })
    .done(function (data, textStatus, jqXHR) {
        me.options.logVehicles && console.log("SC: Vehicle positions for incident", data);
        var transformedVehicles = data.features
            .filter(function(f) {
                // Filter only vehicles for incident inzet
                return me.incident.BetrokkenEenheden.filter(function (be) {
                    return be.IsActief && be.Roepnaam === f.properties.id;
                }).length > 0;
            })
            .map(function(f) {
                // Map SC vehicles schema to schema expected by VehiclePositionLayer
                // (based on VrhAGS)
                var props = f.properties;
                var attributes = {
                    IncidentID: props.incidentNummer || "",
                    Voertuigsoort: props.inzetRol || "",
                    Roepnummer: props.id,
                    Speed: me.options.showSpeed ? props.speed || 0 : 0,
                    Direction: props.heading
                    //PositionTimeFromNow: not available
                };
                var geometry = new OpenLayers.Geometry.Point(f.geometry.coordinates[0], f.geometry.coordinates[1]);
                return new OpenLayers.Feature.Vector(geometry, attributes);
            });
        me.options.logVehicles && console.log("SC: Transformed vehicle positions for layer", transformedVehicles);
        me.vehiclePositionLayer.features(transformedVehicles);
    });
};

VehicleIncidentsController.prototype.geenInzet = function() {
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
    $(this).triggerHandler("end_incident");
    // XXX should listen to event
    safetymaps.deselectObject();
    this.incidentDetailsWindow.hideMultipleFeatureMatches();
};

VehicleIncidentsController.prototype.inzetIncident = function(incidentInfo, fromIncidentList) {
    console.log("inzetIncident (from IM: " + fromIncidentList + ")", incidentInfo);

    var me = this;

    // XXX update als incidentInfo.incident.nummer !== me.incidentNummer, is met timeout 30s...

    var oldIncident = me.incident;

    if(!fromIncidentList) {
        me.button.setIcon("bell");
    }

    if(incidentInfo.incident.nummer !== me.incidentNummer) {
        me.geenInzet();

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

        //XXX Luister naar incident
        dbkjs.modules.safetymaps_creator.unselectObject();
        me.zoomToIncident();

        me.featureSelector.findAndSelectMatches(incident, me.incidentDetailsWindow);
        me.featureSelector.updateBalkRechtsonder(me.getBalkrechtsonderTitle());

        me.incidentDetailsWindow.show();

        if(me.options.showVehicles) {
            me.updateVehiclePositions();
        }

        $(me).triggerHandler("new_incident", [incident, incidentInfo]);
    } else { // update

        /*if(fromIncidentList) {
            me.incidentDetailsWindow.show();
        }*/

        // XXX IM
/*
        if(me.incidentFromIncidentList && me.incidentFromIncidentListWasActive) {
            if(!incident.Actueel || incident.beeindigdeInzet) {
                me.inzetBeeindigd('Incident (of brandweerinzet) beeindigd');
                return;
            }
        }
*/
        me.incident = incidentInfo.incident;
        var incident = me.incident;

        // Always update window, updates moment.fromNow() times
        me.incidentDetailsWindow.data(incident, true, /* restoreScrollTop = */ true);

        // Check if updated, enable alert state if true

        // XXX
        var oldIncidentHtml, newIncidentHtml;
        if(incidentInfo.source === "SafetyConnect") {
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

    if(me.options.showTwitter) {
        me.incidentMonitorController.loadTweets(me.incident);
    }
};

VehicleIncidentsController.prototype.inzetBeeindigd = function(melding) {
    var me = this;
    dbkjs.zoomToInitialExtent();

    // Wait for layer loading messages to clear...
    window.setTimeout(function() {
        dbkjs.util.alert('Melding', melding);
        window.setTimeout(function() {
            $('#systeem_meldingen').hide();
        }, 10000);
    }, 3000);
    me.resetVoertuignummer(me.voertuignummers[0]);
    me.geenInzet();
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

    return title;
};

VehicleIncidentsController.prototype.markerClick = function() {
    this.incidentDetailsWindow.show();
    this.zoomToIncident();
};

VehicleIncidentsController.prototype.normalizeIncidentFields = function(incidentInfo) {
    var incident = incidentInfo.incident;
    if(incidentInfo.source === "SafetyConnect") {

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
        incident.locatie2 = l.NaamLocatie2;

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
        incident.woonplaats = incident.plaats || incident.PLAATS_NAAM_NEN || incident.PLAATS_NAAM;
        incident.huisnummer = Number(incident.HUIS_PAAL_NR);
        incident.huisletter = incident.HUISLETTER;
        incident.toevoeging = incident.HUIS_NR_TOEV;
        incident.straat = incident.NAAM_LOCATIE1;
        incident.locatie2 =  incident.NAAM_LOCATIE2;

        incident.start = AGSIncidentService.prototype.getAGSMoment(incident.DTG_START_INCIDENT);
    } else {
        throw "Unknown incident source: " + incidentInfo.source;
    }
};
