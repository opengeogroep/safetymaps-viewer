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

 /* global safetymaps, dbkjs, OpenLayers */

 dbkjs.modules.safetymaps_creator = {
    id: "dbk.module.safetymaps_creator",
    viewerApiObjects: null,
    selectedObject: null,
    selectedClusterFeature: null,

    register: function() {
        var me = this;

        this.options = $.extend({
            // default options here
        }, this.options);

        // Setup API

        safetymaps.creator.api.basePath = "";
        safetymaps.creator.api.imagePath = "js/safetymaps/modules/creator/assets/";

        // Setup clustering layer

        me.clusteringLayer = new safetymaps.ClusteringLayer();
        $(me.clusteringLayer).on("object_cluster_selected", function(event, features) {
            me.clusterObjectClusterSelected(features);
        });
        $(me.clusteringLayer).on("object_selected", function(event, feature) {
            me.clusterObjectSelected(feature);
        });

        var layer = me.clusteringLayer.createLayer();
        dbkjs.map.addLayer(layer);
        dbkjs.selectControl.deactivate();
        dbkjs.selectControl.layers.push(layer);
        if(!dbkjs.selectControl.multiselectlayers){
            dbkjs.selectControl.multiselectlayers = [];
        }
        dbkjs.selectControl.multiselectlayers.push(layer);
        dbkjs.selectControl.activate();

        // Setup object details layers

        me.objectLayers = new safetymaps.creator.CreatorObjectLayers();
        dbkjs.map.addLayers(me.objectLayers.createLayers());

        var pViewerObjects = safetymaps.creator.api.getViewerObjectMapOverview();
        var pStyles = safetymaps.creator.api.getStyles();

        $.when(pViewerObjects, pStyles).fail(function(msg) {
            console.log("Error initializing SafetyMaps Creator module: " + msg);
        })
        .done(function(viewerObjects) {
            me.viewerApiObjectsLoaded(viewerObjects);
        });
    },

    viewerApiObjectsLoaded: function(data) {
        this.viewerApiObjects = data;
        var features = safetymaps.creator.api.createViewerObjectFeatures(data);
        this.clusteringLayer.addFeaturesToCluster(features);
    },

    clusterObjectClusterSelected: function(features) {
        console.log("TODO show selection list", features);
    },

    clusterObjectSelected: function(feature) {
        console.log("Select feature", feature);

        var me = this;

        // Unselect current, if any
        me.unselectObject();

        this.selectedClusterFeature = feature;

        console.log("zooming to feature", feature.geometry);
        dbkjs.map.setCenter(new OpenLayers.LonLat(feature.geometry.x, feature.geometry.y), dbkjs.options.zoom);

        // Get object details
        safetymaps.creator.api.getObjectDetails(feature.attributes.id)
        .fail(function(msg) {
            // TODO
        })
        .done(function(object) {
            me.selectedObjectDetailsReceived(object);
        });
    },

    unselectObject: function() {
        if(this.selectedObject) {
            this.objectLayers.removeAllFeatures();

            if(this.selectedClusterFeature) {
                dbkjs.selectControl.unselect(this.selectedClusterFeature);
            }
        }
        this.selectedObject = null;
        this.selectedClusterFeature = null;
    },

    selectedObjectDetailsReceived: function(object) {
        try {
            this.objectLayers.addFeaturesForObject(object);
            this.selectedObject = object;
        } catch(error) {
            console.log("Error creating layers for object", object);
            if(error.stack) {
                console.log(error.stack);
            }
        }
    }

};

