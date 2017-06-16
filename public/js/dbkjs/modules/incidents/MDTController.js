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
        //me.zoomToIncident();
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

    me.matches = null;

    $('.dbk-title').on('click', function() {
        if(me.selectedDbkFeature && dbkjs.options.feature) { // geen dbkjs.options.feature bij geselecteerde WO
            if(dbkjs.options.feature.identificatie !== me.selectedDbkFeature.attributes.identificatie) {
                dbkjs.modules.feature.handleDbkOmsSearch(me.selectedDbkFeature);
            } else {
                dbkjs.modules.feature.zoomToFeature(me.selectedDbkFeature);
            }
        } else {
            dbkjs.protocol.jsonDBK.deselect();
            me.zoomToIncident();

            if(me.matches) {
                me.renderMatches();
                dbkjs.dbkInfoPanel.toggle();
            }
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
    this.matches = null;

    me.zoomToIncident();

    // Try to find DBK

    var adres = $(this.xml).find("IncidentLocatie Adres");
    var postcode = $(adres).find("Postcode").text();
    var woonplaats = $(adres).find("Woonplaats").text();
    var huisnummer = Number($(adres).find("Huisnummer").text());
//    var huisletter = $(adres).find("HnAanduiding").text();
//    var toevoeging = $(adres).find("HnToevoeging").text();
    var straat = $(adres).find("Straat").text();

    var title = Mustache.render("{{#x}}Straat{{/x}} {{#x}}Huisnummer{{/x}}{{#x}}HnToevoeging{{/x}} {{#x}}HnAanduiding{{/x}}, {{#x}}Woonplaats{{/x}}", {
        x: function() {
            return function(text, render) {
                return render($(adres).find(text).text());
            };
        }
    });
    me.updateBalkrechtsonder(title);

    this.selectedDbkFeature = null;

    if(dbkjs.modules.feature.features && postcode && huisnummer) {
        console.log("Finding DBK for incident adres " + postcode + " " + woonplaats + " " + huisnummer);

        var dbk = null;
        $.each(dbkjs.modules.feature.features, function(index, f) {
            if($.isArray(f.attributes.adres)) {
                $.each(f.attributes.adres, function(index, fa) {
                    if(fa) {
                        var matchPostcode = fa.postcode && postcode === fa.postcode;
                        var matchHuisnummer = fa.huisnummer && huisnummer === fa.huisnummer;

                        if(matchHuisnummer) {
                            if(matchPostcode) {
                                dbk = f;
                                return false;
                            }
                        }
                    }
                });
            }
            if(dbk) {
                return false;
            }

            if($.isArray(f.attributes.adressen)) {
                $.each(f.attributes.adressen, function(i, a) {
                    var matchPostcode = a.postcode && a.postcode === postcode;
                    var matchWoonplaats = a.woonplaats && a.woonplaats === woonplaats;
                    var matchStraat = a.straatnaam && a.straatnaam === straat;
                    if(matchPostcode || (matchWoonplaats && matchStraat) && a.nummers) {
                        console.log("Checking nummers for match DBK " + f.attributes.formeleNaam + ", "  + a.straatnaam + ", " + a.postcode + " " + a.woonplaats);
                        $.each(a.nummers, function(j, n) {
                            var parts = n.split("|");
                            var matchHuisnummer = Number(parts[0]) === huisnummer;
                            if(matchHuisnummer) {
                                console.log("Matched DBK with nummer " + n, f);
                                dbk = f;
                                return false;
                            }
                        });
                        if(dbk) {
                            return false;
                        }
                    }
                });
            }
            if(dbk) {
                return false;
            }
        });

        var matches = dbk ? [dbk] : [];

        // Zoek naar WO DBK's op basis van selectiepolygoon
        var x = $(this.xml).find("IncidentLocatie XYCoordinaten XCoordinaat").text();
        var y = $(this.xml).find("IncidentLocatie XYCoordinaten YCoordinaat").text();
        var point = new OpenLayers.Geometry.Point(x, y);

        $.each(dbkjs.modules.feature.features, function(index, f) {
            if(f.attributes.selectiekader) {
                $.each(f.attributes.selectiekader.components, function(j, c) {
                    //console.log("checking " + f.attributes.label + " contains: " + c.toString() + ", " + point);
                    if(c.containsPoint(point)) {
                        console.log("Incident XY inside feature selectiekader ", f);
                        matches.push(f);
                    }
                });
            }
        });
        if(matches.length === 1) {
            console.log("Selecting match", dbk);
            this.selectedDbkFeature = matches[0];
            dbkjs.protocol.jsonDBK.process(matches[0], null, true);
        } else if(matches.length > 1) {
            console.log("Multiple matches", matches);
            this.matches = matches;
            this.renderMatches();
        }
    }
    me.incidentDetailsWindow.show();

    $(me).triggerHandler("new_incident", null);
};

MDTController.prototype.renderMatches = function() {
    var me = this;
    if(!me.matches) {
        return;
    }
    var div  = $("#dbkinfopanel_b");
    var item_ul = $('<ul class="nav nav-pills nav-stacked"></ul>');
    div.html("<h3>Meerdere informatiekaarten gevonden op de locatie van het incident:</h3><p>");
    $.each(me.matches, function(i, m) {
        item_ul.append($('<li><a href="#">' + (m.attributes.locatie || m.attributes.formeleNaam) + '</a></li>').on('click', function(e) {
            e.preventDefault();
            dbkjs.protocol.jsonDBK.process(m, null, true);
        }));
    });
    div.append(item_ul);
};

MDTController.prototype.updateBalkrechtsonder = function(title) {
    $('.dbk-title')
        .text(title)
        .css('visibility', 'visible');
};

MDTController.prototype.markerClick = function() {
    this.incidentDetailsWindow.show();
    this.zoomToIncident();
};
