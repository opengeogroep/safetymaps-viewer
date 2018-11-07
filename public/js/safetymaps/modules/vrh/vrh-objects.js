/*
 *  Copyright (c) 2018 B3Partners (info@b3partners.nl)
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

dbkjs.modules.vrh_objects = {
    id: "dbk.module.vrh_objects",
    clusteringLayer: null,
    selectedObject: null,
    selectedClusterFeature: null,
    infoWindow: null,
    overviewObjects: null,
    features:[],

    register: function() {
        var me = this;

        this.overviewObjects = [];

        // XXX
        safetymaps.creator.api.imagePath = "js/safetymaps/modules/creator/assets/";        

        this.options = $.extend({
            // default options here
            maxSearchResults: 30,
            dbks: false,
            evenementen: true,
            waterveiligheid: true,
            filterEvDate: true
        }/*, this.options*/);

        if("off" === OpenLayers.Util.getParameters()["evfilter"]) {
            this.options.filterEvDate = false;
        }

        if("on" === OpenLayers.Util.getParameters()["dbks"]) {
            this.options.dbks = true;
        }

        // Setup API

//        safetymaps.creator.api.basePath = "";
//        safetymaps.creator.api.imagePath = "js/safetymaps/modules/creator/assets/";
//        safetymaps.creator.api.mediaPath = "../media/";

        // Setup clustering layer

        me.clusteringLayer = new safetymaps.ClusteringLayer();
        $(me.clusteringLayer).on("object_cluster_selected", function(event, features) {
            me.clusterObjectClusterSelected(features);
        });
        $(me.clusteringLayer).on("object_selected", function(event, feature) {
            me.clusterObjectSelected(feature);
        });

        dbkjs.hoverControl.deactivate();
        dbkjs.selectControl.deactivate();

        var layer = me.clusteringLayer.createLayer();
        dbkjs.map.addLayer(layer);
        dbkjs.selectControl.layers.push(layer);

        // multi select, otherwise cluster will be deselected when clicking anywhere
        // on the map
        if(!dbkjs.selectControl.multiselectlayers) {
            dbkjs.selectControl.multiselectlayers = [];
        }
        dbkjs.selectControl.multiselectlayers.push(layer);

        // Setup details layers

        me.events = new safetymaps.vrh.Events(this.options);

        me.dbks = new safetymaps.vrh.Dbks(this.options);

        dbkjs.hoverControl.activate();
        dbkjs.selectControl.activate();

        // XXX move to safetymaps.vrh.Dbks.init()
        if(me.options.dbks) {
            safetymaps.vrh.api.getDbks()
            .fail(function(msg) {
                dbkjs.util.alert("Fout", msg, "alert-danger");
            })
            .done(function(dbkObjects) {
                console.log("Got DBK objects", dbkObjects);

                dbkObjects.sort(function(lhs, rhs) {
                    if(!lhs.naam || !rhs.naam) console.log("err", lhs, rhs);
                    return lhs.naam.localeCompare(rhs.naam, dbkjsLang);
                });
                me.overviewObjects = me.overviewObjects.concat(dbkObjects);

                me.features = me.features.concat(safetymaps.vrh.api.createDbkFeatures(dbkObjects));
                me.clusteringLayer.addFeaturesToCluster(me.features);
            });
        }

        // XXX move to safetymaps.vrh.Events.init()
        if(this.options.evenementen) {
            safetymaps.vrh.api.getEvenementen()
            .fail(function(msg) {
                dbkjs.util.alert("Fout", msg, "alert-danger");
            })
            .done(function(evenementenObjects) {
                console.log("Got event objects", evenementenObjects);

                if(me.options.filterEvDate) {
                    evenementenObjects = evenementenObjects.filter(function(ev) {
                        return !new moment(ev.sbegin).isAfter(new moment());
                    });
                }
                evenementenObjects.sort(function(lhs, rhs) {
                    return lhs.evnaam.localeCompare(rhs.evnaam, dbkjsLang);
                });
                me.overviewObjects = me.overviewObjects.concat(evenementenObjects);

                me.features = me.features.concat(safetymaps.vrh.api.createEvenementFeatures(evenementenObjects));
                me.clusteringLayer.addFeaturesToCluster(me.features);
            });
        }

        // Setup user interface for object info window

        me.setupInterface();

        me.createSearchConfig();
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
        me.infoWindow = new SplitScreenWindow("Object info");
        me.infoWindow.createElements();

        me.infoWindow.getView().append(
                $('<div></div>')
                .attr({'id': 'vrh_object_info'})
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
        });
    },

    infoWindowTabsResize: function() {
        var view = this.infoWindow.getView();
        var tabContentHeight = view.height() - view.find(".nav-pills").height();
        view.find(".tab-content").css("height", tabContentHeight);
    },

    createSearchConfig: function() {
        var me = this;

        // XXX move to safetymaps.vrh.Events.init()
        if(dbkjs.modules.search && me.options.evenementen) {
            dbkjs.modules.search.addSearchConfig({
                tabContents: "<i class='fa fa-calendar'></i> Evenementen",
                placeholder: i18n.t("creator.search_placeholder"),
                search: function(value) {
                    console.log("search event " + value);
                    var searchResults = [];
                    $.each(me.overviewObjects, function(i, o) {
                        if(o.clusterFeature.attributes.type === "evenement") {
                            if(value === "" || o.evnaam.toLowerCase().indexOf(value) !== -1) {
                                searchResults.push(o);
                                if(searchResults.length === me.options.maxSearchResults) {
                                    return false;
                                }
                            }
                        }
                    });
                    dbkjs.modules.search.showResults(searchResults, function(r) {
                        return r.evnaam;
                    });
                },
                resultSelected: function(result) {
                    console.log("Search result selected", result);

                    me.selectObjectById("evenement",result.evnaam, result.extent);
                }
            }, true);
        }

        // XXX move to safetymaps.vrh.Dbks.init()
        if(dbkjs.modules.search && me.options.dbks) {
            dbkjs.modules.search.addSearchConfig({
                tabContents: "<i class='fa fa-building'></i> DBK's",
                placeholder: i18n.t("creator.search_placeholder"),
                search: function(value) {
                    console.log("search dbk " + value);
                    var searchResults = [];
                    $.each(me.overviewObjects, function(i, o) {
                        if(o.clusterFeature.attributes.type === "dbk") {
                            var searchVal = o.naam + " " + o.oms_nummer + " " + o.postcode + " " + o.straatnaam + " " + o.huisnummer + " " + o.plaats;
                            if(value === "" || searchVal.toLowerCase().indexOf(value) !== -1) {
                                searchResults.push(o);
                                if(searchResults.length === me.options.maxSearchResults) {
                                    return false;
                                }
                            }
                        }
                    });
                    dbkjs.modules.search.showResults(searchResults, function(r) {
                        var adres = (r.straatnaam || "")
                                + (r.huisnummer ? " " + r.huisnummer : "")
                                + (r.huisletter || "")
                                + (r.toevoeging ? " " + r.toevoeging : "")
                                + (r.plaats ? ", " + r.plaats : "");
                        return r.naam 
                                + (r.oms_nummer ? " (OMS " + r.oms_nummer + ")" : "")
                                + (adres.trim().length > 0 ? ", " + adres : "");
                    });
                },
                resultSelected: function(result) {
                    console.log("Search result selected", result);

                    me.selectObjectById("dbk", result.id, result.extent);
                }
            }, true);
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
            name: feature.attributes.apiObject.naam ? feature.attributes.apiObject.naam : feature.attributes.apiObject.evnaam,
            oms: feature.attributes.apiObject.oms_nummer,
            id: feature.attributes.apiObject.id
        };
        var link = $(Mustache.render('<li><a id="{{id}}" href="#">{{name}}{{#oms}} (OMS: {{oms}}){{/oms}}</a></li>', v));
        $(link).click(function () {
            dbkjs.util.getModalPopup("creator_cluster_list").hide();
            me.clusterObjectSelected(feature);
        });
        return $(link);
    },

    clusterObjectSelected: function(feature) {
        console.log("Select feature", feature);

        this.selectedClusterFeature = feature;
        this.selectObjectById(feature.attributes.type, feature.attributes.id, feature.attributes.apiObject.extent);
    },

    selectObjectById: function(type, id, extent, isIncident) {
        var me = this;

        // Unselect current, if any
        me.unselectObject();

        // No extent when different floor is selected, do not zoom
        if(extent) {
            console.log("zooming to selected " + type + " object at ", extent);

            // Parse "BOX(n n,n n)" to array of left, bottom, top, right
            var bounds = extent.match(/[0-9. ,]+/)[0].split(/[ ,]/);
            bounds = new OpenLayers.Bounds(bounds);

            if(dbkjs.options.objectZoomExtentScale) {
                bounds = bounds.scale(dbkjs.options.objectZoomExtentScale);
            } else if(dbkjs.options.objectZoomExtentBuffer) {
                bounds = bounds.toArray();
                bounds[0] -= dbkjs.options.objectZoomExtentBuffer;
                bounds[1] -= dbkjs.options.objectZoomExtentBuffer;
                bounds[2] += dbkjs.options.objectZoomExtentBuffer;
                bounds[3] += dbkjs.options.objectZoomExtentBuffer;
            }

            dbkjs.map.zoomToExtent(bounds, true);
        }

        // Get object details
        //$("#creator_object_info").text(i18n.t("dialogs.busyloading") + "...");
        safetymaps.vrh.api.getObjectDetails(type, id)
        .fail(function(msg) {
            //$("#creator_object_info").text("Error: " + msg);
        })
        .done(function(object) {
            me.selectedObjectDetailsReceived(type, id, object, isIncident);
        });
    },

    unselectObject: function() {
        if(this.selectedObject) {
            this.events.removeAllFeatures();
            this.dbks.removeAllFeatures();

            if(this.selectedClusterFeature && this.selectedClusterFeature.layer) {
                dbkjs.selectControl.unselect(this.selectedClusterFeature);
            }
        }
        this.selectedObject = null;
        this.selectedClusterFeature = null;
        this.clusteringLayer.setSelectedIds([]);
        $("#vectorclickpanel").hide();
    },

    selectedObjectDetailsReceived: function(type, id, object, isIncident) {
        try {
            var tab = $("#vrh_object_info");
            if(type === "evenement") {
                this.events.addFeaturesForObject(object);
                this.events.updateInfoWindow(tab, object);
            } else if(type === "dbk") {
                this.dbks.addFeaturesForObject(object);
                this.dbks.updateInfoWindow(tab, object);
            }
            if(!isIncident) {
                this.infoWindow.show();
            }
            this.infoWindowTabsResize();

            this.selectedObject = object;
            this.clusteringLayer.setSelectedIds([id]);
        } catch(error) {
            console.log("Error creating layers for object", object);
            if(error.stack) {
                console.log(error.stack);
            }
        }
    },

    showFeatureInfo: function(title, label, description) {
        $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle">&nbsp;' + title + '</span>');
        var html = $('<div class="table-responsive"></div>');
        var table = $('<table class="table table-hover"></table>');
        table.append('<tr><th style="width: 20%">Soort</th><th>' + i18n.t("dialogs.information") + '</th></tr>');
        table.append('<tr><td>' + label + '</td><td>' + (description || "") + '</td></tr>');
        html.append(table);
        $('#vectorclickpanel_b').html('').append(html);
        $('#vectorclickpanel').show();
    },

    objectLayerFeatureUnselected: function (e) {
        $("#vectorclickpanel").hide();
    }
};

