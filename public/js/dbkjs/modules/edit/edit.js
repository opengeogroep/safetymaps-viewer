/*
 *  Copyright (c) 2015 B3Partners (info@b3partners.nl)
 *
 *  This file is part of safetymapsDBK
 *
 *  safetymapsDBK is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  safetymapsDBK is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with safetymapDBK. If not, see <http://www.gnu.org/licenses/>.
 *
 */

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};

dbkjs.editStyles = {
    symbol: new OpenLayers.StyleMap({
        "default": new OpenLayers.Style(
            {
                // points
                pointRadius: "${radius}",
                externalGraphic: "${image}",
                label: "${label}",
                labelYOffset: "${labelYOffset}",
                labelOutlineWidth: 2,
                labelOutlineColor: 'white',
                // lines and areas
                strokeColor: "${strokeColor}",
                strokeWidth: "${strokeWidth}",
                strokeDashstyle: "${strokeDashstyle}",
                strokeLinecap: "${strokeLinecap}",
                // Area
                fillColor: "${fillColor}",
                fillOpacity: "${fillOpacity}"
            },
            {
                context: {
                    labelYOffset: function(feature) {
                        return dbkjs.scaleStyleValue(12, feature.attributes.radius) * -1.4;
                    },
                    label: function(feature) {
                        return feature.attributes.label || "";
                    },
                    strokeDashstyle: function(feature) {
                        return feature.attributes.strokeDashstyle || "solid"
                    },
                    strokeLinecap: function(feature) {
                        return feature.attributes.strokeLinecap || "round";
                    },
                    fillColor: function(feature) {
                        return feature.attributes.fillColor || "transparent";
                    },
                    fillOpacity: function(feature) {
                        if(feature.attributes.type === "point") {
                            return 1;
                        }
                        return feature.attributes.fillOpacity || 0.5;
                    }
                }
            }
        ),
        "select": new OpenLayers.Style(
            {
                pointRadius: "${radius}",
                strokeWidth: "${strokeWidth}"
            },
            {
                context: {
                    radius: function(feature) {
                        return feature.attributes.radius * 1.66;
                    },
                    strokeWidth: function(feature) {
                        return feature.attributes.strokeWidth ? feature.attributes.strokeWidth + 2 : 14;
                    }
                }
            }
        ),
        "hover": new OpenLayers.Style(
            {
                pointRadius: "${radius}",
                strokeWidth: "${strokeWidth}"
            },
            {
                context: {
                    radius: function(feature) {
                        return feature.attributes.radius * 2;
                    },
                    strokeWidth: function(feature) {
                        return feature.attributes.strokeWidth ? feature.attributes.strokeWidth + 3 : 18;
                    }
                }
            }
        )
    })
};

