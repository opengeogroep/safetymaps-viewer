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
        "default": new OpenLayers.Style({
            pointRadius: "${radius}",
            externalGraphic: "${graphic}"
        }, {
            context: {
                graphic: function(feature) {
                    var img = feature.attributes.graphic;
                    return typeof imagesBase64 === 'undefined' ? dbkjs.basePath + img : imagesBase64[img];
                },
                radius: function(feature) {
                    return dbkjs.scaleStyleValue(12, feature.attributes.radius);
                }
            }
        }), 'select': new OpenLayers.Style({
            pointRadius: "${radius}"
        }, {
            context: {
                radius: function(feature) {
                    return dbkjs.scaleStyleValue(20, feature.attributes.radius, 1.66);
                }
            }
        }), 'temporary': new OpenLayers.Style({
            pointRadius: "${radius}"
        }, {
            context: {
                radius: function(feature) {
                    return dbkjs.scaleStyleValue(24, feature.attributes.radius, 2);
                }
            }
        })
    })
};


/**
 * Edit module.
 *
 */
dbkjs.modules.edit = {
    id: "dbk.module.edit",
    active: null,
    catchClick: null,
    layer: null,
    register: function() {
        var me = this;

        me.options = $.extend({
            showMeasureButtons: true
        }, me.options);

        me.active = false;
        me.catchClick = false;

        me.createElements();

        me.layer = new OpenLayers.Layer.Vector("_Edit", {
            styleMap: dbkjs.editStyles.symbol
        });
        dbkjs.map.addLayer(me.layer);

        me.drag = new OpenLayers.Control.DragFeature(me.layer, {
            'onDrag': function (feature, pixel) {

                //_obj.feature = feature;
            }
        });
        dbkjs.map.addControl(me.drag);
//        me.drag.deactivate();

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
    },
    activate: function() {
        var me = this;

        me.active = true;
        me.editTriangle.show();
        me.editBox.show();
        me.plusButton.div.show();
        me.selectButton.div.show();
        me.minusButton.div.show();
        if(me.options.showMeasureButtons) {
            me.measureDistanceButton.div.show();
            me.measureAreaButton.div.show();
        }

        $(me).triggerHandler("activate");
    },
    deactivate: function() {
        var me = this;

        me.active = false;
        me.editTriangle.hide();
        me.editBox.hide();
        me.plusButton.div.hide();
        me.selectButton.div.hide();
        me.minusButton.div.hide();
        me.plusButton.deactivate();
        me.selectButton.deactivate();
        me.minusButton.deactivate();
        me.properties.hide();
        if(me.options.showMeasureButtons) {
            me.measureDistanceButton.div.hide();
            me.measureAreaButton.div.hide();
            me.measureDistanceButton.deactivate();
            me.measureAreaButton.deactivate();
        }

        $("#mapc1map1").css("cursor", "auto");
        me.catchClick = false;

        me.drag.deactivate();

        $(me).triggerHandler("deactivate");
    },
    mapClick: function(lonLat) {
        var me = this;

        console.log("place icon at " + lonLat);

        var feature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(lonLat.lon, lonLat.lat), {
            graphic: $("#edit-symbol-buttons .btn-primary img").attr("src")
        });
        me.layer.addFeatures(feature);
    },
    createButton: function(id, title, left, bottom, iclass) {
        var button = {};
        button.active = false;
        button.activate = function() {
            button.active = true;
            button.a.addClass("btn-primary");
        };
        button.deactivate = function() {
            button.active = false;
            button.a.removeClass("btn-primary");
        };
        button.div = $("<div/>").attr("style", "position: absolute; width: 48px; z-index: 3000")
                .css("left", left + "px")
                .css("bottom", bottom + "px");
        button.a = $("<a/>")
                .attr("id", id + "-a")
                .attr("title", title)
                .addClass("btn btn-default olButton")
                .attr("style", "display: block; font-size: 24px")
                .on("click", function() {
                    $(button).triggerHandler("click");
                });
        $("<i/>").attr("id", id + "-i").addClass("fa " + iclass).appendTo(button.a);
        button.a.appendTo(button.div);
        button.div.appendTo("#mapc1map1");

        return button;
    },
    createStyle: function() {
        var css = ".triangle-left { \
            border-color: transparent rgb(104,104,104) transparent transparent; \
            border-style: solid; \
            border-width: 19px 19px 19px 0px; \\n\
            height: 0px; \
            width: 0px; \
        } \
        .triangle-left:before { \
            position: absolute; \
            bottom: -21px; \
            left: 2px; \
            border-color: transparent white transparent transparent; \
            border-style: solid; \
            border-width: 21px 21px 21px 0px; \\n\
            height: 0px; \
            width: 0px; \
            content: ''; \
        }";

        var style = document.createElement("style");
        style.type = 'text/css';
        if(style.styleSheet) {
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        var head = document.head || document.getElementsByTagName('head')[0];
        head.appendChild(style);
    },
    createElements: function() {
        var me = this;

        me.createStyle();

        me.editButton = me.createButton("edit", "Tekenen", 20, 180, "fa-pencil-square-o");

        $(me.editButton).on("click", function() {
            if(me.active) {
                me.editButton.deactivate();
                me.deactivate();
            } else {
                me.editButton.activate();
                me.activate();
            }
        });

        me.editTriangle = $("<div/>")
                .attr("id", "edit-triangle")
                .addClass("triangle-left")
                .attr("style", "position: absolute; left: 62px; bottom: 180px; z-index: 2999")
                .hide()
                .appendTo("#mapc1map1");
        me.editBox = $("<div/>")
                .attr("id", "edit-box")
                .addClass("edit-box panel")
                .attr("style", "position: absolute; opacity: 1.0; left: 80px; bottom: 44px; width: 60px; height: " + (me.options.showMeasureButtons ? "280" : "171") + "px; z-index: 2998; border-color: rgb(104,104,104);")
                .hide()
                .appendTo("#mapc1map1");

        // Create edit mode buttons
        me.plusButton = me.createButton("plus", "Nieuw", 86, 180, "fa-plus");
        me.plusButton.div.hide();
        $(me.plusButton).on("click", function() {
            if(me.plusButton.active) {
                me.plusButton.deactivate();
                me.properties.hide();
            } else {
                me.plusButton.activate();

                me.selectButton.deactivate();
                me.minusButton.deactivate();
                me.properties.show();
                $("#mapc1map1").css("cursor", "crosshair");
                me.catchClick = true;
                me.drag.deactivate();
            }
        });
        me.selectButton = me.createButton("select", "Selecteer", 86, 126, "fa-mouse-pointer");
        me.selectButton.div.hide();
        $(me.selectButton).on("click", function() {
            if(me.selectButton.active) {
                me.selectButton.deactivate();
                me.properties.hide();
            } else {
                me.selectButton.activate();
                me.drag.activate();

                me.plusButton.deactivate();
                $("#mapc1map1").css("cursor", "auto");
                me.catchClick = false;
                me.minusButton.deactivate();
                me.properties.show();
            }
        });
        me.minusButton = me.createButton("minus", "Verwijder", 86, 72, "fa-minus");
        me.minusButton.div.hide();
        $(me.minusButton).on("click", function() {
            if(me.minusButton.active) {
                me.minusButton.deactivate();
                me.properties.hide();
            } else {
                me.minusButton.activate();

                me.selectButton.deactivate();
                $("#mapc1map1").css("cursor", "auto");
                me.catchClick = false;
                me.plusButton.deactivate();
                me.properties.show();
                me.drag.deactivate();
            }
        });
        if(me.options.showMeasureButtons) {
            me.measureDistanceButton = me.createButton("measureDistance", "Meet afstand", 86, 288, "fa-arrows-v fa-rotate-45");
            me.measureDistanceButton.div.hide();
            $(me.measureDistanceButton).on("click", function() {
                if(dbkjs.modules.measure.distance_control.active) {
                    me.measureDistanceButton.deactivate();
                } else {
                    me.measureDistanceButton.activate();
                    me.minusButton.deactivate();
                    me.plusButton.deactivate();
                    me.selectButton.deactivate();
                    me.properties.hide();
                }
                dbkjs.modules.measure.toggleMeasureDistance();
            });
            me.measureAreaButton = me.createButton("measureArea", "Meet oppervlakte", 86, 234, "fa-bookmark-o fa-rotate-45");
            me.measureAreaButton.div.hide();
            $(me.measureAreaButton).on("click", function() {
                if(dbkjs.modules.measure.area_control.active) {
                    me.measureAreaButton.deactivate();
                } else {
                    me.measureAreaButton.activate();
                    me.minusButton.deactivate();
                    me.plusButton.deactivate();
                    me.selectButton.deactivate();
                    me.properties.hide();
                }
                dbkjs.modules.measure.toggleMeasureArea();
            });
        }

        // Create symbol properties window

        var propertiesMargin = 144;
        me.properties = $("<div/>")
                .attr("id", "edit-properties")
                .attr("style", "margin-bottom: 0px; border: 1px solid gray; bottom: 0px; position: absolute; z-index: 3000; height: 120px")
                .css("margin-left", propertiesMargin + "px")
                .hide()
                .width( $(window).width() - propertiesMargin - 2)
                .addClass("panel");

        function resizeProperties() {
            $("#edit-properties").width( $(window).width() - propertiesMargin - 2 );
        }
        $(window).resize(resizeProperties);
        me.properties.appendTo("#mapc1map1");

        var group = $("<div/>")
                .addClass("btn-group-vertical")
                .css("margin", "5px 5px 5px 5px")
                .css("float", "left")
                .attr("role", "group")
                .appendTo("#edit-properties");

        me.buttonSymbol = $("<button/>")
                .attr("id", "edit-button-symbol")
                .addClass("btn btn-secondary")
                .text("Symbool")
                .appendTo(group);
        me.buttonLine = $("<button/>")
                .attr("id", "edit-button-line")
                .addClass("btn btn-secondary")
                .attr("disabled", "disabled")
                .text("Lijn")
                .appendTo(group);
        me.buttonArea = $("<button/>")
                .attr("id", "edit-button-line")
                .addClass("btn btn-secondary ")
                .attr("disabled", "disabled")
                .text("Gebied")
                .appendTo(group);

        me.symbol = $("<div class='container'> <div class='row'> <div id='symbol-props-left' class='col-md-6'/> <div id='symbol-props-right' class='col-md-6'/> </div> </div>")
                .attr("style", "float: left; width: 600px; margin-top: 5px")
                .appendTo("#edit-properties");

        $("<div class='container-fluid'>" +
//                "<div class='row'> <div class='col-md-3'>Huidig:</div> <div class='col-md-9'>(Notitie)</div> </div>" +
                "<div class='row'> <div class='col-md-3'>Symbool:</div> <div id='edit-symbol-buttons' class='col-md-9' btn-group' role='group'> " +
                "  <button class='btn btn-primary'> <img width='24' src='images/nen1414/Tb01.png'> </button> " +
                "  <button class='btn'> <img width='24' src='images/nen1414/Tb02.png'> </button> " +
                "  <button class='btn'> <img width='24' src='images/nen1414/Tb1.008.png'> </button> " +
                "</div> </div>" +
                "<div class='row'> <div class='col-md-12' style='margin-top: 5px'> <button class='btn'>Symbolenkiezer...</button> </div> </div>" +
          "</div>")
          .appendTo("#symbol-props-left");

        $("#edit-symbol-buttons").find("button").on("click", function(e) {
            console.log("symbol button click", e);
            $("#edit-symbol-buttons").find("button").removeClass("btn-primary");
            $(e.currentTarget).addClass("btn-primary");
        });
        $("<div class='container-fluid'>" +
                "<div class='row'> <div class='col-md-3'>Grootte:</div> <div class='col-md-9'>(Slider)</div> </div>" +
                "<div class='row'> <div class='col-md-3'>Label:</div> <div class='col-md-9'> <input type='text' class='form-control'> </div> </div>" +
          "</div>")
          .appendTo("#symbol-props-right");
    }
};

