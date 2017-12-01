/*!
 *  Copyright (c) 2014 Milo van der Linden (milo@dogodigi.net)
 *
 *  This file is part of opendispatcher/safetymapsDBK
 *
 *  opendispatcher is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  opendispatcher is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with opendispatcher. If not, see <http://www.gnu.org/licenses/>.
 *
 */

/* global OpenLayers, moment, i18n, Mustache */

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.protocol = dbkjs.protocol || {};
dbkjs.options = dbkjs.options || {};
dbkjs.options.feature = null;
dbkjs.protocol.jsonDBK = {
    processing: false,
    panel_group: null,
    panel_tabs: null,
    panel_algemeen: null,
    active_tab: 'algemeen',
    layersVisible: false,
    init: function () {
        var _obj = dbkjs.protocol.jsonDBK;
        _obj.layerPandgeometrie = new OpenLayers.Layer.Vector("Pandgeometrie", {
            styleMap: dbkjs.config.styles.dbkpand
        });
        dbkjs.map.events.register("moveend", null, function () {
            var min = typeof dbkjs.options.dbkLayersMinResolution === "undefined" ? 12 : dbkjs.options.dbkLayersMinResolution;
            if (dbkjs.map.zoom < min) {
                _obj.hideLayers();
            } else {
                _obj.showLayers();
            }
        });
        _obj.layerBrandcompartiment = new OpenLayers.Layer.Vector("Brandcompartiment", {
            styleMap: dbkjs.config.styles.dbkcompartiment
        });
        _obj.layerBrandcompartimentLabels = new OpenLayers.Layer.Vector("Brandcompartiment label", {
            styleMap: dbkjs.config.styles.compartimentlabel
        });
        _obj.layerHulplijn2 = new OpenLayers.Layer.Vector("hulplijn2", {
            styleMap: dbkjs.config.styles.hulplijn2
        });
        _obj.layerHulplijn1 = new OpenLayers.Layer.Vector("hulplijn1", {
            styleMap: dbkjs.config.styles.hulplijn1
        });
        _obj.layerHulplijn = new OpenLayers.Layer.Vector("Hulplijn", {
            styleMap: dbkjs.config.styles.hulplijn
        });

        _obj.layerToegangterrein = new OpenLayers.Layer.Vector("Toegang terrein", {
            styleMap: dbkjs.config.styles.toegangterrein
        });
        _obj.layerBrandweervoorziening = new OpenLayers.Layer.Vector("Brandweervoorziening", {
            styleMap: dbkjs.config.styles.brandweervoorziening
        });
        _obj.layerComm = new OpenLayers.Layer.Vector("Comm", {
             styleMap: dbkjs.config.styles.comm
        });
        _obj.layerGevaarlijkestof = new OpenLayers.Layer.Vector("Gevaarlijke stoffen", {
            styleMap: dbkjs.config.styles.gevaarlijkestof
        });
        _obj.layerTekstobject = new OpenLayers.Layer.Vector("Tekst objecten", {
            styleMap: dbkjs.config.styles.tekstobject
        });
        _obj.layerCustomPolygon = new OpenLayers.Layer.Vector("Custom polygon", {
            styleMap: dbkjs.config.styles.customPolygon
        });
        _obj.layers = [
            _obj.layerPandgeometrie,
            _obj.layerCustomPolygon,
            _obj.layerBrandcompartiment,
            _obj.layerBrandcompartimentLabels,
            _obj.layerHulplijn2,
            _obj.layerHulplijn1,
            _obj.layerHulplijn,
            _obj.layerToegangterrein,
            _obj.layerBrandweervoorziening,
            _obj.layerComm,
            _obj.layerGevaarlijkestof,
            _obj.layerTekstobject
        ];
        _obj.selectlayers = [
            _obj.layerBrandweervoorziening,
            _obj.layerComm,
            _obj.layerBrandcompartiment,
            _obj.layerGevaarlijkestof,
            _obj.layerToegangterrein,
            _obj.layerCustomPolygon
        ];
        _obj.hoverlayers = [
            _obj.layerCustomPolygon,
            _obj.layerBrandweervoorziening,
            _obj.layerComm,
            _obj.layerBrandcompartiment,
            _obj.layerGevaarlijkestof,
            _obj.layerHulplijn,
            _obj.layerToegangterrein,
            _obj.layerTekstobject
        ];
        dbkjs.map.addLayers(_obj.layers);
        dbkjs.selectControl.setLayer((dbkjs.selectControl.layers || dbkjs.selectControl.layer).concat(_obj.hoverlayers));
        dbkjs.hoverControl.setLayer((dbkjs.hoverControl.layers || dbkjs.hoverControl.layer).concat(_obj.hoverlayers));
        dbkjs.hoverControl.activate();
        dbkjs.selectControl.activate();

    },
    hideLayers: function () {
        var _obj = dbkjs.protocol.jsonDBK;
        _obj.layersVisible = false;
        $.each(_obj.layers, function (lindex, lyr) {
            lyr.setVisibility(false);
        });
    },
    showLayers: function () {
        var _obj = dbkjs.protocol.jsonDBK;
        _obj.layersVisible = true;
        $.each(_obj.layers, function (lindex, lyr) {
            //afhankelijkheid van module layertoggle kan niet worden afgedwongen.
            if (dbkjs.modules.vrhinzetbalk) {
                if (dbkjs.modules.vrhinzetbalk.isLayerEnabled(lyr.name)) {
                    lyr.setVisibility(true);
                }
            } else {
                lyr.setVisibility(true);
            }
        });
    },
    resetLayers: function () {
        var _obj = dbkjs.protocol.jsonDBK;
        $.each(_obj.layers, function (lindex, lyr) {
            var currentVisibility = _obj.layersVisible;
            if (currentVisibility && !dbkjs.modules.vrhinzetbalk.isLayerEnabled(lyr.name)) {
                currentVisibility = false;
            }
            lyr.setVisibility(currentVisibility);
        });
    },
    getfeatureinfo: function (e) {
        if(dbkjs.protocol.jsonDBK.selectlayers.indexOf(e.feature.layer) === -1) {
            return;
        }
        $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle">&nbsp;' + e.feature.layer.name + '</span>');
        if(e.feature.layer.name === 'Gevaarlijke stoffen' || e.feature.layer.name === 'Brandweervoorziening' || e.feature.layer.name === 'Comm' || e.feature.layer.name === 'Custom polygon') {
            var html = $('<div class="table-responsive"></div>'),
                table = '';
            if(e.feature.layer.name === 'Gevaarlijke stoffen') {
                table = dbkjs.protocol.jsonDBK.constructGevaarlijkestofHeader();
                table.append(dbkjs.protocol.jsonDBK.constructGevaarlijkestofRow(e.feature.attributes));
                html.append(table);
            };
            if(e.feature.layer.name === 'Brandweervoorziening') {
                if(dbkjs.options.feature.brandweervoorziening2) {
                    table = dbkjs.protocol.jsonDBK.constructBrandweervoorzieningHeader2();
                    table.append(dbkjs.protocol.jsonDBK.constructBrandweervoorzieningRow2(e.feature.attributes));
                } else {
                    table = dbkjs.protocol.jsonDBK.constructBrandweervoorzieningHeader1();
                    table.append(dbkjs.protocol.jsonDBK.constructBrandweervoorzieningRow1(e.feature.attributes));
                }
            };
            if(e.feature.layer.name === 'Comm') {
                table = dbkjs.protocol.jsonDBK.constructAfwijkendebinnendekkingHeader();
                table.append(dbkjs.protocol.jsonDBK.constructAfwijkendebinnendekkingRow(e.feature.attributes));
            }
            if(e.feature.layer.name === 'Custom polygon') {
                console.log("Custom polygon feature info", e.feature);
            }
            html.append(table);
            $('#vectorclickpanel_b').html('').append(html);
            if(dbkjs.viewmode === 'fullscreen') {
                $('#vectorclickpanel').show();
            }
        } else {
            // Generic attribute table
            html = '<div class="table-responsive">';
            html += '<table class="table table-hover">';
            for (var j in e.feature.attributes) {
                if (!dbkjs.util.isJsonNull(e.feature.attributes[j])) {
                    html += '<tr><td><span>' + j + "</span>: </td><td>" + e.feature.attributes[j] + "</td></tr>";
                }
            };
            html += "</table>";
            html += '</div>';
            $('#vectorclickpanel_b').html(html);
            $('#vectorclickpanel').show();
        }
    },
    process: function(feature, onSuccess, noZoom) {
        console.log("yeahse");
        var _obj = dbkjs.protocol.jsonDBK;

        dbkjs.modules.waterongevallen.deselect();

        if (!(feature && feature.attributes && feature.attributes.typeFeature)) {

            $('#dbkinfopanel_b').html('Geen DBK geselecteerd.');
            //$('.dbk-title').css('visibility', 'hidden');

            //clear all layers first!
            $.each(_obj.layers, function(idx, lyr){
               lyr.destroyFeatures();
            });

            dbkjs.options.feature = null;

            if(onSuccess) {
                onSuccess();
            };

            return;
        };
        var mySuccess = function() {
            $('#infopanel_f').html('');
            /*
            var title = "";
            if(feature.attributes.formeleNaam) {
                title = feature.attributes.formeleNaam;
            };
            if(feature.attributes.informeleNaam) {
                if(title === "") {
                    title = feature.attributes.informeleNaam;
                } else {
                    title = title + " (" + feature.attributes.informeleNaam + ")";
                }
            };
            if(title === "") {
                title = "DBK #" + feature.attributes.identificatie;
            };
            $('.dbk-title')
                .text(title)
                .css('visibility', 'visible')
                .on('click', function() {
                    dbkjs.modules.feature.zoomToFeature(feature);
                });
            */
            if(onSuccess) {
                onSuccess();
            }
        };

        if (!dbkjs.options.feature || feature.id !== dbkjs.options.feature.id) {
            if (!dbkjs.protocol.jsonDBK.processing) {
                if(dbkjs.viewmode === 'fullscreen') {
                    dbkjs.util.getModalPopup('infopanel').hide();
                    dbkjs.util.getModalPopup('dbkinfopanel').hide();
                } else {
                    $('#infopanel').hide();
                };
                dbkjs.protocol.jsonDBK.processing = true;
                dbkjs.util.alert('<i class="fa fa-spinner fa-spin"></i>', i18n.t('dialogs.running'), 'alert-info');
                if(feature.attributes.typeFeature === 'WO') {
                    dbkjs.modules.waterongevallen.selected(feature, mySuccess);
                } else {
                    dbkjs.protocol.jsonDBK.getObject(feature, 'algemeen', !!noZoom, mySuccess);
                }
            }
        } else {
            //Check if processing is finished
            if (!dbkjs.protocol.jsonDBK.processing) {
                mySuccess();
                if(dbkjs.viewmode === 'fullscreen') {
                    $('#dbkinfopanel_b').html(dbkjs.options.feature.div);
                } else {
                    $('#infopanel_b').html(dbkjs.options.feature.div);
                    $('#infopanel_f').html('');
                    $('#infopanel').show();
                }
            }
        }        
    },
    /* Restore state to before any DBK was selected */
    deselect: function() {
        var _obj = dbkjs.protocol.jsonDBK;
        $.each(_obj.layers, function (idx, lyr) {
            lyr.destroyFeatures();
        });
        dbkjs.options.feature = null;
        dbkjs.options.dbk = null;
        if(dbkjs.viewmode === 'fullscreen') {
            $('#dbkinfopanel_b').text(i18n.t("dialogs.noinfo"));
        }
        dbkjs.modules.updateFilter(0);
        dbkjs.modules.waterongevallen.deselect();
    },
    activateSelect: function (layer) {
        var _obj = dbkjs.protocol.jsonDBK;
        layer.events.on({
            "featureselected": function(e) {
                dbkjs.ignoreNextTouchend = true;
                _obj.getfeatureinfo(e);
            },
            "featuresadded": function () {
            },
            "featureunselected": function (e) {
                dbkjs.ignoreNextTouchend = true;
                dbkjs.gui.detailsPanelHide();
            }
        });
    },
    constructInfoDiv: function(feature, objecttype) {
        var _obj = dbkjs.protocol.jsonDBK;
        _obj.constructAlgemeen(dbkjs.options.feature, objecttype);
        _obj.constructCustomBijzonderheid(dbkjs.options.feature);
        _obj.constructContact(dbkjs.options.feature);
        _obj.constructOmsdetail(dbkjs.options.feature);
        _obj.constructBijzonderheid(dbkjs.options.feature);
        _obj.constructVerblijf(dbkjs.options.feature);
        _obj.constructMedia(dbkjs.options.feature);
        _obj.constructFloors(dbkjs.options.feature);
        if(dbkjs.options.feature.brandweervoorziening2) {
            _obj.constructBrandweervoorziening2(dbkjs.options.feature);
        } else {
            _obj.constructBrandweervoorziening(dbkjs.options.feature);
        }
        _obj.constructAfwijkendebinnendekking(dbkjs.options.feature);
        _obj.constructGevaarlijkestof(dbkjs.options.feature);
    },
    info: function (data, noZoom) {
        var _obj = dbkjs.protocol.jsonDBK;
        var objecttype = "object";
        if (data.DBKObject || data.DBKGebied) {
            if (data.DBKObject) {
                dbkjs.options.feature = data.DBKObject;
            } else {
                dbkjs.options.feature = data.DBKGebied;
                objecttype = "gebied";
            }

            dbkjs.options.dbk = dbkjs.options.feature.identificatie;
            dbkjs.disableloadlayer = true;
            if (dbkjs.permalink) {
                dbkjs.permalink.updateLink();
            }

            _obj.panel_group = $('<div class="tab-content"></div>');
            _obj.panel_tabs = $('<ul class="nav nav-pills"></ul>');
            _obj.constructInfoDiv(dbkjs.options.feature, objecttype);
            var div = $('<div class="tabbable"></div>');
            div.append(_obj.panel_group);
            div.append(_obj.panel_tabs);
            if (dbkjs.viewmode === 'fullscreen') {
                $('#dbkinfopanel_b').html(div);
            } else {
                dbkjs.gui.infoPanelUpdateHtml('');
                dbkjs.gui.infoPanelAddItems(div);
            }
            dbkjs.gui.infoPanelUpdateTitle('<i class="fa fa-building"></i> ' + dbkjs.options.feature.formeleNaam);
            $('#systeem_meldingen').hide();

            // Construct additional geometries.
            _obj.constructPandGeometrie(dbkjs.options.feature);
            _obj.constructGebied(dbkjs.options.feature);
            _obj.constructCustomPolygon(dbkjs.options.feature);
            _obj.constructHulplijn(dbkjs.options.feature);
            _obj.constructToegangterrein(dbkjs.options.feature);
            _obj.constructBrandcompartiment(dbkjs.options.feature);
            _obj.constructTekstobject(dbkjs.options.feature);

            if (!noZoom && dbkjs.options.zoomToPandgeometrie) {
                dbkjs.modules.feature.zoomToPandgeometrie();
            }

            if (dbkjs.viewmode === 'fullscreen') {
                //dbkjs.util.getModalPopup('infopanel').show();
            } else {
                dbkjs.gui.infoPanelShow();
            }

            if (dbkjs.viewmode !== 'fullscreen') {
                _obj.addMouseoverHandler("#bwvlist", _obj.layerBrandweervoorziening);
                _obj.addMouseoutHandler("#bwvlist", _obj.layerBrandweervoorziening);
                _obj.addMouseoverHandler("#gvslist", _obj.layerGevaarlijkestof);
                _obj.addMouseoutHandler("#gvslist", _obj.layerGevaarlijkestof);
                _obj.addRowClickHandler("#floorslist", "verdiepingen");
            }

            dbkjs.modules.feature.layer.redraw();

            _obj.processing = false;
        } else {
            dbkjs.options.feature = null;
            dbkjs.util.alert(i18n.t('app.error'), i18n.t('dialogs.infoNotFound'), 'alert-danger');
        }
    },
    constructRow: function (val, caption, id) {
        if (!dbkjs.util.isJsonNull(val)) {
            var output = '<tr' + (id ? ' id="' + id + '"' : "") + '><td>' + caption + '</td><td>' + val + '</td></tr>';
            return output;
        } else {
            return '';
        }
    },
    constructAlgemeen: function (DBKObject, dbktype) {
        var _obj = dbkjs.protocol.jsonDBK;

        var active_tab = _obj.active_tab === 'algemeen' ? 'active' : '';
        _obj.panel_algemeen = $('<div class="tab-pane ' + active_tab + '" id="collapse_algemeen_' + DBKObject.identificatie + '"></div>');
        var algemeen_table_div = $('<div class="table-responsive"></div>');
        var algemeen_table = $('<table class="table table-hover"></table>');

        var controledatum = dbkjs.util.isJsonNull(DBKObject.controleDatum) ? '<span class="label label-warning">' +
                i18n.t('dbk.unknown') + '</span>' : moment(DBKObject.controleDatum).format('YYYY-MM-DD hh:mm');

        var bhvaanwezig = '<span class="label label-warning">' +
                i18n.t('dbk.noEmergencyResponse') + '</span>';
        if (!dbkjs.util.isJsonNull(DBKObject.BHVaanwezig)) {
            if (DBKObject.BHVaanwezig === true) {
            bhvaanwezig = '<span class="label label-success">' +
                i18n.t('dbk.emergencyResponsePresent') + '</span>';
            } else {
                bhvaanwezig = '<span class="label label-warning">' +
                    i18n.t('dbk.noEmergencyResponse') + '</span>';
            }
        }
        var informelenaam = dbkjs.util.isJsonNull(DBKObject.informeleNaam) ? '' : DBKObject.informeleNaam;
        var risicoklasse = dbkjs.util.isJsonNull(DBKObject.risicoklasse) ? '' : DBKObject.risicoklasse;
        var omsnummer = dbkjs.util.isJsonNull(DBKObject.OMSnummer) ? '' : DBKObject.OMSnummer;
        var gebouwconstructie = dbkjs.util.isJsonNull(DBKObject.gebouwconstructie) ? '' : DBKObject.gebouwconstructie;
        var inzetprocedure = dbkjs.util.isJsonNull(DBKObject.inzetprocedure) ? '' : DBKObject.inzetprocedure;
        var gebruikstype = dbkjs.util.isJsonNull(DBKObject.gebruikstype) ? '' : DBKObject.gebruikstype;

        // @todo: Losse regel voor laagste en hoogste
        // Hoogste altijd positief (zegt Dennis, ik sla hem kort als het niet zo is)
        // Laagste; minnetje er voor, bij 0 niet tonen.
        // Verdiepingen berekenen. Bij hoogste; 1 = BG/0, 2 = 1 etc.
        var laagstebouwlaag;
        var hoogstebouwlaag;
        if (!dbkjs.util.isJsonNull(DBKObject.bouwlaag)) {
            bouwlaag = DBKObject.bouwlaag;
        } else {
            bouwlaag = i18n.t('dbk.unknown');
        }
        if (!dbkjs.util.isJsonNull(DBKObject.laagsteBouwlaag)) {
            laagstebouwlaag = DBKObject.laagsteBouwlaag === 0 ? 0 : -DBKObject.laagsteBouwlaag + ' (' + -DBKObject.laagsteBouwlaag + ')';
        } else {
            laagstebouwlaag = i18n.t('dbk.unknown');
        }
        if (!dbkjs.util.isJsonNull(DBKObject.hoogsteBouwlaag)) {
            hoogstebouwlaag = DBKObject.hoogsteBouwlaag === 0 ? 0 : DBKObject.hoogsteBouwlaag + ' (' + (DBKObject.hoogsteBouwlaag - 1) + ')';
        } else {
            hoogstebouwlaag = i18n.t('dbk.unknown');
        }
        dbkjs.options.feature.bouwlaag = bouwlaag;
        if (dbktype === "object") {
            if(dbkjs.viewmode === 'fullscreen') {
                // In fullscreen mode is er geen window title met formele naam,
                // toon deze als eerste regel
                var formelenaam = dbkjs.util.isJsonNull(DBKObject.formeleNaam) ? '' : DBKObject.formeleNaam;
                algemeen_table.append(_obj.constructRow(formelenaam, i18n.t('dbk.formalName')));
            }
            algemeen_table.append(_obj.constructRow(informelenaam, i18n.t('dbk.alternativeName'), "informelenaam"));

            // Show the adres as normal table row, after formele/informelenaam
            // No BAG links
            if(dbkjs.options.adresFirstInTable && DBKObject.adres && DBKObject.adres.length > 0) {
                var waarde = DBKObject.adres[0];
                var openbareruimtenaam = dbkjs.util.isJsonNull(waarde.openbareRuimteNaam) ? '' : waarde.openbareRuimteNaam;
                var huisnummer = dbkjs.util.isJsonNull(waarde.huisnummer) ? '' : ' ' + waarde.huisnummer;
                var huisnummertoevoeging = dbkjs.util.isJsonNull(waarde.huisnummertoevoeging) ? '' : ' ' + waarde.huisnummertoevoeging;
                var huisletter = dbkjs.util.isJsonNull(waarde.huisletter) ? '' : ' ' + waarde.huisletter;
                var postcode = dbkjs.util.isJsonNull(waarde.postcode) ? '' : ' ' + waarde.postcode;
                var woonplaatsnaam = dbkjs.util.isJsonNull(waarde.woonplaatsNaam) ? '' : ' ' + waarde.woonplaatsNaam;
                var gemeentenaam = dbkjs.util.isJsonNull(waarde.gemeenteNaam) ? '' : ' ' + waarde.gemeenteNaam;
                var adresText = openbareruimtenaam +
                        huisnummer + huisnummertoevoeging + huisletter + '<br/>' +
                        woonplaatsnaam + postcode + gemeentenaam;
                algemeen_table.append(_obj.constructRow(adresText, 'Adres'));
            }

            algemeen_table.append(_obj.constructRow(controledatum, i18n.t('dbk.dateChecked'), "controledatum"));
            if (dbkjs.showStatus) {
              var status = dbkjs.util.isJsonNull(DBKObject.status) ? '<span class="label label-warning">' +
                      i18n.t('dbk.unknown') + '</span>' : DBKObject.status;
                algemeen_table.append(_obj.constructRow(status, i18n.t('dbk.status')));
            }
            algemeen_table.append(_obj.constructRow(bhvaanwezig, i18n.t('dbk.emergencyResponse'), "bhvaanwezig"));
            algemeen_table.append(_obj.constructRow(inzetprocedure, i18n.t('dbk.procedure')));
            algemeen_table.append(_obj.constructRow(gebouwconstructie, 'Gebouwconstructie'));
            algemeen_table.append(_obj.constructRow(omsnummer, i18n.t('dbk.fireAlarmCode')));
            algemeen_table.append(_obj.constructRow(gebruikstype, i18n.t('dbk.application')));
            algemeen_table.append(_obj.constructRow(risicoklasse, i18n.t('dbk.risk')));
            algemeen_table.append(_obj.constructRow(bouwlaag, i18n.t('dbk.level'), "bouwlaag"));
            algemeen_table.append(_obj.constructRow(laagstebouwlaag, i18n.t('dbk.lowLevel') + ' (' + i18n.t('dbk.floor') + ')'));
            algemeen_table.append(_obj.constructRow(hoogstebouwlaag, i18n.t('dbk.highLevel') + ' (' + i18n.t('dbk.floor') + ')'));
        } else if (dbktype === "gebied") {
            algemeen_table.append(_obj.constructRow(informelenaam, i18n.t('dbk.alternativeName'), "informelenaam"));
            algemeen_table.append(_obj.constructRow(controledatum, i18n.t('dbk.dateChecked')));
        }
        if (!dbkjs.options.adresFirstInTable && DBKObject.adres) {
            //adres is een array of null
            $.each(DBKObject.adres, function (adres_index, waarde) {
                var bag_button;
                var adres_row = $('<tr></tr>');
                var adres_div = $('<td></td>');
                var openbareruimtenaam = dbkjs.util.isJsonNull(waarde.openbareRuimteNaam) ? '' : waarde.openbareRuimteNaam;
                var huisnummer = dbkjs.util.isJsonNull(waarde.huisnummer) ? '' : ' ' + waarde.huisnummer;
                var huisnummertoevoeging = dbkjs.util.isJsonNull(waarde.huisnummertoevoeging) ? '' : ' ' + waarde.huisnummertoevoeging;
                var huisletter = dbkjs.util.isJsonNull(waarde.huisletter) ? '' : ' ' + waarde.huisletter;
                var postcode = dbkjs.util.isJsonNull(waarde.postcode) ? '' : ' ' + waarde.postcode;
                var woonplaatsnaam = dbkjs.util.isJsonNull(waarde.woonplaatsNaam) ? '' : ' ' + waarde.woonplaatsNaam;
                var gemeentenaam = dbkjs.util.isJsonNull(waarde.gemeenteNaam) ? '' : ' ' + waarde.gemeenteNaam;
                var adresText = openbareruimtenaam +
                        huisnummer + huisnummertoevoeging + huisletter + '<br/>' +
                        woonplaatsnaam + postcode + gemeentenaam;
                adres_div.append(adresText);
                adres_row.append(adres_div);
                algemeen_table.append(adres_row);
                if ($.inArray('bag', dbkjs.options.organisation.modules) > -1) {
                    if (!dbkjs.util.isJsonNull(waarde.bagId)) {
                        var bag_div = $('<td></td>');
                        var bag_p = $('<p></p>');

                        if (dbkjs.viewmode === 'fullscreen') {
                            bag_button = $('<button type="button" class="btn btn-primary">' + i18n.t('dbk.tarryobjectid') + ' ' + waarde.bagId + '</button>');
                        } else {
                            bag_button = $('<button type="button" class="btn btn-primary">' + i18n.t('dbk.tarryobjectid') + ' ' + dbkjs.util.pad(waarde.bagId, 16) + '</button>');
                        }

                        bag_p.append(bag_button);
                        bag_button.click(function () {
                            if ($.inArray('bag', dbkjs.options.organisation.modules) > -1) {
                                dbkjs.modules.bag.getVBO(waarde.bagId, function (result) {
                                    if (result.length === 0) {
                                        var waardeBagId;
                                        if (dbkjs.viewmode === 'fullscreen') {
                                            waardeBagId = waarde.bagId;
                                        } else {
                                            waardeBagId = dbkjs.util.pad(waarde.bagId,16);
                                        }
                                        $('#collapse_algemeen_' + _obj.feature.id).append(
                                            '<div class="alert alert-warning alert-dismissable">' +
                                            '<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' +
                                            '<strong>' + i18n.t('app.fail') +
                                            '</strong>' +
                                            dbkjs.util.pad(waarde.bagId, 16) + ' ' + i18n.t('dialogs.infoNotFound') +
                                            '</div>'
                                        );
                                    } else {
                                        $('#bagpanel_b').html('');
                                        $.each(result, function (result_index, waarde) {
                                            dbkjs.modules.bag.vboInfo2(waarde);
                                        });
                                        $('#bagpanel').show();
                                    }
                                });
                            }
                        });
                        bag_div.append(bag_p);
                        adres_row.append(bag_div);
                    } else {
                        adres_row.append('<td></td>');
                    }
                } else {
                    adres_row.append('<td></td>');
                }
            });
        }
        algemeen_table_div.append(algemeen_table);
        _obj.panel_algemeen.append(algemeen_table_div);
        _obj.panel_group.html(_obj.panel_algemeen);
        if (active_tab === 'active') {
            _obj.panel_tabs.html('<li class="active"><a data-toggle="tab" href="#collapse_algemeen_' + DBKObject.identificatie + '">' + i18n.t('dbk.general') + '</a></li>');
        } else {
            _obj.panel_tabs.html('<li><a data-toggle="tab" href="#collapse_algemeen_' + DBKObject.identificatie + '">' + i18n.t('dbk.general') + '</a></li>');
        }
        _obj.panel_tabs.html();
    },
    constructCustomBijzonderheid: function(feature) {
        var _obj = dbkjs.protocol.jsonDBK;

        if(!feature.custom_bijzonderheid) {
            return;
        }
        var tabs = {};
        $.each(feature.custom_bijzonderheid, function(i, b) {
            if(tabs[b["Tabblad"]]) {
                tabs[b["Tabblad"]].push(b);
            } else {
                tabs[b["Tabblad"]] = [b];
            }
        });
        console.log("tabs bijzonderheid", tabs);

        var i = 0;
        $.each(tabs, function(tab, fields) {
            var id = 'collapse_custom_bijzonderheid' + (i++) + '_' + feature.identificatie;
            var bijzonderheid_div = $('<div class="tab-pane" id="' + id + '"></div>');
            var bijzonderheid_table_div = $('<div class="table-responsive"></div>');
            var bijzonderheid_table = $('<table class="table table-hover"></table>');
            $.each(fields, function (i, f) {
                if(!dbkjs.util.isJsonNull(f["Tekst"])) {
                    bijzonderheid_table.append(
                            '<tr>' +
                            '<td>' + f["Soort"] + '</td>' +
                            '<td>' + f["Tekst"] + '</td>' +
                            '</tr>'
                            );
                }
            });
            bijzonderheid_table_div.append(bijzonderheid_table);
            bijzonderheid_div.append(bijzonderheid_table_div);
            _obj.panel_group.append(bijzonderheid_div);
            _obj.panel_tabs.append('<li><a data-toggle="tab" href="#' + id + '">' + tab + '</a></li>');
        });
    },
    constructBrandweervoorziening: function (feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        if(feature.brandweervoorziening){
            var id = 'collapse_brandweervoorziening_' + feature.identificatie;
            var bv_div = $('<div class="tab-pane" id="' + id + '"></div>');
            var bv_table_div = $('<div class="table-responsive"></div>');
            var bv_table = _obj.constructBrandweervoorzieningHeader1();
            var features = [];
            $.each(feature.brandweervoorziening, function(idx, myGeometry){
                var myFeature = new OpenLayers.Feature.Vector(new OpenLayers.Format.GeoJSON().read(myGeometry.geometry, "Geometry"));
                myFeature.attributes = {
                    "type" : myGeometry.typeVoorziening,
                    "name": myGeometry.naamVoorziening,
                    "information": myGeometry.aanvullendeInformatie,
                    "rotation": myGeometry.hoek,
                    "category": myGeometry.categorie,
                    "namespace": myGeometry.namespace,
                    "radius": myGeometry.radius,
                    "fid": "brandweervoorziening_ft_" + idx
                };
                var myrow = _obj.constructBrandweervoorzieningRow1(myFeature.attributes);
                myrow.mouseover(function(){
                    dbkjs.selectControl.select(myFeature);
                });
                myrow.mouseout(function(){
                    dbkjs.selectControl.unselect(myFeature);
                });
                bv_table.append(myrow);
                features.push(myFeature);

            });
            _obj.layerBrandweervoorziening.addFeatures(features);
            _obj.activateSelect(_obj.layerBrandweervoorziening);
            bv_table_div.append(bv_table);
            bv_div.append(bv_table_div);
            _obj.panel_group.append(bv_div);
            _obj.panel_tabs.append(Mustache.render('<li><a data-toggle="tab" href="#{{id}}">{{#t}}dbk.prevention{{/t}}</a></li>', dbkjs.util.mustachei18n({id: id})));
        }
    },
    constructBrandweervoorzieningHeader1: function() {
        var bv_table = $('<table class="table table-hover"></table>');
            bv_table.append(Mustache.render(
                '<tr><th>{{#t}}prevention.type{{/t}}</th>' +
                '<th>{{#t}}prevention.name{{/t}}</th>' +
                '<th>{{#t}}prevention.comment{{/t}}</th></tr>', dbkjs.util.mustachei18n()));
        return bv_table;
    },
    constructBrandweervoorzieningRow1: function(brandweervoorziening) {
        var img = "images/" + brandweervoorziening.namespace.toLowerCase() + '/' +  brandweervoorziening.type + '.png';
        img = typeof imagesBase64 === 'undefined'  ? dbkjs.basePath + img : imagesBase64[img];
        return $(Mustache.render(
                '<tr>' +
                    '<td><img class="thumb" src="{{img}}" alt="{{brandweervoorziening.type}}" title="{{brandweervoorziening.type}}"></td>' +
                    '<td>{{brandweervoorziening.name}}</td>' +
                    '<td>{{brandweervoorziening.information}}</td>' +
                '</tr>', { img: img, brandweervoorziening: brandweervoorziening }));
    },
    getBrandweervoorzieningInfo: function(code) {
        var info = {};
        searchDirs = ["nen1414", "eughs", "other", "wo", "imoov"];

        info.iconBase = "images/i32";

        $.each(searchDirs, function(i, dir) {
            if(imagesBase64["images/" + dir + "/" + code + ".png"]) {
                info.iconBase = "images/" + dir + "/" + code;
                return false;
            }
        });

        info.size = 12;
        info.code = code;
        info.name = code;

        switch(code) {
            case "Tb1001"      : info.name = "Brandweeringang"; break;
            case "Tb1002"      : info.name = "Overige ingangen"; break;
            case "Tb1003"      : info.name = "Sleutelkluis"; break;
            case "Tb1004"      : info.name = "Brandweerpaneel"; break;
            case "Tb1004a"     : info.name = "Brandmeldcentrale"; break;
            case "Tb1005"      : info.name = "Nevenbrandweerpaneel"; break;
            case "Tb1006"      : info.name = "Ontruimingspaneel"; break;
            case "Tb1007"      : info.name = "Droge blusleiding"; break;
            case "Tb1007a"     : info.name = "Afname Droge Buisleiding"; break;
            case "Tb1007a_HD"  : info.name = "Afname Droge Buisleiding HD"; info.size = 14; break;
            case "Tb1007_HD"   : info.name = "Droge Buisleiding HD"; info.size = 14; break;
            case "Tb1008"      : info.name = "Opstelplaats eerste blusvoertuig"; info.size = 14; break;
            case "Tb1009"      : info.name = "Opstelplaats overige blusvoertuigen"; info.size = 14; break;
            case "Tb1010"      : info.name = "Opstelplaats Redvoertuig"; break;
            case "Tb1012"      : info.name = "Opstelplaats Hulpverleningsvoertuig"; info.size = 16; break;

            case "Tb1013": info.name = "Boot"; info.size = 16; break;
            case "Tb1014": info.name = "Opstelplaats WO"; info.size = 16; break;
            case "Falck42": info.size = 18; info.name = "Tewaterlaatplaats boot"; break;
            case "Falck43": info.size = 18; info.name = "Zwemplaats"; break;
            case "Falck44": info.size = 18; info.name = "Gemaal/loosplaats"; break;
            case "Falck45": info.size = 18; info.name = "Beweegbare brug"; break;
            case "Falck46": info.size = 18; info.name = "Vaste brug"; break;

            case "Tb2001": info.name = "Noodschakelaar neon"; break;
            case "Tb2002": info.name = "Noodschakelaar CV"; break;
            case "Tb2003": info.name = "Schakelaar elektriciteit"; break;
            case "Tb2004": info.name = "Schakelaar luchtbehandeling"; break;
            case "Tb2005": info.name = "Schakelaar rook-/warmteafvoer"; break;
            case "Tb2021": info.name = "Afsluiter gas"; break;
            case "Tb2022": info.name = "Afsluiter water"; break;
            case "Tb2023": info.name = "Afsluiter sprinkler"; break;
            case "Tb2026": info.name = "Afsluiter schuimvormend middel"; break;
            case "Tb2041": info.name = "Activering blussysteem"; break;
            case "Tb2042": info.name = "Schakelkast elektriciteit"; break;
            case "Tb2043": info.name = "Noodstop"; break;

            case "Tb4001"      : info.name = "Hydrant"; break;
            case "Tb4001blau"  : info.name = "Hydrant (blauw)"; break;
            case "Tb4002"      : info.name = "Ondergrondse brandkraan"; break;
            case "Tb4002blau"  : info.name = "Ondergrondse brandkraan (blauw)"; break;
            case "Tb4003"      : info.name = "Geboorde put"; break;
            case "Tb4021"      : info.name = "Blussysteem AFFF"; break;
            case "Tb4022"      : info.name = "Blussysteem schuim"; break;
            case "Tb4023"      : info.name = "Blussysteem water"; break;
            case "Tb4024"      : info.name = "Blussysteem kooldioxide"; break;
            case "Tb4025"      : info.name = "Blussysteem Hi Fog"; break;

            case "Tbk5001" : info.name = "Brandweerlift"; break;
            case "Tbk7004" : info.name = "Lift"; break;
            case "Tn06"     : info.name = "Verzamelplaats"; break;
            case "Tw01"     : info.name = "Gevaar"; break;
            case "Tw02"     : info.name = "Electrische Spanning"; break;
            case "Tn06"     : info.name = "Verzamelplaats"; break;
            case "CAI"      : info.name = "Aansluiting CAI"; break;

            case "Falck1" : info.size = 12; info.name = "Trap"; break;
            case "Falck11": info.size = 12; info.name = "Schacht of kanaal"; break;
            case "Falck12": info.size = 18; info.name = "Rook Warmte Afvoerluiken"; break;
            case "Falck13": info.size = 12; info.name = "Flitslicht"; break;
            case "Falck14": info.size = 12; info.name = "Brandweervoorziening"; break;
            case "Falck15": info.size = 18; info.name = "PGS 15 Kluis"; break;
            case "Falck16": info.size = 16; info.name = "Trap standaard"; break;
            case "Falck17": info.size = 16; info.name = "Trap wokkel"; break;
            case "Falck18": info.size = 12; info.name = "???"; break;
            case "Falck19": info.size = 12; info.name = "Bluswaterriool"; break;
            case "Falck20": info.size = 12; info.name = "Openwater blauw"; break;
            case "Falck21": info.size = 12; info.name = "Verplaatsbare Sleutelpaal"; break;
            case "Falck22": info.size = 12; info.name = "Poller"; break;
            case "Falck23": info.size = 12; info.name = "Berijdbaar"; break;
            case "Falck24": info.size = 12; info.name = "Gasdetectiepaneel"; break;
            case "Falck25": info.size = 12; info.name = "Afsluiter omloop"; break;
            case "Falck26": info.size = 12; info.name = "Afsluiter Stadsverwarming"; break;
            case "Falck27": info.size = 12; info.name = "Afsluiter divers"; break;
            case "Falck28": info.size = 12; info.name = "Afsluiter LPG"; break;
            case "Falck29": info.size = 12; info.name = "Brandbluspomp"; break;
            case "Falck30": info.size = 12; info.name = "Waterkanon"; break;
            case "Falck31": info.size = 12; info.name = "Blussysteem divers"; break;
            case "Falck32": info.size = 12; info.name = "???"; break;
            case "Falck33": info.size = 12; info.name = "Vulpunt"; break;
            case "Falck34": info.size = 12; info.name = "Niet blussen met Water"; break;
            case "Falck35": info.size = 12; info.name = "Trap rond"; break;
            case "Falck36": info.size = 12; info.name = "???"; break;
            case "Falck40": info.size = 12; info.name = "Brandweerinfokast"; break;
            case "Falck41": info.size = 12; info.name = "Parkeerplaats"; break;


            case "Openwater": info.name = "Open water"; break;
            case "Sewer"    : info.name = "Toegang riool"; break;
            case "Signal"   : info.name = "Signaal"; break;
        }
        return info;
    },
    constructBrandweervoorziening2: function (feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        if(!feature.brandweervoorziening2) {
            return;
        }

        var id = 'collapse_brandweervoorziening_' + feature.identificatie;
        var bv_div = $('<div class="tab-pane" id="' + id + '"></div>');
        var bv_table_div = $('<div class="table-responsive"></div>');
        var bv_table = _obj.constructBrandweervoorzieningHeader2();

        var features = [];
        $.each(feature.brandweervoorziening2, function (idx, b) {
            var info = _obj.getBrandweervoorzieningInfo(b.Code);

            var icon = imagesBase64[info.iconBase + ".png"];
            if(b.Omschrijving && b.Omschrijving.trim().length > 0) {
                if(imagesBase64[info.iconBase + "_i.png"]) {
                    icon = imagesBase64[info.iconBase + "_i.png"];
                }
            }
            var f = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(b.X, b.Y), {
                "icon": icon,
                "iconBase": info.iconBase,
                "code": info.code,
                "name": info.name,
                "information": b.Omschrijving || '',
                "rotation": b.Rotatie,
                "radius": info.size,
                "fid": "brandweervoorziening_ft_" + idx
            });

            var row = _obj.constructBrandweervoorzieningRow2(f.attributes);
            row.mouseover(function(){
                dbkjs.selectControl.select(f);
            });
            row.mouseout(function(){
                dbkjs.selectControl.unselect(f);
            });
            bv_table.append(row);
            features.push(f);
        });
        _obj.layerBrandweervoorziening.addFeatures(features);
        _obj.activateSelect(_obj.layerBrandweervoorziening);
        bv_table_div.append(bv_table);
        bv_div.append(bv_table_div);
        _obj.panel_group.append(bv_div);
        _obj.panel_tabs.append('<li><a data-toggle="tab" href="#' + id + '">' + i18n.t('dbk.prevention') + '</a></li>');
    },
    constructBrandweervoorzieningHeader2: function() {
        var bv_table = $('<table class="table table-hover"></table>');
            bv_table.append(Mustache.render(
                '<tr><th>{{#t}}prevention.type{{/t}}</th>' +
                '<th>{{#t}}prevention.name{{/t}}</th>' +
                '<th>{{#t}}prevention.comment{{/t}}</th></tr>', dbkjs.util.mustachei18n()));
        return bv_table;
    },
    constructBrandweervoorzieningRow2: function(brandweervoorziening) {
        return $(Mustache.render(
                '<tr>' +
                    '<td><img class="thumb" src="{{iconBase}}.png" alt="{{code}}" title="{{code}}"></td>' +
                    '<td>{{name}}</td>' +
                    '<td>{{information}}</td>' +
                '</tr>', brandweervoorziening));
    },
    constructAfwijkendebinnendekkingHeader: function() {
        var comm_table = $('<table id="commlist" class="table table-hover"></table>');
        comm_table.append(Mustache.render(
                '<tr>' +
                    '<th/>' +
                    '<th>{{#t}}comm.ispossible{{/t}}</th>' +
                    '<th>{{#t}}comm.alternative{{/t}}</th>' +
                    '<th>{{#t}}comm.information{{/t}}</th>' +
                '</tr>', dbkjs.util.mustachei18n()));
        return comm_table;
    },
    constructAfwijkendebinnendekkingRow: function(comm) {
        var img = 'images/' + comm.namespace.toLowerCase() + '/' +  comm.type + '.png';
        img = typeof imagesBase64 === 'undefined'  ? dbkjs.basePath + img : imagesBase64[img];
        return $(Mustache.render(
            '<tr>' +
                '<td><img class="thumb" src="{{img}}" alt="{{comm.status}}" title="{{comm.status}}"></td>' +
                '<td>{{comm.status}}</td>' +
                '<td>{{comm.alternative}}</td>' +
                '<td>{{comm.information}}</td>' +
            '</tr>', {img: img, comm: comm}));
    },
    constructAfwijkendebinnendekking: function (feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        if (feature.afwijkendebinnendekking) {
            var id = 'collapse_comm_' + feature.identificatie;
            var comm_div = $('<div class="tab-pane" id="' + id + '"></div>');
            var comm_table_div = $('<div class="table-responsive"></div>');
            var comm_table = _obj.constructAfwijkendebinnendekkingHeader();
            var features = [];
            $.each(feature.afwijkendebinnendekking, function (idx, myGeometry) {
                var information = myGeometry.aanvullendeInformatie || '';
                var alternative = myGeometry.alternatieveCommInfrastructuur || '';
                var myFeature = new OpenLayers.Feature.Vector(new OpenLayers.Format.GeoJSON().read(myGeometry.geometry, "Geometry"));
                myFeature.attributes = {
                    "possible": myGeometry.dekking,
                    "alternative": alternative,
                    "information": information,
                    "fid": "comm_ft_" + idx
                };
                myFeature.attributes.namespace = 'other';
                myFeature.attributes.type = 'Dekking_nOK';
                var comm_status = i18n.t('comm.impossible');
                if(myGeometry.dekking) {
                    myFeature.attributes.type = 'Dekking_OK';
                    comm_status = i18n.t('comm.possible');
                }
                myFeature.attributes.status = comm_status;
                var myrow = _obj.constructAfwijkendebinnendekkingRow(myFeature.attributes);
                myrow.mouseover(function(){
                    dbkjs.selectControl.select(myFeature);
                });
                myrow.mouseout(function(){
                    dbkjs.selectControl.unselect(myFeature);
                });
                comm_table.append(myrow);
                features.push(myFeature);

            });
            _obj.layerComm.addFeatures(features);
            _obj.activateSelect(_obj.layerComm);
            comm_table_div.append(comm_table);
            comm_div.append(comm_table_div);
            _obj.panel_group.append(comm_div);
            _obj.panel_tabs.append('<li><a data-toggle="tab" href="#' + id + '">' + i18n.t('dbk.comm') + '</a></li>');
        }
    },
    constructGevaarlijkestof: function (feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        if(feature.gevaarlijkestof){
            var id = 'collapse_gevaarlijkestof_' + feature.identificatie;
            var bv_div = $('<div class="tab-pane" id="' + id + '"></div>');
            var bv_table_div = $('<div class="table-responsive"></div>');
            var bv_table = _obj.constructGevaarlijkestofHeader();
            var features = [];
             $.each(feature.gevaarlijkestof, function(idx, myGeometry){
                var myFeature = new OpenLayers.Feature.Vector(new OpenLayers.Format.GeoJSON().read(myGeometry.geometry, "Geometry"));
                myFeature.attributes = {
                    "type" : myGeometry.symboolCode,
                    "name": myGeometry.naamStof,
                    "namespace": myGeometry.namespace,
                    "quantity": myGeometry.hoeveelheid ? myGeometry.hoeveelheid.replace(/([0-9]+)([lL])/,"$1\u2113") : myGeometry.hoeveelheid,
                    "indication": myGeometry.gevaarsindicatienummer,
                    "information": myGeometry.aanvullendeInformatie,
                    "ericKaart": myGeometry.ericKaart,
                    "unnumber": myGeometry.UNnummer,
                    "radius": myGeometry.radius,
                    "fid": "gevaarlijkestof_ft_" + idx
                };
                var myrow = _obj.constructGevaarlijkestofRow(myFeature.attributes);
                myrow.mouseover(function(){
                    dbkjs.selectControl.select(myFeature);
                });
                myrow.mouseout(function(){
                    dbkjs.selectControl.unselect(myFeature);
                });
                bv_table.append(myrow);
                features.push(myFeature);
            });
            _obj.layerGevaarlijkestof.addFeatures(features);
            _obj.activateSelect(_obj.layerGevaarlijkestof);
            bv_table_div.append(bv_table);
            bv_div.append(bv_table_div);
            _obj.panel_group.append(bv_div);
            _obj.panel_tabs.append(Mustache.render('<li><a data-toggle="tab" href="#{{id}}">{{#t}}dbk.chemicals{{/t}}</a></li>', dbkjs.util.mustachei18n({ id: id})));
        }
    },
    constructGevaarlijkestofHeader: function() {
        var bv_table = $('<table class="table table-hover"></table>');
            bv_table.append(Mustache.render(
                    '<tr>' +
                        '<th>{{#t}}chemicals.type{{/t}}</th>' +
                        '<th>{{#t}}chemicals.indication{{/t}}</th>' +
                        '<th>{{#t}}chemicals.name{{/t}}</th>' +
                        '<th>{{#t}}chemicals.quantity{{/t}}</th>' +
                        '<th>{{#t}}chemicals.information{{/t}}</th>' +
                        '<th>ERIC-kaart</th>' +
                    '</tr>', dbkjs.util.mustachei18n()));
        return bv_table;
    },
    constructGevaarlijkestofRow: function(gevaarlijkestof) {
        var img = 'images/' + gevaarlijkestof.namespace.toLowerCase() + '/' +  gevaarlijkestof.type + '.png';
        img = typeof imagesBase64 === 'undefined'  ? dbkjs.basePath + img : imagesBase64[img];
        return $(Mustache.render(
            '<tr>' +
                '<td><img class="thumb" src="{{img}}" alt="{{gevaarlijkestof.type}}" title="{{gevaarlijkestof.type}}"></td>' +
                '<td><div class="gevicode">{{gevaarlijkestof.indication}}</div><div class="unnummer">{{gevaarlijkestof.unnumber}}</div></td>' +
                '<td>{{gevaarlijkestof.name}}</td>' +
                '<td>{{gevaarlijkestof.quantity}}</td>' +
                '<td>{{gevaarlijkestof.information}}</td>' +
                '<td>{{gevaarlijkestof.ericKaart}}</td>' +
            '</tr>', {img: img, gevaarlijkestof: gevaarlijkestof}));
    },
    constructFloors: function (feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        if (feature.verdiepingen && feature.verdiepingen.length > 1) {
            var id = 'collapse_floors_' + feature.identificatie;
            var active_tab = _obj.active_tab === 'verdiepingen' ? 'active' : '';
            var verdiepingen_div = $('<div class="tab-pane ' + active_tab + '" id="' + id + '"></div>');
            var verdiepingen_table_div = $('<div class="table-responsive"></div>');
            var verdiepingen_table = $('<table id ="floorslist" class="table table-hover"></table>');
            var verdiepingen_table_header = '<tr><th>' + i18n.t('dbk.floor') + '</th>';

            verdiepingen_table_header += '<th>'+ i18n.t('app.name') +'</th>';
            verdiepingen_table_header += '</tr>';
            verdiepingen_table.append(verdiepingen_table_header);
            $.each(feature.verdiepingen, function (verdiepingen_index, waarde) {
                var myrow;
                var sterretje = '';
                    if (waarde.type === 'hoofdobject') {
                    sterretje = ' (' + i18n.t('dbk.mainobject') + ')';
                }
                var isCurrentObject = waarde.identificatie === feature.identificatie;
                sterretje += "<td>" + (isCurrentObject ? '<strong><em>' :'') + waarde.informeleNaam + " (" + waarde.formeleNaam + ")"+(isCurrentObject ? '</strong></em>' :'')+ "</td>";
                if(!isCurrentObject) {
                    //Show the hyperlink!
                    myrow = $('<tr id="' + waarde.identificatie + '">' +
                        '<td>' + waarde.bouwlaag + sterretje + '</td>' +
                        '</tr>');
                    myrow.click(function(){
                        _obj.getObject(waarde.identificatie, 'verdiepingen', true);
                        if(dbkjs.viewmode === 'fullscreen') {
                            dbkjs.util.getModalPopup('dbkinfopanel').hide();
                        }
                    });
                } else {
                    //No hyperlink, current object
                    myrow = $('<tr>' +
                            '<td><strong><em>' + waarde.bouwlaag + sterretje + '</em><strong></td>' +
                            '</tr>');

                }
                verdiepingen_table.append(myrow);
            });
            verdiepingen_table_div.append(verdiepingen_table);
            verdiepingen_div.append(verdiepingen_table_div);
            _obj.panel_group.append(verdiepingen_div);
            if (active_tab === 'active') {
                _obj.panel_tabs.append('<li class="' + active_tab + '"><a data-toggle="tab" href="#' + id + '">' + i18n.t('dbk.floors') + '</a></li>');
            } else {
                _obj.panel_tabs.append('<li><a data-toggle="tab" href="#' + id + '">' + i18n.t('dbk.floors') + '</a></li>');
            }
        }
    },
    constructContact: function (feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        var id = 'collapse_contact_' + feature.identificatie;
        if (feature.contact) {
            var active_tab = _obj.active_tab === 'gevaarlijkestof' ? 'active' : '';
            var contact_div = $('<div class="tab-pane" ' + active_tab + ' id="' + id + '"></div>');
            var contact_table_div = $('<div class="table-responsive"></div>');
            var contact_table = $('<table class="table table-hover"></table>');
            contact_table.append('<tr><th>' +
                    i18n.t('contact.role') + '</th><th>' +
                    i18n.t('contact.name') + '</th><th>' +
                    i18n.t('contact.telephone') + '</th></tr>');
            $.each(feature.contact, function (contact_index, waarde) {
                contact_table.append(
                        '<tr>' +
                        '<td>' + waarde.functie + '</td>' +
                        '<td>' + waarde.naam + '</td>' +
                        '<td>' + waarde.telefoonnummer + '</td>' +
                        '</tr>'
                        );
            });
            contact_table_div.append(contact_table);
            contact_div.append(contact_table_div);
            _obj.panel_group.append(contact_div);
            _obj.panel_tabs.append('<li><a data-toggle="tab" href="#' + id + '">' + i18n.t('dbk.contact') + '</a></li>');
        }
    },
    constructOmsdetail: function (feature) {
        /* Niet gebruikt
        var _obj = dbkjs.protocol.jsonDBK;
        var id = 'collapse_omsdetail_' + feature.identificatie;
        if (feature.oms_details) {
            var active_tab = _obj.active_tab === 'gevaarlijkestof' ? 'active' : '';
            var omsdetail_div = $('<div class="tab-pane" ' + active_tab + ' id="' + id + '"></div>');
            var omsdetail_table_div = $('<div class="table-responsive"></div>');
            var omscontact_table = $('<table class="table table-hover"></table>');
            omscontact_table.append('<tr><th>' +
                    i18n.t('oms.contact') + '</th><th>' +
                    i18n.t('oms.telephone') + '</th><th>' +
                    i18n.t('oms.mobile') + '</th></tr>');

            var omsinfo_table_div = $('<div class="table-responsive"></div>');
            var omsinfo_table = $('<table class="table table-hover"></table>');
            var omscrit_table_div = $('<div class="table-responsive"></div>');
            var omscrit_table = $('<table class="table table-hover"></table>');
            $.each(feature.oms_details, function (omsdetail_index, waarde) {
                var critstring = '';
                omsinfo_table.append(
                        '<tr>' +
                        '<td><b>' + i18n.t('oms.number') + '</b></td>' +
                        '<td>' + waarde.omsnummer + '</td>' +
                        '</tr>' +
                        '<tr>' +
                        '<td><b>' + i18n.t('oms.objectname') + '</b></td>' +
                        '<td>' + waarde.objectnaam + '</td>' +
                        '</tr>'
                        );
                for (var i = 1; i < 17; i++) {
                    if (waarde['crit' + i]) {
                        critstring += '<tr>' +
                                '<td><b>' + i18n.t('oms.criterium') + ' ' + i + '</b></td>' +
                                '<td> </td>' +
                                '<td>' + waarde['crit' + i] + '</td>' +
                                '</tr>';
                    }
                }
                omscrit_table.append(critstring);
                omscontact_table.append(
                        '<tr>' +
                        '<td>' + i18n.t('dbk.general') + '</td>' +
                        '<td colspan="2">' + waarde.tel_alg + '</td>' +
                        '</tr>'
                        );
                for (var j = 1; j < 4; j++) {
                    var naam = waarde['sh_' + j + '_naam'] || '';
                    var telvast = waarde['sh_' + j + '_tel_vast'] || '';
                    var telmob = waarde['sh_' + j + '_tel_mob'] || '';
                    var contactstring = '' + naam + telvast + telmob;
                    if ( contactstring.length > 0)
                        omscontact_table.append('<tr>' +
                                '<td>' + naam + '</td>' +
                                '<td>' + telvast + '</td>' +
                                '<td>' + telmob + '</td>' +
                                '</tr>');
                }


            });
            omsinfo_table_div.append(omsinfo_table);
            omscrit_table_div.append(omscrit_table);
            omsdetail_table_div.append(omscontact_table);
            omsdetail_div.append(omsinfo_table_div);
            omsdetail_div.append(omsdetail_table_div);
            omsdetail_div.append(omscrit_table_div);
            _obj.panel_group.append(omsdetail_div);
            _obj.panel_tabs.append('<li><a data-toggle="tab" href="#' + id + '">' + i18n.t('dbk.omsdetail') + '</a></li>');
        }
        */
    },
    constructBijzonderheid: function (feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        var id = 'collapse_bijzonderheid_' + feature.identificatie;
        if (feature.bijzonderheid) {
            var bijzonderheid_div = $('<div class="tab-pane" id="' + id + '"></div>');
            var bijzonderheid_table_div = $('<div class="table-responsive"></div>');
            var bijzonderheid_table = $('<table class="table table-hover"></table>');
            bijzonderheid_table.append('<tr><th>' + i18n.t('particularies.type') + '</th><th>' + i18n.t('particularies.comment') + '</th></tr>');
            var set = {
                Algemeen: {titel: 'Algemeen', waarde: ''},
                Preparatie: {titel: 'Preparatie', waarde: ''},
                Preventie: {titel: 'Preventie', waarde: ''},
                Repressie: {titel: 'Repressie', waarde: ''}
            };
            $.each(feature.bijzonderheid, function (bijzonderheid_index, waarde) {
                if (!dbkjs.util.isJsonNull(waarde.soort)) {
                    var bijz = {soort: waarde.soort, tekst: waarde.tekst};
                    set[waarde.soort].waarde += bijz.tekst + '<br>';
                }
            });
            $.each(set, function (set_idx, set_entry) {
                if (set_entry.waarde !== '') {
                    bijzonderheid_table.append(
                            '<tr>' +
                            '<td>' + set_entry.titel + '</td>' +
                            '<td>' + set_entry.waarde + '</td>' +
                            '</tr>'
                            );
                }
            });
            bijzonderheid_table_div.append(bijzonderheid_table);
            bijzonderheid_div.append(bijzonderheid_table_div);
            _obj.panel_group.append(bijzonderheid_div);
            _obj.panel_tabs.append('<li><a data-toggle="tab" href="#' + id + '">' + i18n.t('dbk.particularities') + '</a></li>');
        }
    },
    constructMedia: function (feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        var id = 'collapse_foto_' + feature.identificatie;
        var car_id = 'carousel_foto_' + feature.identificatie;
        if (feature.foto) {
            feature.images = [];
            var foto_div = $('<div class="tab-pane" id="' + id + '"></div>');
            var image_carousel = $('<div id="' + car_id + '" class="carousel slide" data-interval="false"></div>');
            var image_carousel_inner = $('<div class="carousel-inner"></div>');
            var image_carousel_nav = $('<ol class="carousel-indicators"></ol>');
            $.each(feature.foto, function (foto_index, waarde) {
                var active = '';
                if (foto_index === 0) {
                    active = 'active';
                } else {
                    active = '';
                }
                var realpath = dbkjs.mediaPath + waarde.URL;
                if(dbkjs.util.endsWith(waarde.URL.toLowerCase(), '.jpeg') || dbkjs.util.endsWith(waarde.URL.toLowerCase(), '.jpg') || dbkjs.util.endsWith(waarde.URL.toLowerCase(), '.png')) {
                    waarde.filetype = 'afbeelding';
                }
                if (waarde.filetype === "document" || waarde.filetype === "pdf" || waarde.filetype === "doc" || waarde.filetype === "docx") {
                    if(dbkjs.util.endsWith(waarde.URL.toLowerCase(), '.pdf')) {
                        image_carousel_inner.append(
                            '<div class="item ' + active + '">' +
                                '<h3 class="pdf-heading" style="margin: 0; text-align: center; height: 28px">' + waarde.naam + '</h3>' +
                                '<div class="pdf-embed" id="pdf_embed_' + foto_index + '" data-url="' + realpath + '"/>' +
                            '</div>'
                        );
                    } else {
                        image_carousel_inner.append('<div class="item ' + active +
                                '"><img src="' + dbkjs.basePath + 'images/missing.gif""><div class="carousel-caption"><a href="' + realpath +
                                '" target="_blank"><h1><i class="fa fa-download fa-3"></h1></i></a><h3>' +
                                waarde.naam +
                                '</h3><a href="' + realpath + '" target="_blank"><h2>' + i18n.t('app.download') + '</h2></a></div></div>');
                    }
                } else if (waarde.filetype === "weblink") {
                    image_carousel_inner.append('<div class="item ' + active +
                            '"><img src="' + dbkjs.basePath + 'images/missing.gif""><div class="carousel-caption"><a href="' + waarde.URL +
                            '" target="_blank"><h1><i class="fa fa-external-link fa-3"></i></h1><h2>' +
                            i18n.t('app.hyperlink') + '</h2></a></div></div>'
                            );
                } else if (waarde.filetype === 'afbeelding') {
                    image_carousel_inner.append('<div class="item ' + active + '"><img class="img-full" style="width: 100%" src="' + realpath +
                            '" onerror="dbkjs.util.mediaError(this);"><div class="carousel-caption"><h3>' +
                            waarde.naam + '</h3></div></div>');
                    feature.images.push(realpath);
                }
                if (feature.foto.length > 1) {
                    image_carousel_nav.append('<li data-target="#' + car_id + '" data-slide-to="' +
                            foto_index + '" class="' + active + '"></li>');
                }
            });
            image_carousel.append(image_carousel_nav);
            image_carousel.append(image_carousel_inner);
            if (feature.foto.length > 1) {
                // Style "bottom: auto" om alleen pijlen bovenaan te hebben, niet
                // over PDFs heen
                image_carousel.append('<a class="left carousel-control" style="bottom: auto" href="#' + car_id + '" data-slide="prev">' +
                        '<span class="fa fa-arrow-left"></span></a>');
                image_carousel.append('<a class="right carousel-control" style="bottom: auto" href="#' + car_id + '" data-slide="next">' +
                        '<span class="fa fa-arrow-right"></span></a>');
            }
            foto_div.append(image_carousel);
            _obj.panel_group.append(foto_div);
            _obj.panel_tabs.append('<li><a data-toggle="tab" href="#' + id + '">' + i18n.t('dbk.media') + '</a></li>');
        }
    },
    constructVerblijf: function (feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        var id = 'collapse_verblijf_' + feature.identificatie;
        if (feature.verblijf) {
            var verblijf_div = $('<div class="tab-pane" id="' + id + '"></div>');
            var verblijf_table_div = $('<div class="table-responsive"></div>');
            var verblijf_table = $('<table class="table table-hover"></table>');
            verblijf_table.append('<tr><th>' + i18n.t('tarry.from') + '</th><th>' +
                    i18n.t('tarry.to') + '</th><th>' +
                    i18n.t('tarry.ammount') + '</th><th>' +
                    i18n.t('tarry.notSelfReliant') + '</th><th>' +
                    i18n.t('tarry.group') + '</th><th>' +
                    i18n.t('tarry.days') + '</th></tr>');
            $.each(feature.verblijf, function (verblijf_index, waarde) {
                var dagen = '';
                var nsr = waarde.aantalNietZelfredzaam || 0;
                var sr = waarde.aantal || 0;
                dagen += !waarde.maandag ? '<span class="label label-default">' + moment.weekdaysMin(1) + '</span>' : '<span class="label label-success">' + moment.weekdaysMin(1) + '</span>';
                dagen += !waarde.dinsdag ? '<span class="label label-default">' + moment.weekdaysMin(2) + '</span>' : '<span class="label label-success">' + moment.weekdaysMin(2) + '</span>';
                dagen += !waarde.woensdag ? '<span class="label label-default">' + moment.weekdaysMin(3) + '</span>' : '<span class="label label-success">' + moment.weekdaysMin(3) + '</span>';
                dagen += !waarde.donderdag ? '<span class="label label-default">' + moment.weekdaysMin(4) + '</span>' : '<span class="label label-success">' + moment.weekdaysMin(4) + '</span>';
                dagen += !waarde.vrijdag ? '<span class="label label-default">' + moment.weekdaysMin(5) + '</span>' : '<span class="label label-success">' + moment.weekdaysMin(5) + '</span>';
                dagen += !waarde.zaterdag ? '<span class="label label-default">' + moment.weekdaysMin(6) + '</span>' : '<span class="label label-success">' + moment.weekdaysMin(6) + '</span>';
                dagen += !waarde.zondag ? '<span class="label label-default">' + moment.weekdaysMin(0) + '</span>' : '<span class="label label-success">' + moment.weekdaysMin(0) + '</span>';
                verblijf_table.append('<tr>' +
                        '<td>' + waarde.tijdvakBegintijd.substring(0, 5) + '</td>' +
                        '<td>' + waarde.tijdvakEindtijd.substring(0, 5) + '</td>' +
                        '<td>' + sr + '</td>' +
                        '<td>' + nsr + '</td>' +
                        '<td>' + waarde.typeAanwezigheidsgroep + '</td>' +
                        '<td>' + dagen + '</td>' +
                        '</tr>');
            });
            verblijf_table_div.append(verblijf_table);
            verblijf_div.append(verblijf_table_div);
            _obj.panel_group.append(verblijf_div);
            _obj.panel_tabs.append('<li><a data-toggle="tab" href="#' + id + '">' + i18n.t('dbk.tarry') + '</a></li>');
        }
    },
    constructPandGeometrie: function (feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        if (feature.pandgeometrie) {
            var features = [];
            $.each(feature.pandgeometrie, function (idx, myGeometry) {
                var myFeature = new OpenLayers.Feature.Vector(new OpenLayers.Format.GeoJSON().read(myGeometry.geometry, "Geometry"));
                myFeature.attributes = {"id": myGeometry.bagId, "status": myGeometry.bagStatus};
                features.push(myFeature);
            });
            _obj.layerPandgeometrie.addFeatures(features);
            _obj.activateSelect(_obj.layerPandgeometrie);
        }
    },
    constructGebied: function (feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        var geom = null;

        if(feature.geometry) { // DBKGebied
            geom = feature.geometry;
        } else if(feature.gebied) { // DBKObject met nieuw gebied property uit wfs.Gebied
            geom = feature.gebied;
        }

        if(geom) {
            var f = new OpenLayers.Feature.Vector(new OpenLayers.Format.GeoJSON().read(geom, "Geometry"));
            f.attributes = {"id": feature.identificatie, "type": "gebied"};
            _obj.layerPandgeometrie.addFeatures(f);
            _obj.activateSelect(_obj.layerPandgeometrie);
        }
    },
    constructHulplijn: function (feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        if (feature.hulplijn) {
            var features = [];
            var features1 = [];
            var features2 = [];
            $.each(feature.hulplijn, function (idx, myGeometry) {
                var myBearing = 0;
                var myline = new OpenLayers.Format.GeoJSON().read(myGeometry.geometry, "Geometry");
                var myFeature = new OpenLayers.Feature.Vector(myline);
                if (myGeometry.typeHulplijn === "Arrow") {
                    var myVertices = myline.getVertices();
                    var myEndpoint = myVertices[myVertices.length - 1];
                    //revert bearing. Don't knwo why, but it works ;-)
                    myBearing = -(dbkjs.util.bearing(myVertices[myVertices.length - 2], myVertices[myVertices.length - 1]));
                    myFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Collection([myline, myEndpoint]));
                }
                var aanvinfo = dbkjs.util.isJsonNull(myGeometry.aanvullendeInformatie) ? '' : myGeometry.aanvullendeInformatie;
                myFeature.attributes = {"type": myGeometry.typeHulplijn, "rotation": myBearing, "information": aanvinfo};
                features.push(myFeature);
                if (myGeometry.typeHulplijn === "Cable") {
                    features1.push(myFeature.clone());
                }
                if (myGeometry.typeHulplijn === "Conduit") {
                    features1.push(myFeature.clone());
                }
                if (myGeometry.typeHulplijn === "Fence") {
                    features1.push(myFeature.clone());
                }
                if (myGeometry.typeHulplijn === "Fence_O") {
                    features1.push(myFeature.clone());
                }
                if (myGeometry.typeHulplijn === "Gate") {
                    features1.push(myFeature.clone());
                    features2.push(myFeature.clone());
                }
                if (myGeometry.typeHulplijn === "Bbarrier") {
                    features1.push(myFeature.clone());
                    features2.push(myFeature.clone());
                }

            });
            _obj.layerHulplijn.addFeatures(features);
            _obj.layerHulplijn1.addFeatures(features1);
            _obj.layerHulplijn2.addFeatures(features2);
            _obj.activateSelect(_obj.layerHulplijn);
        }
    },
    constructToegangterrein: function (feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        if (feature.toegangterrein) {
            var features = [];
            $.each(feature.toegangterrein, function (idx, myGeometry) {
                var myBearing = 0;
                var myline = new OpenLayers.Format.GeoJSON().read(myGeometry.geometry, "Geometry");
                var myFeature = new OpenLayers.Feature.Vector(myline);
                var myVertices = myline.getVertices();
                var myEndpoint = myVertices[myVertices.length - 1];
                //revert bearing. Don't knwo why, but it works ;-)
                myBearing = -(dbkjs.util.bearing(myVertices[myVertices.length - 2], myVertices[myVertices.length - 1]));
                myFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Collection([myline, myEndpoint]));
                myFeature.attributes = {"primary": myGeometry.primair, "rotation": myBearing,
                    "title": myGeometry.naamRoute, "information": myGeometry.aanvullendeInformatie};
                features.push(myFeature);
            });
            _obj.layerToegangterrein.addFeatures(features);
            _obj.activateSelect(_obj.layerToegangterrein);
        }
    },
    constructBrandcompartiment: function (feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        if (feature.brandcompartiment) {
            var features = [];
            var labelFeatures = [];
            //var labelOffsetDebug = "";
            $.each(feature.brandcompartiment, function (idx, myGeometry) {
                var myline = new OpenLayers.Format.GeoJSON().read(myGeometry.geometry, "Geometry");
                if (!dbkjs.util.isJsonNull(myGeometry.Label)) {
                    //create a feature for every center of every segment of the line, place the label there
                    var labelfeatures = [];
                    labelfeatures.push(myline);
                    //$.each(myline.components,function(cidx, component){
                    //    var labelFeature = myline.getCentroid();
                    //    labelfeatures.push(labelFeature);
                    //});
                    //labelfeatures.push(myFeature);
                    var outFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Collection(labelfeatures));
                    outFeature.attributes = {"type": myGeometry.typeScheiding, "label": myGeometry.Label};
                    features.push(outFeature);
                } else {
                    var myFeature = new OpenLayers.Feature.Vector(myline);
                    myFeature.attributes = {
                        "type": myGeometry.typeScheiding,
                        "informatie": myGeometry.aanvullendeInformatie
                    };
                    features.push(myFeature);

                    for(var i = 0; i < myline.components.length-1; i++) {
                        var start = myline.components[i];
                        var end = myline.components[i+1];

                        if(start.distanceTo(end) < 7.5) {
                            continue;
                        }

                        var midx = start.x + (end.x - start.x)/2;
                        var midy = start.y + (end.y - start.y)/2;

                        var opposite = (end.y - start.y);
                        var adjacent = (end.x - start.x);
                        var theta = Math.atan2(opposite, adjacent);
                        var angle = -theta * (180/Math.PI);

                        var labelPoint = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(midx, midy), {
                            "type": myGeometry.typeScheiding,
                            "label": myGeometry.Label,
                            "rotation": angle,
                            "theta": theta
                        });
                        labelFeatures.push(labelPoint);
                    }
                }
            });
            //console.log(labelOffsetDebug);
            _obj.layerBrandcompartiment.addFeatures(features);
            _obj.layerBrandcompartimentLabels.addFeatures(labelFeatures);
            _obj.activateSelect(_obj.layerBrandcompartiment);
        }
    },
    constructTekstobject: function (feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        if (feature.tekstobject) {
            var features = [];
            $.each(feature.tekstobject, function (idx, myGeometry) {
                var myFeature = new OpenLayers.Feature.Vector(new OpenLayers.Format.GeoJSON().read(myGeometry.geometry, "Geometry"));
                //@todo: De omschrijving moet er nog bij, ook in de database!
                myFeature.attributes = {
                    "title": myGeometry.tekst,
                    "rotation": myGeometry.hoek,
                    "scale": myGeometry.schaal + 2
                };
                features.push(myFeature);
            });
            _obj.layerTekstobject.addFeatures(features);
            _obj.activateSelect(_obj.layerTekstobject);
        }
    },
    constructCustomPolygon: function(feature) {
        var _obj = dbkjs.protocol.jsonDBK;
        if(feature.custom_polygon) {
            var features = [];
            $.each(feature.custom_polygon, function(i, custom_polygon) {
                var myFeature = new OpenLayers.Feature.Vector(new OpenLayers.Format.GeoJSON().read(custom_polygon.geometry, "Geometry"));
                $.each(custom_polygon, function(a, v) {
                    if(custom_polygon.hasOwnProperty(a) && a !== "geometry") {
                        myFeature.attributes[a] = v;
                    }
                });
                features.push(myFeature);
            });
            _obj.layerCustomPolygon.addFeatures(features);
            _obj.layerCustomPolygon.events.register("featureselected", _obj, _obj.customPolygonSelected);
        }
    },
    customPolygonSelected: function(e) {
        // Direct unselecteren en redraw voor juiste z-order en geen selected
        // style
        dbkjs.selectControl.unselect(e.feature);
        this.layerCustomPolygon.redraw();

        $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle">&nbsp;Waterongevallen</span>');
        var html = $('<div class="table-responsive"></div>');

        var table = $('<table class="table table-hover"></table>');
        table.append($(Mustache.render(
        '<tr>' +
            '<td style="width: 100px; background-color: ' + dbkjs.config.styles.getCustomPolygonColor(e.feature.attributes["Soort"]) + '"></td>' +
            '<td>{{f.Soort}}</td>' +
        '</tr>', { f: e.feature.attributes})));
        html.append(table);
        $('#vectorclickpanel_b').html('').append(html);
        $('#vectorclickpanel').show();
    },
    getObject: function (feature, activetab, noZoom, onSuccess) {
        var _obj = dbkjs.protocol.jsonDBK;
        if(activetab){
         _obj.active_tab = activetab;
        };
        var params = {
            srid: dbkjs.options.projection.srid,
            timestamp: new Date().getTime(),
            version: "2"
        };
        var fid;
        if(feature.attributes){
            fid = feature.attributes.identificatie;
        } else {
            //the function is not recieving a feature, but a string
            fid = feature;
        };
        $.getJSON(dbkjs.dataPath + 'object/' + fid + '.json', params).done(function(data) {
            //clear all layers first!
            $.each(_obj.layers, function(idx, lyr){
               lyr.destroyFeatures();
            });
            if(onSuccess) {
                onSuccess();
            };
            dbkjs.protocol.jsonDBK.info(data, noZoom);
        }).fail(function( jqxhr, textStatus, error ) {
            dbkjs.options.feature = null;
            dbkjs.util.alert(i18n.t('app.error'), i18n.t('dialogs.infoNotFound'), 'alert-danger');
            _obj.processing = false;
        });
    },
    getGebied: function (feature, activetab, onSuccess) {
        var _obj = dbkjs.protocol.jsonDBK;
        if(activetab){
            _obj.active_tab = activetab;
        };
        var params = {
            srid: dbkjs.options.projection.srid,
            timestamp: new Date().getTime()
        };
        var fid;
        if(feature.attributes){
            fid = feature.attributes.identificatie;
        } else {
            //the function is not recieving a feature, but a string
            fid = feature;
        };
        $.getJSON(dbkjs.dataPath + 'gebied/' + fid + '.json', params).done(function(data) {
            //clear all layers first!
            $.each(_obj.layers, function(idx, lyr){
               lyr.destroyFeatures();
            });
            if(onSuccess) {
                onSuccess();
            }
            dbkjs.protocol.jsonDBK.info(data);
        }).fail(function( jqxhr, textStatus, error ) {
            dbkjs.options.feature = null;
            dbkjs.util.alert(i18n.t('app.error'), i18n.t('dialogs.infoNotFound'), 'alert-danger');
            _obj.processing = false;
        });
    },
    addMouseoverHandler: function (tableid, vLayer) {
        $(tableid).on("mouseover", "tr", function () {
            //event.preventDefault();
            var idx = $(this).attr("id");
            var feature = vLayer.features[idx];
            if (feature) {
                dbkjs.selectControl.select(feature);
            }
            return false;
        });
    },
    addMouseoutHandler: function (tableid, vLayer) {
        $(tableid).on("mouseout", "tr", function () {
            //event.preventDefault();
            var idx = $(this).attr("id");
            var feature = vLayer.features[idx];
            if (feature) {
                dbkjs.selectControl.unselect(feature);
            }
            return false;
        });
    },
    addRowClickHandler: function (tableid, detailtype) {
        $(tableid).on("click", "tr", function () {
            var _obj = dbkjs.protocol.jsonDBK;
            var identificatie = $(this).attr("id");
            if (identificatie) {
                _obj.getObject(identificatie, detailtype);
            }
            if (dbkjs.viewmode === 'fullscreen') {
                dbkjs.util.getModalPopup('dbkinfopanel').hide();
            }
            return false;
        });

    }
};
