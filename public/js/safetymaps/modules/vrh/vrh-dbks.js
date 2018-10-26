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
                rotation: "-${rotation}"
            }, {
                context: {
                    symbol: function(feature) {
                        var symbol = feature.attributes.code;
                        if(feature.attributes.description.trim().length > 0) {
                            symbol += "_i";
                        }
                        return safetymaps.creator.api.imagePath + 'symbols/' + symbol + '.png';
                    },
                    myradius: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,14, feature.attributes.radius);
                    }
                }
            }),
            temporary: new OpenLayers.Style({pointRadius: me.options.graphicSizeHover}),
            select: new OpenLayers.Style({pointRadius: me.options.graphicSizeSelect})
        })
    });
    this.layers.push(this.layerSymbols);
    this.selectLayers.push(this.layerSymbols);

    return this.layers;
};

safetymaps.vrh.Dbks.prototype.showFeatureInfo = function(title, label, description) {
    dbkjs.modules.vrh_objects.showFeatureInfo(title, label, description);
};

safetymaps.vrh.Dbks.prototype.layerFeatureSelected = function(e) {
    var me = this;
    var layer = e.feature.layer;
    var f = e.feature.attributes;
    console.log(layer.name + " feature selected", e);
    if(layer === me.layerSymbols) {
        me.showFeatureInfo("Branweervoorziening", i18n.t("symbol." + f.code) || "", f.omschrijvi);
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
    var wktParser = new OpenLayers.Format.WKT();

    var wktReader = function(d) {
        var f = wktParser.read(d.geometry);
        delete d.geom;
        delete d.geometry;
        f.attributes = d;
        return f;
    };

    this.layerPand.addFeatures(object.pand.map(wktReader));

    this.layerSymbols.addFeatures($.each((object.brandweervoorziening || []).map(wktReader), function(i, bwvz) {
        bwvz.attributes.code = bwvz.attributes.symboolcod.replace(/,/, "");
        bwvz.attributes.description = bwvz.attributes.omschrijvi || "";
        bwvz.attributes.rotation = 360-bwvz.attributes.symboolhoe || 0;
        console.log("brandweervoorziening ", bwvz.attributes);
    }));

    // TODO opstelplaats, toegang_pand, toegang_terrein, gevaren

/*
    var terrein = wktReader(object.terrein);
    this.layerTerrain.addFeatures([terrein]);

    this.layerLocationPolygon.addFeatures(object.locatie_vlak.map(wktReader));
    // TODO add label points, or text symbolizer for polygon?
    this.layerLocationLine.addFeatures(object.locatie_lijn.map(wktReader));
    this.layerLocationLine2.addFeatures(object.locatie_lijn.map(wktReader));
    this.layerLocationLine3.addFeatures(object.locatie_lijn.map(wktReader));

    this.layerRoutePolygon.addFeatures(object.route_vlak.map(wktReader));
    // TODO add label points, or text symbolizer for polygon?
    this.layerRouteLine.addFeatures(object.route_lijn.map(wktReader));
    this.layerRouteLine2.addFeatures(object.route_lijn.map(wktReader));
    this.layerRouteLine3.addFeatures(object.route_lijn.map(wktReader));

    this.layerLabels.addFeatures(object.teksten.map(d => new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(d.x, d.y), d)));

    this.layerLocationSymbols.addFeatures(object.locatie_punt.map(d => new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(d.x, d.y), d)));
    this.layerRouteSymbols.addFeatures(object.route_punt.map(d => new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(d.x, d.y), d)));
*/
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
