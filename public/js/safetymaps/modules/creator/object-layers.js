/*
 *  Copyright (c) 2017 B3Partners (info@b3partners.nl)
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
 * OpenLayers2 layers for displaying SafetyMaps Creator objects.
 *
 */

 /* global safetymaps, OpenLayers */

var safetymaps = safetymaps || {};
safetymaps.creator = safetymaps.creator || {};

safetymaps.creator.CreatorObjectLayers = function(options) {
    this.options = $.extend({
        // TODO move relevant dbkjs.options.* to here
    }, options);
};

safetymaps.creator.CreatorObjectLayers.prototype.createLayers = function() {
    var me = this;

    this.layers = [];

    this.layerBuildings = new OpenLayers.Layer.Vector("Creator buildings", {
        rendererOptions: {
            zIndexing: true
        },
        // TODO add VRH functionality for switching style when aerial basemap
        // is enabled
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                fillColor: "#66ff66",
                fillOpacity: 0.2,
                strokeColor: "#66ff66",
                strokeWidth: 1
            }, {
                context: {
                }
            })
        })
    });
    this.layers.push(this.layerBuildings);

    this.layerCustomPolygon = new OpenLayers.Layer.Vector("Creator custom polygons", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                fillColor: "{fillColor}",
                fillOpacity: "{fillOpacity}"
            })
        })
    });
    this.layers.push(this.layerCustomPolygon);

    this.layerFireCompartmentation = new OpenLayers.Layer.Vector("Creator fire compartmentation", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                color: "{color}",
                strokeWidth: "{strokeWidth}"
            })
        })
    });
    this.layers.push(this.layerFireCompartmentation);
    this.layerFireCompartmentationLabels = new OpenLayers.Layer.Vector("Creator fire compartmentation labels", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({
                // TODO
            })
        })
    });
    this.layers.push(this.layerFireCompartmentationLabels);

    this.layerLines1 = new OpenLayers.Layer.Vector("Creator lines 1", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                color: "{color}",
                strokeWidth: "{strokeWidth}"
            })
        })
    });
    this.layers.push(this.layerLines1);
    this.layerLines2 = new OpenLayers.Layer.Vector("Creator lines 2", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                color: "{color}",
                strokeWidth: "{strokeWidth}"
            })
        })
    });
    this.layers.push(this.layerLines2);
    this.layerLines3 = new OpenLayers.Layer.Vector("Creator lines 3", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                color: "{color}",
                strokeWidth: "{strokeWidth}"
            })
        })
    });
    this.layers.push(this.layerLines3);

    this.layerApproachRoutes = new OpenLayers.Layer.Vector("Creator approach routes", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                color: "{color}",
                strokeWidth: "{strokeWidth}"
            })
        })
    });
    this.layers.push(this.layerApproachRoutes);

    this.layerCommunicationCoverage = new OpenLayers.Layer.Vector("Creator communication coverage", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                externalGraphic: "{symbol}"
            })
        })
    });
    this.layers.push(this.layerCommunicationCoverage);

    this.layerSymbols = new OpenLayers.Layer.Vector("Creator symbols", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({
                externalGraphic: "{symbol}",
                rotation: "{rotation}"
            })
        })
    });
    this.layers.push(this.layerSymbols);

    this.layerDangerSymbols = new OpenLayers.Layer.Vector("Creator danger symbols", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({
                externalGraphic: "{symbol}"
            })
        })
    });
    this.layers.push(this.layerDangerSymbols);

    this.layerLabels = new OpenLayers.Layer.Vector("Creator labels", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({
                fontSize: "{size}",
                label: "{label}",
                rotation: "{rotation}",
                labelOutlineColor: "#ffffff",
                labelOutlineWidth: 1
            })
        })
    });
    this.layers.push(this.layerLabels);

    return this.layers;
};

safetymaps.creator.CreatorObjectLayers.prototype.removeAllFeatures = function(object) {
    if(this.layers) {
        $.each(this.layers, function(i, layer) {
            layer.removeAllFeatures();
        });
    }
};

safetymaps.creator.CreatorObjectLayers.prototype.addFeaturesForObject = function(object) {
    this.addBuildingFeatures(object);
    this.addCustomPolygonFeatures(object);
    this.addFireCompartmentationFeatures(object);
    this.addLineFeatures(object);
    this.addApproachRouteFeatures(object);
    this.addCommunicationCoverageFeatures(object);
    this.addSymbolFeatures(object);
    this.addDangerSymbolFeatures(object);
    this.addLabelFeatures(object);
};

