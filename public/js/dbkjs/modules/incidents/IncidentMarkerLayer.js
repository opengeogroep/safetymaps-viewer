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

function IncidentMarkerLayer() {
    this.ghor = dbkjs.modules.incidents.options.ghor;

    // Layer name starts with _ to hide in support module layer list
    this.layer = new OpenLayers.Layer.Markers("_Incident markers", {
        rendererOptions: { zIndexing: true }
    });
    dbkjs.map.addLayer(this.layer);

    this.size = new OpenLayers.Size(24,26);
    this.offset = new OpenLayers.Pixel(-(this.size.w/2), -this.size.h);

    this.popups = [];

    this.showHover = false; // window.localStorage.getItem("IncidentMarkerLayer.showHover");
//    this.showHover = this.showHover === "true" || this.showHover === null; // Default value checked
//    $("#baselayerpanel_b").append('<hr/><label><input type="checkbox" ' + (this.showHover ? 'checked' : '') + ' onclick="dbkjs.modules.incidents.controller.markerLayer.setShowHover(event.target.checked)">Toon informatie over incident rechtsonderin het scherm bij muis over</label>');

    this.showPopups = false;// window.localStorage.getItem("IncidentMarkerLayer.showPopups") === "true";
    //$("#baselayerpanel_b").append('<hr/><label><input type="checkbox" ' + (this.showPopups ? 'checked' : '') + ' onclick="dbkjs.modules.incidents.controller.markerLayer.setShowPopups(event.target.checked)">Toon popups bij incidenten</label>');

};

IncidentMarkerLayer.prototype.setShowHover = function(showHover) {
    this.showHover = showHover;
    window.localStorage.setItem("IncidentMarkerLayer.showHover", showHover);
};

IncidentMarkerLayer.prototype.setShowPopups = function(showPopups) {
    var wasShown = this.showPopups;
    $.each(this.popups, function(i, p) {
        if(wasShown) {
            dbkjs.map.removePopup(p);
        } else {
            dbkjs.map.addPopup(p);
        }
    });
    this.showPopups = showPopups;
    window.localStorage.setItem("IncidentMarkerLayer.showPopups", showPopups);
};


IncidentMarkerLayer.prototype.getIncidentXY = function(incident) {
    var x, y;
    if(incident.T_X_COORD_LOC && incident.T_Y_COORD_LOC) {
        x = incident.T_X_COORD_LOC;
        y = incident.T_Y_COORD_LOC;
    } else if(incident.IncidentLocatie) {
        x = incident.IncidentLocatie.XCoordinaat;
        y = incident.IncidentLocatie.YCoordinaat;
    } else {
        x = $(incident).find("IncidentLocatie XYCoordinaten XCoordinaat").text();
        y = $(incident).find("IncidentLocatie XYCoordinaten YCoordinaat").text();
    }
    return {x: x, y: y};
};

