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
 * Functionality for working with data returned by VrhActionBean from safetymaps-server
 */

var safetymaps = safetymaps || {};
safetymaps.vrh = safetymaps.vrh || {};

safetymaps.vrh.api = {
    basePath: "",
    imagePath: "",

    /**
     * Get array of objects with overview info of DBK objects
     */
    getDbks: function(newDbSchema) {
        var d = $.Deferred();

        var msg = "Fout bij laden DBK gegevens: ";
        $.ajax("api/vrh/dbks.json", {
            dataType: "json",
            data: {
                newDbSchema: newDbSchema
            },
            cache: true,
            ifModified: true
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
    createDbkFeatures: function(data) {
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
            var symbol = "js/safetymaps/modules/creator/assets/object.png";
            var width = 23;
            var height = 40;

            feature.attributes.label = apiObject.naam;
            feature.attributes.symbol = me.imagePath + symbol;
            feature.attributes.width = width;
            feature.attributes.height = height;
            feature.attributes.type = "dbk";
            feature.attributes.adres = [apiObject];
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

    /**
     * Get array of objects with overview info of evenement objects
     */
    getEvenementen: function() {
        var d = $.Deferred();

        var msg = "Fout bij laden evenementgegevens: ";
        $.ajax("api/vrh/evenementen.json", {
            dataType: "json"
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
    createEvenementFeatures: function(data) {
        var me = this;

        var wktParser = new OpenLayers.Format.WKT();

        var features = [];
        $.each(data, function(i, apiObject) {
            var feature = wktParser.read(apiObject.centroid);
            feature.attributes = {
                id: apiObject.id,
                apiObject: apiObject,
                minClusteringResolution: Infinity
            };
            var symbol = "js/safetymaps/modules/creator/assets/event.png";
            var width = 33;
            var height = 35;

            feature.attributes.label = apiObject.evnaam;
            feature.attributes.symbol = me.imagePath + symbol;
            feature.attributes.width = width;
            feature.attributes.height = height;
            feature.attributes.type = "evenement";
            if(apiObject.selectiekader) {
                var selectiekaderFeature = wktParser.read(apiObject.selectiekader);
                feature.attributes.selectionPolygon = selectiekaderFeature.geometry;
            }
            apiObject.clusterFeature = feature;
            features.push(feature);
        });
        return features;
    },

    getWaterongevallen: function(newDbSchema) {
        var d = $.Deferred();

        var msg = "Fout bij laden WO gegevens: ";
        $.ajax("api/vrh/waterongevallen.json", {
            dataType: "json",
            data: {
                newDbSchema: newDbSchema
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

    createWaterongevallenFeatures: function(data) {
        var me = this;

        var wktParser = new OpenLayers.Format.WKT();

        var features = [];
        $.each(data, function(i, apiObject) {
            var feature = wktParser.read(apiObject.geometry);
            feature.attributes = {
                id: apiObject.id,
                apiObject: apiObject,
                minClusteringResolution: 0
            };
            var symbol = "js/safetymaps/modules/creator/assets/wo.png";
            var width = 40;
            var height = 40;

            feature.attributes.label = apiObject.locatie;
            feature.attributes.symbol = me.imagePath + symbol;
            feature.attributes.width = width;
            feature.attributes.height = height;
            feature.attributes.type = "waterongevallenkaart";
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

    getObjectDetails: function(type, id, newDbSchema) {
        var me = this;

        var d = $.Deferred();

        var msg = "Fout bij laden " + type + " gegevens: ";
        $.ajax("api/vrh/" + type + "/" + id + ".json", {
            dataType: "json",
            data: {
                newDbSchema: newDbSchema
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
    }
};

