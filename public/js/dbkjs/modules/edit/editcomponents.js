/**
 * dbkjs.modules.Observable
 * @constructor
 */
dbkjs.modules.Observable = function () {
    this.listeners = [];
};
dbkjs.modules.Observable.prototype = Object.create({
    on: function(eventKey, callback, scope) {
        this.listeners.push({ event: eventKey, callback: callback, scope: scope });
        return this;
    },
    once: function(eventKey, callback, scope) {
        this.listeners.push({ event: eventKey, callback: callback, scope: scope, once: true });
        return this;
    },
    off: function(eventKey, callback, scope) {
        for(var i = this.listeners.length - 1; i >= 0; i--) {
            if(this.listeners[i].event === eventKey && this.listeners[i].callback === callback && this.listeners[i].scope === scope) {
                this.listeners.splice(i, 1);
            }
        }
        return this;
    },
    trigger: function(eventKey, data) {
        var onceListeners = [];
        for(var i = 0; i < this.listeners.length; i++) {
            if(this.listeners[i].event === eventKey) {
                this.listeners[i].callback.apply(this.listeners[i].scope || this, data || []);
                if(this.listeners[i].once) {
                    onceListeners.push(this.listeners[i]);
                }
            }
        }
        for(i = 0; i < onceListeners.length; i++) {
            this.off(eventKey, onceListeners[i].callback, onceListeners[i].scope);
        }
    },
    removeListeners: function() {
        this.listeners = [];
    }
});
dbkjs.modules.Observable.prototype.constructor = dbkjs.modules.Observable;

/**
 * dbkjs.modules.FeaturesManager
 * @constructor
 */
