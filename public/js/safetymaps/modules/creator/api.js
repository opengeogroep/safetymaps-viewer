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
 * For common use by safetymaps-viewer and safetymaps-flamingo.
 *
 * Functionality for working with data returned by ViewerApiAction from safetymaps-server
 */

var safetymaps = safetymaps || {};
safetymaps.creator = safetymaps.creator || {};

safetymaps.creator.api = {
    basePath: "",
    imagePath: "",
    apiPath: "api/",

    /**
     * Get array of objects with overview info of SafetyMaps Creator objects
     */
    getViewerObjectMapOverview: function() {
        var d = $.Deferred();

        // TODO i18n
        var msg = "Error loading Creator objects from " + this.basePath + this.apiPath + "features.json: ";
        $.ajax(this.basePath + this.apiPath + "features.json", {
            dataType: "json",
            data: {
                version: "3"
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
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
    createViewerObjectFeatures: function(data) {
        var me = this;

        var wktParser = new OpenLayers.Format.WKT();

        var features = [];
        $.each(data, function(i, apiObject) {
            var wkt = apiObject.selectiekader_centroid || apiObject.pand_centroid;
            var feature = wktParser.read(wkt);
            feature.attributes = {
                id: apiObject.id,
                apiObject: apiObject,
                minClusteringResolution: 0
            };
            var symbol = "object.png";
            var width = 23;
            var height = 40;
            if(apiObject.heeft_verdiepingen) {
                symbol = "objectwithfloors.png";
                width = 21;
                height = 38;
            }
            feature.attributes.type = "Object";
            if(apiObject.symbool) {
                switch(apiObject.symbool.toLowerCase()) {
                    case "waterongevallen":
                        symbol = "wo.png"; width = 40; height = 40;
                        feature.attributes.type = "Waterongevallen";
                        break;
                    case "evenement":
                        symbol = "event.png"; width = 33; height = 35;
                        feature.attributes.type = "Evenement";
                        break;
                }
            }
            feature.attributes.label = apiObject.informele_naam;
            feature.attributes.symbol = me.imagePath + symbol;
            feature.attributes.width = width;
            feature.attributes.height = height;
            if(apiObject.selectieadressen){
                feature.attributes.adressen = apiObject.selectieadressen;
            }
            if(apiObject.selectiekader) {
                var selectiekaderFeature = wktParser.read(apiObject.selectiekader);
                feature.attributes.selectionPolygon = selectiekaderFeature.geometry;
                feature.attributes.minClusteringResolution = 2.5833;
            }
            apiObject.clusterFeature = feature;
            features.push(feature);
        });
        return features;
    },

    getStyles: function() {
        var me = this;

        var d = $.Deferred();

        // TODO i18n
        var msg = "Error loading styles from " + this.basePath + "api/styles.json: ";
        $.ajax(this.basePath + "api/styles.json", {
            dataType: "json",
            data: {
                version: "3"
            },
            cache: false
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            d.reject(msg + safetymaps.utils.getAjaxError(jqXHR, textStatus, errorThrown));
        })
        .done(function(data, textStatus, jqXHR) {
            safetymaps.creator.api.styles = data;
            d.resolve(data);
        });
        return d.promise();

    },

    verdiepingenSort: function(lhs, rhs) {
        lhs = lhs.bouwlaag;
        rhs = rhs.bouwlaag;
        // First +3, +2, +1
        // Then "BG"
        // Then -1, -2, -3
        
        //bouwlaag can contain '/' example: +2/+11
        //sort on lhs of the '/'
        if(lhs.indexOf('/')!== -1){
            lhs = lhs.slice(0,lhs.indexOf('/'));
        }
        if(rhs.indexOf('/')!== -1){
            rhs = rhs.slice(0,rhs.indexOf('/'));
        }
        
        if(lhs.charAt(0) === "+") {
            // When lhs starts with + and rhs not, lhs always sorted higher
            if(rhs.charAt(0) !== "+") {
                return -1;
            } else {
                // Sort in descending order
                return Number(rhs) - Number(lhs);
            }
        }

        if(lhs.charAt(0) === "-") {
            // When lhs starts with - and rhs not, lhs always sorted lower
            if(rhs.charAt(0) !== "-") {
                return 1;
            } else {
                // Sort negative numbers in descending order
                return Number(rhs) - Number(lhs);
            }
        }

        if(lhs === "BG") {
            if(rhs.charAt(0) === "+") {
                return 1;
            } else if(rhs.charAt(0) === "-") {
                return -1;
            }
        }

        // Fall back to normal sorting
        return lhs.localeCompare(rhs);
    },

    getObjectDetails: function(id) {
        var me = this;

        var d = $.Deferred();

        // TODO i18n
        var msg = "Error loading Creator object details from " + this.basePath + this.apiPath + "object/" + id + ".json: ";
        $.ajax(this.basePath + this.apiPath + "object/" + id + ".json", {
            dataType: "json",
            data: {
                version: "3"
            },
            cache: false
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            d.reject(msg + safetymaps.utils.getAjaxError(jqXHR, textStatus, errorThrown));
        })
        .done(function(data, textStatus, jqXHR) {

            if(data.verdiepingen) {
                data.verdiepingen.sort(me.verdiepingenSort);
            }

            d.resolve(data);
        });
        return d.promise();

    }
};

