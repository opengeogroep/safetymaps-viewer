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
/* global AGSIncidentService */

function IncidentMarkerLayer() {
    // Layer name starts with _ to hide in support module layer list
    this.layer = new OpenLayers.Layer.Markers("_Incident markers", {
        rendererOptions: { zIndexing: true }
    });
    dbkjs.map.addLayer(this.layer);

    this.size = new OpenLayers.Size(26,26);
    this.offset = new OpenLayers.Pixel(-(this.size.w/2), -this.size.h);
};

IncidentMarkerLayer.prototype.addIncident = function(incident, archief, singleMarker) {
    var me = this;
    var xy = AGSIncidentService.prototype.getIncidentXY(incident);
    var x = xy.x, y = xy.y;
    var isManuallyCreated = incident.IncidentId && incident.IncidentId.includes("FLK");

    if(singleMarker) {
        if(x === me.x && y === me.y) {
            return;
        }

        this.layer.clearMarkers();

        me.x = x;
        me.y = y;
    }

    var pos = new OpenLayers.LonLat(x, y);

    var icon = !archief 
        ? isManuallyCreated ? "images/bell-orange.png" : "images/bell.png" 
        : "images/bell-gray.png";

    var marker = new OpenLayers.Marker(
        pos,
        new OpenLayers.Icon(icon, this.size, this.offset)
    );
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
    this.x = null;
    this.y= null;
};

IncidentMarkerLayer.prototype.markerClick = function(marker, incident, archief) {
    $(this).triggerHandler('click', { incident: incident, archief: archief, marker: marker});
};
