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
            waterveiligheid: true,
            filterEvDate: true
        }, this.options);

        if("off" === OpenLayers.Util.getParameters()["evfilter"]) {
            this.options.filterEvDate = false;
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

            if(me.options.filterEvDate) {
                evenementenObjects = evenementenObjects.filter(ev => !new moment(ev.sbegin).isAfter(new moment()));
            }
            evenementenObjects.sort(function(lhs, rhs) {
                return lhs.evnaam.localeCompare(rhs.evnaam, dbkjsLang);
            });
            me.overviewObjects = me.overviewObjects.concat(evenementenObjects);

            var features = safetymaps.vrh.api.createEvenementFeatures(evenementenObjects);
            me.clusteringLayer.addFeaturesToCluster(features);
        });

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

        if(dbkjs.modules.search) {
            dbkjs.modules.search.addSearchConfig({
                tabContents: "<i class='fa fa-calendar-alt'></i> Evenementen",
                placeholder: i18n.t("creator.search_placeholder"),
                search: function(value) {
                    console.log("search event " + value);
                    var searchResults = [];
                    $.each(me.overviewObjects, function(i, o) {
                        if(value === "" || o.evnaam.toLowerCase().indexOf(value) !== -1) {
                            searchResults.push(o);
                            if(searchResults.length === me.options.maxSearchResults) {
                                return false;
                            }
                        }
                    });
                    dbkjs.modules.search.showResults(searchResults, r => r.evnaam);
                },
                resultSelected: function(result) {
                    console.log("Search result selected", result);

                    me.selectObjectById("evenement",result.evnaam, result.extent);
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
            me.selectedObjectDetailsReceived(type, id, object, isIncident);
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

    selectedObjectDetailsReceived: function(type, id, object,isIncident = false) {
        try {
            this.eventLayers.addFeaturesForObject(object);
            this.updateInfoWindow(object,isIncident);
            this.selectedObject = object;
            this.clusteringLayer.setSelectedIds([id]);
        } catch(error) {
            console.log("Error creating layers for object", object);
            if(error.stack) {
                console.log(error.stack);
            }
        }
    },

    updateInfoWindow: function(object,isIncident = false) {
        var me = this;

        var div = $('<div class="tabbable"></div>');

        var tabContent = $('<div class="tab-content"></div>');
        var tabs = $('<ul class="nav nav-pills"></ul>');
        div.append(tabContent);
        div.append(tabs);

        var rows = [];

        //rows.push({l: "Gemeente",                               t: t.gemeente});
        //rows.push({l: "Begindatum",                             t: t.sbegin});
        //rows.push({l: "Aanvrager",                              t: t.aanvrager});

        var t = object.terrein;
        rows.push({l: "Naam evenement",                         t: t.evnaam});
        rows.push({l: "Locatie",                                t: t.locatie});
        rows.push({l: "Adres",                                  t: t.adres});
        rows.push({l: "Soort evenement",                        t: t.soort_even});
        rows.push({l: "Contactpersoon organisatie",             t: t.contactper});
        rows.push({l: "Programma",                              t: t.programma});
        rows.push({l: "Bijzonderheden",                         t: t.bijzonderh});
        safetymaps.creator.createHtmlTabDiv("algemeen", "Evenementgegevens algemeen", safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

        rows = [];
        rows.push({l: "Tijden",                                 t: t.tijden});
        rows.push({l: "Aantal bezoekers",                       t: t.aantal_bez});
        rows.push({l: "Personeel EHBO",                         t: t.personeel_});
        rows.push({l: "Personeel security",                     t: t.personeel1});
        rows.push({l: "Personeel BHV",                          t: t.personee_1});
        rows.push({l: "Omroepinstallatie",                      t: t.omroepinst});
        rows.push({l: "Veiligheidsplan",                        t: t.veiligheid});
        rows.push({l: "Verzamelplaats",                         t: t.verzamelpl});
        rows.push({l: "Bijzonderheden",                         t: t.bijzonde_1});
        safetymaps.creator.createHtmlTabDiv("aanwezigheid", "Aanwezige personen", safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

        rows = [];
        rows.push({l: "Aantal tijdelijke bouwsels",             t: t.aantal_tij});
        rows.push({l: "Herpositionering voertuigen",            t: t.herpositio});
        rows.push({l: "OD uitrukvolgorde",                      t: t.od_uitrukv});
        rows.push({l: "Locatie CoPI",                           t: t.locatie_co});
        rows.push({l: "Toegangswegen",                          t: t.toegangswe});
        rows.push({l: "Bijzonderheden evenement",               t: t.bijzonde_2});
        safetymaps.creator.createHtmlTabDiv("gegevens", "Gegevens evenement", safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

        rows = [];
        rows.push({l: "Publieksprofiel",                        t: t.publiekspr});
        rows.push({l: "Activiteiten profiel",                   t: t.activiteit});
        rows.push({l: "Ruimtelijk profiel",                     t: t.ruimtelijk});
        safetymaps.creator.createHtmlTabDiv("risico", "Risico-inventarisatie", safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

        rows = [];
        rows.push({l: "Voertuigen",                             t: t.voertuigen});
        rows.push({l: "Functionarissen",                        t: t.functionar});
        safetymaps.creator.createHtmlTabDiv("maatregelen", "Maatregelen", safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

        rows = [];
        rows.push({l: "Coördinatie ter plaatse",                t: t.coordinati});
        rows.push({l: "Communicatie & verbindingen",              t: t.communicat});
        rows.push({l: "Informatievoorziening",                  t: t.informatie});
        rows.push({l: "Logistiek",                              t: t.logistiek});
        safetymaps.creator.createHtmlTabDiv("leiding", "Leiding & Coördinatie", safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

        rows = [];
        rows.push({l: "Commandant van Dienst naam",             t: t.commandant});
        rows.push({l: "Commandant van Dienst telefoon",         t: t.commanda_1});
        rows.push({l: "Hoofd officier van Dienst naam",         t: t.hoofd_offi});
        rows.push({l: "Hoofd officier van Dienst telefoon",     t: t.hoofd_of_1});
        rows.push({l: "AC Brandweer naam",                      t: t.ac_brandwe});
        rows.push({l: "AC Brandweer telefoon",                  t: t.ac_brand_1 });
        rows.push({l: "Leider CoPI naam",                       t: t.leider_cop});
        rows.push({l: "Leider CoPI telefoon",                   t: t.leider_c_1});
        rows.push({l: "Officier van dienst naam",               t: t.officier_v });
        rows.push({l: "Officier van dienst telefoon",           t: t.officier_1 });
        rows.push({l: "Reserve Officier van dienst 1 naam",     t: t.reserve_of});
        rows.push({l: "Reserve Officier van dienst 1 telefoon", t: t.reserve__1});
        rows.push({l: "Reserve Officier van dienst 2 naam",     t: t.reserve__2});
        rows.push({l: "Reserve Officier van dienst 2 telefoon", t: t.reserve__3});
        rows.push({l: "AGS naam",                               t: t.ags_naam});
        rows.push({l: "AGS telefoon",                           t: t.ags_telefo});
        rows.push({l: "Woordvoerder naam",                      t: t.woordvoerd});
        rows.push({l: "Woordvoerder telefoon",                  t: t.woordvoe_1});
        rows.push({l: "HON naam",                               t: t.hon_naam});
        rows.push({l: "HON telefoon",                           t: t.hon_telefo});
        rows.push({l: "Centralist naam",                        t: t.centralist});
        rows.push({l: "Centralist telefoon",                    t: t.centrali_1});
        rows.push({l: "PID naam",                               t: t.pid_naam});
        rows.push({l: "PID telefoon",                           t: t.pid_telefo});
        rows.push({l: "Objectofficier naam",                    t: t.objectoffi });
        rows.push({l: "Object officier telefoon",               t: t.objectof_1});
        rows.push({l: "HIN naam",                               t: t.hin_naam});
        rows.push({l: "HIN telefoon",                           t: t.hin_telefo});
        rows.push({l: "Medewerker OV naam",                     t: t.medewerker});
        rows.push({l: "Medewerker OV telefoon",                 t: t.medewerk_1});
        rows.push({l: "Brandweer in de wijk naam",              t: t.brandweer_});
        rows.push({l: "Brandweer in de wijk telefoon",          t: t.brandweer1});
        rows.push({l: "MOB naam",                               t: t.mob_naam});
        rows.push({l: "MOB naam",                               t: t.mob_telefo});
        safetymaps.creator.createHtmlTabDiv("functionarissen", "Functionarissen BRW", safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

        safetymaps.creator.createHtmlTabDiv("legenda", "Legenda", safetymaps.creator.createInfoTabDiv(me.createEventLegend()), tabContent, tabs);

        $("#vrh_object_info").html(div);

        if(!isIncident) {
            this.infoWindow.show();
        }
        this.infoWindowTabsResize();
    },

    createEventLegend: function() {
        var me = this;

        var rows = [];
        var rowsWithoutInfo = [];

        if(me.eventLayers.layerLocationPolygon.features.length > 0) {
            rows.push([
                "<b>Locatie vlak</b>",
                "<b>Soort</b>",
                "<b>Omschrijving</b>"
            ]);

            var soortenDisplayed = {};

            $.each(me.eventLayers.layerLocationPolygon.features, function(i, f) {
                var soort = f.attributes.vlaksoort;
                var omschrijving = f.attributes.omschrijvi || null;
                if(soortenDisplayed[soort] && omschrijving !== null) {
                    return true;
                }
                soortenDisplayed[soort] = true;

                var style = me.eventLayers.locationPolygonStyle[soort];

                var tr = [
                    "<div style='width: 150px; height: 40px; border: 2px solid " + style.stroke + "; background-color: " + style.fill + ";'></div>",
                    style.label,
                    omschrijving || ""
                ];


                if(omschrijving === null) {
                    rowsWithoutInfo.push(tr);
                } else {
                    rows.push(tr);
                }
            });
            rowsWithoutInfo.sort(function(lhs, rhs) {
                return lhs[1].localeCompare(rhs[1]);
            });
            rows.push.apply(rows, rowsWithoutInfo);
        }
        rowsWithoutInfo = [];

        if(me.eventLayers.layerRoutePolygon.features.length > 0) {
            rows.push([
                "<b>Route vlak</b>",
                "<b>Soort</b>",
                "<b>Omschrijving</b>"
            ]);

            var soortenDisplayed = {};

            $.each(me.eventLayers.layerRoutePolygon.features, function(i, f) {
                var soort = f.attributes.vlaksoort;
                var omschrijving = f.attributes.vlakomschr || null;
                if(soortenDisplayed[soort] && omschrijving !== null) {
                    return true;
                }
                soortenDisplayed[soort] = true;

                var style = me.eventLayers.routePolygonStyle[soort];

                var tr = [
                    "<div style='width: 150px; height: 40px; border: 2px solid " + style.stroke + "; background-color: " + style.fill + ";'></div>",
                    style.label,
                    omschrijving || ""
                ];


                if(omschrijving === null) {
                    rowsWithoutInfo.push(tr);
                } else {
                    rows.push(tr);
                }
            });
            rowsWithoutInfo.sort(function(lhs, rhs) {
                return lhs[1].localeCompare(rhs[1]);
            });
            rows.push.apply(rows, rowsWithoutInfo);
        }
        rowsWithoutInfo = [];

        if(me.eventLayers.layerLocationLine.features.length > 0) {
            rows.push([
                "<b>Locatie lijn</b>",
                "<b>Soort</b>",
                "<b>Omschrijving</b>"
            ]);

            var soortenDisplayed = {};

            $.each(me.eventLayers.layerLocationLine.features, function(i, f) {
                var soort = f.attributes.lijnsoort;
                var omschrijving = f.attributes.lijnbeschr || null;
                if(soortenDisplayed[soort] && omschrijving !== null) {
                    return true;
                }
                soortenDisplayed[soort] = true;

                var style = me.eventLayers.locationLineStyle[soort];

                var tr = [
                    "<img style='width: 40%' src='" + me.eventLayers.imagePath + '/lines/' + soort + ".png'>",
                    style.label,
                    omschrijving || ""
                ];


                if(omschrijving === null) {
                    rowsWithoutInfo.push(tr);
                } else {
                    rows.push(tr);
                }
            });
            rowsWithoutInfo.sort(function(lhs, rhs) {
                return lhs[1].localeCompare(rhs[1]);
            });
            rows.push.apply(rows, rowsWithoutInfo);
        }
        rowsWithoutInfo = [];

        if(me.eventLayers.layerRouteLine.features.length > 0) {
            rows.push([
                "<b>Route lijn</b>",
                "<b>Soort</b>",
                "<b>Omschrijving</b>"
            ]);

            var soortenDisplayed = {};

            $.each(me.eventLayers.layerRouteLine.features, function(i, f) {
                var soort = f.attributes.routetype;
                var omschrijving = f.attributes.routebesch || null;
                if(soortenDisplayed[soort] && omschrijving !== null) {
                    return true;
                }
                soortenDisplayed[soort] = true;

                var style = me.eventLayers.routeLineStyle[soort];

                var tr = [
                    "<img style='width: 40%' src='" + me.eventLayers.imagePath + '/lines/' + soort + ".png'>",
                    style.label,
                    omschrijving || ""
                ];

                if(omschrijving === null) {
                    rowsWithoutInfo.push(tr);
                } else {
                    rows.push(tr);
                }
            });
            rowsWithoutInfo.sort(function(lhs, rhs) {
                return lhs[1].localeCompare(rhs[1]);
            });
            rows.push.apply(rows, rowsWithoutInfo);
        }
        rowsWithoutInfo = [];

        if(me.eventLayers.layerLocationSymbols.features.length > 0) {
            rows.push([
                "<b>Locatie symbool</b>",
                "<b>Soort</b>",
                "<b>Omschrijving</b>"
            ]);

            var soortenDisplayed = {};

            $.each(me.eventLayers.layerLocationSymbols.features, function(i, f) {
                var soort = f.attributes.type;
                var omschrijving = f.attributes.ballonteks || null;
                if(soortenDisplayed[soort] && omschrijving !== null) {
                    return true;
                }
                soortenDisplayed[soort] = true;

                var label = me.eventLayers.locationSymbolTypes[soort];

                var tr = [
                    "<img style='width: 20%' src='" + me.eventLayers.imagePath + '/' + soort + ".png'>",
                    label,
                    omschrijving || ""
                ];

                if(omschrijving === null) {
                    rowsWithoutInfo.push(tr);
                } else {
                    rows.push(tr);
                }
            });
            rowsWithoutInfo.sort(function(lhs, rhs) {
                return lhs[1].localeCompare(rhs[1]);
            });
            rows.push.apply(rows, rowsWithoutInfo);
        }
        rowsWithoutInfo = [];

        if(me.eventLayers.layerRouteSymbols.features.length > 0) {
            rows.push([
                "<b>Route symbool</b>",
                "<b>Soort</b>",
                "<b>Omschrijving</b>"
            ]);

            var soortenDisplayed = {};

            $.each(me.eventLayers.layerRouteSymbols.features, function(i, f) {
                var soort = f.attributes.soort;
                var omschrijving = f.attributes.ballonteks || null;
                if(soortenDisplayed[soort] && omschrijving !== null) {
                    return true;
                }
                soortenDisplayed[soort] = true;

                var label = me.eventLayers.routeSymbolTypes[soort];
                var tr = [
                    "<img style='width: 20%' src='" + me.eventLayers.imagePath + '/' + soort + ".png'>",
                    label,
                    omschrijving || ""
                ];

                if(omschrijving === null) {
                    rowsWithoutInfo.push(tr);
                } else {
                    rows.push(tr);
                }
            });
            rowsWithoutInfo.sort(function(lhs, rhs) {
                return lhs[1].localeCompare(rhs[1]);
            });
            rows.push.apply(rows, rowsWithoutInfo);
        }

        return rows;
    },

    eventLayerFeatureSelected: function(e) {
        var me = this;
        var layer = e.feature.layer;
        var f = e.feature.attributes;
        console.log(layer.name + " feature selected", e);
        if(layer === me.eventLayers.layerLocationPolygon) {
            var s = me.eventLayers.locationPolygonStyle[f.vlaksoort];
            me.showFeatureInfo("Locatie", s.label, f.omschrijvi);
            layer.redraw();
        } else if(layer === me.eventLayers.layerRoutePolygon) {
            var s = me.eventLayers.routePolygonStyle[f.vlaksoort];
            me.showFeatureInfo("Route", s.label, f.vlakomschr);
            layer.redraw();
        } else if(layer === me.eventLayers.layerLocationSymbols) {

            me.showFeatureInfo("Locatie", me.eventLayers.locationSymbolTypes[f.type] || "", f.ballonteks);
            layer.redraw();
        } else if(layer === me.eventLayers.layerRouteSymbols) {
            me.showFeatureInfo("Route", me.eventLayers.routeSymbolTypes[f.soort] || "", f.ballonteks);
            layer.redraw();
        } else if(layer.name.startsWith("Event location lines")) {
            me.showFeatureInfo("Locatie", me.eventLayers.locationLineStyle[f.lijnsoort].label, f.lijnbeschr);
            layer.redraw();
        } else if(layer.name.startsWith("Event route lines")) {
            me.showFeatureInfo("Route", me.eventLayers.routeLineStyle[f.routetype].label, f.routebesch);
            layer.redraw();
        } else {
            $("#vectorclickpanel").hide();
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

