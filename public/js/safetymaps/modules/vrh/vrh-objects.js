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
            dbk: true,
            evenementen: false,
            waterveiligheid: true
        }, this.options);

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

        // Setup details layers

        me.eventLayers = new safetymaps.vrh.EventLayers(dbkjs);
        dbkjs.map.addLayers(me.eventLayers.createLayers());
        dbkjs.hoverControl.deactivate();
        $.each(me.eventLayers.selectLayers, function(i, l) {
            dbkjs.selectControl.layers.push(l);
            if(l.hover) dbkjs.hoverControl.layers.push(l);
            l.events.register("featureselected", me, me.eventLayerFeatureSelected);
            l.events.register("featureunselected", me, me.eventLayerFeatureUnselected);
        });

        dbkjs.hoverControl.activate();
        dbkjs.selectControl.activate();
/*
        safetymaps.vrh.api.getDbks()
        .fail(function(msg) {
            dbkjs.util.alert("Fout", msg, "alert-danger");
        })
        .done(function(dbkObjects) {
            console.log("Got DBK objects", dbkObjects);

            dbkObjects.sort(function(lhs, rhs) {
                return lhs.naam.localeCompare(rhs.naam, dbkjsLang);
            });
            me.overviewObjects = me.overviewObjects.concat(dbkObjects);

            var features = safetymaps.vrh.api.createDbkFeatures(dbkObjects);
            me.clusteringLayer.addFeaturesToCluster(features);
        });
*/
        safetymaps.vrh.api.getEvenementen()
        .fail(function(msg) {
            dbkjs.util.alert("Fout", msg, "alert-danger");
        })
        .done(function(evenementenObjects) {
            console.log("Got event objects", evenementenObjects);

            evenementenObjects.sort(function(lhs, rhs) {
                return lhs.evnaam.localeCompare(rhs.evnaam, dbkjsLang);
            });
            me.overviewObjects = me.overviewObjects.concat(evenementenObjects);

            var features = safetymaps.vrh.api.createEvenementFeatures(evenementenObjects);
            me.clusteringLayer.addFeaturesToCluster(features);
        });

        // Setup user interface for object info window

        me.setupInterface();
    },

    setupInterface: function() {
        var me = this;

        // Element for displaying list of Creator objects in a cluster
        dbkjs.util.createModalPopup({name: "creator_cluster_list"}).getView().append($("<div></div>").attr({'id': 'creator_cluster_list'}));
/*
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

        });
        */
    },
/*
    infoWindowTabsResize: function() {
        var view = this.infoWindow.getView();
        var tabContentHeight = view.height() - view.find(".nav-pills").height();
        view.find(".tab-content").css("height", tabContentHeight);

        view.find(".pdf-embed").css("height", tabContentHeight - 28);
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
                        if(r.informele_naam && r.informele_naam.trim().length > 0 && r.informele_naam !== r.formele_naam) {
                            s += " (" + r.informele_naam + ")";
                        }
                        return s;
                    });
                },
                resultSelected: function(result) {
                    console.log("Search result selected", result);

                    me.selectObjectById(result.id, result.extent);
                }
            }, true);
        }
    },
*/
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
            name: feature.attributes.apiObject.naam,
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

    selectObjectById: function(type, id, extent, isIncident = false) {
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
            me.selectedObjectDetailsReceived(type, object, isIncident);
        });
    },

    unselectObject: function() {
        if(this.selectedObject) {
            this.eventLayers.removeAllFeatures();

            if(this.selectedClusterFeature && this.selectedClusterFeature.layer) {
                dbkjs.selectControl.unselect(this.selectedClusterFeature);
            }
        }
        this.selectedObject = null;
        this.selectedClusterFeature = null;
        this.clusteringLayer.setSelectedIds([]);
        $("#vectorclickpanel").hide();
    },

    selectedObjectDetailsReceived: function(type, object,isIncident = false) {
        try {
            this.eventLayers.addFeaturesForObject(object);
//            this.updateInfoWindow(object,isIncident);
            this.selectedObject = object;
/*
            var ids = [object.id];
            $.each(object.verdiepingen || [], function(i, v) {
                ids.push(v.id);
            });
            this.clusteringLayer.setSelectedIds(ids);
*/
        } catch(error) {
            console.log("Error creating layers for object", object);
            if(error.stack) {
                console.log(error.stack);
            }
        }
    }
