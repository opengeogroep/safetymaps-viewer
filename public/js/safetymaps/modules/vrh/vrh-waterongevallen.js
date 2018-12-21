/*
 *  Copyright (c) 2018 B3Partners (info@b3partners.nl)
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

/*
 * OpenLayers2 layers for displaying Waterongevallen objects.
 */

var safetymaps = safetymaps || {};
safetymaps.vrh = safetymaps.vrh || {};

safetymaps.vrh.Waterongevallen = function(options) {
    var me = this;

    me.options = $.extend({
    }, options);

    me.loading = true;

    me.initLayers();
};

safetymaps.vrh.Waterongevallen.prototype.scalePattern = function(pattern, factor) {
    if(!pattern || pattern.trim().length === 0) {
        return "";
    }
    var values = pattern.replace(/\s+/g, " ").split(" ");
    for(var i = 0; i < values.length; i++) {
        values[i] *= factor;
    }
    return values.join(" ");
};

safetymaps.vrh.Waterongevallen.prototype.initLayers = function() {
    var me = this;

    dbkjs.map.addLayers(me.createLayers());

    $.each(me.selectLayers, function(i, l) {
        dbkjs.selectControl.layers.push(l);
        if(l.hover) dbkjs.hoverControl.layers.push(l);
        l.events.register("featureselected", me, me.layerFeatureSelected);
        l.events.register("featureunselected", me, me.layerFeatureUnselected);
    });
};

safetymaps.vrh.Waterongevallen.prototype.createLayers = function() {
    var me = this;

    this.imagePath = "js/safetymaps/modules/vrh/assets/wo";

    this.layers = [];
    this.selectLayers = [];
    
    me.vlakStyle = {
        "Dieptevlak 15 meter en dieper": {
            stroke: "#8e92ff",
            fill: "#0000a0"
        },
        "Dieptevlak 9 tot 15 meter": {
            stroke: "#667eff",
            fill: "#0000de"
        },
        "Dieptevlak 4 tot 9 meter": {
            stroke: "#7bbeff",
            fill: "#0f80ff"
        },
        "Dieptevlak tot 4 meter": {
            stroke: "#97b9d4",
            fill: "#7ddafb"
        },
        "Gevaarlijk, overhangende grond": {
            stroke: "white",
            fill: "red"
        },
        "Ponton": {
            fill: "black"
        }
    };

    this.layerVlakken = new OpenLayers.Layer.Vector("WO vlakken", {
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
                        var style = me.vlakStyle[type];
                        return style.fill;
                    },
                    stroke: function(feature) {
                        var type = feature.attributes.type;
                        var style = me.vlakStyle[type];
                        return style.stroke;
                    }
                }
            })
        })
    });
    this.layers.push(this.layerVlakken);
    this.selectLayers.push(this.layerVlakken);

    this.layerLijnen = new OpenLayers.Layer.Vector("WO lijnen", {
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
    this.layers.push(this.layerLijnen);
    this.selectLayers.push(this.layerLijnen);

    this.symbolen = {
        "Gevaar": "Gevaar",
        "Twa01": "Tewaterlaatplaats boot",
        "Twa02": "Zwemplaats",
        "Twa03": "Gemaal/loosplaats",
        "Twa04": "Beweegbare brug",
        "Twa05": "Vaste brug"
    };
    this.layerSymbolen = new OpenLayers.Layer.Vector("WO symbolen", {
        hover: true,
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
                        return me.imagePath + "/" + type + ".png";
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
                pointRadius: "${radius}"
            }, {
                context: {
                    radius: function(feature) {
                        return feature.attributes.symboolcod ? 20 : 0;
                    }
                }
            }),
            'temporary': new OpenLayers.Style({
                pointRadius: "${radius}"
            }, {
                context: {
                    radius: function(feature) {
                        return feature.attributes.symboolcod ? 24 : 0;
                    }
                }
            })
        })
    });
    this.layers.push(this.layerSymbolen);
    this.selectLayers.push(this.layerSymbolen);

    return this.layers;
};


