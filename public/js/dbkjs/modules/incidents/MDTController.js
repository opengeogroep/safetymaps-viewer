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
            me.getMDTInfo();
        }, 1000);
    });
};

MDTController.prototype.getMDTInfo = function() {
    var me = this;

    $.ajax("/gms.xml", { dataType: "xml", cache: false })
    .always(function() {
        window.setTimeout(function() {
            me.getMDTInfo();
        }, 3000);
    })
    .done(function(xml, textStatus, jqXHR) {
        var first = me.xml === null;
        me.xml = xml;
        me.incidentDetailsWindow.data(xml, true, true, true);
        var newHtml = me.incidentDetailsWindow.getXmlIncidentHtml(xml, true, true);
        var newId = $(xml).find("Incident IncidentNr").text();
        me.markerLayer.addIncident(xml, false, true);
        me.markerLayer.setZIndexFix();
        if(first) {
            me.newIncident();
            me.button.setAlerted(true);
        } else {
            if(me.html !== newHtml) {
                me.button.setAlerted(true);
                $(dbkjs).trigger("incidents.updated");
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

MDTController.prototype.newIncident = function() {
    var me = this;

    dbkjs.protocol.jsonDBK.deselect();
    me.zoomToIncident();

    var x = $(this.xml).find("IncidentLocatie XYCoordinaten XCoordinaat").text();
    var y = $(this.xml).find("IncidentLocatie XYCoordinaten YCoordinaat").text();
    var adres = $(this.xml).find("IncidentLocatie Adres");
    var commonIncidentObject = {
        postcode: $(adres).find("Postcode").text(),
        woonplaats: $(adres).find("Woonplaats").text(),
        huisnummer: Number($(adres).find("Huisnummer").text()),
        huisletter: $(adres).find("HnAanduiding").text(),
        toevoeging: $(adres).find("HnToevoeging").text(),
        straat: $(adres).find("Straat").text(),
        x: x,
        y: y
    };
    me.featureSelector = new IncidentFeatureSelector(me.xml, commonIncidentObject, true, false);

    me.featureSelector.updateBalkRechtsonder();
    me.featureSelector.findAndSelectMatches(me.incidentDetailsWindow);

    me.incidentDetailsWindow.show();

    $(me).triggerHandler("new_incident", [commonIncidentObject]);
};

MDTController.prototype.markerClick = function() {
    this.incidentDetailsWindow.show();
    this.zoomToIncident();
};
