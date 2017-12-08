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
 * OpenLayers2 layer for clustering SafetyMaps Creator objects.
 *
 * Events:
 * - object_cluster_selected (argument: array of features in cluster) (TODO)
 * - object_selected (argument: feature)
 *
 */

 /* global safetymaps, OpenLayers */

var safetymaps = safetymaps || {};

safetymaps.ClusteringLayer = function(options) {
    this.options = $.extend({
        name: 'Object cluster',
        clusteringSymbol: {
            icon: safetymaps.creator.api.imagePath + 'cluster.png',
            width: 51,
            height: 56
        },
        objectSymbol: {
            icon: safetymaps.creator.api.imagePath + 'object.png',
            width: 23,
            height: 40
        },
        minLabelScale: 4000
    }, options); 
};

safetymaps.ClusteringLayer.prototype.createLayer = function() {
    var me = this;
    me.layer = new OpenLayers.Layer.Vector(me.options.name, {
        rendererOptions: {
            zIndexing: true
        },
        options: {
        },
        styleMap: new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({
                cursor: "pointer",
                externalGraphic: "${myIcon}",
                graphicWidth: "${width}",
                graphicHeight: "${height}",
                label: "${label}",
                fontColor: "black",
                fontSize: "12px",
                fontWeight: "bold",
                labelYOffset: -20,
                labelOutlineColor: "white",
                labelOutlineWidth: 3
            }, {
                context: {
                    myIcon: function(feature){
                        if(feature.cluster){
                            return me.options.clusteringSymbol.icon;
                        }else{
                            return me.options.objectSymbol.icon;
                        };
                    },
                    width: function(feature){
                        if(feature.cluster){
                            return me.options.clusteringSymbol.width;
                        }else{
                            return me.options.objectSymbol.width;
                        };
                    },
                    height: function(feature){
                        if(feature.cluster){
                            return me.options.clusteringSymbol.height;
                        }else{
                            return me.options.objectSymbol.height;
                        };
                    },
                    label: function(feature) {
                        if(feature.layer.map.getScale() > me.options.minLabelScale) {
                            return "";
                        } else {
                            return feature.attributes.label || "";
                        }
                    }
                }
            }),
            'temporary': new OpenLayers.Style({pointRadius: 20})
        })
    });
    me.layer.events.register("featureselected", me, me.selected);
    return me.layer;
};

safetymaps.ClusteringLayer.prototype.addFeaturesToCluster = function(features) {
    this.layer.addFeatures(features);
};

safetymaps.ClusteringLayer.prototype.selected = function(e) {

    console.log("object_selected", e.feature);
    $(this).triggerHandler("object_selected", e.feature);
};