dbkjs.modules.EditSymbols = [
    {
        "name": "REALITEIT -- RAMPEN / ONGEVALLEN",
        "children": [
            {
                "name": "RAMPZONES",
                "symbols": [
                    { "id": "s0070", "type": "area", "image": "images/imoov/s0070---g.png", "label": "Brongebied", "rotation": 0, "strokeWidth": 2, "strokeColor": "#000000", "fillColor": "#808284" },
                    { "id": "s0080", "type": "area", "image": "images/imoov/s0080---g.png", "label": "Effectgebied, huidige situatie", "rotation": 0, "strokeWidth": 2, "strokeColor": "#000000", "fillColor": "#1FA2FF" },
                    { "id": "s0090", "type": "area", "image": "images/imoov/s0090---g.png", "label": "Effectgebied, prognose", "rotation": 0, "strokeWidth": 3, "strokeColor": "#1FA2FF", "strokeDashstyle": "1,6" }
                ]
            }
        ]
    },
    {
        "name": "REPRESSIE / RAMPENBESTRIJDING",
        "children": [
            {
                "name": "MAATREGELEN EN INZET",
                "symbols": [
                    { "id": "s0590_B03", "type": "point", "image": "images/imoov/s0590_B03---g.png", "label": "Brandweer Voertuig" },
                    { "id": "s0600_B04", "type": "point", "image": "images/imoov/s0600_B04---g.png", "label": "Brandweer Blusboot" },
                    { "id": "s0610_B05", "type": "point", "image": "images/imoov/s0610_B05---g.png", "label": "Brandweer Meetploeg" },
                    { "id": "s0620_B12", "type": "point", "image": "images/imoov/s0620_B12---g.png", "label": "Brandweer Ontsmettingssluis voertuigen" },
                    { "id": "s0630_B13", "type": "point", "image": "images/imoov/s0630_B13---g.png", "label": "Brandweer Decontaminatie (personen)" }
                ]
            },
            {
                "name": "EVACUATIE EN LOGISTIEK",
                "symbols": [
                    { "id": "s0690", "type": "line", "image": "images/imoov/s0690---g.png", "label": "Evacuatiegebied, grens", "strokeWidth": 6, "strokeColor": "#A41926", "strokeDashstyle": "1,9", "strokeLinecap": "square" },
                    { "id": "s0700", "type": "line", "image": "images/imoov/s0700---g.png", "label": "Evacuatieroute", "strokeWidth": 6, "strokeColor": "#51B848" },
                    { "id": "s0720", "type": "line", "image": "images/imoov/s0720---g.png", "label": "Extra aanvoerroutes hulpdiensten", "strokeWidth": 3, "strokeColor": "#51B848" },
                    { "id": "s0740_B14", "type": "point", "image": "images/imoov/s0740_B14---g.png", "label": "Brandstofvoorziening voor hulpverleningsvoertuigen" }
                ]
            }
        ]
    },
    {
        "name": "PREPARATIE",
        "children": [
            {
                "name": "COMMANDOCENTRA EN UITGANGSSTELLINGEN",
                "symbols": [
                    { "id": "s0850_B01-A", "type": "point", "image": "images/imoov/s0850_B01-A---g.png", "label": "Brandweer OVD, Officier van Dienst" },
                    { "id": "s0870_B03", "type": "point", "image": "images/imoov/s0870_B03---g.png", "label": "Brandweer Uitgangsstelling" },
                    { "id": "s0880_B06", "type": "point", "image": "images/imoov/s0880_B06---g.png", "label": "Brandweer Bluswatervoorziening (algemeen) brandkraan, geboorde put of open water" }
                ]
            }
        ]
    }
];

/**
 * Edit module.
 *
 */
