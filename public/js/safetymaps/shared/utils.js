/*
 *  Copyright (c) 2017 B3Partners (info@b3partners.nl)
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

 /*
  * For common use by safetymaps-viewer and safetymaps-flamingo
  */

var safetymaps = safetymaps || {};
safetymaps.utils = {};
safetymaps.utils.geometry = {};

safetymaps.utils.getAjaxError = function(jqXHR, textStatus, errorThrown) {
    var msg = textStatus;
    if(jqXHR.status) {
        msg += ", status: " + jqXHR.status + (jqXHR.statusText ? " " + jqXHR.statusText : "");
    }
    if(errorThrown && errorThrown !== jqXHR.statusText) {
        msg += ", " + errorThrown;
    }
    return msg;
};

safetymaps.utils.geometry.getLastLineSegmentAngle = function(lineGeometry) {
    var vertices = lineGeometry.getVertices();
    var end = vertices[vertices.length - 1];

    // Find last vertex before end vertex, but ignore identical vertices at end
    // of line
    var idx = vertices.length - 2;
    while(vertices[idx].x === end.x && vertices[idx].y === end.y && idx > 0) {
        idx--;
    }
    var beforeEnd = vertices[idx];

    return safetymaps.utils.geometry.getAngle(beforeEnd, end);
};

safetymaps.utils.geometry.getAngle = function(p1, p2) {
    // 0 degrees = pointing east
    // use 90 -angle for rotating a triangle symbol pointing north with rotation=0

    var angle = 0;

    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;
    if(dx !== 0) {
        var angle = Math.atan(dy / dx);
        angle = angle * (180 / Math.PI);

        if(dx < 0) {
            // reverse angle for II and III quadrants
            angle = angle + 180;
        }
    }

    return angle;
};