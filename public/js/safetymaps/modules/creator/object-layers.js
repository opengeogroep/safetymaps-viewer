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

    this.layerBuildings = new OpenLayers.Layer.Vector("Creator buildings", {
        rendererOptions: {
            zIndexing: true
        },
        // TODO add VRH functionality for switching style when aerial basemap
        // is enabled
        styleMap: new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({
                fillColor: "#00ff00",
                fillOpacity: 0.6,
                strokeColor: "#ff0000",
                strokeWidth: 1
            }, {
                context: {
                }
            })
        })
    });

    this.layers = [this.layerBuildings];
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
};

safetymaps.creator.CreatorObjectLayers.prototype.addBuildingFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    console.log("adding buildings", object);

    var features = [];
    $.each(object.buildings, function(i, buildingWkt) {
        var f = wktParser.read(buildingWkt);
        f.attributes.index = i;
        features.push(f);
    });
    this.layerBuildings.addFeatures(features);
};