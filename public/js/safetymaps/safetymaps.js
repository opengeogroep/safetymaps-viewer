/*
 *  Copyright (c) 2018 B3Partners (info@b3partners.nl)
 *
 *  This file is part of safetymaps-viewer
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
 *  along with safetymapDBK. If not, see <http://www.gnu.org/licenses/>.
 *
 */

/* global OpenLayers, dbkjs */

/**
 * Global safetymaps object.
 *
 * Events:
 *   object_select: clusterFeature in event must be zoomed to and selected by provider
 *   object_deselect: object must be deselected by provider (remove features from
 *      vector layers, tabs, etc).
 *
 */
var safetymaps = safetymaps || {};

/**
 * Make object providers deselect any selected object.
 */
safetymaps.deselectObject = function() {
    safetymaps.selectedClusterFeature = null;
    $(this).triggerHandler("object_deselect");
};

safetymaps.selectObject = function(clusterFeature, zoom) {
    safetymaps.selectedClusterFeature = clusterFeature;

    console.log("Select " + clusterFeature.attributes.type + " object '" + clusterFeature.attributes.label + "'" + (zoom ? "' at " + extentWkt : " - no zoom"));
    var extentWkt = clusterFeature.attributes.apiObject.extent;
    if(zoom && extentWkt) {


        // Parse "BOX(n n,n n)" to array of left, bottom, top, right
        var bounds = extentWkt.match(/[0-9. ,]+/)[0].split(/[ ,]/);
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

    if(! $(this).triggerHandler("object_select", [clusterFeature]) ) {
        console.log("No object selected by object_select listeners");
    }
};

safetymaps.infoWindow = {
    windowByTabs: null,
    commonWindow: null,
    windows: null,
    separateWindowMode: null,

    initialize: function(separateWindowMode) {
        //console.log("infoWindow: initialize, separate windows: " + !!separateWindowMode);

        this.separateWindowMode = separateWindowMode;
        if(this.separateWindowMode) {
            this.windowByTabs = {};
            this.windows = {};
        } else {
            this.commonWindow = new SplitScreenWindow("commonInfoWindow");
            this.commonWindow.createElements(); // no title
            this.createTabElements(this.commonWindow);
        }
    },

    createTabElements: function(window) {
        var div = $("<div class='tabbable tabs-bottom'></div>");
        window.tabContent = $("<div class='tab-content'></div>");
        window.tabs = $("<ul class='nav nav-pills'></ul>");
        div.append(window.tabContent);
        div.append(window.tabs);
        window.getView().append(div);
    },

    /**
     * Create and add a new window when not using a common window. Returns the
     * newly created SplitScreenWindow or the common window.
     *
     * @param {string} windowId Name for the window
     * @param {string} title Title text of the window, shown when window contains a single tab and showSingleTab is false
     * @param {boolean} showSingleTab Whether to show tabs even if window only has single tab. If false title is also shown.
     * @returns {SplitScreenWindow}
     */
    addWindow: function(windowId, title, showSingleTab) {
        var window;
        if(this.separateWindowMode) {
            //console.log("infoWindow: add window " + windowId);
            window = new SplitScreenWindow(windowId);
            window.createElements(title);
            this.createTabElements(window);
            window.showSingleTab = showSingleTab;
            this.windows[windowId] = window;
        } else {
            console.log("infoWindow: add window " + windowId + " [ignored, integrated window mode]");
            window = this.commonWindow;
        }
        return window;
    },

    /**
     * Add a new tab to a window.
     * @param {string} windowId id of the window to add the tab to
     * @param {string} tabId DOM id for tab
     * @param {string} label the label for the a element
     * @param {string} clazz CSS class for the tab
     * @param {string} div tab contents, set to falsy for no-op
     * @param {string} position Position in tab list, either first, last or undefined/null (meaning in order of calling addTab())
     */
    addTab: function(windowId, tabId, label, clazz, div, position) {
        var window = this.separateWindowMode ? this.windows[windowId] : this.commonWindow;

        if(!div) {
            return;
        }

        if(window) {
            //console.log("infoWindow: window " + windowId + ", add tab " + tabId + " (class " + clazz + ")" + (position ? ", position " + position : ""));

            $("#tab_" + tabId).remove();
            $("#tab_li_" + tabId).remove();

            var active = window.tabs.find("li").length === 0 ? "active" : "";
            var tab = $("<div class='tab-pane " + clazz + " " + active + "' id='tab_" + tabId + "'></div>");
            tab.append(div);
            window.tabContent.append(tab);
            var li = "<li class='" + clazz + " " + active + " position_" + position + "' id='tab_li_" + tabId + "'><a data-toggle='tab' href='#tab_" + tabId + "'>" + label + "</a></li>";
            if(position === "first") {
                window.tabs.prepend(li);
            } else if(position !== "last") {
                var last = window.tabs.find(".position_last");
                if(last.length > 0) {
                    $(li).insertBefore(last);
                } else {
                    window.tabs.append(li);
                }
            } else {
                window.tabs.append(li);
            }


        } else {
            console.log("infoWindow: ERROR: cannot add tab '" + tabId + "' tab to unknown window " + windowId);
        }
    },

    removeTab: function(windowId, tabId) {
        var window = this.separateWindowMode ? this.windows[windowId] : this.commonWindow;
        if(window) {
            //console.log("infoWindow: remove tab " + tabId);

            window.tabContent.find(".tab-pane #tab_" + tabId).remove();
            window.tabs.find("li. #tab_li_" + tabId).remove();
        } else {
            console.log("infoWindow: ERROR: cannot remove tab '" + tabId + "' tab from unknown window " + windowId);
        }
    },

    removeTabs: function(windowId, clazz) {
        var window = this.separateWindowMode ? this.windows[windowId] : this.commonWindow;
        if(window) {
            //console.log("infoWindow: remove tabs for class " + clazz);

            window.tabContent.find(".tab-pane." + clazz).remove();
            window.tabs.find("li." + clazz).remove();
        } else {
            console.log("infoWindow: ERROR: cannot remove '" + clazz + "' tabs from unknown window " + windowId);
        }
    },

    showTab: function(windowId, tabId, showWindow) {
        var window = this.separateWindowMode ? this.windows[windowId] : this.commonWindow;
        if(window) {
            //console.log("infoWindow: show tab " + tabId);
            window.tabContent.find(".tab-pane.active").removeClass("active");
            window.tabs.find("li.active").removeClass("active");
            window.tabContent.find("#tab_" + tabId).addClass("active");
            window.tabs.find("#tab_li_" + tabId).addClass("active");

            if(this.separateWindowMode && !window.showSingleTab) {
                if(window.tabs.find("li").length === 1) {
                    window.tabs.hide();
                }
            } else {
                window.tabs.show();
            }

            if(showWindow) {
                window.show();
            }
        } else {
            console.log("infoWindow: ERROR: cannot show tab '" + tabId + "' tab for unknown window " + windowId);
        }
    }
};

(function initSafetyMaps() {
    safetymaps.selectedClusterFeature = null;

    // TODO: replace /api/organisation.json for global settings

    //safetymaps.infoWindow.initialize(dbkjs.options.separateWindowMode);
})();
