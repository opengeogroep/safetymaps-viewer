/*
 *  Copyright (c) 2018 B3Partners (info@b3partners.nl)
 *
 *  This file is part of safetymaps-viewer
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

/*
 * OpenLayers2 layers for displaying VRH DBKs.
 *
 */

/* global safetymaps, dbkjs, OpenLayers, i18n, Mustache */

var safetymaps = safetymaps || {};
safetymaps.vrh = safetymaps.vrh || {};

safetymaps.vrh.Dbks = function(options) {
    var me = this;
    me.options = $.extend({
        compartmentLabelMinSegmentLength: 7.5,
        compartmentLabelMinScale: 300,
        graphicSizeHover: 26,
        graphicSizeSelect: 20,
        options: {
            styleSizeAdjust: 0 // For safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue()
        }
    }, options);

    me.luchtfotoLayer = null;
    $.each(dbkjs.map.layers, function(i, l) {
        if(l.name.toLowerCase().indexOf("luchtfoto") !== -1) {
            me.luchtfotoLayer = l;
            return false;
        }
    });

    me.initLayers();

    me.symbolPath = "js/safetymaps/modules/vrh/assets/dbks/";
    me.vrhSymbols = {
        "Hellingbaan": "Hellingbaan",
        "Tb02": "Brandslanghaspel",
        "Tb1010": "Schacht/kanaal",
        "Tb1010o": "Opstelplaats redvoertuig",
        "Tb1011": "Gas detectiepaneel",
        "Tbe01": "Sleutel of ring paal",
        "Tbe02": "Poller",
        "Tbe05": "Niet toegankelijk",
        "Tbe06": "Parkeerplaats",
        "Tb2024": "Afsluiter omloopleiding",
        "Tb2025": "Afsluiter LPG",
        "Tb4005": "Gesprinklerde ruimte",
        "TbeBus": "Bussluis",
        "TbeHoogte": "Doorrijhoogte",
        "TbeRIJ": "Berijdbaar",
        "Tn05": "Nooduitgang",
        "Tn504": "Indicator/flitslicht",
        "To02": "Slaapplaats",
        "To03": "Noodstroom aggegraat",
        "To04": "Brandweerinfokast",
        "To1001": "Trap",
        "To1002": "Trap rond",
        "To1003": "Trappenhuis"
    };

    me.vrhDangerSymbols = {
        "Tw07": "Tw07",
        "TwTemp": "Temperatuur",
        "Tw21": "Niet blussen met water",
        "Tw22": "Markering lab laag risico",
        "Tw23": "Markering lab middel risico",
        "Tw24": "Markering lab hoog risico"
    };

};

safetymaps.vrh.Dbks.prototype.initLayers = function() {
    var me = this;

    dbkjs.map.addLayers(me.createLayers());

    $.each(me.selectLayers, function(i, l) {
        dbkjs.selectControl.layers.push(l);
        if(l.hover) dbkjs.hoverControl.layers.push(l);
        l.events.register("featureselected", me, me.layerFeatureSelected);
        l.events.register("featureunselected", me, dbkjs.modules.vrh_objects.objectLayerFeatureUnselected);
    });
};

