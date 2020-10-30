/*
 *  Copyright (c) 2018 B3Partners (info@b3partners.nl)
 *
 *  This file is part of safetymaps-viewer.
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
 *  along with safetymaps-viewer. If not, see <http://www.gnu.org/licenses/>.
 */

/* global dbkjs, safetymaps, OpenLayers, Proj4js, jsts, moment, i18n, Mustache, PDFObject */

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

safetymaps.utils.geometry.createMultiLineStringLabelPointFeatures = function(line, minSegmentLength) {
    var features = [];

    // MultiLineString geometry
    for(var j = 0; j < line.components.length; j++) {
        for(var k = 0; k < line.components[j].components.length-1; k++) {
            var start = line.components[j].components[k];
            var end = line.components[j].components[k+1];

            if(start.distanceTo(end) < minSegmentLength) {
                continue;
            }

            var midx = start.x + (end.x - start.x)/2;
            var midy = start.y + (end.y - start.y)/2;

            var opposite = (end.y - start.y);
            var adjacent = (end.x - start.x);
            var theta = Math.atan2(opposite, adjacent);
            var angle = -theta * (180/Math.PI);

            var labelPoint = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(midx, midy), {
                rotation: angle,
                theta: theta
            });
            features.push(labelPoint);
        }
    }
    return features;
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

function getNonInterfaceObscuredBounds(layer) {
    var gf = new jsts.geom.GeometryFactory();
    var resolution = layer.map.getResolution();
    var buf = 50 * resolution;
    var topBuf = buf;
    var leftBuf = buf;
    var el = $("#btngrp_object");
    if(el.length === 1) {
        topBuf = (el.position().top + el.outerHeight(true) + 25) * resolution;
    }
    var el = $("#bottom_left_buttons");
    if(el.length === 1) {
        leftBuf = (el.position().left + el.outerWidth(true) + 30) * resolution;
    }
    var screenBounds = layer.map.getExtent();
    var left = screenBounds.left ? screenBounds.left : 0;
    var newScreenBounds = new OpenLayers.Bounds([screenBounds.left + leftBuf, screenBounds.bottom + buf, screenBounds.right - buf, screenBounds.top - topBuf]);

    var newBoundsGeom = gf.createLinearRing([
        new jsts.geom.Coordinate(screenBounds.left + leftBuf, screenBounds.bottom + buf),
        new jsts.geom.Coordinate(screenBounds.left + leftBuf, screenBounds.top - topBuf),
        new jsts.geom.Coordinate(screenBounds.right - buf, screenBounds.top - topBuf),
        new jsts.geom.Coordinate(screenBounds.right - buf, screenBounds.bottom + buf),
        new jsts.geom.Coordinate(screenBounds.left + leftBuf, screenBounds.bottom + buf)
    ]);
    //var screenBoundsWkt = new OpenLayers.Format.WKT().write(new OpenLayers.Feature.Vector(screenBounds.toGeometry()));
    //console.log("Screen bounds are: " + screenBoundsWkt + ", non interface obscured bounds: " + new jsts.io.WKTWriter().write(newBoundsGeom));
    return {
        bounds: newScreenBounds,
        jtsGeometry: newBoundsGeom,
        jtsCenter: new jsts.geom.Coordinate((newScreenBounds.left + newScreenBounds.right)/2, (newScreenBounds.top + newScreenBounds.bottom)/2)
    };
};