dbkjs.modules.FeaturesManager = function() {
    dbkjs.modules.Observable.call(this);
    this.featureslist = $("<div><h3>Getekende symbolen</h3></div>")
        .attr("id", "edit-features-list")
        .addClass("panel");
    var featurescontainer = $("<div class='features-container'><table class='table table-striped features-table'>" +
        "<thead>" +
        "<tr><td colspan='3'><a title='Delete all' href='#' class='btn btn-info btn-lg remove-all'><span class='glyphicon glyphicon-trash'></span></a>" +
            "<div style='float: right;'><a title='Save all' href='#' class='btn btn-info btn-lg save-all'><i class='fa fa-save'></i></a> &nbsp; <a title='Load' href='#' class='btn btn-info btn-lg load-all'><i class='fa fa-upload'></i></a></div>" +
        "</td></tr>" +
        "<tr><td>Symb.</td><td colspan='2'>Label</td></tr>" +
        "</thead>" +
        "<tbody></tbody>" +
        "</table></div>");
    this.featureslist.append(featurescontainer);
    this.featureslist.appendTo("body");

    this.propertiesGrid = $("<div class='panel sub-panel' id='edit-symbol-properties'>" +
        "<div class='row prop-radius' style=\"display: none;\">" +
            "<div class='col-md-3'>" +
                "<label for='symbolRadiusSlider'>Grootte:</label>" +
            "</div>" +
            "<div class='col-md-9' style=\"padding-left: 25px;\">" +
                '<input id="symbolRadiusSlider" name="radius" type="text" />' +
            "</div>" +
        "</div>" +
        "<div class='row prop-rotation' style=\"display: none;\">" +
            "<div class='col-md-3'>" +
                "<label for='symbolRotationSlider'>Rotatie:</label>" +
            "</div>" +
            "<div class='col-md-9' style=\"padding-left: 25px;\">" +
                '<input id="symbolRotationSlider" name="rotation" type="text" />' +
            "</div>" +
        "</div>" +
        "<div class='row prop-triangleFactor' style=\"display: none;\">" +
            "<div class='col-md-3'>" +
                "<label for='triangleFactor'>Breedte:</label>" +
            "</div>" +
            "<div class='col-md-9' style=\"padding-left: 25px;\">" +
                '<input id="triangleFactor" name="triangleFactor" type="text" />' +
            "</div>" +
        "</div>" +
        "<div class='row prop-label' style=\"display: none;\">" +
            "<div class='col-md-3'>" +
                "<label for='label'>Label:</label>" +
            "</div>" +
            "<div class='col-md-9'>" +
                "<input type='text' name='label' id='label' class='form-control'>" +
            "</div>" +
        "</div>" +
    "</div>");
    this.propertiesGrid.appendTo("body");

    $("#symbolRadiusSlider").slider({ tooltip: "show", min: 2, max: 20, value: 12 });
    $("#symbolRotationSlider").slider({ tooltip: "show", min: -180, max: 180, value: 0 });
    $("#triangleFactor").slider({ tooltip: "show", min: 0, max: 15, value: 1 });

    this.preventEvent = false;

    this.featurestable = featurescontainer.find("tbody");
    this.featureslist.on("click", ".remove-feature, .remove-all", (function(e) {
        e.preventDefault();
        e.stopPropagation();
        var removeBtn = $(e.currentTarget);
        if(removeBtn.hasClass("remove-all")) {
            this.removeAllFeatures();
            return;
        }
        this.removeFeatureByRow(removeBtn.closest("tr"));
    }).bind(this));
    this.featureslist.on("click", ".load-all", (function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.trigger("loadFeatures");
    }).bind(this));
    this.featureslist.on("click", ".save-all", (function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.trigger("saveFeatures");
    }).bind(this));
    this.featureslist.on("click mouseenter mouseout", ".feature-row", (function(e) {
        e.preventDefault();
        e.stopPropagation();
        var featureid = $(e.currentTarget).data("featureid");
        if(e.type === "click") {
            this.trigger("featureSelected", [ featureid ]);
        } else if(e.type === "mouseenter") {
            this.trigger("featureOver", [ featureid ]);
        } else if(e.type === "mouseout") {
            this.trigger("featureOut", [ featureid ]);
        }
    }).bind(this));
    this.watchPropertiesChange();
};
dbkjs.modules.FeaturesManager.prototype = Object.create(dbkjs.modules.Observable.prototype);
$.extend(dbkjs.modules.FeaturesManager.prototype, {
    showFeaturesList: function() {
        this.featureslist.removeClass("hidden").addClass("visible");
    },
    hideFeaturesList: function() {
        this.featureslist.removeClass("visible").addClass("hidden");
    },
    showPropertiesGrid: function() {
        this.propertiesGrid.removeClass("hidden").addClass("visible");
    },
    hidePropertiesGrid: function() {
        this.propertiesGrid.removeClass("visible").addClass("hidden");
    },
    addFeature: function(feature) {
        this.featurestable.append(
            ['<tr class="feature-row" data-featureid="', feature.id,'">',
                "<td class='symbol'>",
                '<img src="', dbkjs.basePath, feature.attributes.image, '" />',
                "</td>",
                "<td class='lbl'>",
                "<span>", feature.attributes.label, "</span>",
                "</td>",
                "<td class='remove'>",
                '<a href="#" class="fa fa-remove remove-feature"></a>',
                "</td>",
                "</tr>"].join(""));
        this.setSelectedFeature(feature);
    },
    updateFeature: function(feature) {
        var row = this.findRowByFeatureId(feature.id);
        row.find(".lbl span").html(feature.attributes.label);
    },
    removeAllFeatures: function() {
        this.featurestable.children().remove();
        this.trigger("removeAllFeatures");
    },
    removeFeatureByRow: function(row) {
        this.removeFeature(row.data("featureid"), row);
    },
    removeFeature: function(featureid, row) {
        if(row) {
            row.remove();
        } else {
            this.findRowByFeatureId(featureid).remove();
        }
        this.trigger("removeFeature", [ featureid ]);
    },
    setSelectedFeature: function(feature) {
        this.featurestable.find(".info").removeClass("info");
        this.findRowByFeatureId(feature.id).addClass("info");
        this.preventEvent = true;
        this.setPropertiesGrid(feature);
        this.preventEvent = false;
    },
    unsetSelectedFeature: function(feature) {
        this.findRowByFeatureId(feature.id).removeClass("info");
        this.propertiesGrid.removeClass("has-selected-feature");
    },
    findRowByFeatureId: function(featureid) {
        return this.featurestable.find(["[data-featureid=", featureid, "]"].join(""));
    },
    setPropertiesGrid: function(feature) {
        this.propertiesGrid.addClass("has-selected-feature");
        this.propertiesGrid.find("[name='label']").val(feature.attributes.label);
        this.propertiesGrid.find(".prop-label").show();
        if(feature.attributes.hasOwnProperty("radius")) {
            this.propertiesGrid.find(".prop-radius").show();
            this.propertiesGrid.find("#symbolRadiusSlider").slider('setValue', parseInt(feature.attributes.radius, 10));
        } else {
            this.propertiesGrid.find(".prop-radius").hide();
        }
        if(feature.attributes.hasOwnProperty("rotation")) {
            this.propertiesGrid.find(".prop-rotation").show();
            this.propertiesGrid.find("#symbolRotationSlider").slider('setValue', parseInt(feature.attributes.rotation, 10));
        } else {
            this.propertiesGrid.find(".prop-rotation").hide();
        }
        if(feature.attributes.hasOwnProperty("triangleFactor")) {
            this.propertiesGrid.find(".prop-triangleFactor").show();
            this.propertiesGrid.find("#triangleFactor").slider('setValue', parseInt(feature.attributes.triangleFactor, 10));
        } else {
            this.propertiesGrid.find(".prop-triangleFactor").hide();
        }
    },
    watchPropertiesChange: function() {
        var propGrid = this.propertiesGrid.find("input");
        var me = this;
        propGrid.on("keyup change", function(e) {
            if(me.preventEvent) {
                return;
            }
            var name = this.getAttribute("name");
            if(["label", "radius", "rotation", "triangleFactor"].indexOf(name) === -1) {
                return;
            }
            var prop = {};
            prop[name] = this.value;
            me.trigger("propertyUpdated", [ prop ]);
        });
    }
});
dbkjs.modules.FeaturesManager.prototype.constructor = dbkjs.modules.FeaturesManager;

