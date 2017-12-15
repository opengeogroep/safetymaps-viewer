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

/* global safetymaps, dbkjs, OpenLayers, i18n, Mustache, PDFObject */

dbkjs.modules.safetymaps_creator = {
    id: "dbk.module.safetymaps_creator",
    viewerApiObjects: null,
    selectedObject: null,
    selectedClusterFeature: null,
    infoWindow: null,

    register: function() {
        var me = this;

        this.options = $.extend({
            // default options here
            maxSearchResults: 30
        }, this.options);

        // Setup API

        safetymaps.creator.api.basePath = "";
        safetymaps.creator.api.imagePath = "js/safetymaps/modules/creator/assets/";
        safetymaps.creator.api.mediaPath = "media/";

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

        // Setup user interface for object info window

        me.setupInterface();
    },

    setupInterface: function() {
        var me = this;

        // Element for displaying list of Creator objects in a cluster
        dbkjs.util.createModalPopup({name: "creator_cluster_list"}).getView().append($("<div></div>").attr({'id': 'creator_cluster_list'}));

        // Button to open info window
        $("#btngrp_object").append($('<a id="btn_object_info" href="#" class="btn navbar-btn btn-default"><i class="fa fa-info-circle"></i></a>'));
        $("#btn_object_info")
        .attr("title", i18n.t("creator.button"))
        .click(function() {
            me.infoWindow.toggle();
        });

        // Window for object info tabs
        me.infoWindow = new SplitScreenWindow("Creator object info");
        me.infoWindow.createElements();

        me.infoWindow.getView().append(
                $('<div></div>')
                .attr({'id': 'creator_object_info'})
                .text(i18n.t("dialogs.noinfo"))
        );

        // Put tabs at the bottom after width transition has ended
        var resizeFunction = function() {
            me.infoWindowTabsResize();
        };
        $(window).resize(resizeFunction);

        $(me.infoWindow).on("show", function() {
            var event = dbkjs.util.getTransitionEvent();
            if(event) {
                me.infoWindow.getView().parent().on(event, resizeFunction);
            } else {
                resizeFunction();
            }

            $.each(me.infoWindow.getView().find(".pdf-embed"), function(i, pdf) {
                if(pdf.children.length === 0) {
                    console.log("embedding PDF " + $(pdf).attr("data-url"));
                    // Add cache buster to avoid unexpected server response (206) on iOS 10 safari webapp
                    PDFObject.embed($(pdf).attr("data-url") + "?t=" + new Date().getTime(), pdf, {
                        // Use custom built pdf.js with src/core/network.js function
                        // PDFNetworkStreamFullRequestReader_validateRangeRequestCapabilities
                        // always returning false to also avoid 206 error
                        PDFJS_URL: "js/libs/pdfjs-1.6.210-disablerange-minified/web/viewer.html",
                        forcePDFJS: !!dbkjs.options.forcePDFJS  /* XXX move to module options */
                    });
                    // Remove buttons from PDFJS toolbar
                    // XXX hack, use PDFJS documentloaded event?
                    function removeToolbar() {
                        var iframe = $("iframe").contents();
                        if(iframe.find("#download")[0] || iframe.find("#secondaryDownload")[0] ) {
                            console.log("found PDFJS toolbar buttons, removing");
                            iframe.find("#download").remove();
                            iframe.find("#openFile").remove();
                            iframe.find("#print").remove();
                            iframe.find("#secondaryDownload").remove();
                            iframe.find("#secondaryOpenFile").remove();
                            iframe.find("#secondaryPrint").remove();
                        } else {
                            console.log("PDFJS toolbar not found, waiting")
                            window.setTimeout(removeToolbar, 500);
                        }
                    }
                    //this check is needed. If the program is not using PDFJS then we can't remove buttons.
                    if(PDFObject.supportsPDFs || dbkjs.options.forcePDFJS ){
                        removeToolbar();
                    }
                }
            });
        });
    },

    infoWindowTabsResize: function() {
        var view = this.infoWindow.getView();
        var tabContentHeight = view.height() - view.find(".nav-pills").height();
        view.find(".tab-content").css("height", tabContentHeight);

        view.find(".pdf-embed").css("height", tabContentHeight - 28);
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
                            if(searchResults.length === me.options.maxSearchResults) {
                                return false;
                            }
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

                    me.clusterObjectSelected(result.clusterFeature);
                }
            });
        }
    },

    clusterObjectClusterSelected: function (feature) {
        console.log("show selection list", feature);

        var me = this;
        me.currentCluster = feature.cluster.slice();

        $("#creator_cluster_list").empty();
        var item_ul = $('<ul class="nav nav-pills nav-stacked"></ul>');
        for (var i = 0; i < me.currentCluster.length; i++) {
            item_ul.append(me.getClusterLink(me.currentCluster[i]));
        }
        $("#creator_cluster_list").append(item_ul);

        dbkjs.util.getModalPopup("creator_cluster_list").setHideCallback(function () {
            if (me.clusteringLayer.layer.selectedFeatures.length === 0) {
                return;
            }
            for (var i = 0; i < me.clusteringLayer.layer.features.length; i++) {
                dbkjs.selectControl.unselect(me.clusteringLayer.layer.features[i]);
            }
        });
        dbkjs.util.getModalPopup("creator_cluster_list").show();
    },

    getClusterLink: function (feature) {
        var me = this;
        var v = {
            name: feature.attributes.apiObject.formele_naam,
            id: feature.attributes.apiObject.id
        };
        var link = $(Mustache.render('<li><a id="{{id}}" href="#">{{name}}</a></li>', v));
        $(link).click(function () {
            dbkjs.util.getModalPopup("creator_cluster_list").hide();
            me.clusterObjectSelected(feature);
        });
        return $(link);
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
        $("#creator_object_info").text(i18n.t("dialogs.busyloading") + "...");
        safetymaps.creator.api.getObjectDetails(feature.attributes.id)
        .fail(function(msg) {
            $("#creator_object_info").text("Error: " + msg);
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
            this.updateInfoWindow(object);
            this.selectedObject = object;
        } catch(error) {
            console.log("Error creating layers for object", object);
            if(error.stack) {
                console.log(error.stack);
            }
        }
    },

    updateInfoWindow: function(object) {
        var div = $('<div class="tabbable"></div>');

        safetymaps.creator.renderInfoTabs(object, div);

        $("#creator_object_info").html(div);

        this.infoWindow.show();
        this.infoWindowTabsResize();
    }
};