dbkjs.modules.edit = {
    id: "dbk.module.edit",
    catchClick: null,
    layer: null,

    debounceUpdateLayer: null,

    mode: "",
    /** @var dbkjs.modules.EditButton[] buttons */
    buttons: [],
    /** @var dbkjs.modules.SymbolManager symbolmanager */
    symbolmanager: null,
    /** @var dbkjs.modules.FeaturesManager featuresManager */
    featuresManager: null,
    /** @var OpenLayers.Feature.Vector selectedFeature */
    selectedFeature: null,
    /** @var OpenLayers.Control.DrawFeature drawLineControl */
    drawLineControl: null,
    /** @var OpenLayers.Control.DrawFeature drawAreaControl */
    drawAreaControl: null,

    register: function() {
        var me = this;

        me.options = $.extend({
            showMeasureButtons: true
        }, me.options);

        me.catchClick = false;

        me.createElements();

        me.layer = new OpenLayers.Layer.Vector("_Edit", {
            styleMap: dbkjs.editStyles.symbol
        });
        dbkjs.map.addLayer(me.layer);

        me.drag = new OpenLayers.Control.DragFeature(me.layer, {
            'onStart': function (feature, pixel) {
                me.setSelectedFeature(feature);
            }
        });
        dbkjs.map.addControl(me.drag);

        var oldOnClick = dbkjs.util.onClick;
        dbkjs.util.onClick = function(e) {
            if(!e) {
                return;
            }
            var xy;
            if(e.xy) {
                xy = e.xy;
            } else if(e.changedTouches && e.changedTouches.length > 0) {
                xy = {x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY };
            }
            if(me.catchClick) {
                me.mapClick(dbkjs.map.getLonLatFromPixel(xy));
            } else {
                oldOnClick(e);
            }
        };

        var drawOptions = {
            eventListeners: {
                "featureadded": function(evt) {
                    me.createFeature(evt.feature);
                }
            },
            handlerOptions: {
                freehand: true,
                freehandToggle: null
            }
        };

        me.drawLineControl = new OpenLayers.Control.DrawFeature(me.layer, OpenLayers.Handler.Path, drawOptions);
        dbkjs.map.addControl(me.drawLineControl);
        me.drawLineControl.deactivate();

        var areaDrawOptions = {
            eventListeners: {
                "featureadded": function(evt) {
                    me.createFeature(evt.feature);
                }
            },
            handlerOptions: {
                sides: 40,
                multi: true,
                irregular: true
            }
        };
        me.drawAreaControl = new OpenLayers.Control.DrawFeature(me.layer, OpenLayers.Handler.RegularPolygon, areaDrawOptions);
        dbkjs.map.addControl(me.drawAreaControl);
        me.drawAreaControl.deactivate();

        this.symbolmanager = new dbkjs.modules.SymbolManager(dbkjs.modules.EditSymbols, "#edit-symbol-buttons", "#symbol-picker-button");
        this.symbolmanager.on("activeSymbolChanged", this.activeSymbolChanged, this);

        this.initFeaturesManager();
        this.setFilter("point");
    },

    activate: function() {
        var me = this;
        me.editTriangle.show();
        me.editBox.show();
        $(me).triggerHandler("activate");
        me.plusButton.activate();
    },

    deactivate: function() {
        var me = this;
        me.editTriangle.hide();
        me.editBox.hide();
        me.deactivateButtons();
        $(me).triggerHandler("deactivate");
        this.clearSelectedFeature();
    },

    initFeaturesManager: function() {
        this.featuresManager = new dbkjs.modules.FeaturesManager();
        this.featuresManager
            .on("removeFeature", function(featureid) {
                var feature = this.layer.getFeatureById(featureid);
                if(feature) {
                    if(this.selectedFeature === feature) {
                        this.selectedFeature = null;
                    }
                    this.layer.removeFeatures([feature]);
                }
            }, this)
            .on("removeAllFeatures", function() {
                this.layer.removeAllFeatures();
                this.selectedFeature = null;
            }, this)
            .on("featureSelected", function(featureid) {
                var feature = this.layer.getFeatureById(featureid);
                if(feature) {
                    this.setSelectedFeature(feature);
                }
            }, this)
            .on("propertyUpdated", function(property) {
                if(!this.selectedFeature) {
                    return;
                }
                if(property.hasOwnProperty("rotation")) {
                    var origin = this.selectedFeature.geometry.getCentroid();
                    var rotate = parseInt(property.rotation, 10);
                    var delta = rotate - parseInt(this.selectedFeature.attributes.rotation, 10);
                    this.selectedFeature.geometry.rotate(delta, origin);
                }
                this.selectedFeature.attributes = $.extend({}, this.selectedFeature.attributes, property);
                this.updateLayer();
                this.featuresManager.updateFeature(this.selectedFeature);
            }, this)
            .on("featureOver", function(featureid) {
                var feature = this.layer.getFeatureById(featureid);
                if(feature) {
                    this.layer.drawFeature(feature, "hover");
                }
            }, this)
            .on("featureOut", function(featureid) {
                var feature = this.layer.getFeatureById(featureid);
                if(feature) {
                    var styleIntent = "default";
                    if(feature === this.selectedFeature) {
                        styleIntent = "select";
                    }
                    this.layer.drawFeature(feature, styleIntent);
                }
            }, this)
            .on("saveFeatures", this.saveFeatures, this)
            .on("loadFeatures", this.readSavedFeatures, this);
    },

    readSavedFeatures: function() {
        var me = this;
        // Read GeoJSON
        $.ajax("api/edit", { data: { load: "true" } })
        .done(function(saved) {
            var geoJsonFormatter = new OpenLayers.Format.GeoJSON();
            me.featuresManager.removeAllFeatures();
            me.layer.features = geoJsonFormatter.read(saved);
            me.layer.redraw();
            var feature;
            for(var i = 0; i < me.layer.features.length; i++) {
                feature = me.layer.features[i];
                me.featuresManager.addFeature(feature);
            }
            me.setSelectedFeature(feature);
        });
    },

    saveFeatures: function() {
        //window.localStorage.setItem("edit.drawedFeatures", JSON.stringify((new OpenLayers.Format.GeoJSON()).write(this.layer.features)));
        $.ajax("api/edit", {
            method: "POST",
            data: { save: "true", features: JSON.stringify((new OpenLayers.Format.GeoJSON()).write(this.layer.features)) }
        })
        .done(function(result) {
        });
    },

    updateLayer: function(useTimeout) {
        if(!useTimeout) {
            this.layer.redraw();
            return;
        }
        if(this.debounceUpdateLayer) window.clearTimeout(this.debounceUpdateLayer);
        this.debounceUpdateLayer = window.setTimeout((function() { this.layer.redraw() }).bind(this), 250);
    },

    setSelectedFeature: function(feature) {
        this.clearSelectedFeature();
        this.layer.drawFeature(feature, "select");
        this.selectedFeature = feature;
        this.featuresManager.setSelectedFeature(this.selectedFeature);
    },

    clearSelectedFeature: function() {
        // Check if we have selectedFeature and if selectedFeature has layer (=not removed)
        if(!this.selectedFeature || !this.selectedFeature.layer) return;
        this.layer.drawFeature(this.selectedFeature, "default");
        this.featuresManager.unsetSelectedFeature(this.selectedFeature);
    },

    setFilter: function(filter) {
        $(".filter-buttons").removeClass("btn-primary");
        $(".filter-" + filter).addClass("btn-primary");
        this.symbolmanager.setFilter(filter);
    },

    activeSymbolChanged: function(activeSymbol) {
        if(!activeSymbol) {
            return;
        }
        if(this.mode === activeSymbol.type) {
            return;
        }

        // Disable previous mode
        if(this.mode === "point") {
            this.disablePointMode();
        } else if(this.mode === "line") {
            this.disableLineMode();
        } else if(this.mode === "area") {
            this.disableAreaMode();
        }

        // Enable new mode
        if(activeSymbol.type === "point") {
            this.enablePointMode();
        } else if(activeSymbol.type === "line") {
            this.enableLineMode();
        } else if(activeSymbol.type === "area") {
            this.enableAreaMode();
        } else {
            this.mode = "";
        }
    },

    enablePointMode: function() {
        this.mode = "point";
    },

    disablePointMode: function() {

    },

    enableLineMode: function() {
        this.mode = "line";
        $("body").addClass("disable-selection");
        this.drawLineControl.activate();
    },

    disableLineMode: function() {
        $("body").removeClass("disable-selection");
        this.drawLineControl.deactivate();
    },

    enableAreaMode: function() {
        this.mode = "area";
        $("body").addClass("disable-selection");
        this.drawAreaControl.activate();
    },

    disableAreaMode: function() {
        $("body").removeClass("disable-selection");
        this.drawAreaControl.deactivate();
    },

    mapClick: function(lonLat) {
        var me = this;
        if(this.mode === "point") {
            var symbol = me.symbolmanager.getActiveSymbol();
            if(!symbol) {
                alert("Selecteer eerst een symbool");
                return;
            }
            var feature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(lonLat.lon, lonLat.lat));
            me.layer.addFeatures(feature);
            this.createFeature(feature, symbol);
        }
    },

    createFeature: function(feature) {
        var symbol = this.symbolmanager.getActiveSymbol();
        var attributes = $.extend({}, symbol, {
            label: ""
        });
        if(symbol.type === "point") {
            attributes.radius = 12;
        }
        feature.attributes = attributes;
        this.featuresManager.addFeature(feature);
        this.setSelectedFeature(feature);
    },

    deactivateButtons: function(btn) {
        for(var i = 0; i < this.buttons.length; i++) {
            if(!btn || this.buttons[i] !== btn) {
                this.buttons[i].deactivate();
            }
        }
    },

    createFilterButton: function(label, filter) {
        return $("<button/>")
            .addClass("btn btn-secondary filter-buttons filter-" + filter)
            .text(label)
            .on("click", (function(e) {
                this.setFilter(filter);
            }).bind(this));
    },

    createElements: function() {
        var me = this;

        // me.loadStylesheet();

        var mainEditButton = new dbkjs.modules.EditButton("edit", "Tekenen", "#mapc1map1", "fa-pencil-square-o", {
            divClass: "edit-button"
        }).on("activate", function() {
            me.activate();
        }).on("deactivate", function() {
            me.deactivate();
        });

        me.editTriangle = $("<div/>")
                .attr("id", "edit-triangle")
                .addClass("triangle-left")
                .appendTo("#mapc1map1");

        me.editBox = $("<div/>")
                .attr("id", "edit-box")
                .addClass(["edit-box", "panel", (me.options.showMeasureButtons ? "with-measure-buttons" : "")].join(" "))
                .appendTo("#mapc1map1");

        if (me.options.showMeasureButtons) {
            me.measureDistanceButton = new dbkjs.modules.EditButton("measureDistance", "Meet afstand", me.editBox, "fa-arrows-v fa-rotate-45")
                    .on("activate", function (btn) {
                        me.deactivateButtons(btn);
                        dbkjs.modules.measure.toggleMeasureDistance(true);
                    })
                    .on("deactivate", function () {
                        dbkjs.modules.measure.toggleMeasureDistance(false);
                    });
            me.measureAreaButton = new dbkjs.modules.EditButton("measureArea", "Meet oppervlakte", me.editBox, "fa-bookmark-o fa-rotate-45")
                    .on("activate", function (btn) {
                        me.deactivateButtons(btn);
                        dbkjs.modules.measure.toggleMeasureArea(true);
                    })
                    .on("deactivate", function () {
                        dbkjs.modules.measure.toggleMeasureArea(false);
                    });
            me.buttons.push(me.measureDistanceButton, me.measureAreaButton);
        }

        // Create edit mode buttons
        me.plusButton = new dbkjs.modules.EditButton("plus", "Nieuw", me.editBox, "fa-plus")
            .on("activate", function(btn) {
                me.deactivateButtons(btn);
                me.properties.show();
                $("#mapc1map1").css("cursor", "crosshair");
                me.catchClick = true;
            })
            .on("deactivate", function() {
                me.properties.hide();
                $("#mapc1map1").css("cursor", "auto");
                me.catchClick = false;
                me.mode = "";
                me.disablePointMode();
                me.disableLineMode();
                me.disableAreaMode();
            });

        me.selectButton = new dbkjs.modules.EditButton("select", "Selecteer", me.editBox, "fa-mouse-pointer")
            .on("activate", function(btn) {
                me.deactivateButtons(btn);
                me.featuresManager.showFeaturesList();
                me.drag.activate();
            })
            .on("deactivate", function() {
                me.featuresManager.hideFeaturesList();
                me.drag.deactivate();
            });

        me.buttons.push(me.plusButton, me.selectButton);

        // Create symbol properties window
        me.properties = $("<div/>")
                .attr("id", "edit-properties")
                .addClass("panel");
        me.properties.appendTo("#mapc1map1");

        var group = $("<div/>")
                .addClass("btn-group-vertical edit-type-buttons")
                .attr("role", "group")
                .appendTo("#edit-properties");

        group.append(this.createFilterButton("Symbool", "point"));
        group.append(this.createFilterButton("Lijn", "line"));
        group.append(this.createFilterButton("Gebied", "area"));

        $("<div class='container properties-container'>" +
                "<div class='row'>" +
                    "<div id='symbol-picker-bar' class='col-md-12'/>" +
                "</div>" +
            "</div>")
            .appendTo("#edit-properties");

        $("<div class='container-fluid'>" +
//                "<div class='row'> <div class='col-md-3'>Huidig:</div> <div class='col-md-9'>(Notitie)</div> </div>" +
                "<div class='row'> <div id='edit-symbol-buttons' class='col-md-12' btn-group' role='group'>" +
                    "<button class='btn fa fa-plus' id='symbol-picker-button'></button>" +
                "</div></div> " +
                "<div class='row'> <div class='col-md-12' style='margin-top: 5px'>  </div> </div>" +
          "</div>")
          .appendTo("#symbol-picker-bar");
    }
};