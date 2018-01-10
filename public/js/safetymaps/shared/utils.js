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

OpenLayers.Strategy.Cluster.prototype.cluster = function (event) {
    var wktParser = new OpenLayers.Format.WKT();
    var gf;
    if ((!event || event.zoomChanged || (event.type === "moveend" && !event.zoomChanged)) && this.features) {
        var screenBounds = this.layer.map.getExtent();
        var resolution = this.layer.map.getResolution();
        this.resolution = resolution;
        var clusters = [];
        var feature, clustered, cluster;
        for (var i = 0; i < this.features.length; ++i) {
            feature = this.features[i];
            if (feature.originalGeometry) {
                feature.geometry = feature.originalGeometry;
                delete feature.originalGeometry;
            }
            if (feature.geometry) {
                if (!screenBounds.intersectsBounds(feature.geometry.getBounds())) {
                    if (feature.attributes.apiObject.selectiekader) {
                        var theGeom = wktParser.read(feature.attributes.apiObject.selectiekader).geometry;
                        if (screenBounds.intersectsBounds(theGeom.getBounds())) {
                            console.log("feature point outside screen but selectiekader inside", feature);
                            if (!gf) gf = new jsts.geom.GeometryFactory();
                            var buf = 50 * this.layer.map.getResolution();
                            var smallerScreenBounds = gf.createLinearRing([
                                new jsts.geom.Coordinate(screenBounds.left + buf, screenBounds.bottom + buf),
                                new jsts.geom.Coordinate(screenBounds.left + buf, screenBounds.top - buf),
                                new jsts.geom.Coordinate(screenBounds.right - buf, screenBounds.top - buf),
                                new jsts.geom.Coordinate(screenBounds.right - buf, screenBounds.bottom + buf),
                                new jsts.geom.Coordinate(screenBounds.left + buf, screenBounds.bottom + buf)
                            ]);
                            var line = gf.createLineString([
                                new jsts.geom.Coordinate(this.layer.map.getCenter().lon, this.layer.map.getCenter().lat),
                                new jsts.geom.Coordinate(feature.geometry.x, feature.geometry.y)
                            ]);
                            var newLocation = line.intersection(smallerScreenBounds);
                            var w = new jsts.io.WKTWriter();
                            console.log("smallerScreenBounds", w.write(smallerScreenBounds), "line", w.write(line), "newLocation",w.write(newLocation), newLocation);
                            feature.originalGeometry = feature.geometry;
                            feature.geometry = new OpenLayers.Geometry.Point(newLocation.getX(), newLocation.getY());

                        }else{continue;}
                    }else{continue;}
                }
                clustered = false;
                for (var j = clusters.length - 1; j >= 0; --j) {
                    cluster = clusters[j];
                    if (this.shouldCluster(cluster, feature)) {
                        this.addToCluster(cluster, feature);
                        clustered = true;
                        break;
                    }
                }
                if (!clustered) {
                    clusters.push(this.createCluster(this.features[i]));
                }

            }
        }
        this.clustering = true;
        this.layer.removeAllFeatures();
        this.clustering = false;
        if (clusters.length > 0) {
            if (this.threshold > 1) {
                var clone = clusters.slice();
                clusters = [];
                var candidate;
                for (var i = 0, len = clone.length; i < len; ++i) {
                    candidate = clone[i];
                    if (candidate.attributes.count < this.threshold) {
                        Array.prototype.push.apply(clusters, candidate.cluster);
                    } else {
                        clusters.push(candidate);
                    }
                }
            }
            this.clustering = true;
            // A legitimate feature addition could occur during this
            // addFeatures call.  For clustering to behave well, features
            // should be removed from a layer before requesting a new batch.
            this.layer.addFeatures(clusters);
            this.clustering = false;
        }
        this.clusters = clusters;

    }
},

safetymaps.utils.getAbsoluteUrl = (function() {
	var a;

	return function(url) {
		if(!a) a = document.createElement('a');
		a.href = url;

		return a.href;
	};
})();