/*
    updateInfoWindow: function(object,isIncident = false) {
        var me = this;

        var div = $('<div class="tabbable"></div>');

        safetymaps.creator.renderInfoTabs(object, div);

        $("#creator_object_info").html(div);

        $("#tab_pane_floors tr").click(function(e) {
            var floor = e.currentTarget.firstChild.innerText;
            console.log("click floor " + floor, e);

            $.each(object.verdiepingen, function(i, v) {
                if(v.id !== object.id && v.bouwlaag === floor) {
                    me.selectObjectById(v.id);
                }
            });
        });

        if(!isIncident)this.infoWindow.show();
        this.infoWindowTabsResize();

    },

    objectLayerFeatureSelected: function(e) {
        var me = this;
        var layer = e.feature.layer;
        var f = e.feature.attributes;
        if (layer === me.objectLayers.layerCustomPolygon) {
            if(f.style.en === "Area"){
                console.log("Area selected, do nothing");
                layer.redraw();
                return;
            }
            console.log("CustomPolygon feature selected", e);
            var table = $('<table class="table table-hover"></table>');
            table.append('<tr><th style="width: 10%"></th><th>' + i18n.t("dialogs.information") + '</th></tr>');
            var desc = f.style.en;
            if(f.style.hasOwnProperty(dbkjsLang)) {
                if(f.style[dbkjsLang] !== "") {
                    desc = f.style[dbkjsLang];
                }
            }
            table.append(
                    '<tr><td bgcolor="'+f.style.color+'"></td>' +
                    '<td>' + desc + '</td>' +
                    '</tr>'
                    );
            me.showFeatureInfo(i18n.t("creator.area"), table);
            layer.redraw();
        } else if (layer === me.objectLayers.layerFireCompartmentation) {
            console.log("FireCompartmentation feature selected", e);
            var table = $('<table class="table table-hover"></table>');
            table.append('<tr><th>' + i18n.t("dialogs.information") + '</th></tr>');
            var desc = f.style.en;
            if(f.style.hasOwnProperty(dbkjsLang)) {
                if(f.style[dbkjsLang] !== "") {
                    desc = f.style[dbkjsLang];
                }
            }
            table.append('<tr><td>' + desc + '</td></tr>');
            me.showFeatureInfo(i18n.t("creator.fire_compartment"), table);
        } else if (layer === me.objectLayers.layerCommunicationCoverage) {
            console.log("communication feature selected", e);

            var table = $('<table class="table table-hover"></table>');

            table.append('<tr>' +
                    '<th style="width: 30%">' + i18n.t("creator.symbol_" + (f.coverage ? "" : "no_") + "communication_coverage") + '</th>' +
                    '<th>' + i18n.t("dialogs.information") + '</th>' +
                    '<th>' + i18n.t("creator.communication_alternative") + '</th>' +
                    '</tr>'
                    );
            var img = safetymaps.creator.api.imagePath + (f.coverage ? "coverage" : "no_coverage") + ".png";
            table.append(
                    '<tr><td><img class="thumb" src="' + img + '"></td>' +
                    '<td>' + Mustache.escape(f.info) + '</td>' +
                    '<td>' + Mustache.escape(f.alternative) + '</td>' +
                    '</tr>'
                    );
            me.showFeatureInfo(i18n.t("creator.symbols"), table);
        } else if(layer === me.objectLayers.layerSymbols) {
            console.log("symbol selected", e);

            var table = $('<table class="table table-hover"></table>');
            table.append('<tr><th style="width: 30%">' + i18n.t("symbol." + f.code) + '</th><th>' + i18n.t("dialogs.information") + '</th></tr>');
            var img = safetymaps.creator.api.imagePath + 'symbols/' + f.code + '.png';
            table.append(
                    '<tr><td><img class="thumb" src="' + img + '" alt="' + f.code + '" title="' + f.code + '"></td>' +
                    '<td>' + Mustache.escape(f.description) + '</td></tr>'
            );
            me.showFeatureInfo(i18n.t("creator.symbols"), table);
        } else if(layer === me.objectLayers.layerDangerSymbols) {
            console.log("danger symbol selected", e);

            var table = $('<table class="table table-hover"></table>');
            table.append('<tr>' +
                    '<th>' + i18n.t("creator.danger_symbol_icon") + '</th>' +
                    '<th>' + i18n.t("creator.danger_symbol_hazard_identifier") + '</th>' +
                    '<th>' + i18n.t("creator.danger_symbol_name") + '</th>' +
                    '<th>' + i18n.t("creator.danger_symbol_quantity") + '</th>' +
                    '<th>' + i18n.t("creator.danger_symbol_information") + '</th>' +
                    '</tr>'
            );

            table.append(Mustache.render('<tr>' +
                '<td><img style="width: 20%" src="{{img}}" alt="{{symbolName}}" title="{{symbolName}}"></td>' +
                '<td><div class="gevicode">{{f.geviCode}}</div><div class="unnummer">{{f.unNr}}</div></td>' +
                '<td>{{f.substance_name}}</td>' +
                '<td>{{f.amount}}</td>' +
                '<td>{{f.description}}</td>' +
                '</tr>',
                {
                    img: safetymaps.creator.api.imagePath + 'danger_symbols/' + f.symbol + '.png',
                    symbolName: i18n.t("creator.danger_symbol_" + f.symbol),
                    f: f
            }));
            me.showFeatureInfo(i18n.t("creator.danger_symbols"), table);

        } else {
            console.log(layer.name + " feature selected", e);
        }
    },

    showFeatureInfo: function(title, content) {
        $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle">&nbsp;' + title + '</span>');
        var html = $('<div class="table-responsive"></div>');
        html.append(content);
        $('#vectorclickpanel_b').html('').append(html);
        $('#vectorclickpanel').show();
    },

    objectLayerFeatureUnselected: function (e) {
        $("#vectorclickpanel").hide();
        if (e.feature.layer === this.objectLayers.layerCustomPolygon) {
            e.feature.layer.redraw();
        }
    }*/
};

