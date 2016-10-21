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
                pointRadius: "${radius}",
                externalGraphic: "${graphic}",
                label: "${label}",
                labelYOffset: "${labelYOffset}",
                labelOutlineWidth: 2,
                labelOutlineColor: 'white'
            },
            {
                context: {
                    graphic: function(feature) {
                        var img = feature.attributes.graphic;
                        return typeof imagesBase64 === 'undefined' ? dbkjs.basePath + img : imagesBase64[img];
                    },
                    radius: function(feature) {
                        return dbkjs.scaleStyleValue(12, feature.attributes.radius);
                    },
                    labelYOffset: function(feature) {
                        return dbkjs.scaleStyleValue(12, feature.attributes.radius) * -1.4;
                    },
                    label: function(feature) {
                        return feature.attributes.label || "";
                    }
                }
            }
        ),
        "select": new OpenLayers.Style(
            {
                pointRadius: "${radius}",
                strokeColor: "#357ebd"/*,
                labelOutlineColor: "#357ebd",
                labelOutlineWidth: 2*/
            },
            {
                context: {
                    radius: function(feature) {
                        return dbkjs.scaleStyleValue(20, feature.attributes.radius, 1.66);
                    }
                }
            }
        ),
        "hover": new OpenLayers.Style(
            {
                pointRadius: "${radius}"
            },
            {
                context: {
                    radius: function(feature) {
                        return dbkjs.scaleStyleValue(24, feature.attributes.radius, 2);
                    }
                }
            }
        )
    })
};


dbkjs.modules.EditSymbols = [
    {
        "name": "REPRESSIE / RAMPENBESTRIJDING",
        "children": [
            {
                "name": "MAATREGELEN EN INZET",
                "symbols": [
                    { "id": "s0590_B03", "image": "images/imoov/s0590_B03---g.png", "label": "Brandweer Voertuig" },
                    { "id": "s0600_B04", "image": "images/imoov/s0600_B04---g.png", "label": "Brandweer Blusboot" },
                    { "id": "s0610_B05", "image": "images/imoov/s0610_B05---g.png", "label": "Brandweer Meetploeg" },
                    { "id": "s0620_B12", "image": "images/imoov/s0620_B12---g.png", "label": "Brandweer Ontsmettingssluis voertuigen" },
                    { "id": "s0630_B13", "image": "images/imoov/s0630_B13---g.png", "label": "Brandweer Decontaminatie (personen)" }
                ]
            },
            {
                "name": "EVACUATIE EN LOGISTIEK",
                "symbols": [
                    { "id": "s0740_B14", "image": "images/imoov/s0740_B14---g.png", "label": "Brandstofvoorziening voor hulpverleningsvoertuigen" }
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
                    { "id": "s0850_B01-A", "image": "images/imoov/s0850_B01-A---g.png", "label": "Brandweer OVD, Officier van Dienst" },
                    { "id": "s0870_B03", "image": "images/imoov/s0870_B03---g.png", "label": "Brandweer Uitgangsstelling" },
                    { "id": "s0880_B06", "image": "images/imoov/s0880_B06---g.png", "label": "Brandweer Bluswatervoorziening (algemeen) brandkraan, geboorde put of open water" }
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
    /** @var OpenLayers.Control.DrawFeature drawFeatureControl */
    drawFeatureControl: null,

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
            handlerOptions: {
                freehand: true,
                freehandToggle: null
            }
        };
        me.drawFeatureControl = new OpenLayers.Control.DrawFeature(me.layer, OpenLayers.Handler.Path, drawOptions);
        dbkjs.map.addControl(me.drawFeatureControl);
        me.drawFeatureControl.deactivate();

        this.symbolmanager = new dbkjs.modules.SymbolManager(dbkjs.modules.EditSymbols, "#edit-symbol-buttons", "#symbol-picker-button");

        this.initFeaturesManager();

        this.watchPropertiesChange();

        this.enableSymbolMode();
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
            }, this);
    },

    setPropertiesGrid: function(feature) {
        var propGrid = $("#edit-symbol-properties");
        propGrid.find("[name='label']").val(feature.attributes.label);
        propGrid.find("#symbolRadiusSlider").slider('setValue', parseInt(feature.attributes.radius, 10));
    },

    watchPropertiesChange: function() {
        var propGrid = $("#edit-symbol-properties").find("input");
        var me = this;
        propGrid.on("keyup change", function(e) {
            if(!me.selectedFeature) {
                return;
            }
            if(this.getAttribute("name") === "label") {
                me.selectedFeature.attributes.label = this.value;
                me.updateLayer(true);
            }
            if(this.getAttribute("name") === "radius") {
                me.selectedFeature.attributes.radius = this.value;
                me.updateLayer();
            }
            me.featuresManager.updateFeature(me.selectedFeature);
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
        this.setPropertiesGrid(this.selectedFeature);
        this.featuresManager.setSelectedFeature(this.selectedFeature);
    },

    clearSelectedFeature: function() {
        // Check if we have selectedFeature and if selectedFeature has layer (=not removed)
        if(!this.selectedFeature || !this.selectedFeature.layer) return;
        this.layer.drawFeature(this.selectedFeature, "default");
        this.featuresManager.unsetSelectedFeature(this.selectedFeature);
    },

    enableSymbolMode: function() {
        this.mode = "add-symbol";
        this.buttonSymbol.addClass("btn-primary");
        this.disableLineMode();
    },

    disableSymbolMode: function() {
        this.buttonSymbol.removeClass("btn-primary");
    },

    enableLineMode: function() {
        this.mode = "add-line";
        $("body").addClass("disable-selection");
        this.buttonLine.addClass("btn-primary");
        this.drawFeatureControl.activate();
        this.disableSymbolMode();
    },

    disableLineMode: function() {
        $("body").removeClass("disable-selection");
        this.buttonLine.removeClass("btn-primary");
        this.drawFeatureControl.deactivate();
    },

    mapClick: function(lonLat) {
        var me = this;
        if(this.mode === "add-symbol") {
            var symbol = me.symbolmanager.getActiveSymbol();
            if(!symbol) {
                alert("Selecteer eerst een symbool");
                return;
            }
            var feature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(lonLat.lon, lonLat.lat), {
                graphic: symbol.image,
                radius: 12,
                symbol: symbol.id,
                label: ""
            });
            me.layer.addFeatures(feature);
            this.setSelectedFeature(feature);
            me.featuresManager.addFeature(feature);
        }
    },

    deactivateButtons: function(btn) {
        for(var i = 0; i < this.buttons.length; i++) {
            if(!btn || this.buttons[i] !== btn) {
                this.buttons[i].deactivate();
            }
        }
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
                me.enableSymbolMode();
            })
            .on("deactivate", function() {
                me.properties.hide();
                $("#mapc1map1").css("cursor", "auto");
                me.catchClick = false;
                me.mode = "";
                me.disableSymbolMode();
                me.disableLineMode();
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

        me.buttonSymbol = $("<button/>")
                .attr("id", "edit-button-symbol")
                .addClass("btn btn-secondary")
                .text("Symbool")
                .on("click", function() {
                    me.enableSymbolMode();
                })
                .appendTo(group);
        me.buttonLine = $("<button/>")
                .attr("id", "edit-button-line")
                .addClass("btn btn-secondary")
                .text("Lijn")
                .on("click", function() {
                    me.enableLineMode();
                })
                .appendTo(group);
        me.buttonArea = $("<button/>")
                .attr("id", "edit-button-line")
                .addClass("btn btn-secondary ")
                .attr("disabled", "disabled")
                .text("Gebied")
                .appendTo(group);

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