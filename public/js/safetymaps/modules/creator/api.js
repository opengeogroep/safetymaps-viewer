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
 * For common use by safetymaps-viewer and safetymaps-flamingo.
 *
 * Functionality for working with data returned by ViewerApiAction from safetymaps-server
 */

 /* global safetymaps */
 
var safetymaps = safetymaps || {};
safetymaps.creator = safetymaps.creator || {};
 
safetymaps.creator.api = {
    /**
     * Get array of objects with overview info of SafetyMaps Creator objects
     */
    getViewerObjectMapOverview: function() {
        var d = $.Deferred();

        var msg = "Error loading Creator objects from /api/features.json: ";
        $.ajax('api/features.json', {
            dataType: "json",
            data: {
                version: "3"
            }
        })  
        .fail(function(jqXHR, textStatus, errorThrown) {
            // TODO i18n
            d.reject(msg + safetymaps.utils.getAjaxError(jqXHR, textStatus, errorThrown));
        })
        .done(function(data, textStatus, jqXHR) {
            if(data.success) {
                d.resolve(data.results);
            } else {
                d.reject(msg + data.error);
            }
        });  
        return d.promise();            
    },
    
    /**
     * Create OpenLayers features suitable for use in ClusteringLayer
     */
    createViewerObjectFeatures: function(data, options) {
        var wktParser = new OpenLayers.Format.WKT();
        
        var features = new Array(data.length);
        $.each(data, function(i, apiObject) {
            var wkt = apiObject.selectiekader_centroid || apiObject.pand_centroid;
            var feature = wktParser.read(wkt);
            feature.attributes = {
                id: apiObject.id,
                minClusteringResolution: 0 
            };
            var symbol = apiObject.heeft_verdiepingen ? "objectwithfloors.png" : "object.png";
            var label = null;
            var width = 24;
            var height = 38;
            if(apiObject.symbol) {
                switch(apiObject.symbol.toLowerCase()) {
                    case "waterongevallen":
                        symbol = "wo.png"; width = 40; height = 40;
                        label = apiObject.informele_naam;
                        break;
                    case "evenement":
                        symbol = "event.png"; width = 85; height = 65;
                        break;
                }
            }
            feature.attributes.symbol = options.imagePath + '/' + symbol;
            feature.attributes.width = width;
            feature.attributes.height = height;
            if(apiObject.selectiekader) {
                var selectiekaderFeature = wktParser.read(apiObject.selectiekader);
                feature.attributes.selectionPolygon = selectiekaderFeature.geometry;
                feature.attributes.minClusteringResolution = 2.5833;
            }
            
            features[i] = feature;
            if(apiObject.id === 1317213368) {
                console.log('createdg feature for ', apiObject, feature);
            }
        });
        return features;
    },

    getStyleInfo: function() {
        // TODO
        // $.ajax('api/styles.json', {
    }
};

