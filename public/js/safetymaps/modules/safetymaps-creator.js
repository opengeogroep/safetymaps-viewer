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

/* global safetymaps, dbkjs, OpenLayers, i18n, Mustache */

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

        // multi select, otherwise cluster will be deselected when clicking anywhere
        // on the map
        if(!dbkjs.selectControl.multiselectlayers) {
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

        this.viewerApiObjects.sort(function(lhs, rhs) {
            return lhs.formele_naam.localeCompare(rhs.formele_naam, dbkjsLang);
        });
        var features = safetymaps.creator.api.createViewerObjectFeatures(this.viewerApiObjects);
        this.clusteringLayer.addFeaturesToCluster(features);

        this.createSearchConfig();
    },

    createSearchConfig: function() {
        var me = this;

        if(dbkjs.modules.search) {
            dbkjs.modules.search.addSearchConfig({
                tabContents: "<i class='fa fa-building'></i> " + i18n.t("creator.search"),
                placeholder: i18n.t("creator.search_placeholder"),
                search: function(value) {
                    console.log("search object " + value);
                    var searchResults = [];
                    $.each(me.viewerApiObjects, function(i, o) {
                        if(value === "" || o.formele_naam.toLowerCase().indexOf(value) !== -1 || (o.informele_naam && o.informele_naam.toLowerCase().indexOf(value) !== -1)) {
                            searchResults.push(o);
                        }
                    });
                    dbkjs.modules.search.showResults(searchResults, function(r) {
                        var s = r.formele_naam;
                        if(r.informele_naam && r.informele_naam !== r.formele_naam) {
                            s += " (" + r.informele_naam + ")";
                        }
                        return s;
                    });
                },
                resultSelected: function(result) {
                    console.log("Search result selected", result);

                    dbkjs.selectControl.select(result.clusterFeature);
                }
            });
        }
    },

    clusterObjectClusterSelected: function (feature) {
        console.log("show selection list", feature);

        var me = this;
        me.currentCluster = feature.cluster.slice();

        $('#infopanel_b').empty();
        var item_ul = $('<ul id="dbklist" class="nav nav-pills nav-stacked"></ul>');
        for (var i = 0; i < me.currentCluster.length; i++) {
            item_ul.append(me.getClusterLink(me.currentCluster[i]));
        }
        dbkjs.gui.infoPanelAddItems(item_ul);

        dbkjs.util.getModalPopup('infopanel').setHideCallback(function () {
            if (me.clusteringLayer.layer.selectedFeatures.length === 0) {
                return;
            }
            for (var i = 0; i < me.clusteringLayer.layer.features.length; i++) {
                dbkjs.selectControl.unselect(me.clusteringLayer.layer.features[i]);
            }
        });
        dbkjs.util.getModalPopup('infopanel').show();
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

            if(this.selectedClusterFeature.layer) {
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
    },

    getClusterLink: function (feature) {
        var me = this;
        var v = {
            name: feature.attributes.apiObject.formele_naam,
            id: feature.attributes.apiObject.id
        };
        var link = $(Mustache.render('<li><a id="{{id}}" href="#">{{name}}</a></li>', v));
        $(link).click(function () {
            dbkjs.util.getModalPopup('infopanel').hide();
            me.clusterObjectSelected(feature);
        });
        return $(link);
    }
};