safetymaps.vrh.Waterongevallen.prototype.showFeatureInfo = function(type, img, color, description) {
    $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle">&nbsp;Waterongevallen</span>');
    var html = $('<div class="table-responsive"></div>');
    var table = $('<table class="table table-hover"></table>');
    var td = "<td></td>";
    if(color) {
        td = "<td style='height: 52px; background-color: " + color + "'></td>";
    } else if(img) {
        td = "<td><img src='" + img + "'></td>";
    }
    table.append('<tr><th style="width: 60px"></th><th>Naam</td><th>' + i18n.t("dialogs.information") + '</th></tr>');
    table.append('<tr>' + td + '<td>' + type + '</td><td>' + (description || "") + '</td></tr>');
    html.append(table);
    $('#vectorclickpanel_b').html('').append(html);
    $('#vectorclickpanel').show();
};

safetymaps.vrh.Waterongevallen.prototype.layerFeatureSelected = function(e) {
    var me = this;
    var layer = e.feature.layer;
    var f = e.feature.attributes;
    console.log(layer.name + " feature selected", e);
    if(layer === me.layerVlakken) {
        // Direct unselecteren en redraw voor juiste z-order en geen selected
        // style
        dbkjs.selectControl.unselect(e.feature);

        var s = me.vlakStyle[f.type];
        me.showFeatureInfo(f.type, null, s.fill, f.bijzonderh);
        layer.redraw();
    } else if(layer === me.layerSymbolen) {
        me.showFeatureInfo(me.symbolen[f.symboolcod], me.imagePath + "/" + f.symboolcod + ".png", null, f.bijzonderh);
        layer.redraw();
    } else {
        dbkjs.selectControl.unselect(e.feature);
        $("#vectorclickpanel").hide();
    }
};

safetymaps.vrh.Waterongevallen.prototype.layerFeatureUnselected = function(e) {
    if(e.feature.layer !== this.layerVlakken) {
        dbkjs.modules.vrh_objects.objectLayerFeatureUnselected();
    }
};

safetymaps.vrh.Waterongevallen.prototype.removeAllFeatures = function(object) {
    if(this.layers) {
        $.each(this.layers, function(i, layer) {
            layer.removeAllFeatures();
        });
    }
};

safetymaps.vrh.Waterongevallen.prototype.addFeaturesForObject = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    var wktReader = function(d) {
        var f = wktParser.read(d.geometry);
        f.attributes = d;
        return f;
    };

    this.layerVlakken.addFeatures(object.vlakken.map(wktReader));
    this.layerLijnen.addFeatures(object.lijnen.map(wktReader));
    this.layerSymbolen.addFeatures(object.symbolen.map(wktReader));
    this.layerSymbolen.addFeatures(object.teksten.map(wktReader));
};

