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

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};
dbkjs.modules.waterongevallen = {
    id: "dbk.module.waterongevallen",
    options: null,
    features: null,
    symbolen: null,
    vlakken: null,
    lijnen: null,
    register: function() {
        var me = this;

        this.options = $.extend({
            vrh: false
        }, this.options);

        this.init();

        $(dbkjs.modules.feature).on("loaded", function() {
            me.load();
        });
    },
    load: function() {
        var me = this;
        $.ajax((dbkjs.options.serverUrlPrefix ? dbkjs.options.serverUrlPrefix : "") + "action/vrh", {
            dataType: "json"
        }).fail(function(jqXHR, textStatus, errorThrown) {
            dbkjs.gui.showError("Fout bij inladen waterongevallenkaarten: " + errorThrown);
        }).done(function(data) {
            if(!data.success) {
                dbkjs.gui.showError("Fout bij inladen waterongevallenkaarten: " + data.error);
                return;
            }
            me.features = new OpenLayers.Format.GeoJSON().read(data.wbbk);

            if(me.features.length > 0) {
                $.each(me.features, function(i, feature) {
                    feature.attributes.typeFeature = "WO";
                    feature.attributes.identificatie = "fid_wo_" + feature.attributes.id;

                    var label = feature.attributes.locatie;
                    if(feature.attributes.adres || feature.attributes.plaatsnaam) {
                        label += " (";
                        if(feature.attributes.adres) {
                            label += feature.attributes.adres;
                            label += ", ";
                        }
                        if(feature.attributes.plaatsnaam) {
                            label += feature.attributes.plaatsnaam;
                        }
                        label += ")";
                    }
                    feature.attributes.label = label;
                });
                console.log("Aantal waterongevallenkaarten: " + me.features.length);

                $("#search_li_wo").show();

                dbkjs.modules.feature.features = dbkjs.modules.feature.features.concat(me.features);
                dbkjs.modules.feature.layer.addFeatures(dbkjs.modules.feature.features);
            } else {
                console.log("Geen waterongevallenkaarten!");
            }
        });
    },
    selected: function(feature, successFunction) {
        var me = this;
        $.ajax((dbkjs.options.serverUrlPrefix ? dbkjs.options.serverUrlPrefix : "") + "action/vrh", {
            dataType: "json",
            data: {
                wbbk: true,
                id: feature.attributes.id
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            dbkjs.gui.showError("Fout bij inladen waterongevallenkaart: " + errorThrown);
        }).done(function(data) {
            if(!data.success) {
                dbkjs.gui.showError("Fout bij inladen waterongevallenkaart: " + data.error);
                return;
            }
            dbkjs.selectControl.unselectAll();
            me.loadLayers(data);
            dbkjs.modules.feature.zoomToFeature(feature)
            if(typeof successFunction === "function") {
                successFunction();
            }
        });

    },
    symbolSelected: function(e) {
        $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle">&nbsp;Waterongevallen</span>');
        var html = $('<div class="table-responsive"></div>');

        var table = $('<table class="table table-hover"></table>');
        table.append(Mustache.render('<tr><th>{{#t}}waterongevallen.' + e.feature.attributes.symboolcod + '{{/t}}</th><th>Informatie</th></tr>',  dbkjs.util.mustachei18n()));
        var img = e.object.styleMap.styles.default.context.myicon(e.feature);
        table.append($(Mustache.render(
        '<tr>' +
            '<td><img class="thumb" src="{{img}}" alt="{{f.symboolcod}}" title="{{f.symboolcod}}"></td>' +
            '<td>{{f.bijzonderh}}</td>' +
        '</tr>', {img: img, f: e.feature.attributes})));
        html.append(table);
        $('#vectorclickpanel_b').html('').append(html);
        $('#vectorclickpanel').show();
    },
    symbolUnselected: function(e) {
        $('#vectorclickpanel').hide();
    },
    init: function() {
        this.createLayers();
    },
    createLayers: function() {
        this.vlakken = new OpenLayers.Layer.Vector("_WO_symbolen", {
            rendererOptions: {
                zIndexing: true
            },
            styleMap: new OpenLayers.StyleMap({
                'default': new OpenLayers.Style({
                    fillColor: "${fill}",
                   // fillOpacity: 0.2,
                    strokeColor: "${stroke}",
                    strokeWidth: 1
                }, {
                    context: {
                        fill: function (feature) {
                            var type = feature.attributes.type;

                            if(type === "Dieptevlak 15 meter en dieper") {
                                return "#0000a0";
                            } else if(type === "Dieptevlak 9 tot 15 meter") {
                                return "#0000de";
                            } else if(type === "Dieptevlak 4 tot 9 meter") {
                                return "#0f80ff";
                            } else if(type == "Dieptevlak tot 4 meter") {
                                return "#7ddafb";
                            } else if(type === "Gevaarlijk, overhangende grond") {
                                return "red";
                            }
                        },
                        stroke: function(feature) {
                            var type = feature.attributes.type;
                            if(type === "Dieptevlak 15 meter en dieper") {
                                return "#8e92ff";
                            } else if(type === "Dieptevlak 9 tot 15 meter") {
                                return "#667eff";
                            } else if(type === "Dieptevlak 4 tot 9 meter") {
                                return "#7bbeff";
                            } else if(type == "Dieptevlak tot 4 meter") {
                                return "#97b9d4";
                            } else if(type === "Gevaarlijk, overhangende grond") {
                                return "white";
                            }
                        }
                    }
                })
            })
        });
        dbkjs.map.addLayer(this.vlakken);
        this.lijnen = new OpenLayers.Layer.Vector("_WO_lijnen", {
            rendererOptions: {
                zIndexing: true
            },
            styleMap: new OpenLayers.StyleMap({
                'default': new OpenLayers.Style({
                    strokeColor: "${stroke}",
                    strokeDashstyle: "dash",
                    strokeWidth: 2
                }, {
                    context: {
                        stroke: function(feature) {
                            var type = feature.attributes.type;
                            if(type === "Hekwerk") {
                                return "blue";
                            } else if(type === "Inzetdiepte") {
                                return "yellow";
                            }
                        }
                    }
                })
            })
        });
        dbkjs.map.addLayer(this.lijnen);
        this.symbolen = new OpenLayers.Layer.Vector("_WO_symbolen", {
            rendererOptions: {
            },
            styleMap: new OpenLayers.StyleMap({
                'default': new OpenLayers.Style({
                    cursor: "pointer",
                    externalGraphic: "${myicon}",
                    pointRadius: 16
                }, {
                    context: {
                        myicon: function(feature) {
                            var type = feature.attributes.symboolcod;
                            return typeof imagesBase64 === 'undefined' ? dbkjs.basePath + "images/wo/" + type + ".png" : imagesBase64["images/wo/" + type + ".png"];
                        }
                    }
                }),
                'select': new OpenLayers.Style({pointRadius: 20}),
                'temporary': new OpenLayers.Style({pointRadius: 24})
            })
        });
        this.symbolen.events.register("featureselected", this, this.symbolSelected);
        this.symbolen.events.register("featureunselected", this, this.symbolUnselected);
        dbkjs.map.addLayer(this.symbolen);
        dbkjs.hoverControl.deactivate();
        dbkjs.hoverControl.layers.push(this.symbolen);
        dbkjs.hoverControl.activate();
        dbkjs.selectControl.deactivate();
        dbkjs.selectControl.layers.push(this.symbolen);
        dbkjs.selectControl.activate();
    },
    loadLayers: function(data) {
        this.vlakken.removeAllFeatures();
        var features = new OpenLayers.Format.GeoJSON().read(data.vlakken);
        this.vlakken.addFeatures(features);
        features = new OpenLayers.Format.GeoJSON().read(data.lijnen);
        this.lijnen.addFeatures(features);
        features = new OpenLayers.Format.GeoJSON().read(data.symbolen);
        this.symbolen.addFeatures(features);

        var j = dbkjs.protocol.jsonDBK;
        j.panel_group = $('<div class="tab-content"></div>');
        j.panel_tabs = $('<ul class="nav nav-pills"></ul>');
        var div = $('<div class="tabbable"></div>');
        div.append(j.panel_group);
        div.append(j.panel_tabs);
        $('#dbkinfopanel_b').html(div);

        this.createInfoTabDiv("algemeen", "Algemeen", true, data,
            [ "locatie", "adres", "plaatsnaam", "gebruik_bo", "bijzondere"],
            [ "Locatie", "Adres", "Plaatsnaam", "Gebruik boot", "Bijzonderheden" ]
        );

        this.createInfoTabDiv("gebruikwater", "Gebruik water", false, data,
            [ "beroepsvaa", "recreatiev", "zeilboten", "roeiers", "zwemmers", "bijzonde_1"],
            [ "Beroepsvaart", "Recreatievaart", "Zeilboten", "Roeiers", "Zwemmers", "Bijzonderheden" ]
        );

        this.createInfoTabDiv("risicogegevens", "Risicogegevens", false, data,
            ["stroming", "soortwalka", "hoogte_wal", "diepte_wat", "diepte_max", "bodemgeste", "zicht", "soort_wate", "verkeer", "gemalen", "bijzonde_2"],
            ["Stroming", "Soort Walkant", "Hoogte Walkant", "Diepte water aan de kant", "Diepte maximaal", "Bodemgesteldheid", "Zicht", "Soort water", "Verkeer", "Gemalen", "Bijzondere gevaren" ]
        );

        this.createInfoTabDiv("duikinstructie", "Duikinstructie", false, data,
            ["duikongeva", "dmc", "klpd", "waterbehee", "havendiens"],
            ["Duikongeval", "Duikmedisch centrum", "KLPD", "Waterbeheerder", "Havendienst"]
        );
        $("#collapse_duikinstructie table").append("<tr><td colspan='2'>" +
                "<table border='1' cellpadding='2'><tr><td><i>VN</i></td><td>30</td><td>27</td><td>25</td><td>23</td><td>21</td><td>19</td><td>18</td><td>17</td><td>16</td><td>15</td><td>14</td><td>13</td><td>12</td><td>11</td><td>11</td></tr>" +
                "<tr><td><i>VH</i></td><td>15</td><td>14</td><td>12</td><td>11</td><td>10</td><td>9</td><td>9</td><td>8</td><td>7</td><td>7</td><td>6</td><td>5</td><td>5</td><td>5</td><td>4</td></tr>" +
                "<tr><td><i>D</i></td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td><td>9</td><td>10</td><td>11</td><td>12</td><td>13</td><td>14</td><td>15</td></tr>" +
                "</table><br>" +
                "<table><tr><td><i>VN:</i></td><td>Normaal verbruik</td></tr>" +
                "<tr><td><i>VH:</i><td>Hoog verbruik</td></tr>" +
                "<tr><td><i>D:</i><td>Diepte</td></tr></table>" +
                "</td></tr>"
                );

        if(data.attributes["bijzonde_2"]) {
            this.createInfoTabDiv("bijzonderheden", "Bijzonderheden", false, data,
                ["bijzonde_2"],
                ["Bijzonderheden"]
            );
        }

        // Fire handler to put tabs at bottom
        $(window).resize();

        dbkjs.protocol.jsonDBK.processing = false;
        $('#systeem_meldingen').hide();
    },
    createInfoTabDiv: function(id, label, active, data, props, labels) {
        id = 'collapse_' + id;
        var bv_div = $('<div class="tab-pane ' + (active ? "active" : "") + '" id="' + id + '"></div>');
        var bv_table_div = $('<div class="table-responsive"></div>');
        var bv_table = $('<table class="table table-hover"></table>');

        $.each(props, function(i, prop) {
            if(data.attributes[prop]) {
                bv_table.append('<tr><td>' + labels[i] + '</td><td>' + data.attributes[prop] + '</td></tr>');
            }
        });

        bv_table_div.append(bv_table);
        bv_div.append(bv_table_div);

        dbkjs.protocol.jsonDBK.panel_group.append(bv_div);
        dbkjs.protocol.jsonDBK.panel_tabs.append('<li class="' + (active ? "active" : "") + '"><a data-toggle="tab" href="#' + id + '">' + label + '</a></li>');
    },
    deselect: function() {
        if(this.vlakken) {
            this.vlakken.removeAllFeatures();
            this.lijnen.removeAllFeatures();
            this.symbolen.removeAllFeatures();
        }
    }
};

