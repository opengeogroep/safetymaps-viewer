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

    mode: "",
    /** @var dbkjs.modules.EditButton[] buttons */
    buttons: [],
    /** @var dbkjs.modules.SymbolManager symbolmanager */
    symbolmanager: null,
    /** @var OpenLayers.Feature.Vector selectedFeature */
    selectedFeature: null,

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

        this.symbolmanager = new dbkjs.modules.SymbolManager(dbkjs.modules.EditSymbols, "#edit-symbol-buttons", "#symbol-picker-button");

        this.watchPropertiesChange();
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
        this.clearSelectedFeature();
    },

    watchPropertiesChange: function() {
        var propGrid = $("#edit-symbol-properties").find("input");
        var me = this;
        propGrid.on("change", function(e) {
            if(this.getAttribute("name") === "label") {
                me.selectedFeature.attributes.label = this.value;
            }
        });
    },

    setSelectedFeature: function(feature) {
        this.clearSelectedFeature();
        dbkjs.selectControl.select(feature);
        this.selectedFeature = feature;
        $("#edit-symbol-properties").find("[name='label']").val(feature.attributes.label);
    },

    clearSelectedFeature: function() {
        if(this.selectedFeature) dbkjs.selectControl.unselect(this.selectedFeature);
    },

    mapClick: function(lonLat) {
        var me = this;
        if(this.mode === "add") {
            var symbol = me.symbolmanager.getActiveSymbol();
            if(!symbol) {
                alert("Selecteer eerst een symbool");
                return;
            }
            var feature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(lonLat.lon, lonLat.lat), {
                graphic: symbol.image,
                symbol: symbol.id,
                label: ""
            });
            me.layer.addFeatures(feature);
            this.setSelectedFeature(feature);
        }
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

    showFeaturesList: function() {
        this.featureslist.show();

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
                me.mode = "add";
            })
            .on("deactivate", function() {
                me.properties.hide();
                $("#mapc1map1").css("cursor", "auto");
                me.catchClick = false;
                me.mode = "";
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
                me.showFeaturesList();
            })
            .on("deactivate", function() {
                me.featureslist.hide();
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

        $("<div class='container properties-container'>" +
                "<div class='row'>" +
                    "<div id='symbol-props-left' class='col-md-6'/>" +
                    "<div id='symbol-props-right' class='col-md-6'/>" +
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
          .appendTo("#symbol-props-left");

        $("<div class='container-fluid' id='edit-symbol-properties'>" +
                "<div class='row'> <div class='col-md-3'>Grootte:</div> <div class='col-md-9'>(Slider)</div> </div>" +
                "<div class='row'> <div class='col-md-3'><label for='label'>Label:</label></div> <div class='col-md-9'> <input type='text' name='label' id='label' class='form-control'> </div> </div>" +
          "</div>")
          .appendTo("#symbol-props-right");


        me.featureslist = $("<div><h1>List of features here</h1></div>")
            .attr("id", "edit-features-list")
            .addClass("panel");
        me.featureslist.appendTo("body");

    }
};

dbkjs.modules.SymbolManager = function(symbols, quickSelectContainer, symbolPickerBtn) {
    this.symbolTree = symbols;
    this.symbols = {};
    this.recentlyUsed = [];
    this.activeSymbol = null;
    this.quickSelectContainer = $(quickSelectContainer);

    this.createSymbolsIndex();
    this.symbolpicker = this.createSymbolPicker();
    this.loadRecentlyUsedSymbols();

    // Listeners
    $(symbolPickerBtn).on("click", (function() { this.symbolpicker.show() }).bind(this));
    this.quickSelectContainer.add(this.symbolpicker.find(".panel-body"))
        .on("click", ".symbol-btn", this.setActiveSymbol.bind(this));
};
dbkjs.modules.SymbolManager.prototype = Object.create({

    createSymbolsIndex: function() {
        for(var i = 0; i < this.symbolTree.length; i++) {
            this.addSymbolsToIndex(this.symbolTree[i]);
        }
    },

    addSymbolsToIndex: function(category) {
        if(category.hasOwnProperty("symbols")) {
            for(var i = 0; i < category.symbols.length; i++) {
                this.symbols[category.symbols[i].id] = category.symbols[i];
            }
        }
        if(category.hasOwnProperty("children")) {
            for(var j = 0; j < category.children.length; j++) {
                this.addSymbolsToIndex(category.children[j]);
            }
        }
    },

    createSymbolPicker: function() {
        var symbolpicker = dbkjs.util.createDialog(
            'symbolpicker',
            'Symbolenkiezer'
        );
        var html = [];
        for(var i = 0; i < this.symbolTree.length; i++) {
            html.push(this.createCategory(this.symbolTree[i], true));
        }
        symbolpicker.find(".panel-body").html(html.join(''));
        $("body").append(symbolpicker);
        return symbolpicker;
    },

    createCategory: function(category, rootLevel) {
        var html = [];
        if(category.hasOwnProperty("name")) {
            if(rootLevel) {
                html.push("<h3>", category.name, "</h3>");
            } else {
                html.push("<h4>", category.name, "</h4>");
            }
        }
        if(category.hasOwnProperty("symbols")) {
            for(var i = 0; i < category.symbols.length; i++) {
                html.push(this.createSymbolLarge(category.symbols[i]));
            }
        }
        if(category.hasOwnProperty("children")) {
            for(var j = 0; j < category.children.length; j++) {
                html.push(this.createCategory(category.children[j]));
            }
        }
        return html.join("");
    },

    createSymbolLarge: function(symbol) {
        return ['<a href="#" class="symbol-btn symbol-large" data-symbolid="', symbol.id, '">',
            '<img src="', symbol.image,'">',
            '<span>', symbol.label,'</span>',
        '</a>'].join("");
    },

    createSymbolButton: function(symbol) {
        return [
            '<button class="btn symbol-btn" data-symbolid="', symbol.id, '">',
            '<img src="', symbol.image,'">',
            '</button>'
        ].join("");
    },

    getSymbol: function(id) {
        if(this.symbols.hasOwnProperty(id)) {
            return this.symbols[id];
        }
        return null;
    },

    loadRecentlyUsedSymbols: function() {
        var recentlyUsed = window.localStorage.getItem("edit.recentlyused");
        if(recentlyUsed) {
            this.recentlyUsed = JSON.parse(recentlyUsed);
        }
        var symbol;
        // Reverse order because buttons are prepended
        for(var i = this.recentlyUsed.length - 1; i >= 0; i--) {
            symbol = this.getSymbol(this.recentlyUsed[i]);
            if(symbol) {
                this.addToQuickSelect(symbol);
            }
        }
        if(this.activeSymbol === null) {
            this.activeSymbol = symbol;
        }
    },

    saveRecentlyUsedSymbols: function() {
        window.localStorage.setItem("edit.recentlyused", JSON.stringify(this.recentlyUsed));
    },

    addToRecentlyUsed: function(symbol) {
        if(this.recentlyUsed.indexOf(symbol.id) === -1) {
            this.recentlyUsed.unshift(symbol.id);
        }
        if(this.recentlyUsed.length > 10) {
            this.recentlyUsed.splice(10);
        }
        this.saveRecentlyUsedSymbols();
    },

    addToQuickSelect: function(symbol) {
        var quickBtn = this.quickSelectContainer.find("[data-symbolid='" + symbol.id + "']");
        if(quickBtn.length === 0) {
            quickBtn = $(this.createSymbolButton(symbol));
            this.quickSelectContainer.prepend(quickBtn);
            this.addToRecentlyUsed(symbol);
        }
        this.quickSelectContainer.find(".btn-primary").removeClass("btn-primary");
        quickBtn.addClass("btn-primary");
    },

    setActiveSymbol: function(e) {
        this.symbolpicker.hide();
        var symbolid = e.currentTarget.getAttribute("data-symbolid");
        var symbol = this.getSymbol(symbolid);
        if(!symbol) {
            return;
        }
        this.activeSymbol = symbol;
        this.addToQuickSelect(this.activeSymbol);
    },

    getActiveSymbol: function() {
        return this.activeSymbol;
    }

});
dbkjs.modules.SymbolManager.prototype.constructor = dbkjs.modules.SymbolManager;


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