safetymaps.vrh.Waterongevallen.prototype.updateInfoWindow = function(windowId, object) {
    var me = this;

    safetymaps.infoWindow.removeTabs(windowId, "info");

    var t = object.attributes;
    var rows;

    rows = [];
    rows.push({l: "Locatie",        t: t.locatie});
    rows.push({l: "Adres",          t: t.adres});
    rows.push({l: "Plaatsnaam",     t: t.plaatsnaam});
    rows.push({l: "Gebruik boot",   t: t.gebruik_bo});
    safetymaps.infoWindow.addTab(windowId, "algemeen", "Algemeen", "info", safetymaps.creator.createInfoTabDiv(rows, null, ["leftlabel"]));

    rows = [];
    rows.push({l: "Beroepsvaart",   t: t.beroepsvaa});
    rows.push({l: "Recreatievaart", t: t.recreatiev});
    rows.push({l: "Zeilboten",      t: t.zeilboten});
    rows.push({l: "Roeiers",        t: t.roeiers});
    rows.push({l: "Zwemmers",       t: t.zwemmers});
    rows.push({l: "Bijzonderheden", t: t.bijzonde_1});
    rows.push({l: "",               t: t.bijzonde_4});
    safetymaps.infoWindow.addTab(windowId, "gebruikwater", "Gebruik water", "info", safetymaps.creator.createInfoTabDiv(rows, null, ["leftlabel"]));

    rows = [];
    rows.push({l: "Stroming",                   t: t.stroming});
    rows.push({l: "Soort Walkant",              t: t.soortwalka});
    rows.push({l: "Hoogte Walkant",             t: t.hoogte_wal});
    rows.push({l: "Diepte water aan de kant",   t: t.diepte_wat});
    rows.push({l: "Diepte maximaal",            t: t.diepte_max});
    rows.push({l: "Bodemgesteldheid",           t: t.bodemgeste});
    rows.push({l: "Zicht",                      t: t.zicht});
    rows.push({l: "Soort water",                t: t.soort_wate});
    rows.push({l: "Waterkwaliteit",             t: t.waterkwali});
    rows.push({l: "Verkeer",                    t: t.verkeer});
    rows.push({l: "Gemalen",                    t: t.gemalen});
    rows.push({l: "Bijzondere gevaren",         t: t.bijzondere});
    rows.push({l: "",                           t: t.bijzonde_5});
    safetymaps.infoWindow.addTab(windowId, "risicogegevens", "Risicogegevens", "info", safetymaps.creator.createInfoTabDiv(rows, null, ["leftlabel"]));

    rows = [];
    rows.push({l: "Duikongeval",            t: t.duikongeva});
    rows.push({l: "Duikmedisch centrum",    t: t.dmc});
    rows.push({l: "KLPD",                   t: t.klpd});
    rows.push({l: "Waterbeheerder",         t: t.waterbehee});
    rows.push({l: "Havendienst",            t: t.havendiens});
    rows.push({l: "Bijzonderheden",         t: t.bijzonde_2});
    rows.push({l: "",                       t: t.bijzonde_6});
    safetymaps.infoWindow.addTab(windowId, "noodprocedure", "Noodprocedure", "info", safetymaps.creator.createInfoTabDiv(rows, null, ["leftlabel"]));

    safetymaps.infoWindow.addTab(windowId, "duikinstructie", "Duikinstructie", "info",
            "<table border='1' cellpadding='2' style='width: 100%'><tr><td class='leftlabel'>Werktijd (Normaal verbruik)</td><td>30</td><td>27</td><td>25</td><td>23</td><td>21</td><td>19</td><td>18</td><td>17</td><td>16</td><td>15</td><td>14</td><td>13</td><td>12</td><td>11</td><td>11</td></tr>" +
            "<tr><td>Werktijd (hoog verbruik)</td><td>15</td><td>14</td><td>12</td><td>11</td><td>10</td><td>9</td><td>9</td><td>8</td><td>7</td><td>7</td><td>6</td><td>5</td><td>5</td><td>5</td><td>4</td></tr>" +
            "<tr><td>Diepte</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td><td>9</td><td>10</td><td>11</td><td>12</td><td>13</td><td>14</td><td>15</td></tr>" +
            "</table><br>"
    );

    rows = [];
    rows.push({l: "Bijzonderheden", t: t.bijzonderh});
    rows.push({l: "",               t: t.bijzonde_3});
    safetymaps.infoWindow.addTab(windowId, "bijzonderheden", "Bijzonderheden", "info", safetymaps.creator.createInfoTabDiv(rows, null, ["leftlabel"]));

    safetymaps.infoWindow.addTab(windowId, "symbolen", "Symbolen", "info",  safetymaps.creator.createInfoTabDiv(me.createLegend(), null, ["leftlabel", "leftlabel"]));
    dbkjs.modules.vrh_objects.addLegendTrEventHandler("tab_symbolen", {
        "symbool" : me.layerSymbolen
    }, "symboolcod");
};

safetymaps.vrh.Waterongevallen.prototype.createLegend = function() {
    var me = this;

    var rows = [];
    var rowsWithInfo = [], rowsWithoutInfo = [];
    function legendTrSort(lhs, rhs) {
        return lhs[1].localeCompare(rhs[1]);
    };

    if(me.layerSymbolen.features.length > 0) {
        rows.push([
            "<b>Symbool</b>",
            "<b>Naam</b>",
            "<b>Informatie</b>"
        ]);

        var codesDisplayed = {};

        $.each(me.layerSymbolen.features, function(i, f) {
            var code = f.attributes.symboolcod;
            if(!code) {
                return true;
            }
            var description = f.attributes.bijzonderh || null;
            if(codesDisplayed[code] && description === null) {
                return true;
            }
            codesDisplayed[code] = true;

            var id = "symbool_" + (description !== null ? "idx_" + i : "attr_" + code);
            var tr = [
                "<img id='" + id + "' class='legend_symbol' src='" + me.imagePath + '/' + code + ".png'>",
                me.symbolen[code],
                description || ""
            ];

            if(description === null) {
                rowsWithoutInfo.push(tr);
            } else {
                rowsWithInfo.push(tr);
            }
        });
        rowsWithInfo.sort(legendTrSort);
        rowsWithoutInfo.sort(legendTrSort);
        rows = rows.concat(rowsWithInfo).concat(rowsWithoutInfo);
    }
    return rows;
};