safetymaps.vrh.Dbks.prototype.createLayers = function() {
    var me = this;

    this.layers = [];
    this.selectLayers = [];

    this.layerPand = new OpenLayers.Layer.Vector("DBK Pand", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                fillColor: "#ffffff",
                fillOpacity: "${fillOpacity}",
                strokeColor: "#ff0000",
                strokeWidth: 3
            }, {
                context: {
                    fillOpacity: function(feature) {
                        return me.luchtfotoLayer && me.luchtfotoLayer.visibility ? 0.3 : 1;
                    }
                }
            })
        })
    });
    this.layers.push(this.layerPand);

    // other polygons, lines...

    this.layerSymbols = new OpenLayers.Layer.Vector("DBK symbols", {
        hover: true,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                externalGraphic: "${symbol}",
                pointRadius: "${myradius}",
                rotation: "${rotation}",
                fontWeight: "bold",
                fontSize: "${fontSize}",
                label: "${label}"
            }, {
                context: {
                    myradius: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,18, feature.attributes.radius);
                    },
                    label: function(feature) {
                        if(feature.attributes.code === "TbeHoogte") {
                            return feature.attributes.bijzonderh;
                        }
                        return "";
                    },
                    fontSize: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,12, feature.attributes.radius) + "px";
                    }
                }
            }),
            temporary: new OpenLayers.Style({
                pointRadius: me.options.graphicSizeHover,
                fontSize: "${fontSize}"
            }, {
                context: {
                    fontSize: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,18, feature.attributes.radius) + "px";
                    }
                }
            }),
            select: new OpenLayers.Style({
                pointRadius: me.options.graphicSizeSelect,
                fontSize: "${fontSize}"
            }, {
                context: {
                    fontSize: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,14, feature.attributes.radius) + "px";
                    }
                }
            })
        })
    });
    this.layers.push(this.layerSymbols);
    this.selectLayers.push(this.layerSymbols);

    this.layerDangerSymbols = new OpenLayers.Layer.Vector("DBK danger symbols", {
        hover: true,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                externalGraphic: "${symbol}",
                pointRadius: "${myradius}"
            }, {
                context: {
                    myradius: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,18, feature.attributes.radius);
                    }
                }
            }),
            temporary: new OpenLayers.Style({pointRadius: me.options.graphicSizeHover}),
            select: new OpenLayers.Style({pointRadius: me.options.graphicSizeSelect})
        })
    });
    this.layers.push(this.layerDangerSymbols);
    this.selectLayers.push(this.layerDangerSymbols);

    this.layerLabels = new OpenLayers.Layer.Vector("DBK labels", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({
                fontSize: "${size}",
                label: "${tekst}",
                rotation: "${rotation}",
                labelOutlineColor: "#ffffff",
                labelOutlineWidth: 1
            }, {
                context: {
                    size: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,14,feature.attributes.symboolgro);
                    }
                }
            })
        })
    });
    this.layers.push(this.layerLabels);
    this.selectLayers.push(this.layerLabels); // Alleen om bovenop andere lagen te komen

    return this.layers;
};

safetymaps.vrh.Dbks.prototype.showFeatureInfo = function(title, code, image, label, description) {
    $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle">&nbsp;' + title + '</span>');
    var html = $('<div class="table-responsive"></div>');
    var table = $('<table class="table table-hover"></table>');
    table.append('<tr><th style="width: 110px">Symbool</th><th>' + i18n.t("name") + '</th><th>' + i18n.t("dialogs.information") + '</th></tr>');
    table.append('<tr><td><img class="thumb" src="' + image + '" alt="' + code + '" title="' + code + '"></td><td style="width: 20%">' + label + '</td><td>' + (description || "") + '</td></tr>');
    html.append(table);
    $('#vectorclickpanel_b').html('').append(html);
    $('#vectorclickpanel').show();
};

safetymaps.vrh.Dbks.prototype.showGevaarlijkeStof = function(title, f) {
    $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle">&nbsp;' + title + '</span>');
    var html = $('<div class="table-responsive"></div>');
    var table = $('<table class="table table-hover"></table>');
    table.append('<tr><th width="100px">Symbool</th><th width="60px">Gevi</th><th>Naam</th><th>Hoeveelheid</th><th>Bijzonderheden</th><th>ERIC-kaart</th></tr>');
    table.append('<tr><td><img class="thumb" src="' + f.symbol_noi + '" alt="' + f.symboolcod + '" title="' + f.symboolcod + '"></td>'
        + '<td><div class="gevicode">' + f.gevi_code + '</div><div class="unnummer">' + f.vn_nummer + '</div></td>'
        + '<td>' + f.stofnaam + '</td><td>' + f.hoeveelhei + '</td><td>' + f.description + '</td><td>' + f.eric_kaart + '</td></tr>');
    html.append(table);
    $('#vectorclickpanel_b').html('').append(html);
    $('#vectorclickpanel').show();
};