IncidentMarkerLayer.prototype.addIncident = function(incident, archief, singleMarker) {
    var me = this;
    var xy= me.getIncidentXY(incident);
    var x = xy.x, y = xy.y;

    if(singleMarker) {
        if(x === me.x && y === me.y) {
            return;
        }

        this.layer.clearMarkers();

        me.x = x;
        me.y = y;
    }

    var pos = new OpenLayers.LonLat(x, y);

    var icon;
    if(me.ghor) {
        var b = incident.inzetEenhedenStats.B.total;
        var a = incident.inzetEenhedenStats.A.total;
        if(archief) {
            icon = "images/bell-gray.png";
        } else if(b !== 0 && a !== 0) {
            icon = "images/bell-yellowred.png";
        } else if(a !== 0) {
            icon = "images/bell-yellow.png";
        } else {
            icon = "images/bell.png";
        }
    } else {
        icon = !archief ? "images/bell.png" : "images/bell-gray.png";
    }

    var marker = new OpenLayers.Marker(
        pos,
        new OpenLayers.Icon(icon, this.size, this.offset)
    );
    if(me.ghor && incident.inzetEenhedenStats.standard) {
        marker.setOpacity(0.5);
    }
    marker.id = incident.INCIDENT_ID;
    var handler = function() { me.markerClick(marker, incident, archief); };
    marker.events.register("click", marker, handler);
    marker.events.register("touchstart", marker, handler);
    marker.events.register("mouseover", marker, function() {
        me.showMarkerHover(marker, incident);
    });
    marker.events.register("mouseout", marker, function() {
        me.hideMarkerHover(marker, incident);
    });
    this.layer.addMarker(marker);

    if(incident.PLAATS_NAAM) {
        var classificatie = incident.classificaties;
        if(classificatie && classificatie.indexOf(",") !== -1) {
            classificatie = classificatie.split(",")[0];
        }
        var popup = new OpenLayers.Popup.FramedCloud(null, pos, null, "P" + incident.PRIORITEIT_INCIDENT_BRANDWEER + " " + dbkjs.util.htmlEncode(classificatie) + ", " +
                dbkjs.util.htmlEncode(IncidentDetailsWindow.prototype.getIncidentAdres(incident, false)) +
                " " + dbkjs.util.htmlEncode(incident.PLAATS_NAAM), null, false, null);
        popup.panMapIfOutOfView = false;
        this.popups.push(popup);

        if(this.showPopups) {
            dbkjs.map.addPopup(popup);
        }

        $(dbkjs.modules.incidents.controller.incidentDetailsWindow).on("show", function() {
            me.hideMarkerHover();
        });
    }

    return marker;
};

IncidentMarkerLayer.prototype.showMarkerHover = function(marker, incident) {
    var me = this;

    if(dbkjs.modules.incidents.controller.incidentDetailsWindow.visible || !me.showHover) {
        return;
    }

    var title = "<i class='fa fa-bell'/> <span style='font-weight: bold; color: " + IncidentDetailsWindow.prototype.getPrioriteitColor(incident.PRIORITEIT_INCIDENT_BRANDWEER) + "'>P " + incident.PRIORITEIT_INCIDENT_BRANDWEER + "</span> " + dbkjs.util.htmlEncode(incident.classificaties) + "<br>" +
            dbkjs.util.htmlEncode(IncidentDetailsWindow.prototype.getIncidentAdres(incident, false)) +
            " " + dbkjs.util.htmlEncode(incident.PLAATS_NAAM);

    var displayEenheden = [];
    var extraCount = 0;
    $.each(incident.inzetEenheden, function(i, inzet) {
        if(!inzet.DTG_EIND_ACTIE && inzet.T_IND_DISC_EENHEID === "B") {
            var eenheid = (inzet.CODE_VOERTUIGSOORT ? inzet.CODE_VOERTUIGSOORT : "") + " " + inzet.ROEPNAAM_EENHEID;

            if(displayEenheden.length === 4) {
                extraCount++;
            } else {
                displayEenheden.push(eenheid);
            }
        }
    });
    if(displayEenheden.length > 0) {
        title += "<br>" + displayEenheden.join(" ");
        if(extraCount > 0) {
            title += " <b>+" + extraCount + "</b>";
        }
    }

    $('.dbk-title')
        .html(title)
        .css('visibility', 'visible')
        .css("line-height", "inherit");
};

IncidentMarkerLayer.prototype.hideMarkerHover = function() {
    $(".dbk-title").css('visibility', 'hidden');
};

IncidentMarkerLayer.prototype.setZIndexFix = function() {
    this.layer.setZIndex(100000);
};

IncidentMarkerLayer.prototype.removeMarker = function(marker) {
    this.layer.removeMarker(marker);
};

IncidentMarkerLayer.prototype.clear = function() {
    this.layer.clearMarkers();
    $.each(this.popups, function(i, p) {
        dbkjs.map.removePopup(p);
    });
    this.popups = [];
};

IncidentMarkerLayer.prototype.markerClick = function(marker, incident, archief) {
    $(this).triggerHandler('click', { incident: incident, archief: archief, marker: marker});
};
