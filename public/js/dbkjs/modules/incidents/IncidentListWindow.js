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
 * Window which shows list of current and historic events. Subclass of
 * SplitScreenWindow. Create only one instance as it always uses modal popup
 * name "incidentList".
 * @returns {IncidentListWindow}
 */
function IncidentListWindow() {
    SplitScreenWindow.call(this, "incidentList");
    var me = this;

    me.createStyle();

    $(this).on('elements_created', function() {
        me.getView().html("Verbinden met incidentenservice...");

        // Replace "<- Kaart" with button
        me.getView().parent().find(".modal-popup-close").remove()

        $("<button class='btn btn-primary' style='float: left; margin: 5px'><i class='fa fa-arrow-left'></i></button>")
        .prependTo(me.getView().parent())
        .click(function() {
            me.hide();
        });

        me.getView().parent()
    });
}

IncidentListWindow.prototype = Object.create(SplitScreenWindow.prototype);
IncidentListWindow.prototype.constructor = IncidentListWindow;

IncidentListWindow.prototype.createStyle = function() {
    // Create style
    var css = '.incidentList .header { font-size: 18px; margin: 5px 0px 5px 0px } ' +
        //'.incidentList .list .incident.even { background-color: #; } ' +
        '.incidentList .list .incident.odd { background-color: #ECECEC; } ' +
        '.incidentList .list div.incident:hover { background-color: #DCE0E8; cursor: pointer; cursor: hand; } ' +
        '.incidentList .list .incident { width: 100%; white-space: nowrap; min-width: 900px; } ' +
        '.incidentList .list .incident span { padding: 0px 2px 2px 0px; vertical-align: top; display: inline-block; overflow: hidden; text-overflow: ellipsis; } ' +
        '.incidentList .list .incident span.prio::before { content: "PRIO " } ' +
        '.incidentList .list .incident span.locatie { width: 35% } ' +
        '.incidentList .list .incident span.classificatie { width: 30%; } ' +
        '.incidentList .list .incident span.plaats { width: 130px; } ' +
        '@media (max-width: 1000px) { \n\
.incidentList .list .incident span.fromNow { display: none; } \n\
.incidentList .list .incident span.classificatie { width: 35% } \n\
.incidentList .list .incident span.locatie { } \n\
.incidentList .list .incident span.prio::before { content: " P" } \n\
} ' +
        '@media (max-width: 900px) { \n\
.incidentList .list .incident span.locatie { } \n\
} ' +
        '@media (max-width: 600px) { \n\
.incidentList .list .incident span.locatie { width: 25% } \n\
} ';

    var head = document.getElementsByTagName('head')[0];
    var style = document.createElement('style');

    style.type = 'text/css';
    if(style.styleSheet) {
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }
    head.appendChild(style);
};

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
        dbkjs.modules.incidents.options.incidentListFooterFunction(v, activeIncidents, inactiveIncidents);
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
                    actueleInzet.push(eenheid.CODE_VOERTUIGSOORT + " " + eenheid.ROEPNAAM_EENHEID + (eenheid.KAZ_NAAM ? " (" + eenheid.KAZ_NAAM + ")" : ""));
                }
            });
        }
        var r = $("<div class='incident'/>")
                .addClass(odd ? "odd" : "even")
                .attr("title", incident.locatie + (showInzetInTitle && actueleInzet.length > 0 ? ", " + actueleInzet.join(", ") : ""));
        odd = !odd;

        if(dbkjs.options.incidents.incidentListFunction) {
            dbkjs.options.incidents.incidentListFunction(r, incident);
        }

        $("<span class='time'/>").text(incident.start.format("D-M-YYYY HH:mm")).appendTo(r);
        $("<span class='prio'/>").html(incident.prio ? incident.prio + " " : "&nbsp;&nbsp;").appendTo(r);
        $("<span class='locatie'/>").text(incident.locatie).appendTo(r);
        $("<span class='plaats'/>").text(incident.plaats || "-").appendTo(r);

        var classificaties = incident.classificaties || "";
        var icons = me.getIncidentEenhedenIcons(incident);

        $("<span class='classificatie'/>").html(icons + classificaties).appendTo(r);
        $("<span class='fromNow'/>").text(incident.start.fromNow()).appendTo(r);

        if(incidentDivFunction) {
            incidentDivFunction(r, incident);
        }
        r.appendTo(d);
    });
    d.appendTo(el);
};

IncidentListWindow.prototype.getIncidentEenhedenIcons = function(incident) {
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

    html = "<span style='color: red'>" + htmlB + "</span>";
    if(incident.inzetEenhedenStats.P.total !== 0) {
        html += "<span style='color: blue'>" + multiIcon("cab",incident.inzetEenhedenStats.P.total) + "</span>";
    }
    if(incident.inzetEenhedenStats.A.total !== 0) {
        html += "<span style='color: orange'>" + htmlA + "</span>";
    }
    return html;
};
