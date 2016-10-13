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
    catchClick: null,
    layer: null,
    buttons: [],

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
        me.editTriangle.show();
        me.editBox.show();
        $(me).triggerHandler("activate");
    },

    deactivate: function() {
        var me = this;
        me.editTriangle.hide();
        me.editBox.hide();
        me.deactivateButtons();
        $(me).triggerHandler("deactivate");
    },

    mapClick: function(lonLat) {
        var me = this;
        var feature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(lonLat.lon, lonLat.lat), {
            graphic: $("#edit-symbol-buttons .btn-primary img").attr("src")
        });
        me.layer.addFeatures(feature);
    },

    loadStylesheet: function() {
        var cssId = 'editcss';
        if (!document.getElementById(cssId)) {
            var head  = document.head || document.getElementsByTagName('head')[0];
            var link  = document.createElement('link');
            link.id   = cssId;
            link.rel  = 'stylesheet';
            link.type = 'text/css';
            link.href = 'js/dbkjs/modules/edit/edit.css';
            link.media = 'all';
            head.appendChild(link);
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

        me.loadStylesheet();

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
            });

        me.selectButton = new dbkjs.modules.EditButton("select", "Selecteer", me.editBox, "fa-mouse-pointer")
            .on("activate", function(btn) {
                me.deactivateButtons(btn);
                me.properties.show();
                me.drag.activate();
            })
            .on("deactivate", function() {
                me.properties.hide();
                me.drag.deactivate();
            });

        me.minusButton = new dbkjs.modules.EditButton("minus", "Verwijder", me.editBox, "fa-minus")
            .on("activate", function(btn) {
                me.deactivateButtons(btn);
            })
            .on("deactivate", function() {

            });

        me.buttons.push(me.plusButton, me.selectButton, me.minusButton);

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

        me.symbol = $("<div class='container properties-container'>" +
                "<div class='row'>" +
                    "<div id='symbol-props-left' class='col-md-6'/>" +
                    "<div id='symbol-props-right' class='col-md-6'/>" +
                "</div>" +
            "</div>")
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

        $("#edit-symbol-buttons").on("click", "button", function(e) {
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

dbkjs.modules.EditButton = function(id, title, parent, iclass, conf) {
    this.active = false;
    this.id = id;
    this.listeners = {};
    conf = conf || {};
    this.div = $("<div></div>")
        .attr("id", id || "")
        .addClass("edit-button-container");
    this.a = $("<a/>")
        .attr("title", title || "")
        .addClass("btn btn-default olButton")
        .on("click", this.click.bind(this));
    $("<i/>").addClass("fa " + iclass || "").appendTo(this.a);
    this.a.appendTo(this.div);
    this.div.appendTo(parent);
    if(conf.divClass) {
        this.div.addClass(conf.divClass);
    }
    return this;
};
dbkjs.modules.EditButton.prototype = Object.create({
    on: function(eventKey, callback, scope) {
        this.listeners[eventKey] = { callback: callback, scope: scope };
        return this;
    },
    trigger: function(evt, data) {
        if(!this.listeners.hasOwnProperty(evt)) {
            return;
        }
        this.listeners[evt].callback.apply(this.listeners[evt].scope || this, data || []);
    },
    click: function() {
        if(this.active) {
            this.deactivate();
        } else {
            this.activate();
        }
        this.trigger("click");
    },
    activate: function() {
        this.active = true;
        this.a.addClass("btn-primary");
        this.trigger("activate", [ this ]);
    },
    deactivate: function() {
        this.active = false;
        this.a.removeClass("btn-primary");
        this.trigger("deactivate", [ this ]);
    }
});
dbkjs.modules.EditButton.prototype.con = dbkjs.modules.EditButton;