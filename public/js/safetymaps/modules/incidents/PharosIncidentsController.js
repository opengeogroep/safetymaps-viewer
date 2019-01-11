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

    me.featureSelector = incidents.featureSelector;

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

    me.incident = null;

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
        window.setTimeout(function() {
            me.getPharosInfo();
        }, 1000);
    });
};

PharosIncidentsController.prototype.getPharosInfo = function() {
    var me = this;

    $.ajax("/eal/falck.xml", { dataType: "xml", cache: false })
    .always(function() {
        window.setTimeout(function() {
            me.getPharosInfo();
        }, 5000);
    })
    .done(function(response, textStatus, jqXHR) {

        var first = me.incident === null;

        me.incident = me.parsePharosFalckXML(response);

        if(!me.incident.nummer) {
            me.incidentDetailsWindow.data("Geen incidentinformatie: " + Mustache.escape(new XMLSerializer().serializetoString(response)));
            return;
        }

        me.incidentDetailsWindow.data(me.incident, true, true, "pharos");
        var newHtml = me.incidentDetailsWindow.getIncidentHtmlPharos(me.incident, true, true);
        var newNummer = me.incident.nummer;
        me.markerLayer.addIncident(me.incident.lonlat, false, true);
        me.markerLayer.setZIndexFix();
        if(first) {
            me.newIncident();
            me.button.setAlerted(true);
        } else {
            if(me.html !== newHtml) {
                console.log("incidents: pharos updated falck.xml incident data", me.incident);
                $(dbkjs).trigger("incidents.updated");
                me.button.setAlerted(true);
            }
            if(me.incidentNummer !== newNummer) {
                me.newIncident();
            }
        }
        me.html = newHtml;
        me.incidentNummer = newNummer;
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        me.incident = null; // Don't reset incidentNummer, may be intermittent failure
        me.incidentDetailsWindow.showError("Fout bij ophalen incidentinformatie: " + textStatus);
    });
};

PharosIncidentsController.prototype.parsePharosFalckXML = function(xml) {

    var loc = $(xml).find("IncidentLocatie");
    var incident = {
        nummer: $(xml).find("IncidentNummer").text(),
        x: $(loc).find("XCoordinaat").text(),
        y: $(loc).find("YCoordinaat").text(),
        startTijd: moment($(xml).find("BrwDisciplineGegevens StartDTG").text()),
        prioriteit: $(xml).find("BrwDisciplineGegevens Prioriteit").text(),
        classificaties: [],
        straat: $(loc).find("NaamLocatie1").text(),
        locatie: $(loc).find("NaamLocatie2").text(),
        huisnummer: Number($(loc).find("Huisnummer").text()),
        huisletter: $(loc).find("Letter").text(),
        toevoeging: $(loc).find("HnToevoeging").text(),
        aanduiding: $(loc).find("HnAanduiding").text(),
        paalnummer: $(loc).find("Paalnummer").text(),
        woonplaats: $(loc).find("Plaatsnaam").text(),
        kladblokregels: [],
        karakteristieken: [],
        eenheden: [],
        xml: xml
    };
    incident.lonlat = new OpenLayers.LonLat(incident.x, incident.y);

    var mcx = [ $(xml).find("BrwDisciplineGegevens Meldingsclassificatie1").text(),
            $(xml).find("BrwDisciplineGegevens Meldingsclassificatie2").text(),
            $(xml).find("BrwDisciplineGegevens Meldingsclassificatie3").text()];;
    $.each(mcx, function(i, m) { if(m !== "") { incident.classificaties.push(m); } });

    var kbs = $(xml).find("Kladblokregels Kladblokregel");
    $.each(kbs, function(idx, kbr) {
        incident.kladblokregels.push({
            tijd: moment($(kbr).find("DTG").text()),
            index: idx,
            tekst: $(kbr).find("Inhoud").text()
        });
    });
    incident.kladblokregels.sort(function(lhs, rhs) {
        if(lhs.tijd.isSame(rhs.tijd)) {
            return lhs.index - rhs.index;
        } else {
            return lhs.tijd.isBefore(rhs.tijd) ? -1 : 1;
        }
    });
    $.each($(xml).find("Karakteristieken Karakteristiek"), function(idx, karakteristiek) {
        incident.karakteristieken.push({
            naam: $(karakteristiek).find("Naam").text(),
            waarde: $(karakteristiek).find("Waarde").text()
        });
    });

    $.each($(xml).find("Eenheden Eenheid"), function(idx, eenheid) {
        incident.eenheden.push({
            naam: $(eenheid).find("Naam").text(),
            eindeActieTijd: $(eenheid).find("EindeActieDTG").text(),
            status: Number($(eenheid).find("StatusCode").text())
        });
    });

    return incident;
};

PharosIncidentsController.prototype.zoomToIncident = function() {
    var me = this;
    if(me.incident && me.incident.x && me.incident.y) {
        dbkjs.map.setCenter(me.incident.lonlat, dbkjs.options.zoom);
    }
};

PharosIncidentsController.prototype.newIncident = function() {
    var me = this;

    console.log("incidents: pharos new falck.xml incident data", me.incident);

    safetymaps.deselectObject();
    me.zoomToIncident();

    me.featureSelector.findAndSelectMatches(me.incident, me.incidentDetailsWindow);
    me.featureSelector.updateBalkRechtsonder();

    me.incidentDetailsWindow.show();

    $(me).triggerHandler("new_incident", [me.incident]);
};

PharosIncidentsController.prototype.markerClick = function() {
    this.incidentDetailsWindow.show();
    this.zoomToIncident();
};
