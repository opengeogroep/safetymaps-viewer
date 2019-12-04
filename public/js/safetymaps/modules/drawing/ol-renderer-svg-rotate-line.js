/* 
 * Copyright (c) 2019 B3Partners (info@b3partners.nl)
 * 
 * This file is part of safetymaps-viewer.
 * 
 * safetymaps-viewer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * safetymaps-viewer is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 *  along with safetymaps-viewer. If not, see <http://www.gnu.org/licenses/>.
 */

/* global OpenLayers */

/**
 * Override setStyle function on openlayers SVG.js
 *
 */

(function() {
    var originalSetStyle = OpenLayers.Renderer.SVG.prototype.setStyle;

    OpenLayers.Renderer.SVG.prototype.setStyle = function(node, style, options) {
        //console.log("override setStyle");
        var node = originalSetStyle.call(this, node, style, options);

        if(node._geometryClass === "OpenLayers.Geometry.LineString" && style.rotation && style.rotation !== "undefined" && style.rotationPoint && style.rotationPoint !== "undefined") {
            var rotationPoint = style.rotationPoint.split(",");
            rotationPoint[0] = Number(rotationPoint[0].split("=")[1]);
            rotationPoint[1] = Number(rotationPoint[1].split("=")[1]);

            var resolution = this.getResolution();
            var x = ((rotationPoint[0] - this.featureDx) / resolution + this.left);
            var y = (rotationPoint[1] / resolution - this.top);

            node.setAttributeNS(null, "transform", "rotate(" + style.rotation + "," + x + "," + -y + ")");
        }
        return node;
    };
})();