OpenLayers.Strategy.Cluster.prototype.cluster = function (event) {
    var wktParser = new OpenLayers.Format.WKT();
    var gf = new jsts.geom.GeometryFactory();
    var filterFunction = this.layer.options.filterFunction;
    if ((!event || event.zoomChanged || (event.type === "moveend" && !event.zoomChanged)) && this.features) {
        var screenBounds = this.layer.map.getExtent();
        var nonInterfaceObscuredBounds = getNonInterfaceObscuredBounds(this.layer);

        var resolution = this.layer.map.getResolution();
        this.resolution = resolution;
        var clusters = [];
        var nonClusteredFeatures = [];
        var feature, clustered, cluster;
        for (var i = 0; i < this.features.length; ++i) {
            feature = this.features[i];
            if (feature.originalGeometry) {
                feature.geometry = feature.originalGeometry;
                delete feature.originalGeometry;
            }
            if(filterFunction && !filterFunction(feature)) {
                continue;
            }
            if (feature.geometry) {
                if (!nonInterfaceObscuredBounds.bounds.intersectsBounds(feature.geometry.getBounds())) {
                    if (feature.attributes.apiObject.selectiekader) {
                        var theGeom = wktParser.read(feature.attributes.apiObject.selectiekader).geometry;
                        if (screenBounds.intersectsBounds(theGeom.getBounds())) {
                            //console.log("feature point outside screen but selectiekader inside", feature);
                            var line = gf.createLineString([
                                //new jsts.geom.Coordinate(this.layer.map.getCenter().lon, this.layer.map.getCenter().lat),
                                nonInterfaceObscuredBounds.jtsCenter,
                                new jsts.geom.Coordinate(feature.geometry.x, feature.geometry.y)
                            ]);
                            var newLocation = line.intersection(nonInterfaceObscuredBounds.jtsGeometry);
                            //var w = new jsts.io.WKTWriter();
                            //console.log("object " + feature.attributes.label + " bound intersect line: " + w.write(line) + ", display point: " + w.write(newLocation));
                            feature.originalGeometry = feature.geometry;
                            feature.geometry = new OpenLayers.Geometry.Point(newLocation.getX(), newLocation.getY());

                        }else{continue;}
                    }else{continue;}
                }
                // Only cluster if resolution above feature.attributes.minClusteringResolution
                if(feature.attributes.minClusteringResolution && resolution < feature.attributes.minClusteringResolution) {
                    nonClusteredFeatures.push(feature);
                } else {
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

        if(nonClusteredFeatures.length > 0) {
            this.clustering = true;
            this.layer.addFeatures(nonClusteredFeatures);
            this.clustering = false;
        }
    }
},

safetymaps.utils.setBrokenImage = function(image) {
  
    image.src =safetymaps.creator.api.imagePath+"missing.gif";
},

safetymaps.utils.getAbsoluteUrl = (function() {
	var a;

	return function(url) {
		if(!a) a = document.createElement('a');
		a.href = url;

		return a.href;
	};
})();
safetymaps.utils.Permalink =
    OpenLayers.Class(OpenLayers.Control.Permalink, {
    //argParserClass: dbkjs.ArgParser,
    SELECT_ARGUMENT_KEY: "select",
    initialize: function (options) {
        OpenLayers.Control.Permalink.prototype.initialize.apply(this, arguments);
    },
    updateLink: function () {
        var separator = this.anchor ? '#' : '?';
        var updateLinkhref = this.base;
        var anchor = null;
        if (updateLinkhref.indexOf("#") !== -1 && this.anchor === false) {
            anchor = updateLinkhref.substring(updateLinkhref.indexOf("#"), updateLinkhref.length);
        }
        if (updateLinkhref.indexOf(separator) !== -1) {
            updateLinkhref = updateLinkhref.substring(0, updateLinkhref.indexOf(separator));
        }
        var splits = updateLinkhref.split("#");
        updateLinkhref = splits[0] + separator + OpenLayers.Util.getParameterString(this.createParams());
        if (anchor) {
            updateLinkhref += anchor;
        }
        if (this.anchor && !this.element) {
            window.location.href = updateLinkhref;
        } else {
            this.element.href = updateLinkhref;
        }
    },
    createParams: function (center, zoom, layers) {
        center = center || this.map.getCenter();

        var params = OpenLayers.Util.getParameters(this.base);
        // If there's still no center, map is not initialized yet.
        // Break out of this function, and simply return the params from the
        // base link.
        if (dbkjs.options) {
            if (dbkjs.options.dbk && dbkjs.options.dbk !== 0) {
                params[i18n.t('app.queryDBK')] = dbkjs.options.dbk;
            }
        }
        if (center) {
            //zoom
            params.zoom = zoom || this.map.getZoom();

            //lon,lat
            var lat = center.lat;
            var lon = center.lon;

            if (this.displayProjection) {
                var mapPosition = OpenLayers.Projection.transform(
                    { x: lon, y: lat },
                    this.map.getProjectionObject(),
                    this.displayProjection
                );
                lon = mapPosition.x;
                lat = mapPosition.y;
            }
            params.lat = Math.round(lat * 100000) / 100000;
            params.lon = Math.round(lon * 100000) / 100000;


            //layers
            layers = this.map.layers;
            params.ly = [];
            for (var i = 0, len = layers.length; i < len; i++) {
                var layer = layers[i];
                if (layer.isBaseLayer) {
                    if (layer === this.map.baseLayer) {
                        params.b = layer.metadata.pl;
                    }
                } else {
                    if (layer.metadata.pl && layer.getVisibility()) {
                        params.ly.push(layer.metadata.pl);
                    }
                }
            }
        }
        return params;
    },
    CLASS_NAME: "dbkjs.Permalink"
});

// https://stackoverflow.com/questions/5518181/jquery-deferreds-when-and-the-fail-callback-arguments
// http://jsfiddle.net/InfinitiesLoop/yQsYK/51/
$.whenAll = function( firstParam ) {
    var args = arguments,
        sliceDeferred = [].slice,
        i = 0,
        length = args.length,
        count = length,
        rejected,
        deferred = length <= 1 && firstParam && jQuery.isFunction( firstParam.promise )
            ? firstParam
            : jQuery.Deferred();

    function resolveFunc( i, reject ) {
        return function( value ) {
            rejected |= reject;
            args[ i ] = arguments.length > 1 ? sliceDeferred.call( arguments, 0 ) : value;
            if ( !( --count ) ) {
                // Strange bug in FF4:
                // Values changed onto the arguments object sometimes end up as undefined values
                // outside the $.when method. Cloning the object into a fresh array solves the issue
                var fn = rejected ? deferred.rejectWith : deferred.resolveWith;
                fn.call(deferred, deferred, sliceDeferred.call( args, 0 ));
            }
        };
    }

    if ( length > 1 ) {
        for( ; i < length; i++ ) {
            if ( args[ i ] && jQuery.isFunction( args[ i ].promise ) ) {
                args[ i ].promise().then( resolveFunc(i), resolveFunc(i, true) );
            } else {
                --count;
            }
        }
        if ( !count ) {
            deferred.resolveWith( deferred, args );
        }
    } else if ( deferred !== firstParam ) {
        deferred.resolveWith( deferred, length ? [ firstParam ] : [] );
    }
    return deferred.promise();
};
