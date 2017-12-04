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

 /* global safetymaps, dbkjs */

 dbkjs.modules.safetymaps_creator = {
    id: "dbk.module.safetymaps_creator",
    viewerApiObjects: null,
    selectedObject: null,

    register: function() {
        var me = this;

        this.options = $.extend({
            // default options here
        }, this.options);

        // Setup API
        safetymaps.creator.api.basePath = "";
        safetymaps.creator.api.imagePath = "js/safetymaps/modules/creator";

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

        //me.objectLayers = new safetymaps.CreatorObjectLayers();
        //var layers = me.objectLayers.createLayers();
        // add all to map

        safetymaps.creator.api.getViewerObjectMapOverview()
        .fail(function(msg) {
            // TODO
        })
        .done(function(data) {
            me.viewerApiObjectsLoaded(data);
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

        } else {
        }
    },

    selectedObjectDetailsReceived: function(object) {
    }

};

