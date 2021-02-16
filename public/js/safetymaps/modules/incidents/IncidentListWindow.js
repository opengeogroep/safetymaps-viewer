/*
 *  Copyright (c) 2015-2018 B3Partners (info@b3partners.nl)
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
/* global SplitScreenWindow */

/**
 * Window which shows list of current and historic events. Subclass of
 * SplitScreenWindow. Create only one instance as it always uses modal popup
 * name "incidentList".
 * @returns {IncidentListWindow}
 */
function IncidentListWindow() {
    SplitScreenWindow.call(this, "incidentList");
    var me = this;

    $(this).on('elements_created', function() {
        me.getView().html("Verbinden met incidentenservice...");
    });
}

IncidentListWindow.prototype = Object.create(SplitScreenWindow.prototype);
IncidentListWindow.prototype.constructor = IncidentListWindow;

IncidentListWindow.prototype.showError = function(e) {
    this.getView().html("");
    this.getView().text(e);
};

/**
 * Render incidents in the window view.
 * @param {object} activeIncidents Array of active incidents
 * @param {object} inactiveIncidents Array of inactive incidents
 * @param {boolean} restoreScrollTop
 * @returns {undefined}
 */
IncidentListWindow.prototype.data = function(activeIncidents, inactiveIncidents, restoreScrollTop) {
    var me = this;

    var v = this.getView();
    var scrollTop = v.scrollTop();

    v.html("");

    var d = $("<div class='incidentList'/>");
    var h = $("<div class='header actueleInzet'/>")
            .html(activeIncidents.length === 0 ? "Geen actieve incidenten" :
                (activeIncidents.length === 1 ? "&Eacute;&eacute;n actief incident" : activeIncidents.length + " actieve incidenten") +
                " met actuele inzet brandweereenheden");

    h.appendTo(d);
    me.listIncidents(d, activeIncidents, true, function(r, incident) {
        $(r).on('click', function() {
            $(me).trigger('click', { incident: incident, addMarker: false });
        });
    });

    var h = $("<div class='header archief'/>").html("Gearchiveerde/inzet be&euml;indigde incidenten");
    h.appendTo(d);
    me.listIncidents(d, inactiveIncidents, false, function(r, incident) {
        $(r).on('click', function() {
            $(me).trigger('click', { incident: incident, addMarker: true });
        });
    });
    d.appendTo(v);

    if(dbkjs.modules.incidents.options.incidentListFooterFunction) {
        var f = dbkjs.modules.incidents.options.incidentListFooterFunction;
        if(typeof f === "string" && typeof(window[f]) === "function") {
            f = window[f];
        }

        if(typeof f === "function") {
            f(v, activeIncidents, inactiveIncidents);
        }
    }

    if(restoreScrollTop) {
        v.scrollTop(scrollTop);
    }
};

