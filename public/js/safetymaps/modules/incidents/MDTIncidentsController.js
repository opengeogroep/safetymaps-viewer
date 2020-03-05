/*
 *  Copyright (c) 2016-2018 B3Partners (info@b3partners.nl)
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

/**
 * Controller for displaying incident info from MDT koppeling CityGIS Navigator
 * version 0.1 combined with Falck tool to write MDT XML to /gms.xml.
 *
 * Events:
 *
 * @param {Object} incidents dbk module
 * @returns {MDTIncidentsController}
 */
function MDTIncidentsController(incidents) {
    var me = this;

    me.featureSelector = incidents.featureSelector;
    me.options = incidents.options;

    me.button = new AlertableButton("btn_incident", "Incident", "bell-o");
    me.button.getElement().prependTo('#btngrp_object');

    $(me.button).on('click', function() {
        me.incidentDetailsWindow.show();
        me.zoomToIncident();
    });

    me.incidentDetailsWindow = new IncidentDetailsWindow();
    $(me.incidentDetailsWindow).on('show', function() {
        me.button.setAlerted(false);
    });

    me.markerLayer = new IncidentMarkerLayer();
    $(me.markerLayer).on('click', function() {
        me.markerClick();
    });

    me.marker = null;
    me.incidentId = null;
    me.html = null;
    me.xml = null;

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

    $(dbkjs).one("dbkjs_init_complete", function() {
        me.timeout = window.setTimeout(function() {
            me.getMDTInfo();
        }, 1000);
    });
};

MDTIncidentsController.prototype.getMDTInfo = function() {
    var me = this;

    $.ajax("/gms.xml", { dataType: "xml", cache: false })
    .always(function() {
        me.timeout = window.setTimeout(function() {
            me.getMDTInfo();
        }, 5000);
    })
    .done(function(xml, textStatus, jqXHR) {
        me.handleIncident(xml);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        me.xml = null;
        me.incidentDetailsWindow.showError("Fout bij ophalen MDT incidentinformatie: " + textStatus);
    });
};

MDTIncidentsController.prototype.handleIncident = function (xml) {
    var me = this;
    var first = me.xml === null;
    var newHtml = me.incidentDetailsWindow.getXmlIncidentHtml(xml, true, true);
    var newId = $(xml).find("Incident IncidentNr").text();

    me.xml = xml;
    me.incidentDetailsWindow.data(xml, true, true, true);    
    me.markerLayer.addIncident(xml, false, true);
    me.markerLayer.setZIndexFix();
    
    if(first) {
        me.html = newHtml;
        me.incidentId = newId;
        me.button.setAlerted(true);
        me.newIncident();
    } else {
        if(me.html !== newHtml) {
            me.button.setAlerted(true);
            $(dbkjs).trigger("incidents.updated");
        }
        if(me.incidentId !== newId) {                
            me.html = newHtml;
            me.incidentId = newId;
            me.newIncident();
        }
    }
};

MDTIncidentsController.prototype.zoomToIncident = function() {
    if(this.xml) {
        var x = $(this.xml).find("IncidentLocatie XYCoordinaten XCoordinaat").text();
        var y = $(this.xml).find("IncidentLocatie XYCoordinaten YCoordinaat").text();
        dbkjs.map.setCenter(new OpenLayers.LonLat(x, y), dbkjs.options.zoom);
    }
};

MDTIncidentsController.prototype.newIncident = function() {
    var me = this;

    safetymaps.deselectObject();
    me.zoomToIncident();

    var x = $(this.xml).find("IncidentLocatie XYCoordinaten XCoordinaat").text();
    var y = $(this.xml).find("IncidentLocatie XYCoordinaten YCoordinaat").text();
    var adres = $(this.xml).find("IncidentLocatie Adres");
    var commonIncidentObject = {
        nummer: me.incidentId,
        IncidentNummer: me.incidentId,
        postcode: $(adres).find("Postcode").text(),
        woonplaats: $(adres).find("Woonplaats").text(),
        huisnummer: Number($(adres).find("Huisnummer").text()),
        huisletter: $(adres).find("HnAanduiding").text(),
        toevoeging: $(adres).find("HnToevoeging").text(),
        straat: $(adres).find("Straat").text(),
        x: x,
        y: y
    };
    me.featureSelector.findAndSelectMatches(commonIncidentObject, me.incidentDetailsWindow);
    me.featureSelector.updateBalkRechtsonder();

    if(me.options.showTwitter) {
        me.incidentMonitorController.loadTweets(commonIncidentObject);
    }

    me.incidentDetailsWindow.show();

    $(me).triggerHandler("new_incident", [commonIncidentObject, commonIncidentObject]);
};

MDTIncidentsController.prototype.markerClick = function() {
    this.incidentDetailsWindow.show();
    this.zoomToIncident();
};
