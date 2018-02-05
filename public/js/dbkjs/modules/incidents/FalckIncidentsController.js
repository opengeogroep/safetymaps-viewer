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
        me.zoomToIncident();
    });

    me.incidentDetailsWindow = new IncidentDetailsWindow();
    me.incidentDetailsWindow.createElements("Incident");
    $(me.incidentDetailsWindow).on('show', function() {
        me.button.setAlerted(false);
    });

    me.markerLayer = new IncidentMarkerLayer();
    $(me.markerLayer).on('click', function(incident) {
        me.markerClick();
    });
    me.marker = null;

    me.voertuignummer = window.localStorage.getItem("voertuignummer");

    me.xml = null;

    $('.dbk-title').on('click', function() {
        me.zoomToIncident();
        me.incidentDetailsWindow.show();
        if(me.featureSelector.matches.length === 1) {
            dbkjs.protocol.jsonDBK.process(me.featureSelector.matches[0], null, true);
        } else {
            dbkjs.protocol.jsonDBK.deselect();
            me.incidentDetailsWindow.showMultipleFeatureMatches();
        }
    });

    $(dbkjs).one("dbkjs_init_complete", function() {
        window.setTimeout(function() {
            me.addConfigControls();
            me.getVoertuignummers();
            me.setVoertuignummer(me.voertuignummer, true);
        }, 2000);
    });
};

/**
 * Add controls to configuration window.
 */
FalckIncidentsController.prototype.addConfigControls = function() {
    var me = this;
    var incidentSettings = $("<div><h4>Meldkamerkoppeling</h4><p/>" +
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

    var nummers = me.voertuignummer.split(/[,\s]+/);
    var i = 0;
    function check() {
        if(i < nummers.length) {
            var nummer = nummers[i++];
            me.getVoertuigIncidenten(nummer)
            .fail(function(msg) {
                me.handleInzetInfo(msg);
            })
            .done(function(inzetInfo) {
                if(inzetInfo === null) {
                    // should use promises somehow
                    check();
                } else {
                    me.handleInzetInfo(inzetInfo);
                }
            });
        } else {
            // all nummers checked, no inzet
            me.handleInzetInfo(null);
        }
    }
    check();
};

FalckIncidentsController.prototype.handleInzetInfo = function(inzetInfo) {
    var me = this;

    me.getInzetTimeout = window.setTimeout(function() {
        me.getInzetInfo();
    }, 30000);

    if(typeof inzetInfo === "string") {
        var msg = "Kan meldkamerinfo niet ophalen: " + inzetInfo;
        dbkjs.gui.showError(msg);
        me.button.setIcon("bell-slash");
        me.incidentDetailsWindow.showError(msg);
    } else if(inzetInfo === null || inzetInfo.length === 0) {
        me.incidentDetailsWindow.showError("Geen actief incident voor voertuig(en) " + me.voertuignummer + ". Laatst informatie opgehaald op " + new moment().format("LLL") + ".");

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
    } else {
        $('#systeem_meldingen').hide();
        me.button.setIcon("bell-o");
        var incidenten = inzetInfo;
        me.inzetIncident(incidenten[incidenten.length-1]);
    }
};

/**
 *
 * @param {type} nummer voertuignummer
 * @returns null if no incidents from service, string if Ajax error, or array of incidents for eenheid
 */
FalckIncidentsController.prototype.getVoertuigIncidenten = function(nummer) {
    var me = this;

    var p = $.Deferred();
    $.ajax(me.options.incidentsUrl + "/eenheid/" + nummer, {
        dataType: "json"
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        p.reject(AGSIncidentService.prototype.getAjaxError(jqXHR, textStatus, errorThrown));
    })
    .done(function(data) {
        data = data[0];
        var incidenten = data && data.Incidenten && data.Incidenten.length > 0 ? data.Incidenten : null;

        if(incidenten && incidenten.length > 0) {
            console.log("Got incidents for voertuig " + nummer + ": " + incidenten);
        } else {
            console.log("No incidents for voertuig " + nummer);
        }
        p.resolve(incidenten);
    });
    return p;
};

FalckIncidentsController.prototype.geenInzet = function(triggerEvent) {
    this.disableIncidentUpdates();
    this.incidentId = null;
    this.incident = null;
    this.incidentDetailsWindow.data("Er is momenteel geen incident waavoor dit voertuig is ingezet.");
    this.incidentDetailsWindow.hide();
    this.markerLayer.clear();
    if(this.featureSelector) {
        this.featureSelector.hideBalkRechtsonder();
    }
    this.button.setAlerted(false);
    this.button.setIcon("bell-o");

    if(triggerEvent) {
        $(this).triggerHandler("end_incident");
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
            me.incidentDetailsWindow.data(incident, true);
            me.markerLayer.addIncident(incident, false, true);
            me.markerLayer.setZIndexFix();

            dbkjs.protocol.jsonDBK.deselect();
            me.zoomToIncident();

            var x = incident.IncidentLocatie.XCoordinaat;
            var y = incident.IncidentLocatie.YCoordinaat;
            var l = incident.IncidentLocatie;
            var commonIncidentObject = {
                postcode: l.Postcode,
                woonplaats: l.Plaatsnaam,
                huisnummer: l.Huisnummer,
                huisletter: l.Letter,
                toevoeging: l.HnToevoeging,
                straat: l.NaamLocatie1,
                x: x,
                y: y
            };
            me.featureSelector = new IncidentFeatureSelector(incident, commonIncidentObject, true, false);

            me.featureSelector.updateBalkRechtsonder(me.getBalkrechtsonderTitle());
            me.featureSelector.findAndSelectMatches(me.incidentDetailsWindow);

            me.incidentDetailsWindow.show();
            me.enableIncidentUpdates();

            me.button.setIcon("bell");

            $(me).triggerHandler("new_incident", [commonIncidentObject]);
        });
    }
};


