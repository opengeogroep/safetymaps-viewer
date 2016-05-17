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
 * Controller for displaying incident info from MDT koppeling CityGIS Navigator
 * version 0.1 combined with Falck tool to write MDT XML to /gms.xml.
 *
 * Events:
 *
 * @param {Object} incidents dbk module
 * @returns {MDTController}
 */
function MDTController(incidents) {
    var me = this;

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
    $(me.markerLayer).on('click', function(incident, marker) {
        me.markerClick(incident, marker);
    });
    me.marker = null;

    me.xml = null;

    me.getMDTInfo();
};

MDTController.prototype.getMDTInfo = function() {
    var me = this;

    $.ajax("/gms.xml", {
        cache: false,
        dataType: "xml"
    })
    .always(function() {
        window.setTimeout(function() {
            me.getMDTInfo();
        }, 1000);
    })
    .done(function(xml) {
        var first = me.xml === null;
        me.xml = xml;
        me.incidentDetailsWindow.data(xml, true, true, true);
        var newHtml = me.incidentDetailsWindow.getXmlIncidentHtml(xml, true, true);
        var newId = $(xml).find("Incident IncidentNr").text();
        me.markerLayer.clear();
        me.markerLayer.addIncident(xml, false);
        me.markerLayer.setZIndexFix();
        if(first) {
            me.zoomToIncident();
            me.button.setAlerted(true);
        } else {
            if(me.html !== newHtml) {
                me.button.setAlerted(true);
            }
            if(me.incidentId !== newId) {
                me.zoomToIncident();
            }
        }
        me.html = newHtml;
        me.incidentId = newId;
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        me.xml = null;
        me.incidentDetailsWindow.showError("Fout bij ophalen MDT incidentinformatie: " + textStatus);
    });
};

MDTController.prototype.zoomToIncident = function() {
    if(this.xml) {
        var x = $(this.xml).find("IncidentLocatie XYCoordinaten XCoordinaat").text();
        var y = $(this.xml).find("IncidentLocatie XYCoordinaten YCoordinaat").text();
        dbkjs.map.setCenter(new OpenLayers.LonLat(x, y), dbkjs.options.zoom);
    }
};

MDTController.prototype.markerClick = function(incident, marker) {
    this.incidentDetailsWindow.show();
    this.zoomToIncident();
};
