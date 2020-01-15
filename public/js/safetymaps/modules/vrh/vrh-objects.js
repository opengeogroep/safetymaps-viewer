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

dbkjs.modules.vrh_objects = {
    id: "dbk.module.vrh_objects",
    clusteringLayer: null,
    selectedObject: null,
    selectedClusterFeature: null,
    infoWindow: null,
    overviewObjects: null,
    features:[],
    newDbSchema: false,

    register: function() {
        var me = this;

        this.overviewObjects = [];

        this.newDbSchema = OpenLayers.Util.getParameters()["newDbSchema"] === "true";

        // XXX
        safetymaps.creator.api.imagePath = "js/safetymaps/modules/creator/assets/";        

        this.options = $.extend({
            // default options here
            maxSearchResults: 30,
            dbks: true,
            evenementen: true,
            waterongevallen: true,
            evFilter: "huidig",
            evFilterShowDaysBeforeBegin: 3,
            evFilterShowDaysAfterBegin: 3
        }, this.options);
        this.options.options = dbkjs.options;
        this.options.map = dbkjs.map;

        var evfilter = OpenLayers.Util.getParameters()["evfilter"];
        if(["alle","ooktoekomstig"].indexOf(evfilter) !== -1) {
            this.options.evFilter = evfilter;
        }

        // Setup details layers

        me.events = new safetymaps.vrh.Events(this.options);

        me.waterongevallen = new safetymaps.vrh.Waterongevallen(this.options);

        me.dbks = new safetymaps.vrh.Dbks(this.options);


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

        dbkjs.hoverControl.activate();
        dbkjs.selectControl.activate();

        // XXX move to safetymaps.vrh.Dbks.init()
        if(me.options.dbks) {
            safetymaps.vrh.api.getDbks(me.newDbSchema)
            .fail(function(msg) {
                dbkjs.util.alert("Fout", msg, "alert-danger");
                me.dbks.loading = false;
            })
            .done(function(dbkObjects) {
                console.log("Got " + dbkObjects.length + " DBK objects");
                me.dbks.loading = false;

                me.overviewObjects = me.overviewObjects.concat(dbkObjects);

                me.features = me.features.concat(safetymaps.vrh.api.createDbkFeatures(dbkObjects));
                me.clusteringLayer.addFeaturesToCluster(me.features);
            });
        } else {
            me.dbks.loading = false;
        }

        // XXX move to safetymaps.vrh.Waterongevallen.init()
        if(me.options.waterongevallen) {
            safetymaps.vrh.api.getWaterongevallen(me.newDbSchema)
            .fail(function(msg) {
                dbkjs.util.alert("Fout", msg, "alert-danger");
                me.waterongevallen.loading = false;
            })
            .done(function(woObjects) {
                console.log("Got " + woObjects.length + " waterongevallen objects");
                me.waterongevallen.loading = false;

                me.overviewObjects = me.overviewObjects.concat(woObjects);

                me.features = me.features.concat(safetymaps.vrh.api.createWaterongevallenFeatures(woObjects));
                me.clusteringLayer.addFeaturesToCluster(me.features);
            });
        } else {
            me.waterongevallen.loading = false;
        }

        // XXX move to safetymaps.vrh.Events.init()
        if(this.options.evenementen) {
            safetymaps.vrh.api.getEvenementen()
            .fail(function(msg) {
                dbkjs.util.alert("Fout", msg, "alert-danger");
                me.events.loading = false;
            })
            .done(function(evenementenObjects) {
                console.log("Got " + evenementenObjects.length + " event objects");
                me.events.loading = false;

                if(me.options.evFilter !== "alle") {
                    var now = new moment();
                    var countBefore = evenementenObjects.length;
                    evenementenObjects = evenementenObjects.filter(function(ev) {
                        // Evenementen tonen van instelbaar aantal dagen voor en na sbegin
                        var beginDatum = new moment(ev.sbegin);
                        var beginDatumAdjusted = beginDatum.clone().subtract(me.options.evFilterShowDaysBeforeBegin, "days");
                        var eindDatum = beginDatum.clone().add(me.options.evFilterShowDaysAfterBegin, "days");
                        var filter = (me.options.evFilter === "ooktoekomstig" || beginDatumAdjusted.isBefore(now)) && eindDatum.isAfter(now);
/*
                        if(filter) {
                            console.log("Tonen evenement " + ev.evnaam + " begindatum " + beginDatum.format("LLLL") + " (check datum " + beginDatumAdjusted.format("LLLL") + "), einddatum niet meer dan " + me.options.evFilterShowDaysAfterBegin + " dagen geleden: " + eindDatum.format("LLLL"));
                        } else {
                            var s = "Verbergen evenement " + ev.evnaam + " begindatum " + beginDatum.format("LLLL");
                            if(me.options.evFilter !== "ooktoekomstig" && beginDatumAdjusted.isAfter(now)) {
                                s += " startdatum is meer dan 3 dagen in de toekomst (tijdstip wanner evenement getoond wordt: " + beginDatumAdjusted.format("LLLL");
                            }
                            if(eindDatum.isBefore(now)) {
                                s += " startdatum is meer dan 3 dagen geleden (tijdstip tot wanneer evenement werd getoond: " + eindDatum.format("LLLL");
                            }
                            console.log(s);
                        }
*/
                        return filter;
                    });
                    console.log(countBefore - evenementenObjects.length + " evenementen gefiltered, aantal zichtbaar: " + evenementenObjects.length);
                }

                me.overviewObjects = me.overviewObjects.concat(evenementenObjects);

                me.features = me.features.concat(safetymaps.vrh.api.createEvenementFeatures(evenementenObjects));
                me.clusteringLayer.addFeaturesToCluster(me.features);
            });
        } else {
            me.events.loading = false;
        }

        // Setup user interface for object info window

        me.setupInterface();

        me.addSearchConfig();
        me.addFeatureProvider();

        // Listen for toggler events
        me.buttonStates = {};
        $(dbkjs).on("dbkjs_init_complete", function() {
            if(dbkjs.modules.toggler) {
                $(dbkjs.modules.toggler).on("button_change", function(e, button, active) {
                    me.togglerButtonChanged(button, active);
                });
            }
        });
    },

    togglerButtonChanged: function(button, active) {
        var me = this;
        me.buttonStates[button] = active;

        var basis = me.buttonStates.basis;
        me.dbks.layerLabels.setVisibility(basis);

        var brandweergegevens = me.buttonStates.brandweergegevens;
        me.dbks.layerFireCompartmentation.setVisibility(brandweergegevens);
        me.dbks.layerFireCompartmentationLabels.setVisibility(brandweergegevens);
        me.dbks.layerDangerSymbols.setVisibility(brandweergegevens);

        me.dbks.layerLines1.redraw();
        me.dbks.layerLines2.redraw();
        me.dbks.layerLines3.redraw();
        me.dbks.layerSymbols.redraw();
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
            // TODO wat indien niets geselecteerd?
            safetymaps.infoWindow.showTab(me.infoWindow.getName(), "algemeen", true);
        });

        me.infoWindow = safetymaps.infoWindow.addWindow("vrh_object_info", "Object informatie");

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
    },

    infoWindowTabsResize: function() {
        var view = this.infoWindow.getView();
        var tabContentHeight = view.find(".tab-content").height();

        view.find(".pdf-embed").css("height", tabContentHeight - 28);
    },

    addSearchConfig: function() {
        var me = this;

        // XXX move to safetymaps.vrh.Events.init()
        if(dbkjs.modules.search && me.options.evenementen) {
            dbkjs.modules.search.addSearchConfig({
                tabContents: "<i class='fa fa-calendar'></i> Evenementen",
                placeholder: i18n.t("creator.search_placeholder"),
                search: function(value) {
                    value = value.toLowerCase();
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

                    me.selectObjectById("evenement",result.id, result.extent);
                }
            }, true);
        }

        // XXX move to safetymaps.vrh.Events.init()
        if(dbkjs.modules.search && me.options.waterongevallen) {
            dbkjs.modules.search.addSearchConfig({
                tabContents: "<i class='fa fa-life-buoy'></i> Waterongevallen",
                placeholder: "WO-kaartnaam",
                search: function(value) {
                    value = value.toLowerCase();
                    console.log("search wo " + value);
                    var searchResults = [];
                    $.each(me.overviewObjects, function(i, o) {
                        if(o.clusterFeature.attributes.type === "waterongevallenkaart") {
                            if(value === "" || o.locatie.toLowerCase().indexOf(value) !== -1) {
                                searchResults.push(o);
                                if(searchResults.length === me.options.maxSearchResults) {
                                    return false;
                                }
                            }
                        }
                    });
                    dbkjs.modules.search.showResults(searchResults, function(r) {
                        var s = r.locatie;
                        if(r.adres || r.plaatsnaam) {
                            var p = [];
                            if(r.adres) p.push(r.adres);
                            if(r.plaatsnaam) p.push(r.plaatsnaam);

                            s += " (" + p.join(", ") + ")";
                        }
                        return s;
                    });
                },
                resultSelected: function(result) {
                    console.log("Search result selected", result);

                    me.selectObjectById("waterongevallenkaart",result.id, result.extent);
                }
            }, true);
        }

        // XXX move to safetymaps.vrh.Dbks.init()
        if(dbkjs.modules.search && me.options.dbks) {
            dbkjs.modules.search.addSearchConfig({
                tabContents: "<i class='fa fa-building'></i> DBK's",
                placeholder: i18n.t("creator.search_placeholder"),
                search: function(value) {
                    value = value.toLowerCase();
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

    addFeatureProvider: function() {
        var me = this;

        $(safetymaps).on("object_deselect", function() {
            me.unselectObject();
        });

        $(safetymaps).on("object_select", function(event, clusterFeature) {
            me.selectObjectById(clusterFeature.attributes.type, clusterFeature.attributes.id, null, true);
        });

        $(dbkjs).one("dbkjs_init_complete", function() {
            if(dbkjs.modules.incidents && dbkjs.modules.incidents.featureSelector) {
                dbkjs.modules.incidents.featureSelector.addFeatureProvider({
                    getName: function() {
                        return "VRH DBK's en events";
                    },
                    isLoading: function() {
                        return me.dbks.loading || me.events.loading;
                    },
                    findIncidentMatches: function(matchHuisletter, matchToevoeging, x, y, postcode, huisnummer, huisletter, toevoeging, woonplaats, straat) {
                        return me.findIncidentMatches(matchHuisletter, matchToevoeging, x, y, postcode, huisnummer, huisletter, toevoeging, woonplaats, straat);
                    }
                });
            }
        });
    },

    findIncidentMatches: function (exactMatchHuisletter, exactMatchToevoeging, x, y, postcode, huisnummer, huisletter, toevoeging, woonplaats, straat) {
        var me = this;
        var matches = [];

        $.each(me.overviewObjects, function(i, o) {
            if(o.clusterFeature.attributes.type === "dbk") {
                var continueAdressenSearch = true;

                var matchPostcode = o.postcode && o.postcode === postcode;
                var matchHuisnummer = o.huisnummer && o.huisnummer === huisnummer;
                var matchHuisletter = !exactMatchHuisletter || (o.huisletter === huisletter);
                var matchToevoeging = !exactMatchToevoeging || (o.toevoeging === toevoeging);
                var matchWoonplaats = woonplaats && o.plaats && woonplaats === o.plaats;
                var matchStraat = straat && o.straatnaam && straat === o.straatnaam;

                if((matchPostcode || (matchWoonplaats && matchStraat)) && matchHuisnummer && matchHuisletter && matchToevoeging) {
                    console.log("VRH DBK adres match", o);
                    matches.push(o.clusterFeature);
                    return;
                }

                $.each(o.selectieadressen || [], function(i, a) {
                    var matchPostcode = a.pc && a.pc === postcode;
                    var matchWoonplaats = a.pl && a.pl === woonplaats;
                    var matchStraat = a.sn && a.sn === straat;

                    if(matchPostcode || (matchWoonplaats && matchStraat) && a.nrs) {
                        console.log("VRH DBK check selectieadres nummers voor DBK " + o.naam + ", " + a.pc + " " + a.pl);
                        $.each(a.nrs, function(j, n) {
                            var parts = n.split("|");
                            var matchHuisnummer = Number(parts[0]) === huisnummer;
                            var fHuisletter = parts.length > 1 ? parts[1] : "";
                            var fToevoeging = parts.length > 2 ? parts[2] : "";
                            var matchHuisletter = !exactMatchHuisletter || (fHuisletter === huisletter);
                            var matchToevoeging = !exactMatchToevoeging || (fToevoeging === toevoeging);

                            if(matchHuisnummer && matchHuisletter && matchToevoeging) {
                                console.log("VRH DBK match selectieadres op nummer " + n, o);
                                matches.push(o.clusterFeature);
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
            }

            // Naast o.clusterFeature.attributes.type "dbk" ook voor "evenement"

            if(x && y && o.clusterFeature.attributes.selectionPolygon) {
                var point = new OpenLayers.Geometry.Point(x, y);

                $.each(o.clusterFeature.attributes.selectionPolygon.components, function(j, c) {
                    if(c.containsPoint(point)) {
                    console.log("VRH " + o.clusterFeature.attributes.type + " " + o.clusterFeature.attributes.label + ": incident inside selectiekader");
                        matches.push(o.clusterFeature);
                    }
                });
            }
        });

        matches.sort(function(lhs, rhs) {
            var typeOrder = ["dbk", "evenement", "waterongevallenkaart"];
            var lhsOrder = typeOrder.indexOf(lhs.attributes.type);
            var rhsOrder = typeOrder.indexOf(rhs.attributes.type);

            if(lhsOrder === rhsOrder) {
                return lhs.attributes.label.localeCompare(rhs.attributes.label);
            } else {
                return lhsOrder - rhsOrder;
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
        var link = $(Mustache.render('<li class="object"><a id="{{id}}" href="#"><img src="{{symbol}}">{{label}}</a></li>', feature.attributes));
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
        safetymaps.vrh.api.getObjectDetails(type, id, this.newDbSchema)
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
            this.waterongevallen.removeAllFeatures();

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
            if(type === "evenement") {
                this.events.addFeaturesForObject(object);
                this.events.updateInfoWindow(this.infoWindow.getName(), object);
            } else if(type === "dbk") {
                this.dbks.addFeaturesForObject(object);
                this.dbks.updateInfoWindow(this.infoWindow.getName(), object, this.newDbSchema);
            } else if(type === "waterongevallenkaart") {
                this.waterongevallen.addFeaturesForObject(object);
                this.waterongevallen.updateInfoWindow(this.infoWindow.getName(), object);
            }
            if(!isIncident) {
                safetymaps.infoWindow.showTab(this.infoWindow.getName(), "algemeen", true);
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
    },

    addLegendTrEventHandler: function(tabId, layerByIdPrefix, attribute) {
        dbkjs.modules.safetymaps_creator.addLegendTrEventHandler(tabId, layerByIdPrefix, attribute);
    }
};