/**
 * dbkjs.modules.SymbolManager
 * @param symbols {Array}
 * @param quickSelectContainer {Element}
 * @param symbolPickerBtn {Element}
 * @constructor
 */
dbkjs.modules.SymbolManager = function(symbols, quickSelectContainer, symbolPickerBtn) {
    dbkjs.modules.Observable.call(this);
    this.symbolTree = symbols;
    this.symbols = {};
    this.symbolFilter = "";
    this.recentlyUsed = { point: [], line: [], area: [] };
    this.activeSymbol = { point: null, line: null, area: null };
    this.quickSelectContainer = $(quickSelectContainer);

    this.createSymbolsIndex();
    this.symbolpicker = this.createSymbolPicker();
    this.loadRecentlyUsedSymbols();

    // Listeners
    $(symbolPickerBtn).on("click", (function() {
        $("#edit-symbol-properties").hide();
        this.symbolpicker.show(); }).bind(this));
    this.quickSelectContainer.add(this.symbolpicker.find(".panel-body"))
        .on("click", ".symbol-btn", this.handleSymbolButtonClick.bind(this));
};
dbkjs.modules.SymbolManager.prototype = Object.create(dbkjs.modules.Observable.prototype);
$.extend(dbkjs.modules.SymbolManager.prototype, {

    setFilter: function(filter) {
        this.symbolFilter = filter;
        var containers = this.quickSelectContainer.add(this.symbolpicker.find(".panel-body"));
        containers.find(".maincategory, .subcategory, .symbol-btn, .empty-message").addClass("hidden").removeClass("visible");
        containers.find(".type-" + this.symbolFilter).removeClass("hidden").addClass("visible");
        containers.find(".subcategory").each(function() {
            if($(this).children(".visible").length > 0) {
                $(this).removeClass("hidden").addClass("visible");
            }
        });
        containers.find(".maincategory").each(function() {
            if($(this).children(".visible").length > 0) {
                $(this).removeClass("hidden").addClass("visible");
            }
        });

        var selected = this.quickSelectContainer.find(".symbol-btn").not(".hidden").first();
        if(selected.length) {
            this.setActiveSymbol(selected.data("symbolid"));
        }
    },

    /**
     * Create indexed list of all symbols for easy lookup
     */
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
        html.push("<div class=\"", (rootLevel ? "maincategory" : "subcategory") ,"\">");
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
        html.push("</div>");
        return html.join("");
    },

    createSymbolLarge: function(symbol) {
        return ['<a href="#" class="symbol-btn symbol-large type-', symbol.type, '" data-symbolid="', symbol.id, '">',
            '<img src="', symbol.image,'">',
            '<span>', symbol.label,'</span>',
            '</a>'].join("");
    },

    createSymbolButton: function(symbol) {
        return [
            '<button class="btn symbol-btn type-', symbol.type, '" data-symbolid="', symbol.id, '">',
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
        this.loadRecentlyUsedType("point");
        this.loadRecentlyUsedType("line");
        this.loadRecentlyUsedType("area");
    },

    loadRecentlyUsedType: function(type) {
        var symbol;
        // Reverse order because buttons are prepended
        if(this.recentlyUsed[type].length === 0) {
            this.quickSelectContainer.prepend("<span class='empty-message type-" + type + "'>Selecteer eerst een symbool door op de + te klikken</span>");
        }
        for(var i = this.recentlyUsed[type].length - 1; i >= 0; i--) {
            symbol = this.getSymbol(this.recentlyUsed[type][i]);
            if(symbol) {
                this.addToQuickSelect(symbol);
            }
        }
        if(!symbol) {
            return;
        }
        if(this.activeSymbol[type] === null) {
            this.activeSymbol[type] = symbol;
        }
    },

    saveRecentlyUsedSymbols: function() {
        window.localStorage.setItem("edit.recentlyused", JSON.stringify(this.recentlyUsed));
    },

    addToRecentlyUsed: function(symbol) {
        var type = symbol.type;
        if(this.recentlyUsed[type].indexOf(symbol.id) === -1) {
            this.recentlyUsed[type].unshift(symbol.id);
        }
        if(this.recentlyUsed[type].length > 10) {
            this.recentlyUsed[type].splice(10);
        }
        this.saveRecentlyUsedSymbols();
    },

    addToQuickSelect: function(symbol) {
        var quickBtn = this.quickSelectContainer.find("[data-symbolid='" + symbol.id + "']");
        this.quickSelectContainer.find(".empty-message.type-" + symbol.type).remove();
        if(quickBtn.length === 0) {
            quickBtn = $(this.createSymbolButton(symbol));
            this.quickSelectContainer.prepend(quickBtn);
            this.addToRecentlyUsed(symbol);
        }
    },

    handleSymbolButtonClick: function(e) {
        this.symbolpicker.hide();
        $("#edit-symbol-properties").show();
        this.setActiveSymbol(e.currentTarget.getAttribute("data-symbolid"));
    },

    setActiveSymbol: function(symbolid) {
        var symbol = this.getSymbol(symbolid);
        if(!symbol) {
            return;
        }
        this.activeSymbol[symbol.type] = symbol;
        this.addToQuickSelect(symbol);
        this.quickSelectContainer.find(".btn-primary").removeClass("btn-primary");
        this.quickSelectContainer.find("[data-symbolid='" + symbol.id + "']").addClass("btn-primary");
        this.trigger("activeSymbolChanged", [ symbol ]);
    },

    getActiveSymbol: function() {
        return this.activeSymbol[this.symbolFilter] || this.activeSymbol["point"];
    }

});
dbkjs.modules.SymbolManager.prototype.constructor = dbkjs.modules.SymbolManager;

/***
 * dbkjs.modules.EditButton
 * @param id {string}
 * @param title {string}
 * @param parent {jQuery}
 * @param iclass {string}
 * @param conf {Object}
 * @returns {dbkjs.modules.EditButton}
 * @constructor
 */
dbkjs.modules.EditButton = function(id, title, parent, iclass, conf) {
    dbkjs.modules.Observable.call(this);
    this.active = false;
    this.id = id;
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
dbkjs.modules.EditButton.prototype = Object.create(dbkjs.modules.Observable.prototype);
$.extend(dbkjs.modules.EditButton.prototype, {
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