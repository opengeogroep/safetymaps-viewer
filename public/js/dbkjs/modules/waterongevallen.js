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
        $.ajax("api/wbbks.json", {
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
        $.ajax("api/wbbk/" + feature.attributes.id + ".json", {
            dataType: "json"
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
        if(!e.feature.attributes.symboolcod) {
            // Alleen tekst
            dbkjs.selectControl.unselect(e.feature);
            return;
        }
        $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle">&nbsp;Waterongevallen</span>');
        var html = $('<div class="table-responsive"></div>');

        var table = $('<table class="table table-hover"></table>');
        table.append(Mustache.render('<tr><th style="width: 30%">{{#t}}waterongevallen.' + e.feature.attributes.symboolcod + '{{/t}}</th><th>Informatie</th></tr>',  dbkjs.util.mustachei18n()));
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
    vlakSelected: function(e) {
        // Direct unselecteren en redraw voor juiste z-order en geen selected
        // style
        dbkjs.selectControl.unselect(e.feature);
        this.vlakken.redraw();

        $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle">&nbsp;Waterongevallen</span>');
        var html = $('<div class="table-responsive"></div>');

        var table = $('<table class="table table-hover"></table>');
        table.append($(Mustache.render(
        '<tr>' +
            '<td style="width: 100px; background-color: ' + this.getDiepteVlakColor(e.feature.attributes.type) + '"></td>' +
            '<td>{{f.type}}</td>' +
        '</tr>', { f: e.feature.attributes})));
        html.append(table);
        $('#vectorclickpanel_b').html('').append(html);
        $('#vectorclickpanel').show();

    },
    init: function() {
        this.createLayers();
    },
    getDiepteVlakColor: function(type) {
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
        } else if(type === "Ponton") {
            return "black";
        }
        return "";
    },
    createLayers: function() {
        var me = this;
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

                            return me.getDiepteVlakColor(type);
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
                    pointRadius: "${radius}",
                    label: "${label}",
                    labelAlign: "lc",
                    fontColor: "black",
                    fontSize: "12px",
                    fontWeight: "normal",
                    labelOutlineColor: "white",
                    labelOutlineWidth: 1,
                    rotation: "${rotation}"

                }, {
                    context: {
                        radius: function(feature) {
                            return feature.attributes.symboolcod ? 16 : 0;
                        },
                        myicon: function(feature) {
                            var type = feature.attributes.symboolcod;
                            if(!type) {
                                // Alleen tekst
                                return "";
                            }
                            if(feature.attributes.bijzonderh && feature.attributes.bijzonderh.trim().length > 0) {
                                type += "_i";
                            }
                            return typeof imagesBase64 === 'undefined' ? dbkjs.basePath + "images/wo/" + type + ".png" : imagesBase64["images/wo/" + type + ".png"];
                        },
                        label: function(feature) {
                            var tekst = feature.attributes.tekst;
                            if(!tekst) {
                                // Alleen symbool
                                return "";
                            }
                            return tekst;
                        },
                        rotation: function(feature) {
                            var hoek = feature.attributes.hoek;
                            if(!hoek) {
                                return 0;
                            }
                            return -hoek;
                        }
                    }
                }),
                'select': new OpenLayers.Style({
                    pointRadius: "${radius}",
                }, {
                    context: {
                        radius: function(feature) {
                            return feature.attributes.symboolcod ? 20 : 0;
                        }
                    }
                }),
                'temporary': new OpenLayers.Style({
                    pointRadius: "${radius}",
                }, {
                    context: {
                        radius: function(feature) {
                            return feature.attributes.symboolcod ? 24 : 0;
                        }
                    }
                })
            })
        });
        this.symbolen.events.register("featureselected", this, this.symbolSelected);
        this.symbolen.events.register("featureunselected", this, this.symbolUnselected);
        this.vlakken.events.register("featureselected", this, this.vlakSelected);
        dbkjs.map.addLayer(this.symbolen);
        dbkjs.hoverControl.deactivate();
        dbkjs.hoverControl.layers.push(this.symbolen);
        dbkjs.hoverControl.activate();
        dbkjs.selectControl.deactivate();
        dbkjs.selectControl.layers.push(this.symbolen);
        dbkjs.selectControl.layers.push(this.lijnen);
        dbkjs.selectControl.layers.push(this.vlakken);
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
        features = new OpenLayers.Format.GeoJSON().read(data.teksten);
        this.symbolen.addFeatures(features);

        var j = dbkjs.protocol.jsonDBK;
        j.panel_group = $('<div class="tab-content"></div>');
        j.panel_tabs = $('<ul class="nav nav-pills"></ul>');
        var div = $('<div class="tabbable"></div>');
        div.append(j.panel_group);
        div.append(j.panel_tabs);
        $('#dbkinfopanel_b').html(div);

        this.createInfoTabDiv("algemeen", "Algemeen", true, data,
            [ "locatie", "adres", "plaatsnaam", "gebruik_bo"],
            [ "Locatie", "Adres", "Plaatsnaam", "Gebruik boot" ]
        );

        this.createInfoTabDiv("gebruikwater", "Gebruik water", false, data,
            [ "beroepsvaa", "recreatiev", "zeilboten", "roeiers", "zwemmers", "bijzonde_1", "bijzonde_4"],
            [ "Beroepsvaart", "Recreatievaart", "Zeilboten", "Roeiers", "Zwemmers", "Bijzonderheden", ""]
        );

        this.createInfoTabDiv("risicogegevens", "Risicogegevens", false, data,
            ["stroming", "soortwalka", "hoogte_wal", "diepte_wat", "diepte_max", "bodemgeste", "zicht", "soort_wate", "waterkwali", "verkeer", "gemalen", "bijzondere", "bijzonde_5"],
            ["Stroming", "Soort Walkant", "Hoogte Walkant", "Diepte water aan de kant", "Diepte maximaal", "Bodemgesteldheid", "Zicht", "Soort water", "Waterkwaliteit", "Verkeer", "Gemalen", "Bijzondere gevaren", "" ]
        );

        this.createInfoTabDiv("noodprocedure", "Noodprocedure", false, data,
            ["duikongeva", "dmc", "klpd", "waterbehee", "havendiens", "bijzonde_2", "bijzonde_6"],
            ["Duikongeval", "Duikmedisch centrum", "KLPD", "Waterbeheerder", "Havendienst", "Bijzonderheden", ""]
        );

        this.createHtmlTabDiv("duikinstructie", "Duikinstructie", false, "" +
                "<table border='1' cellpadding='2' style='width: 100%'><tr><td>Werktijd (Normaal verbruik)</td><td>30</td><td>27</td><td>25</td><td>23</td><td>21</td><td>19</td><td>18</td><td>17</td><td>16</td><td>15</td><td>14</td><td>13</td><td>12</td><td>11</td><td>11</td></tr>" +
                "<tr><td>Werktijd (hoog verbruik)</td><td>15</td><td>14</td><td>12</td><td>11</td><td>10</td><td>9</td><td>9</td><td>8</td><td>7</td><td>7</td><td>6</td><td>5</td><td>5</td><td>5</td><td>4</td></tr>" +
                "<tr><td>Diepte</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td><td>9</td><td>10</td><td>11</td><td>12</td><td>13</td><td>14</td><td>15</td></tr>" +
                "</table><br>"// +
//                "<table><tr><td><i>VN:</i></td><td>Normaal verbruik</td></tr>" +
//                "<tr><td><i>VH:</i><td>Hoog verbruik</td></tr>" +
//                "<tr><td><i>D:</i><td>Diepte</td></tr></table>"

                );

        if(data.attributes["bijzonderh"] || data.attributes["bijzonde_2"]) {
            this.createInfoTabDiv("bijzonderheden", "Bijzonderheden", false, data,
                ["bijzonderh", "bijzonde_3"],
                ["Bijzonderheden", ""]
            );
        }

        var symb_table = $('<table class="table table-hover"></table>');
        symb_table.append('<tr><th></th><th>Symbool</th><th>Informatie</th></tr>');

        $.each(this.symbolen.features, function(i, symbool) {
            if(!symbool.attributes.symboolcod) {
                return true;
            }

            var img = "images/wo/" + symbool.attributes.symboolcod + '.png';
            img = typeof imagesBase64 === 'undefined'  ? dbkjs.basePath + img : imagesBase64[img];

            var row = $(Mustache.render(
                    '<tr>' +
                        '<td style="width: 65px; min-height: 65px"><img class="thumb" style="width: 65%" src="{{img}}" alt="{{a.symboolcod}}" title="{{#i18n.t}}waterongevallen.' + symbool.attributes.symboolcod + '{{/i18n.t}}"></td>' +
                        '<td>{{#i18n.t}}waterongevallen.' + symbool.attributes.symboolcod + '{{/i18n.t}}</td>' +
                        '<td>{{a.bijzonderh}}</td>' +
                    '</tr>', { img: img, i18n: dbkjs.util.mustachei18n(), a: symbool.attributes }));

            row.mouseover(function(){
                dbkjs.selectControl.select(symbool);
            });
            row.mouseout(function(){
                dbkjs.selectControl.unselect(symbool);
            });
            symb_table.append(row);
        });
        if(this.symbolen.features.length > 0) {
            this.createHtmlTabDiv("symbolen", "Symbolen", false, symb_table);
        }

        // Fire handler to put tabs at bottom
        $(window).resize();

        dbkjs.protocol.jsonDBK.processing = false;
        $('#systeem_meldingen').hide();
    },
    createHtmlTabDiv: function(id, label, active, content) {
        id = 'collapse_' + id;
        var bv_div = $('<div class="tab-pane ' + (active ? "active" : "") + '" id="' + id + '"></div>');
        bv_div.append(content);
        dbkjs.protocol.jsonDBK.panel_group.append(bv_div);
        dbkjs.protocol.jsonDBK.panel_tabs.append('<li class="' + (active ? "active" : "") + '"><a data-toggle="tab" href="#' + id + '">' + label + '</a></li>');
    },
    createInfoTabDiv: function(id, label, active, data, props, labels) {
        var bv_table_div = $('<div class="table-responsive"></div>');
        var bv_table = $('<table class="table table-hover"></table>');

        $.each(props, function(i, prop) {
            if(data.attributes[prop]) {
                bv_table.append('<tr><td>' + labels[i] + '</td><td>' + data.attributes[prop] + '</td></tr>');
            }
        });

        bv_table_div.append(bv_table);
        this.createHtmlTabDiv(id, label, active, bv_table_div);
    },
    deselect: function() {
        if(this.vlakken) {
            this.vlakken.removeAllFeatures();
            this.lijnen.removeAllFeatures();
            this.symbolen.removeAllFeatures();
        }
    }
};

