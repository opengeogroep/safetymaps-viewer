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
            maxSearchResults: 30,
            mediaPath: "../media/",
            fotoPath: "../foto/"
        }, this.options);

        // Setup API

        safetymaps.creator.api.basePath = "";
        safetymaps.creator.api.imagePath = "js/safetymaps/modules/creator/assets/";
        safetymaps.creator.api.mediaPath = this.options.mediaPath;
        safetymaps.creator.api.fotoPath = this.options.fotoPath;
        
        //register only if there is a scaleLevel set in the DB
        if (me.options.scaleLevel) {
            dbkjs.map.events.register('zoomend', dbkjs.map, function () {
                me.zoomChanged();
            });
        }
        
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

        // Setup object details layers

        me.objectLayers = new safetymaps.creator.CreatorObjectLayers(dbkjs);
        dbkjs.map.addLayers(me.objectLayers.createLayers());

        dbkjs.hoverControl.deactivate();
        $.each(me.objectLayers.selectLayers, function(i, l) {
            dbkjs.selectControl.layers.push(l);
            if(l.hover) dbkjs.hoverControl.layers.push(l);
            l.events.register("featureselected", me, me.objectLayerFeatureSelected);
            l.events.register("featureunselected", me, me.objectLayerFeatureUnselected);
        });

        dbkjs.hoverControl.activate();
        dbkjs.selectControl.activate();

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
        });
               
        // Setup user interface for object info window
       
        me.setupInterface();

        me.addFeatureProvider();
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
        this.features = safetymaps.creator.api.createViewerObjectFeatures(this.viewerApiObjects);
        this.clusteringLayer.addFeaturesToCluster(this.features);
        
        this.addSearchConfig();
    },

    addSearchConfig: function() {
        var me = this;

        if(dbkjs.modules.search) {
            dbkjs.modules.search.addSearchConfig({
                tabContents: "<i class='fa fa-building'></i> " + i18n.t("creator.search"),
                placeholder: i18n.t("creator.search_placeholder"),
                search: function(value) {
                    console.log("search object " + value);
                    var searchResults = [];
                    $.each(me.viewerApiObjects, function(i, o) {
                        value = value.toLowerCase();
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
            var matchHuisletter = !exactMatchHuisletter || (o.huisletter === huisletter);
            var matchToevoeging = !exactMatchToevoeging || (o.toevoeging === toevoeging);
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
                    console.log("Creator object check selectieadres nummers voor DBK " + o.naam + ", " + a.pc + " " + a.pl);
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
            name: feature.attributes.apiObject.formele_naam+" ("+feature.attributes.apiObject.informele_naam+")",
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

        this.selectedClusterFeature = feature;
        this.selectObjectById(feature.attributes.id, feature.attributes.apiObject.extent);
    },

    selectObjectById: function(id, extent, isIncident /*ES2015 = false */) {
        isIncident = (typeof isIncident !== "undefined") ? isIncident : false;
        var me = this;

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
            
            //Set the clusteringLayer always on top so its always clickable (sometimes polygon areas are drawn over a dbk feature)
            dbkjs.map.raiseLayer(this.clusteringLayer.layer, dbkjs.map.layers.length);
            
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

        var div = $('<div class="tabbable"></div>');

        safetymaps.creator.renderInfoTabs(object, div);

        $("#creator_object_info").html(div);

        $("#tab_pane_floors tr").click(function(e) {
            var floor = e.currentTarget.firstChild.innerText.trim();
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
    },
    
    zoomChanged: function(){
        var me = this;
        var scale = dbkjs.map.getScale();
        if(scale > me.options.scaleLevel){
            me.clusteringLayer.layer.setVisibility(false);
        }else {
            me.clusteringLayer.layer.setVisibility(true);
        }
    }

};

