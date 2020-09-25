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

dbkjs.modules.safetymaps_creator = {
    id: "dbk.module.safetymaps_creator",
    viewerApiObjects: null,
    clusteringLayer: null,
    selectedObject: null,
    selectedClusterFeature: null,
    infoWindow: null,
    features:[],
    loading: null,

    register: function() {
        var me = this;

        this.options = $.extend({
            // default options here
            autoUpdateInterval: 5*1000*60,// every 5 min
            maxSearchResults: 30,
            mediaPath: "media/",
            showDbkToggleButton: false,
            apiPath: "api/",
            imagePath: "assets/"
        }, this.options);

        // Setup API
        safetymaps.creator.api.apiPath = this.options.apiPath;
        safetymaps.creator.api.basePath = "";
        safetymaps.creator.api.imagePath = "js/safetymaps/modules/creator/" + this.options.imagePath;
        safetymaps.creator.api.mediaPath = this.options.mediaPath;
        
        //register only if there is a scaleLevel set in the DB
        if (me.options.scaleLevel) {
            dbkjs.map.events.register('zoomend', dbkjs.map, function () {
                me.zoomChanged();
            });
        }
        
        // Setup clustering layer
        me.clusteringLayer = new safetymaps.ClusteringLayer({
            filterFunction: function(feature) {
                return me.hiddenTypes.indexOf(feature.attributes.type) === -1;
            }
        });
        $(me.clusteringLayer).on("object_cluster_selected", function(event, features) {
            me.clusterObjectClusterSelected(features);
        });
        $(me.clusteringLayer).on("object_selected", function(event, feature) {
            me.clusterObjectSelected(feature);
        });

        var layer = me.clusteringLayer.createLayer();
        dbkjs.map.addLayer(layer);
        dbkjs.selectControl.layers.push(layer);

        // multi select, otherwise cluster will be deselected when clicking anywhere
        // on the map
        if(!dbkjs.selectControl.multiselectlayers) {
            dbkjs.selectControl.multiselectlayers = [];
        }
        dbkjs.selectControl.multiselectlayers.push(layer);

        // Setup object details layers

        me.objectLayers = new safetymaps.creator.CreatorObjectLayers(dbkjs);
        dbkjs.map.addLayers(me.objectLayers.createLayers());

        $.each(me.objectLayers.selectLayers, function(i, l) {
            dbkjs.selectControl.layers.push(l);
            if(l.hover) dbkjs.hoverControl.layers.push(l);
            l.events.register("featureselected", me, me.objectLayerFeatureSelected);
            l.events.register("featureunselected", me, me.objectLayerFeatureUnselected);
        });
 
        //Set the clusteringLayer always on top so its always clickable (sometimes polygon areas are drawn over a dbk feature)
        //wait for event so all layers have been initialized
        $(dbkjs).one("dbkjs_init_complete", function(){
            dbkjs.map.raiseLayer(me.clusteringLayer.layer, dbkjs.map.layers.length);
            dbkjs.hoverControl.deactivate(); // deactivate is necessary here...
            dbkjs.hoverControl.activate();
            dbkjs.selectControl.deactivate(); // deactivate is necessary here...
            dbkjs.selectControl.activate(); 
        });
        
        me.loading = true;
        var pViewerObjects = safetymaps.creator.api.getViewerObjectMapOverview();
        var pStyles = safetymaps.creator.api.getStyles();

        $.when(pViewerObjects, pStyles)
        .always(function() {
            me.loading = false;
        })
        .fail(function(msg) {
            console.log("Error initializing SafetyMaps Creator module: " + msg);
        })
        .done(function(viewerObjects) {
            me.viewerApiObjectsLoaded(viewerObjects);
            me.addSearchConfig();
        });
        
        me.autoUpdate = window.setInterval(function () {
            var pViewerObjects = safetymaps.creator.api.getViewerObjectMapOverview();
            $.when(pViewerObjects)
                .always(function () {
                        me.loading = false;
                    })
                .fail(function (msg) {
                        console.log("Error initializing SafetyMaps Creator module: " + msg);
                    })
                .done(function (viewerObjects) {
                        me.viewerApiObjectsLoaded(viewerObjects);
                });
        }, me.options.autoUpdateInterval);
        
        // Setup user interface for object info window
       
        me.setupInterface();

        me.addFeatureProvider();

        // Listen for toggler events
        me.hiddenTypes = [];
        $(dbkjs).on("dbkjs_init_complete", function() {
            if(dbkjs.modules.toggler) {
                $(dbkjs.modules.toggler).on("button_change", function(e, button, active, config) {
                    me.togglerButtonChanged(button, active, config);
                });
            }
        });
    },

    togglerButtonChanged: function(button, active, config) {
        var me = this;
        if(typeof config.creatorType === "undefined") {
            return;
        }
        var i = me.hiddenTypes.indexOf(config.creatorType);
        if(active && i !== -1) {
            me.hiddenTypes.splice(i, 1);
        } else if(!active && i === -1) {
            me.hiddenTypes.push(config.creatorType);
        }
        console.log("Hidden object types: " + me.hiddenTypes);
        me.clusteringLayer.redraw();
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
            // TODO indien niets geselecteerd?
            safetymaps.infoWindow.showTab(me.infoWindow.getName(), "general", true);
        });

        me.infoWindow = safetymaps.infoWindow.addWindow("creator_object_info", "Object informatie");

        // Resize PDF embed div after width transition has ended
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
        
        if(me.options.extendedFloorButton){
            me.createExtendedFloorButton();
        }
        
        if(me.options.showDbkToggleButton){
            me.createDbkToggleButton();
        }
    },

    infoWindowTabsResize: function() {
        var view = this.infoWindow.getView();
        var tabContentHeight = view.find(".tab-content").height();

        view.find(".pdf-embed").css("height", tabContentHeight - 28);
    },

    viewerApiObjectsLoaded: function(data) {
        this.viewerApiObjects = data;

        this.features = safetymaps.creator.api.createViewerObjectFeatures(this.viewerApiObjects);
        this.clusteringLayer.addFeaturesToCluster(this.features);
        
    },

    addSearchConfig: function() {
        var me = this;

        var searchTabtext = me.options.searchTabText || i18n.t("creator.search");

        if(dbkjs.modules.search) {
            dbkjs.modules.search.addSearchConfig({
                tabContents: "<i class='fa fa-building'></i> " + searchTabtext,
                placeholder: i18n.t("creator.search_placeholder"),
                search: function(value) {
                    console.log("search object " + value);
                    var searchResults = [];
                    $.each(me.viewerApiObjects, function(i, o) {
                        value = value.toLowerCase();
                        if(value === "" || (o.formele_naam && o.formele_naam.toLowerCase().indexOf(value) !== -1) || (o.informele_naam && o.informele_naam.toLowerCase().indexOf(value) !== -1)) {
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

    addFeatureProvider: function() {
        var me = this;

        $(safetymaps).on("object_deselect", function() {
            me.unselectObject();
        });

        $(safetymaps).on("object_select", function(event, clusterFeature) {
            me.selectObjectById(clusterFeature.attributes.id, null, true);
        });

        $(dbkjs).one("dbkjs_init_complete", function() {
            if(dbkjs.modules.incidents && dbkjs.modules.incidents.featureSelector) {
                dbkjs.modules.incidents.featureSelector.addFeatureProvider({
                    getName: function() {
                        return "SafetyMaps Creator objects";
                    },
                    isLoading: function() {
                        return me.loading;
                    },
                    findIncidentMatches: function(matchHuisletter, matchToevoeging, x, y, postcode, huisnummer, huisletter, toevoeging, woonplaats, straat) {
                        return me.findIncidentMatches(matchHuisletter, matchToevoeging, x, y, postcode, huisnummer, huisletter, toevoeging, woonplaats, straat);
                    }
                });
            }
        });
    },

    findIncidentMatches: function(exactMatchHuisletter, exactMatchToevoeging, x, y, postcode, huisnummer, huisletter, toevoeging, woonplaats, straat) {
        var me = this;
        var matches = [];

        $.each(me.features, function(i, f) {

            var o = f.attributes.apiObject;
            var matchPostcode = o.postcode && o.postcode === postcode;
            var matchHuisnummer = o.huisnummer && o.huisnummer === huisnummer;
            var matchHuisletter = !exactMatchHuisletter || ((o.huisletter  || "") === huisletter);
            var matchToevoeging = !exactMatchToevoeging || ((o.toevoeging || "") === toevoeging);
            var matchWoonplaats = woonplaats && o.plaats && woonplaats === o.plaats;
            var matchStraat = straat && o.straatnaam && straat === o.straatnaam;

            if((matchPostcode || (matchWoonplaats && matchStraat)) && matchHuisnummer && matchHuisletter && matchToevoeging) {
                console.log("Creator object adres match", o);
                matches.push(f);
                return;
            }

            var continueAdressenSearch = true;
            $.each(o.selectieadressen || [], function(i, a) {
                var matchPostcode = a.pc && a.pc === postcode;
                var matchWoonplaats = a.pl && a.pl === woonplaats;
                var matchStraat = a.sn && a.sn === straat;


                if(matchPostcode || (matchWoonplaats && matchStraat) && a.nrs) {
                    console.log("Creator object check selectieadres nummers voor DBK " + o.informele_naam + ", " + a.pc + " " + a.pl);
                    $.each(a.nrs, function(j, n) {
                        var parts = n.split("|");
                        var matchHuisnummer = Number(parts[0]) === huisnummer;
                        var fHuisletter = parts.length > 1 ? parts[1] : "";
                        var fToevoeging = parts.length > 2 ? parts[2] : "";
                        var matchHuisletter = !exactMatchHuisletter || (fHuisletter === huisletter);
                        var matchToevoeging = !exactMatchToevoeging || (fToevoeging === toevoeging);

                        if(matchHuisnummer && matchHuisletter && matchToevoeging) {
                            console.log("Creator object match selectieadres op nummer " + n, o);
                            matches.push(f);
                            // No need to check additional addresses for this feature
                            continueAdressenSearch = false;
                            return false;
                        }
                    });
                }
                return continueAdressenSearch;
            });
            if(!continueAdressenSearch) {
                return;
            }

            // Naast o.clusterFeature.attributes.type "dbk" ook voor "evenement"

            if(x && y && f.attributes.selectionPolygon) {
                var point = new OpenLayers.Geometry.Point(x, y);

                $.each(o.clusterFeature.attributes.selectionPolygon.components, function(j, c) {
                    if(c.containsPoint(point)) {
                    console.log("Creator object " + f.attributes.type + " " + f.attributes.label + ": incident inside selectiekader");
                        matches.push(o.clusterFeature);
                    }
                });
            }
        });

        return matches;
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
        dbkjs.util.getModalPopup("creator_cluster_list").getView().scrollTop(0);

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
            label: feature.attributes.apiObject.formele_naam + (feature.attributes.apiObject.informele_naam ? " ("+feature.attributes.apiObject.informele_naam+")" : ""),
            id: feature.attributes.id,
            symbol: feature.attributes.symbol
        };
        var link = $(Mustache.render('<li class="object"><a id="{{id}}" href="#"><img src="{{symbol}}">{{label}}</a></li>', v));

        $(link).click(function () {
            dbkjs.util.getModalPopup("creator_cluster_list").hide();
            me.clusterObjectSelected(feature);
        });
        return $(link);
    },

    clusterObjectSelected: function(feature) {
        console.log("Select feature", feature);

        this.selectedClusterFeature = feature;
        this.selectObjectById(feature.attributes.id, feature.attributes.apiObject.extent);
    },

    selectObjectById: function(id, extent, isIncident /*ES2015 = false */) {
        isIncident = (typeof isIncident !== "undefined") ? isIncident : false;
        
        var me = this;
        var type = me.selectedClusterFeature.attributes.type;

        // Unselect current, if any
        me.unselectObject();

        // No extent when different floor is selected, do not zoom
        if(extent) {
            console.log("zooming to selected object at ", extent);

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
        $("#creator_object_info").text(i18n.t("dialogs.busyloading") + "...");
        safetymaps.creator.api.getObjectDetails(id)
        .fail(function(msg) {
            $("#creator_object_info").text("Error: " + msg);
        })
        .done(function(object) {
            object = $.extend({
                type: type
            }, object);
            me.selectedObjectDetailsReceived(object, isIncident);
        });
    },

    unselectObject: function() {
        if(this.selectedObject) {
            this.objectLayers.removeAllFeatures();

            if(this.selectedClusterFeature && this.selectedClusterFeature.layer) {
                dbkjs.selectControl.unselect(this.selectedClusterFeature);
            }
            $("#creator_object_info").text(i18n.t("dialogs.noinfo"));
        }
        this.selectedObject = null;
        this.selectedClusterFeature = null;
        // Check if called before initialized
        if(this.clusteringLayer) { 
            this.clusteringLayer.setSelectedIds([]);
        }
        $("#vectorclickpanel").hide();
        if(this.infoWindow) {
            // XXX called by VehicleIncidentsController even when module not
            // active. Should change to this module listening to event
            safetymaps.infoWindow.removeTabs(this.infoWindow.getName(), "info");
        }
    },

    selectedObjectDetailsReceived: function(object,isIncident /*ES2015 = false*/) {
        isIncident = (typeof isIncident !== "undefined") ? isIncident : false;
        var me = this;
        try {
            this.objectLayers.addFeaturesForObject(object);
            this.updateInfoWindow(object,isIncident);
            this.selectedObject = object;

            var ids = [object.id];
            $.each(object.verdiepingen || [], function(i, v) {
                ids.push(v.id);
            });
            this.clusteringLayer.setSelectedIds(ids);
                       
            $("#symbols tr").click(function(e){
                if(e.delegateTarget.children[2].innerText === ""){
                    return;
                }
                dbkjs.selectControl.unselectAll();
                var id  = e.delegateTarget.children[0].firstChild.id;
                var f = me.objectLayers.layerSymbols.getFeaturesByAttribute("index",/<id>(.*?)<\/id>/.exec(id)[1]);
                dbkjs.selectControl.select(f[0]);
            });
        } catch(error) {
            console.log("Error creating layers for object", object);
            if(error.stack) {
                console.log(error.stack);
            }
        }
    },

    updateInfoWindow: function(object,isIncident /*ES2015 = false*/) {
        isIncident = (typeof isIncident !== "undefined") ? isIncident : false;
        var me = this;
        
        safetymaps.creator.renderInfoTabs(object, this.infoWindow.getName());
        dbkjs.modules.vrh_objects.addLegendTrEventHandler("tab_danger_symbols", {
            "safetymaps_creatorDangerSymbolsId:" : me.objectLayers.layerDangerSymbols
        });
        dbkjs.modules.vrh_objects.addLegendTrEventHandler("tab_symbols", {
            "symbol" : me.objectLayers.layerSymbols
        }, "code");

        $("#tab_floors tr").click(function(e) {
            var v = object.verdiepingen[$(e.currentTarget).index()-1];
            console.log("Click floor index " + $(e.currentTarget).index(), v);
            if(v.id !== object.id) {
                me.selectObjectById(v.id);
            }
        });
        
        $("#floor-box tr").click(function(e) {
            me.floorVisible = me.infoWindow.visible;
            var v = object.verdiepingen[$(e.currentTarget).index()];
            console.log("Click floor index " + $(e.currentTarget).index(), v);
            if(v.id !== object.id) {
                me.selectObjectById(v.id,null,!me.floorVisible);
            }           
        });

        if(!isIncident) {
            safetymaps.infoWindow.showTab(me.infoWindow.getName(), "general", true);
        }
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
                    '<th style="width: 110px">' + i18n.t("creator.symbol_" + (f.coverage ? "" : "no_") + "communication_coverage") + '</th>' +
                    '<th>' + i18n.t("dialogs.information") + '</th>' +
                    '<th>' + i18n.t("creator.communication_alternative") + '</th>' +
                    '</tr>'
                    );
            var img = safetymaps.creator.api.imagePath + (f.coverage ? "coverage" : "no_coverage") + ".png";
            table.append(
                    '<tr><td><img src="' + img + '"></td>' +
                    '<td>' + Mustache.escape(f.info) + '</td>' +
                    '<td>' + Mustache.escape(f.alternative) + '</td>' +
                    '</tr>'
                    );
            me.showFeatureInfo(i18n.t("creator.symbols"), table);
        } else if(layer === me.objectLayers.layerSymbols) {
            console.log("symbol selected", e);

            var table = $('<table class="table table-hover"></table>');
            table.append('<tr><th style="width: 110px">' + i18n.t("symbol." + f.code) + '</th><th>' + i18n.t("dialogs.information") + '</th></tr>');
            var img = safetymaps.creator.api.imagePath + 'symbols/' + f.code + '.png';
            table.append(
                    '<tr><td><img src="' + img + '" alt="' + f.code + '" title="' + f.code + '"></td>' +
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
                '<td><img style="width: 100px" src="{{img}}" alt="{{symbolName}}" title="{{symbolName}}"></td>' +
                '<td style="width: 66px"><div class="gevicode">{{f.geviCode}}</div><div class="unnummer">{{f.unNr}}</div></td>' +
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

        } else if(layer === me.objectLayers.layerApproachRoutes) {
            console.log("approach route selected", e);
            var table = $('<table class="table table-hover"></table>');
            table.append('<tr><td>' + i18n.t("creator.approach_route_name") + '</th><th>' + i18n.t("dialogs.information") + '</th></tr>');
            table.append(Mustache.render('<tr><td>{{name}}</td><td>{{description}}</td></tr>', f));
            me.showFeatureInfo(i18n.t("creator.approach_route"), table);
        } else {
            console.log(layer.name + " feature selected", e);
            // Feature from layer that has no actual event for selecting but is
            // selectable for correct z-ordering of the layer: deselect feature immediately
            dbkjs.selectControl.unselect(e.feature);
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
    },

    addLegendTrEventHandler: function(tabId, layerByIdPrefix, attribute) {
        var me = this;

        $("#" + tabId + " tr").on("mouseover click", function(e) {

            // Find ID on the <img> element child of the tr
            // For rows with info, select only that feature: [idPrefix]_idx_[index]
            // For rows without info (only one row per code), select all features
            // with that code: [idPrefix]_code_[code]
            var img = $(e.currentTarget).find("img");
            var legendImgId = img ? img.attr("id") : null;

            if(legendImgId) {
                var selectFeatures = me.getLegendTrSelectFeatures(legendImgId, layerByIdPrefix, attribute);
                if(selectFeatures !== null) {
                    dbkjs.selectControl.unselectAll();

                    $.each(selectFeatures, function(i, feature) {
                        if(feature.getVisibility()) {
                            dbkjs.selectControl.select(feature);
                        }
                    });
                }
            }
        });
    },

    getLegendTrSelectFeatures: function(legendImgId, layerByIdPrefix, attributeSearch) {
        var prefix, id, layer;
        $.each(layerByIdPrefix, function(thePrefix, layerForPrefix) {
            if(legendImgId.startsWith(thePrefix)) {
                prefix = thePrefix;
                id = legendImgId.substring(prefix.length);
                layer = layerForPrefix;
            }
        });

        var selectFeatures;
        if(!id || !layer) {
            return null;
        } else if(prefix.endsWith(":")) {
            var idx = Number(id);
            selectFeatures = [layer.features[idx]];
        } else if(id.startsWith("_idx_")) {
            var idx = Number(id.substring("_idx_".length));
            selectFeatures = [layer.features[idx]];
        } else if(id.startsWith("_attr_")) {
            var code = id.substring("_attr_".length);
            selectFeatures = layer.features.filter(function(f) {
                return f.attributes[attributeSearch] === code;
            });
        }
        console.log("Features to select for layer " + layer.name + " for legend id " + legendImgId + ": ", selectFeatures.map(function(f) { return f.attributes[attributeSearch]; }));
        return selectFeatures;
    },
    
    zoomChanged: function(){
        var me = this;
        var scale = dbkjs.map.getScale();
        if(scale > me.options.scaleLevel){
            me.clusteringLayer.layer.setVisibility(false);
        }else {
            me.clusteringLayer.layer.setVisibility(true);
        }
    },
    
    createExtendedFloorButton: function(){
        var me = this;
        //floor button
        var a = $("<a/>")
                .attr("id", "floor-a")
                .attr("title", "Floor button")
                .addClass("btn btn-default olButton")
                .on("click", function () {
                    if (me.floorBox.is(":visible")) {
                        me.floorBox.hide();
                        me.floorTriangle.hide();
                    } else {
                        me.floorBox.show();
                        me.floorTriangle.show();
                    }
                });
        $("<img/>")
                .attr("src","images/warehouse.svg")
                .attr("style","style='position: relative; top: -3px'").appendTo(a);

        a.prependTo("#bottom_left_buttons");

        // floor window
        var floorBottom = $(window).height() - $("#floor-a").offset().top - $("#floor-a").outerHeight();
        me.floorTriangle = $("<div/>")
                .attr("id", "floor-triangle")
                .css("bottom", floorBottom + 4)
                .addClass("triangle-left")
                .appendTo("#map");
        me.floorBox = $("<div/>")
                .attr("id", "floor-box")
                .css("bottom", floorBottom - 32)
                .addClass("floor-box")
                .appendTo("#map");
        $("#floor-a").hide();


        $(dbkjs).on("foundFloors", function (evt, evtObj) {
            var obj = evtObj.rows;
            var currentFloor = evtObj.floor;
            $("#floor-a").show();
            $("#floor-triangle").show();
            $("#floor-box").show();
            $("#floor-box").empty();
                    
            var rows = [];
            $.each(obj, function(i, row) {
                if(i!==0){
                    rows.push([row[0]]);
                }
            });
            $("#floor-box").append(safetymaps.creator.createInfoTabDiv(rows));
        });

        $(dbkjs).on("foundNoFloors", function () {
            $("#floor-a").hide();
            $("#floor-triangle").hide();
            $("#floor-box").hide();
        });
        
        $(dbkjs).on("mapClicked", function () {
            $("#floor-triangle").hide();
            $("#floor-box").hide();
        });
        
    },
    
    createDbkToggleButton: function () {
        var me = this;
        var a = $("<a/>")
                .attr("id", "toggleDbk")
                .attr("title", "DBK button")
                .addClass("btn btn-default navbar-btn")
                .on("click", function () {
                    me.clusteringLayer.setVisibility(!me.clusteringLayer.getVisibility());
                });
        $("<img/>")
                .attr("src","images/building.svg")
                .attr("style","style='position: relative; width: 32px; top: -3px'").appendTo(a);
        
        a.prependTo("#btngrp_3");
    }

};