safetymaps.creator.CreatorObjectLayers.prototype.addBuildingFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    console.log("adding buildings", object);

    var features = [];
    $.each(object.buildings || [], function(i, buildingWkt) {
        var f = wktParser.read(buildingWkt);
        f.attributes.index = i;
        features.push(f);
    });
    this.layerBuildings.addFeatures(features);
};

safetymaps.creator.CreatorObjectLayers.prototype.addCustomPolygonFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    console.log("adding custom polygons", object);

    var features = [];
    $.each(object.custom_polygons || [], function(i, detail) {
        var f = wktParser.read(detail.polygon);
        f.attributes.index = i;
        f.attributes.description = detail.omschrijving;
        f.attributes.style = safetymaps.creator.api.styles.custom_polygons[detail.style];
        features.push(f);
    });
    this.layerCustomPolygon.addFeatures(features);
};

safetymaps.creator.CreatorObjectLayers.prototype.addFireCompartmentationFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    console.log("adding fire compartmentation", object);

    var features = [];
    $.each(object.fire_compartmentation || [], function(i, detail) {
        var f = wktParser.read(detail.line);
        f.attributes.index = i;
        f.attributes.description = detail.omschrijving;
        f.attributes.style = safetymaps.creator.api.styles.compartments[detail.style];
        features.push(f);

        // TODO: create label features
    });
    this.layerBuildings.addFeatures(features);
};

safetymaps.creator.CreatorObjectLayers.prototype.addLineFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    console.log("adding lines", object);

    var features = [];
    $.each(object.lines || [], function(i, detail) {
        var f = wktParser.read(detail.line);
        f.attributes.index = i;
        f.attributes.description = detail.omschrijving;
        f.attributes.style = safetymaps.creator.api.styles.custom_lines[detail.style];
        features.push(f);
    });
    this.layerLines1.addFeatures(features);
    this.layerLines2.addFeatures(features);
    this.layerLines3.addFeatures(features);
};

safetymaps.creator.CreatorObjectLayers.prototype.addApproachRouteFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    console.log("adding approach routes", object);

    var features = [];
    $.each(object.approach_routes || [], function(i, detail) {
        var f = wktParser.read(detail.line);
        f.attributes.index = i;
        f.attributes.description = detail.omschrijving;
        f.attributes.name = detail.naam;
        f.attributes.primary = detail.primair;
        features.push(f);
    });
    this.layerApproachRoutes.addFeatures(features);
};

safetymaps.creator.CreatorObjectLayers.prototype.addCommunicationCoverageFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    console.log("adding communication coverage", object);

    var features = [];
    $.each(object.communication_coverage || [], function(i, detail) {
        var f = wktParser.read(detail.location);
        f.attributes.index = i;
        f.attributes.info = detail.aanvullende_informatie;
        f.attributes.coverage = detail.dekking;
        f.attributes.alternative = detail.alternatief;
        features.push(f);
    });
    this.layerCommunicationCoverage.addFeatures(features);
};

safetymaps.creator.CreatorObjectLayers.prototype.addSymbolFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    console.log("adding symbols", object);

    var features = [];
    $.each(object.symbols || [], function(i, detail) {
        var f = wktParser.read(detail.location);
        f.attributes.index = i;
        f.attributes.description = detail.omschrijving;
        f.attributes.rotation = detail.rotation;
        f.attributes.code = detail.code;
        features.push(f);
    });
    this.layerSymbols.addFeatures(features);
};

safetymaps.creator.CreatorObjectLayers.prototype.addDangerSymbolFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    console.log("adding danger symbols", object);

    var features = [];
    $.each(object.danger_symbols || [], function(i, detail) {
        var f = wktParser.read(detail.location);
        f.attributes.index = i;
        f.attributes.description = detail.omschrijving;
        f.attributes.symbol = detail.symbol;
        f.attributes.geviCode = detail.gevi_code;
        f.attributes.unNr = detail.un_nr;
        f.attributes.amount = detail.hoeveelheid;
        f.attributes.substance_name = detail.naam_stof;
        features.push(f);
    });
    this.layerDangerSymbols.addFeatures(features);
};

safetymaps.creator.CreatorObjectLayers.prototype.addLabelFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    console.log("adding labels", object);

    var features = [];
    $.each(object.labels || [], function(i, detail) {
        var f = wktParser.read(detail.location);
        f.attributes.index = i;
        f.attributes.label = detail.text;
        f.attributes.rotation = detail.rotation;
        f.attributes.size = detail.size;
        features.push(f);
    });
    this.layerLabels.addFeatures(features);
};

