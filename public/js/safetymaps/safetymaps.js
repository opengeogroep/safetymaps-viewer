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

(function initSafetyMaps() {
    safetymaps.selectedClusterFeature = null;
})();

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