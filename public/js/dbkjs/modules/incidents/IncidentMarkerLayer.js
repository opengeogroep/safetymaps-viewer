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
}

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
    this.layer.addMarker(marker);

    return marker;
};

IncidentMarkerLayer.prototype.setZIndexFix = function() {
    this.layer.setZIndex(100000);
};

IncidentMarkerLayer.prototype.removeMarker = function(marker) {
    this.layer.removeMarker(marker);
};

IncidentMarkerLayer.prototype.clear = function() {
    this.layer.clearMarkers();
};

IncidentMarkerLayer.prototype.markerClick = function(marker, incident, archief) {
    $(this).triggerHandler('click', { incident: incident, archief: archief, marker: marker});
};