IncidentListWindow.prototype.listIncidents = function(el, incidents, showInzetInTitle, incidentDivFunction) {
    var me = this;

    var falck = incidents.length > 0 && incidents[0].IncidentNummer;

    incidents.sort(function(lhs, rhs) {
        return lhs.start > rhs.start ? -1 :
                lhs.start === rhs.start ? 0 : 1;
    });

    var d = $("<div class='list'/>");
    var odd = true;
    $.each(incidents, function(i, incident) {
        var actueleInzet = [];
        if(falck) {
            $.each(incident.BetrokkenEenheden, function(j, eenheid) {
                if(!incident.Actief || eenheid.IsActief) {
                    actueleInzet.push(eenheid.InzetRol + " " + eenheid.Roepnaam + (eenheid.BrwKazerne ? " (" + eenheid.BrwKazerne + ")" : ""));
                }
            });
        } else {
            $.each(incident.inzetEenheden, function(j, eenheid) {
                if(!eenheid.DTG_EIND_ACTIE) {
                    actueleInzet.push(eenheid.ROL + " " + eenheid.ROEPNAAM_EENHEID + (eenheid.KAZ_NAAM ? " (" + eenheid.KAZ_NAAM + ")" : ""));
                }
            });
        }
        var r = $("<div class='incident'/>")
                .addClass(odd ? "odd" : "even")
                .attr("title", incident.locatie + (showInzetInTitle && actueleInzet.length > 0 ? ", " + actueleInzet.join(", ") : ""));
        odd = !odd;

        if(dbkjs.modules.incidents.options.incidentListFunction) {
            var f = dbkjs.modules.incidents.options.incidentListFunction;
            if(typeof f === "string" && typeof(window[f]) === "function") {
                f = window[f];
            }

            if(typeof f === "function") {
                f(r, incident);
            }
        }

        $("<span class='time'/>").text(incident.start.format("D-M-YYYY HH:mm")).appendTo(r);
        $("<span class='locatie'/>").text(incident.locatie).appendTo(r);
        $("<span class='plaats'/>").text(incident.plaats || "-").appendTo(r);
        $("<span class='prio prio" + incident.prio + "'/>").text(incident.prio || "").appendTo(r);

        var classificaties = incident.classificaties || "";
        var icons = me.getIncidentEenhedenIcons(incident, incident.prio);

        $("<span class='classificatie'/>").html(icons + classificaties).appendTo(r);
        $("<span class='fromNow'/>").text(incident.start.fromNow()).appendTo(r);

        if(incidentDivFunction) {
            incidentDivFunction(r, incident);
        }
        r.appendTo(d);
    });
    d.appendTo(el);
};

IncidentListWindow.prototype.getIncidentEenhedenIcons = function(incident, prio) {
    var me = this;
    var html = "";

    function multiIcon(soort,count) {
        var icon = "<i class='fa fa-" + soort + "' style='margin-right: 5px'></i>";
        if(count > 3) {
            return count + "&times;" + icon + "&nbsp;";
        } else if(count > 0) {
            return icon.repeat(count);
        } else {
            return "";
        }
    }

    var iconsA = {
        "ambulance": 0,
        "motorcycle": 0,
        "medkit": 0,
        "stethoscope": 0
    };
    $.each(incident.inzetEenhedenStats.A, function(soort, count) {
        if(soort !== "total") {
            if(soort.indexOf("MMT") !== -1) {
                iconsA.stethoscope += count;
            } else if(soort === "MOTOR") {
                iconsA.motorcycle += count;
            } else if(soort === "HAP") {
                iconsA.medkit += count;
            } else {
                iconsA.ambulance += count;
            }
        }
    });
    var iconsB = {
        "bus": 0,
        "cab": 0,
        "motorcycle": 0,
        "ship": 0
    };
    $.each(incident.inzetEenhedenStats.B, function(soort, count) {
        if(soort !== "total") {
            if(soort.indexOf("DA") !== -1 || soort.indexOf("DV") !== -1) {
                iconsB.cab += count;
            } else if(soort === "BMM") {
                iconsB.motorcycle += count;
            } else if(soort === "WO") {
                iconsB.ship += count;
            } else {
                iconsB.bus += count;
            }
        }
    });

    var htmlA = multiIcon("ambulance",iconsA.ambulance) + multiIcon("motorcycle",iconsA.motorcycle) + multiIcon("stethoscope",iconsA.stethoscope) + multiIcon("medkit",iconsA.medkit) ;
    var htmlB = multiIcon("ship",iconsB.ship) + multiIcon("bus",iconsB.bus) + multiIcon("cab",iconsB.cab) + multiIcon("motorcycle",iconsB.motorcycle);

    html = "<span class='eenh disc_b prio" + prio + "'>" + htmlB + "</span>";
    if(incident.inzetEenhedenStats.P.total !== 0) {
        html += "<span class='eenh disc_p prio" + prio + "'>" + multiIcon("cab",incident.inzetEenhedenStats.P.total) + "</span>";
    }
    if(incident.inzetEenhedenStats.A.total !== 0) {
        html += "<span class='eenh disc_a prio" + prio + "'>" + htmlA + "</span>";
    }
    return html;
};
