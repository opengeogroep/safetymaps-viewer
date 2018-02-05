/*
 *  Copyright (c) 2017 B3Partners (info@b3partners.nl)
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

/* global dbkjs, Mustache, SplitScreenWindow, ModalWindow, OpenLayers, Proj4js */

/**
 * Controller for displaying incident info from PharosFalck application.
 *
 * Events:
 *
 * @param {Object} incidents dbk module
 * @returns {PharosIncidentsController}
 */
function PharosIncidentsController(incidents) {
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
    $(me.markerLayer).on('click', function() {
        me.markerClick();
    });
    me.marker = null;

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
            me.getPharosInfo();
        }, 1000);
    });
};

PharosIncidentsController.prototype.getPharosInfo = function() {
    var me = this;

    $.ajax("/eal/Gms.json", { dataType: "json", cache: false })
    .always(function() {
        window.setTimeout(function() {
            me.getPharosInfo();
        }, 3000);
    })
    .done(function(response, textStatus, jqXHR) {
        var first = me.data === null;
        me.data = response.EAL2OGG;
        if(!me.data) {
            me.incidentDetailsWindow.data("Geen incidentinformatie: " + JSON.stringify(response));
        } else if(!me.data.Gms) {
            me.incidentDetailsWindow.data("Geen actief incident");
            return;
        }
        // null -> geen incident
        me.incidentDetailsWindow.data(me.data.Gms, true, true);
        var newHtml = me.incidentDetailsWindow.getIncidentHtmlPharos(me.data.Gms, true);
        var newId = me.data.Gms.Nummer;
        me.markerLayer.addIncident(me.getIncidentOpenLayersLonLat(), false, true);
        me.markerLayer.setZIndexFix();
        if(first) {
            me.newIncident();
            me.button.setAlerted(true);
        } else {
            if(me.html !== newHtml) {
                $(dbkjs).trigger("incidents.updated");
                me.button.setAlerted(true);
            }
            if(me.incidentId !== newId) {
                me.newIncident();
            }
        }
        me.html = newHtml;
        me.incidentId = newId;
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        me.xml = null;
        me.incidentDetailsWindow.showError("Fout bij ophalen incidentinformatie: " + textStatus);
    });
};

PharosIncidentsController.prototype.getIncidentOpenLayersLonLat = function() {
    var me = this;
    var lon = me.data.Gms.IncidentAdres.Positie.X, lat = me.data.Gms.IncidentAdres.Positie.Y;

    lon = lon / 100000;
    lat = lat / 100000;

    var p = new Proj4js.Point(lon, lat);
    var t = Proj4js.transform(new Proj4js.Proj("WGS84"), new Proj4js.Proj("EPSG:28992"), p);
    lon = t.x;
    lat = t.y;
    return new OpenLayers.LonLat(lon, lat);
};

PharosIncidentsController.prototype.zoomToIncident = function() {
    if(this.data && this.data.Gms) {
        var pos = this.getIncidentOpenLayersLonLat();
        dbkjs.map.setCenter(pos, dbkjs.options.zoom);
    }
};

PharosIncidentsController.prototype.newIncident = function() {
    var me = this;

    dbkjs.protocol.jsonDBK.deselect();
    me.zoomToIncident();

    var pos = this.getIncidentOpenLayersLonLat();
    var adres = this.data.Gms.IncidentAdres.Adres;
    var commonIncidentObject = {
        postcode: adres.Postcode,
        woonplaats: adres.Plaats,
        huisnummer: Number(adres.Huisnummer),
        huisletter: adres.HuisnummerToevg,
        toevoeging: null,
        straat: adres.Straat,
        x: pos.lon,
        y: pos.lat
    };
    me.featureSelector = new IncidentFeatureSelector(me.data.Gms, commonIncidentObject, true, false);

    me.featureSelector.updateBalkRechtsonder();
    me.featureSelector.findAndSelectMatches(me.incidentDetailsWindow);

    me.incidentDetailsWindow.show();

    $(me).triggerHandler("new_incident", [commonIncidentObject]);
};

PharosIncidentsController.prototype.markerClick = function() {
    this.incidentDetailsWindow.show();
    this.zoomToIncident();
};
