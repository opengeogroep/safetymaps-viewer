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
    me.options = me.options = $.extend({
        apiPath: dbkjs.options.urls && dbkjs.options.urls.apiPath ? dbkjs.options.urls.apiPath : "api/",
        vehiclesUpdateInterval: 5000,
        showVehicles: true,
    }, incidents.options);

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
    me.xmlFormat = {};

    if (me.options.showVehicles) {
        me.vehiclePositionLayer = new VehiclePositionLayer({
            showUnassignedButMoving: false,
            showInzetRol: me.options.showInzetRol,
            vehiclePopupTemplate: null
        });
    }

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

    me.xmlFormat = me.getXmlFormat(xml);

    var first = me.xml === null;
    var newHtml = me.incidentDetailsWindow.getXmlIncidentHtml(xml, true, true);
    var newId = $(xml).find(me.xmlFormat.incidentNr).text();

    me.xml = xml;
    me.incidentDetailsWindow.data(xml, true, true, true);    
    
    var updateMap = false;
    if(first) {
        me.html = newHtml;
        me.incidentId = newId;
        me.button.setAlerted(true);
        me.newIncident();
        updateMap = true;
    } else {
        if(me.html !== newHtml) {
            me.html = newHtml;
            if(!me.incidentDetailsWindow.isVisible()) {
                updateMap = true;
                me.button.setAlerted(true);
                $(dbkjs).trigger("incidents.updated");
            }
        }
        if(me.incidentId !== newId) {                
            me.html = newHtml;
            me.incidentId = newId;
            me.newIncident();
            updateMap = true;
        }
    }

    if (me.options.showVehicles && updateMap) {
        me.markerLayer.clear();
        me.markerLayer.addIncident(xml, false, true);
        me.markerLayer.setZIndexFix();
        me.markerLayer.layer.setVisibility(true);

        window.clearTimeout(me.updateVehicleTimeout);
        me.updateVehiclePositionLayerSC(me.xml);
    }
};

MDTIncidentsController.prototype.zoomToIncident = function() {
    var me = this;

    if(this.xml) {
        var x = $(this.xml).find(me.xmlFormat.x).text();
        var y = $(this.xml).find(me.xmlFormat.y).text();
        dbkjs.map.setCenter(new OpenLayers.LonLat(x, y), dbkjs.options.zoom);
    }
};

MDTIncidentsController.prototype.newIncident = function() {
    var me = this;

    safetymaps.deselectObject();
    me.zoomToIncident();

    var x = $(this.xml).find(me.xmlFormat.x).text();
    var y = $(this.xml).find(me.xmlFormat.y).text();
    var commonIncidentObject = {
        nummer: me.incidentId,
        IncidentNummer: me.incidentId,
        postcode: $(this.xml).find(me.xmlFormat.postcode).text(),
        woonplaats: $(this.xml).find(me.xmlFormat.woonplaats).text(),
        huisnummer: Number($(this.xml).find(me.xmlFormat.huisnummer).text()),
        huisletter: $(this.xml).find(me.xmlFormat.huisnummeraanduiding).text(),
        toevoeging: $(this.xml).find(me.xmlFormat.huisnummertoevoeging).text(),
        straat: $(this.xml).find(me.xmlFormat.straat).text(),
        x: x,
        y: y
    };
    me.featureSelector.findAndSelectMatches(commonIncidentObject, me.incidentDetailsWindow);
    me.featureSelector.updateBalkRechtsonder();

    me.incidentDetailsWindow.show();

    $(me).triggerHandler("new_incident", [commonIncidentObject, commonIncidentObject]);
};

MDTIncidentsController.prototype.markerClick = function() {
    this.incidentDetailsWindow.show();
    this.zoomToIncident();
};

