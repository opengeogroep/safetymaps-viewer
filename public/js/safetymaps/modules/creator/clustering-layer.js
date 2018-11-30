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

safetymaps.ClusteringLayer = function (options) {
    this.options = $.extend({
        name: 'Object cluster',
        clusterStrategy: {
            distance: 80,
            threshold: 3
        },
        clusteringSymbol: {
            icon: safetymaps.creator.api.imagePath + 'cluster.png',
            width: 51,
            height: 56
        },
        minLabelScale: 4000
    }, options);

    this.selectedIds = [];
};

safetymaps.ClusteringLayer.prototype.createLayer = function () {
    var me = this;
    me.layer = new OpenLayers.Layer.Vector(me.options.name, {
        rendererOptions: {
            zIndexing: true
        },
        strategies: [
            new OpenLayers.Strategy.Cluster(me.options.clusterStrategy)
        ],
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
                labelYOffset: "${myLabelYoffset}",
                labelOutlineColor: "white",
                labelOutlineWidth: 3,
                graphicOpacity: "${opacity}"
            }, {
                context: {
                    myIcon: function (feature) {
                        if (feature.cluster) {
                            return me.options.clusteringSymbol.icon;
                        } else {
                            return feature.attributes.symbol;
                        }
                    },
                    width: function (feature) {
                        if (feature.cluster) {
                            return me.options.clusteringSymbol.width;
                        } else {
                            return feature.attributes.width;
                        }
                    },
                    height: function (feature) {
                        if (feature.cluster) {
                            return me.options.clusteringSymbol.height;
                        } else {
                            return feature.attributes.height;
                        }
                    },
                    label: function (feature) {
                        if (feature.attributes.count) {
                            return feature.attributes.count;
                        } else if (feature.layer.map.getScale() > me.options.minLabelScale) {
                            return "";                        
                        } else if(me.selectedIds.indexOf(feature.attributes.id) !== -1) {
                            return "";
                        } else {
                            return feature.attributes.label || "";
                        }
                    },
                    myLabelYoffset: function (feature) {
                        if (feature.cluster) {
                            return -4;
                        } else {
                            return -20;
                        }
                    },
                    opacity: function(feature) {
                        if(feature.cluster) {
                            return 1;
                        }
                        if(me.selectedIds.indexOf(feature.attributes.id) !== -1) {
                            return 0.01;
                        }
                        return 1;
                    }

                }
            })
        })
    });
    me.layer.events.register("featureselected", me, me.selected);
    return me.layer;
};

safetymaps.ClusteringLayer.prototype.setSelectedIds = function(ids) {
    console.log("Selected object ids: ", ids);
    this.selectedIds = ids;
    this.layer.redraw();
};

/* XXX Apparently works as replace instead of add! */
safetymaps.ClusteringLayer.prototype.addFeaturesToCluster = function (features) {
    this.layer.addFeatures(features);
};

safetymaps.ClusteringLayer.prototype.selected = function (e) {
    if(e.feature.cluster) {
        console.log("object_cluster_selected", e.feature);
        $(this).triggerHandler("object_cluster_selected", e.feature);
    } else {
        console.log("object_selected", e.feature);
        $(this).triggerHandler("object_selected", e.feature);
    }
};