FalckIncidentsController.prototype.zoomToIncident = function() {
    if(this.incident && this.incident.IncidentLocatie && this.incident.IncidentLocatie.XCoordinaat && this.incident.IncidentLocatie.YCoordinaat) {
        dbkjs.map.setCenter(new OpenLayers.LonLat(this.incident.IncidentLocatie.XCoordinaat, this.incident.IncidentLocatie.YCoordinaat), dbkjs.options.zoom);
    }
};

FalckIncidentsController.prototype.getBalkrechtsonderTitle = function() {
    var me = this;
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

    return title;
};

FalckIncidentsController.prototype.markerClick = function() {
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

FalckIncidentsController.prototype.updateIncident = function(incidentId) {
    var me = this;
    if(this.incidentId !== incidentId) {
        // Incident cancelled or changed since timeout was set, ignore
        return;
    }

    $.ajax(me.options.incidentsUrl + "/incident/" + incidentId, {
        dataType: "json"
    })
    .fail(function(e) {
        var msg = "Kan incidentinfo niet updaten: " + e;
        dbkjs.gui.showError(msg);
        me.incidentDetailsWindow.showError(msg);
        // Leave incidentDetailsWindow contents with old info
    })
    .done(function(incident) {
        if(me.incidentId !== incidentId) {
            // Incident cancelled or changed since request was fired off, ignore
            return;
        }
        if(incident.length === 0) {
            me.geenInzet(true);
            return;
        }
        incident = incident[0];
        me.normalizeIncidentFields(incident);
        var oldIncident = me.incident;
        me.incident = incident;
        me.button.setIcon("bell");

        // Always update window, updates moment.fromNow() times
        me.incidentDetailsWindow.data(incident, true, true);

        // Check if updated, enable alert state if true
        var oldIncidentHtml = me.incidentDetailsWindow.getIncidentHtmlFalck(oldIncident, true, true);
        if(oldIncidentHtml !== me.incidentDetailsWindow.getIncidentHtmlFalck(incident, true, true)) {
            $(dbkjs).trigger("incidents.updated");
            if(!me.incidentDetailsWindow.isVisible()) {
                me.button.setAlerted(true);
            }

            // Possibly update marker position
            me.markerLayer.addIncident(incident, false, true);
            me.markerLayer.setZIndexFix();

            me.updateBalkrechtsonder();
        }

        // Check if position updated
        var oldX = null, oldY = null;
        if(oldIncident.IncidentLocatie) {
            oldX = oldIncident.IncidentLocatie.XCoordinaat;
            oldY = oldIncident.IncidentLocatie.YCoordinaat;
        }

        if(incident.IncidentLocatie
        && (incident.IncidentLocatie.XCoordinaat !== oldX
            || incident.IncidentLocatie.YCoordinaat !== oldY)) {

            // This function uses coords in me.incident, updated in previous if stmt
            me.zoomToIncident();
        }
    });
};

FalckIncidentsController.prototype.normalizeIncidentFields = function(incident) {
    incident.id = incident.IncidentId; // Used for IncidentMonitorController.updateVehiclePositionLayer()

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
};