MDTIncidentsController.prototype.getXmlFormat = function (xml) {
    var xmlIsDefault = $(xml).find("Incident IncidentNr").length > 0;
    var xmlIsSCT = $(xml).find("MdtIncident IncidentNummer").length > 0;
    
    var xmlFormat = {};

    if (xmlIsDefault) {
        xmlFormat.incidentNr = "Incident IncidentNr";
        xmlFormat.x = "IncidentLocatie XYCoordinaten XCoordinaat";
        xmlFormat.y = "IncidentLocatie XYCoordinaten YCoordinaat";
        xmlFormat.postcode = "IncidentLocatie Adres Postcode";
        xmlFormat.woonplaats =  "IncidentLocatie Adres Woonplaats";
        xmlFormat.huisnummer = "IncidentLocatie Adres Huisnummer";
        xmlFormat.huisnummeraanduiding = "IncidentLocatie Adres HnAanduiding";
        xmlFormat.huisnummertoevoeging = "IncidentLocatie Adres HnToevoeging";
        xmlFormat.straat = "IncidentLocatie Adres Straat";
        xmlFormat.eenheid = "GekoppeldeEenheden Eenheid";
        xmlFormat.roepnaam = "Roepnaam";
        xmlFormat.disc = "Disc";

        xmlFormat.prio = "Prioriteit";
        xmlFormat.startdatumtijd = "StartDatumTijd";
        xmlFormat.msgDate = "XmlMsgKop MsgDate";
        xmlFormat.msgTime = "XmlMsgKop MsgTime";
        xmlFormat.incidentLocatie = "IncidentLocatie"
        xmlFormat.karakteristiek = "Karakteristiek";
        xmlFormat.karakteristiekNaam = "KarakteristiekNaam";
        xmlFormat.karakteristiekWaarde = "KarakteristiekWaarde";
        xmlFormat.afspraakOpLocatie = "AfspraakOpLocatie";
        xmlFormat.kladblok = "Kladblok";

        xmlFormat.classificatie = $(xml).find("Classificatie").text();

        xmlFormat.discBrandweer = "B--";
    }
    else if (xmlIsSCT) {
        xmlFormat.incidentNr = "MdtIncident IncidentNummer";
        xmlFormat.x = "IncidentLocatie XCoordinaat";
        xmlFormat.y = "IncidentLocatie YCoordinaat";
        xmlFormat.postcode = "IncidentLocatie NaamLocatie2";
        xmlFormat.woonplaats =  "IncidentLocatie Plaatsnaam";
        xmlFormat.huisnummer = "IncidentLocatie Huisnummer";
        xmlFormat.huisnummeraanduiding = "IncidentLocatie HnAanduiding";
        xmlFormat.huisnummertoevoeging = "IncidentLocatie HnToevoeging";
        xmlFormat.straat = "IncidentLocatie NaamLocatie1";
        xmlFormat.eenheid = "Eenheden Eenheid";
        xmlFormat.roepnaam = "Roepnaam";
        xmlFormat.disc = "Discipline";

        xmlFormat.prio = "Prioriteit";
        xmlFormat.startdatumtijd = "StartDTG";
        xmlFormat.msgDate = "XmlMsgKop MsgDate";
        xmlFormat.msgTime = "XmlMsgKop MsgTime";
        xmlFormat.incidentLocatie = "IncidentLocatie"
        xmlFormat.karakteristiek = "Karakteristiek";
        xmlFormat.karakteristiekNaam = "KarakteristiekNaam";
        xmlFormat.karakteristiekWaarde = "KarakteristiekWaarde";
        xmlFormat.afspraakOpLocatie = "AfspraakOpLocatie";
        xmlFormat.kladblok = "Kladblokregel Inhoud";

        xmlFormat.classificatie = $(xml).find("Meldingsclassificatie1").text() + ", "
            + $(xml).find("Meldingsclassificatie2").text() + ", "
            + $(xml).find("Meldingsclassificatie3").text();

        xmlFormat.discBrandweer = "B";
    }

    return xmlFormat;
}

MDTIncidentsController.prototype.updateVehiclePositionLayerSC = function (incident) {
    var me = this;

    var roepnamen = [];
    $.each($(incident).find(me.xmlFormat.eenheid), function (i, eenheid) {
        var naam = $(eenheid).find(me.xmlFormat.roepnaam).text();
        var disc = $(eenheid).find(me.xmlFormat.disc).text();

        if (disc === me.xmlFormat.discBrandweer) {
            roepnamen.push(naam);
        }
    });

    $.ajax(me.options.apiPath + "safetyconnect/eenheidlocatie", {
        dataType: "json",
        data: {
            extended: false
        },
        xhrFields: { withCredentials: true }, crossDomain: true
    })
    .always(function() {
        me.updateVehicleTimeout = window.setTimeout(function() {
            me.updateVehiclePositionLayerSC(incident);
        }, me.options.vehiclesUpdateInterval);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
        console.log("SC: Error updating vehicle positions", jqXHR, textStatus, errorThrown);
    })
    .done(function (data, textStatus, jqXHR) {
        me.options.logVehicles && console.log("IM SC: Vehicle positions", data);
        var transformedVehicles = data.features
            .filter(function(el) {
                return roepnamen.filter(function (rn) {
                    return rn === el.properties.id;
                }).length > 0;
            })
            .map(function(f) {
                var props = f.properties;
                var attributes = {
                    IncidentID: props.incidentNummer || "",
                    Voertuigsoort: props.inzetRol || "",
                    Roepnummer: props.id,
                    Speed: me.options.showSpeed ? props.speed || 0 : 0,
                    Direction: props.heading
                };
                var geometry = new OpenLayers.Geometry.Point(f.geometry.coordinates[0], f.geometry.coordinates[1]);
                return new OpenLayers.Feature.Vector(geometry, attributes);
            });
        me.options.logVehicles && console.log("IM SC: Transformed vehicle positions for layer", transformedVehicles);
        me.vehiclePositionLayer.features(transformedVehicles);
    });
}