safetymaps.vrh.Dbks.prototype.layerFeatureSelected = function(e) {
    var me = this;
    var layer = e.feature.layer;
    var f = e.feature.attributes;
    console.log(layer.name + " feature selected", e);
    if(layer === me.layerSymbols) {
        me.showFeatureInfo("Brandweervoorziening", f.symboolcod, f.symbol_noi, me.vrhSymbols[f.code] || i18n.t("symbol." + f.code) || "", f.description);
    } else if(layer === me.layerDangerSymbols) {
        if(f.stofnaam) {
            me.showGevaarlijkeStof("Gevaarlijke stof", f);
        } else {
            me.showFeatureInfo("Gevaar", f.symboolcod, f.symbol_noi, me.vrhDangerSymbols[f.code] || i18n.t("symbol." + f.code) || "", f.description);
        }
    } else {
        $("#vectorclickpanel").hide();
    }
};

safetymaps.vrh.Dbks.prototype.removeAllFeatures = function(object) {
    if(this.layers) {
        $.each(this.layers, function(i, layer) {
            layer.removeAllFeatures();
        });
    }
};

safetymaps.vrh.Dbks.prototype.addFeaturesForObject = function(object) {
    var me = this;
    var wktParser = new OpenLayers.Format.WKT();

    var wktReader = function(d) {
        var f = wktParser.read(d.geometry);
        delete d.geom;
        delete d.geometry;
        f.attributes = d;
        return f;
    };

    this.layerPand.addFeatures(object.pand.map(wktReader));

    var vrhFeature = function(f) {
        if(f.attributes.symboolcod) {
            f.attributes.code = f.attributes.symboolcod.replace(/,/, "");
        }
        f.attributes.description = f.attributes.omschrijvi || "";
        if(f.attributes.bijzonderh && f.attributes.bijzonderh.trim() !== "-") {
            f.attributes.description += "; " + f.attributes.bijzonderh;
        }
        f.attributes.rotation = -(360-f.attributes.symboolhoe) || 0;

        var symbol = f.attributes.code;
        var path = safetymaps.creator.api.imagePath + 'symbols/';
        if(me.vrhSymbols[f.attributes.code]) {
            path = me.symbolPath;
        }
        f.attributes.symbol_noi = path + symbol + '.png';
        if(f.attributes.description.trim().length > 0) {
            symbol += "_i";
        }
        f.attributes.symbol = path + symbol + '.png';

        return f;
    };

    this.layerSymbols.addFeatures((object.brandweervoorziening || []).map(wktReader).map(vrhFeature));
    this.layerSymbols.addFeatures((object.toegang_pand || []).map(wktReader).map(vrhFeature));
    this.layerSymbols.addFeatures((object.toegang_terrein|| []).map(wktReader).map(vrhFeature));
    this.layerSymbols.addFeatures((object.opstelplaats || []).map(wktReader).map(function(f) {
        // Voor deze laag betekent code Tb1,010 niet schacht/kanaal maar opstelplaats redvoertuig
        if(f.attributes.symboolcod === "Tb1,010") {
            f.attributes.symboolcod = "Tb1,010o";
        }
        return f;
    }).map(vrhFeature));
    this.layerSymbols.addFeatures((object.hellingbaan || []).map(wktReader).map(function(f) {
        f.attributes.symboolcod = "Hellingbaan";
        f.attributes.omschrijvi = f.attributes.bijzonderh;
        return f;
    }).map(vrhFeature));

    this.layerDangerSymbols.addFeatures((object.gevaren || []).map(wktReader).map(function(f) {
        f.attributes.code = f.attributes.symboolcod;

        if(f.attributes.code === "Tw03") {
            f.attributes.code = "TwTemp";
        }

        f.attributes.description = f.attributes.bijzonderh && f.attributes.bijzonderh.trim() !== "-" ? f.attributes.bijzonderh : "";
        if(f.attributes.soort_geva && f.attributes.soort_geva.trim() !== "-") {
            f.attributes.description += f.attributes.description !== "" ? "; " : "";
            f.attributes.description += f.attributes.soort_geva;
        }
        if(f.attributes.locatie && f.attributes.locatie.trim() !== "-") {
            f.attributes.description += f.attributes.description !== "" ? "; " : "";
            f.attributes.description += "Locatie: " + f.attributes.locatie;
        }

        var symbol = f.attributes.code;
        var path = safetymaps.creator.api.imagePath + 'danger_symbols/';
        if(me.vrhDangerSymbols[f.attributes.code]) {
            path = me.symbolPath;
        }
        f.attributes.symbol_noi = path + symbol + '.png';
        if(f.attributes.description.trim().length > 0) {
            symbol += "_i";
        }
        f.attributes.symbol = path + symbol + '.png';
        return f;
    }));

    this.layerDangerSymbols.addFeatures((object.gevaarlijke_stoffen || []).map(wktReader).map(function(f) {
        f.attributes.code = f.attributes.symboolcod;

        f.attributes.description = f.attributes.bijzonderh && f.attributes.bijzonderh.trim() !== "-" ? f.attributes.bijzonderh : "";
        if(f.attributes.etiket && f.attributes.etiket.trim() !== "-") {
            f.attributes.description += f.attributes.description !== "" ? ", " : "";
            f.attributes.description += "Etiket: " + f.attributes.etiket;
        }
        if(f.attributes.ruimte && f.attributes.ruimte.trim() !== "-") {
            f.attributes.description += f.attributes.description !== "" ? ", " : "";
            f.attributes.description += "Ruimte: " + f.attributes.ruimte;
        }

        var symbol = f.attributes.code;
        var path = safetymaps.creator.api.imagePath + 'danger_symbols/';
        if(me.vrhDangerSymbols[f.attributes.code]) {
            path = me.symbolPath;
        }
        f.attributes.symbol_noi = path + symbol + '.png';
        if(f.attributes.description.trim().length > 0) {
            symbol += "_i";
        }
        f.attributes.symbol = path + symbol + '.png';
        return f;
    }));

    this.layerLabels.addFeatures((object.teksten || []).map(wktReader).map(function(f) {
        f.attributes.rotation = f.attributes.symboolhoe-90 || 0;
        return f;
    }));

    console.log("Added DBK layer features", this.layers);
};

safetymaps.vrh.Dbks.prototype.updateInfoWindow = function(tab, object) {
    var me = this;

    var div = $('<div class="tabbable"></div>');

    var tabContent = $('<div class="tab-content"></div>');
    var tabs = $('<ul class="nav nav-pills"></ul>');
    div.append(tabContent);
    div.append(tabs);

    var rows = [];

    //rows.push({l: "Gemeente",                               t: t.gemeente});
    //rows.push({l: "Begindatum",                             t: t.sbegin});
    //rows.push({l: "Aanvrager",                              t: t.aanvrager});

    var o = object;

    var p = o.pand[0];
    $.each(o.pand, function(i, pand) {
        if(pand.hoofd_sub === "Hoofdpand") {
            p = pand;
            return false;
        }
        return true;
    });

    rows.push({l: "OMS nummer",                                t: p.oms_nummer});
    rows.push({l: "Naam",                                   t: o.naam});
    safetymaps.creator.createHtmlTabDiv("algemeen", "Algemeen", safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

    rows = [];

//    safetymaps.creator.createHtmlTabDiv("legenda", "Legenda", safetymaps.creator.createInfoTabDiv(me.createEventLegend()), tabContent, tabs);

    tab.html(div);
};
