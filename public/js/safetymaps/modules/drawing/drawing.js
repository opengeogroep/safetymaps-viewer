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

/* global dbkjs, safetymaps, OpenLayers, Proj4js, jsts, moment, i18n, Mustache, PDFObject */

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};

dbkjs.modules.drawing = {
    id: "dbk.modules.drawing",
    active: false,
    drawMode: null,
    layer: null,
    drawLineControl: null,
    register: function() {
        var me = dbkjs.modules.drawing;

        me.gf = new jsts.geom.GeometryFactory();

        me.options = $.extend({
            showMeasureButtons: false,
            // Set by ViewerApiActionBean
            editAuthorized: false,
            colors: ["yellow", "green", "red", "rgb(45,45,255)", "black"],
            defaultColor: "black",
            eraserWidth: 10,
            eraserInterval: 50
        }, me.options);

        me.color = me.options.defaultColor;

        me.createElements();

        me.initOpenLayersControls();

        $(dbkjs).on("deactivate_exclusive_map_controls", function() {
            me.panel.selectModeDeactivated();
            me.selectControl.activate();
            me.drawLineControl.deactivate();
        });
    },

    createElements: function() {
        var me = this;

        me.button = $("<a>")
            .attr("id", "btn-drawing")
            .attr("title", i18n.t("drawing.title"))
            .addClass("btn btn-default");
        $("<i/>").addClass("fa fa-pencil-square-o").appendTo(me.button);
        me.button.prependTo($("#bottom_left_buttons"));
        me.button.on("click", me.click.bind(me));

        me.panel = new DrawingPanelWindow(me.options);

        $(me.panel).on("hide", function() {
            me.active = false;
            me.deactivate();
        })
        .on("select", function() {
            me.selectMode();
        })
        .on("eraser", function() {
            me.eraserMode();
        })
        .on("color", function(e, color) {
            me.selectControl.unselectAll();
            me.drawLine(color);
        })
        .on("delete", function() {
            me.deleteLine();
        })
        .on("label", function(event, label) {
            me.setLabel(label);
        })
        .on("rotate", function(event, rotation) {
            me.setRotation(rotation);
        });
    },

    initOpenLayersControls: function() {
        var me = this;

        me.layer = new OpenLayers.Layer.Vector("_Drawing", {
            styleMap: new OpenLayers.StyleMap({
                "default": new OpenLayers.Style({
                    strokeColor: "${strokeColor}",
                    strokeWidth: "3",
                    fontSize: 16,
                    rotationPoint: "${rotationPoint}",
                    rotation: "${rotation}",
                    label: "${label}",
                    labelSelect: false,
                    labelOutlineColor: "#ffffff",
                    labelOutlineWidth: 2,
                    labelAlign: "cb"
                }),
                "select": new OpenLayers.Style({
                    strokeWidth: "5"
                }),
                "hover": new OpenLayers.Style({
                    strokeWidth: "4"
                }),
                "temporary": new OpenLayers.Style({
                    strokeColor: "${color}",
                    fillColor: "${color}",
                    fillOpacity: 0.2,
                    strokeOpacity: "${strokeOpacity}",
                    strokeWidth: 3,
                    pointRadius: 6,
                    pointerEvents: "visiblePainted"
                }, {
                    context: {
                        color: function(feature) {
                            return me.drawMode === "eraser" ? "black" : me.color;
                        },
                        strokeOpacity: function(feature) {
                            return me.drawMode === "eraser" ? 0 : 1;
                        }
                    }
                })
            })
        });
        dbkjs.map.addLayer(me.layer);

        // Add to dbkjs.selectControl, otherwise layers will be below others
        // when our selectControl is not active
        dbkjs.selectControl.layers.push(me.layer);

        me.selectControl = new OpenLayers.Control.SelectFeature([me.layer]);
        dbkjs.map.addControl(me.selectControl);
        me.selectControl.deactivate();
        me.layer.events.register("featureselected", me, me.lineSelected);
        me.layer.events.register("featureunselected", me, me.lineUnselected);
        me.layer.events.register("sketchstarted", me, function(evt) {
            //console.log("sketchstarted", evt);
        });
        me.drawLineControl = new OpenLayers.Control.DrawFeature(me.layer, OpenLayers.Handler.Path, {
            callbacks: {
                point: function(evt) {
                    if(me.drawMode === "eraser") {
                        me.erasePoint(evt.x, evt.y, evt.parent);
                    }
                }
            },
            eventListeners: {
                featureadded: function(evt) {
                    if(me.drawMode === "line") {
                        me.lineDrawn(evt.feature);
                    } else if(me.drawMode === "eraser") {
                        me.eraserLineFinished(evt.feature);
                    }
                }
            },
            handlerOptions: {
                freehand: true,
                freehandToggle: "shiftKey"
            }
        });
        dbkjs.map.addControl(me.drawLineControl);
        me.drawLineControl.deactivate();
    },

    click: function() {
        if(this.active) {
            this.active = false;
            this.deactivate();
        } else {
            this.active = true;
            this.color = this.options.defaultColor;
            this.activate();
        }
    },

    activate: function() {
        this.panel.show();
        // Put our layer on top of other vector layers
        dbkjs.map.raiseLayer(dbkjs.modules.drawing.layer, dbkjs.map.layers.length);
        dbkjs.selectControl.deactivate();
        this.drawLine(this.options.defaultColor);
    },

    deactivate: function() {
        this.panel.hide();
        this.drawLineControl.deactivate();
        this.selectControl.deactivate();
        dbkjs.selectControl.activate();
    },

    selectMode: function() {
        $(dbkjs).triggerHandler("deactivate_exclusive_map_controls");
        this.drawLineControl.deactivate();
        this.selectControl.activate();
        this.panel.selectModeActivated();
    },

    eraserMode: function() {
        $(dbkjs).triggerHandler("deactivate_exclusive_map_controls");
        this.selectControl.unselectAll();
        this.selectControl.deactivate();
        this.drawLineControl.activate();
        this.drawMode = "eraser";
        this.panel.eraserModeActivated();
        this.eraserLineProcessedComponents = 0;
    },

    erasePoint: function(x, y, erasedLine) {
        var me = this;
        this.eraserLine = erasedLine;
        if(!this.eraserInterval) {
            this.eraserInterval = setInterval(function() {
                me.processEraser();
            }, this.options.eraserInterval);
        }
    },

    eraserLineFinished: function(feature) {
        this.layer.removeFeatures([feature]);
        this.eraserLine = feature.geometry;
        clearInterval(this.eraserInterval);
        this.eraserInterval = null;
        this.processEraser();
        this.eraserLine = null;
        this.eraserLineProcessedComponents = 0;
    },

    processEraser: function() {
        var extraComponents = (this.eraserLine.components.length - this.eraserLineProcessedComponents);
        if(extraComponents > 1) {
            //console.log("Process " + extraComponents + " eraser line components", this.eraserLine);

            try {
                //var writer = new jsts.io.WKTWriter();

                // Create JSTS line from OpenLayers.Geometry.LineString components
                var coords = [];
                for(var i = this.eraserLineProcessedComponents; i < this.eraserLine.components.length; i++) {
                    var vertex = this.eraserLine.components[i];
                    coords.push(new jsts.geom.Coordinate(vertex.x, vertex.y));
                }
                // Buffer line to erase with scale dependent width
                var lineToErase = this.gf.createLineString(coords).buffer(this.options.eraserWidth * dbkjs.map.getResolution());
                //console.log("JSTS line to erase", writer.write(lineToErase));

                var eraseLineBoundsCoords = lineToErase.getEnvelope().getExteriorRing().getCoordinates();
                var eraseLineBounds = new OpenLayers.Bounds(
                        eraseLineBoundsCoords[0].x, // left
                        eraseLineBoundsCoords[0].y, // bottom
                        eraseLineBoundsCoords[2].x, // right
                        eraseLineBoundsCoords[2].y  // top
                );

                var allNewFeatures = [];
                for(var i = 0; i < this.layer.features.length; i++) {
                    var f = this.layer.features[i];

                    // Skip calculation if entire feature outside eraser line
                    if(!f.geometry.bounds.intersectsBounds(eraseLineBounds)) {
                        allNewFeatures.push(f);
                        continue;
                    }

                    var drawnLineGeometry = this.olLineStringToJSTS(f.geometry);
                    if(!drawnLineGeometry) {
                        // Sometimes line with one coordinate remains, skip it
                        continue;
                    }
                    var difference = drawnLineGeometry.difference(lineToErase);

                    //console.log("Old line", writer.write(drawnLineGeometry), "difference", writer.write(difference));

                    if(difference.getGeometryType() === "MultiLineString") {
                        for(var j = 0; j < difference.getNumGeometries(); j++) {
                            var g = difference.getGeometryN(j);
                            if(g.getGeometryType() === "LineString") {
                                var newGeom = this.jstsLineStringToOlGeometry(g);
                                if(newGeom !== null) {
                                    var newAttributes = $.extend(f.attributes);
                                    if(j > 0) {
                                        newAttributes.label = "";
                                    }
                                    var newFeature = new OpenLayers.Feature.Vector(newGeom, newAttributes);
                                    allNewFeatures.push(newFeature);
                                }
                            }
                        }
                    } else if(difference.getGeometryType() === "LineString") {
                        var newGeom = this.jstsLineStringToOlGeometry(difference);
                        if(newGeom !== null) {
                            var newFeature = new OpenLayers.Feature.Vector(newGeom, f.attributes);
                            allNewFeatures.push(newFeature);
                        }
                    } else {
                        console.log("Unexpects JSTS difference geometry type: " + difference.getGeometryType(), difference);
                        allNewFeatures.push(f);
                    }
                }
                this.layer.removeAllFeatures();
                this.layer.addFeatures(allNewFeatures);

                this.eraserLineProcessedComponents = this.eraserLine.components.length;
            } catch(error) {
                console.log("Error processing eraser, disabling interval", error);
                clearInterval(this.eraserInterval);
            }
        }
    },

    olLineStringToJSTS: function(geometry) {
        if(geometry.components.length < 2) {
            return null;
        }
        var coords = [];
        for(var i = 0; i < geometry.components.length; i++) {
            var vertex = geometry.components[i];
            coords.push(new jsts.geom.Coordinate(vertex.x, vertex.y));
        }
        return this.gf.createLineString(coords);
    },

    jstsLineStringToOlGeometry: function(line) {
        var coords = line.getCoordinates().splice(0);
        if(coords.length < 2) {
            return null;
        }
        for(var i = 0; i < coords.length; i++) {
            coords[i] = new OpenLayers.Geometry.Point(coords[i].x, coords[i].y);
        }
        return new OpenLayers.Geometry.LineString(coords);
    },

    drawLine: function(color) {
        this.color = color;
        $(dbkjs).triggerHandler("deactivate_exclusive_map_controls");
        this.selectControl.deactivate();
        this.drawLineControl.activate();
        this.panel.eraserModeDeactivated();
        this.drawMode = "line";
    },

    lineDrawn: function(feature) {
        var me = this;
        feature.attributes.strokeColor = me.color;
        feature.attributes.label = "";
        feature.attributes.rotation = 0;
        feature.attributes.rotationPoint = feature.geometry.bounds.getCenterLonLat();
        me.selectControl.unselectAll();
        me.selectControl.select(feature);
        me.layer.redraw();
    },

    lineSelected: function(e) {
        if(!this.active) {
            dbkjs.selectControl.unselect(e.feature);
            return;
        }
        console.log("lineSelected", e.feature);
        this.panel.featureSelected(e.feature);
    },

    lineUnselected: function(e) {
        console.log("lineUnselected", e.feature);
        this.panel.featureUnselected();
    },

    deleteLine: function() {
        this.layer.removeFeatures(this.layer.selectedFeatures);
        this.panel.featureUnselected();
    },

    setLabel: function(label) {
        var f = this.layer.selectedFeatures[0];
        if(f) {
            f.attributes.label = label;
        }
        this.layer.redraw();
    },

    setRotation: function(rotation) {
        var f = this.layer.selectedFeatures[0];
        if(f) {
            f.attributes.rotation = rotation;
        }
        this.layer.redraw();
    }
};