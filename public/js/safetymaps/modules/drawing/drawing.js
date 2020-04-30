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
    visible: true,
    layer: null,
    drawLineControl: null,
    drawPolygonControl: null,
    updateInterval: null,
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
            eraserInterval: 50,
            updateInterval: 5000,
            saveDebounceTime: 1000,
            log: true
        }, me.options);

        me.color = me.options.defaultColor;
        me.symbol = null;

        onMapClick = dbkjs.util.onClick;
        dbkjs.util.onClick = function(e) {
            var xy;
            if(!e) {
                return;
            }
            if(e.xy) {
                xy = e.xy;
            } else if(e.changedTouches && e.changedTouches.length > 0) {
                xy = {x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY };
            }
            if (me.active) {
                me.mapClick(dbkjs.map.getLonLatFromPixel(xy));
            } else {
                onMapClick(e);
            }
        };

        me.createElements();

        me.initOpenLayersControls();

        $(dbkjs).on("deactivate_exclusive_map_controls", function() {
            me.panel.selectModeDeactivated();
            me.selectControl.activate();
            me.drawLineControl.deactivate();
        });

        $(dbkjs).one("dbkjs_init_complete", function () {
            if (dbkjs.modules.incidents && dbkjs.modules.incidents.controller) {
                $(dbkjs.modules.incidents.controller).on("new_incident", function (event, commonIncident, incident) {
                    me.newIncident(commonIncident.nummer || incident.IncidentNummer);
                });
                $(dbkjs.modules.incidents.controller).on("end_incident", function () {
                    me.endIncident();
                });
            }
        });
    },

    newIncident: function(incidentNr) {
        var me = this;
        me.options.log && console.log("drawing: new incident " + incidentNr);
        me.incidentNr = incidentNr;
        me.button.show();
        me.toggleVisibility(true);
        if(me.updateJqXHR && me.updateJqXHR.state() === "pending") {
            console.log("drawing: aborting previous request");
            me.updateJqXHR.abort();
        }
        window.clearInterval(me.updateInterval);
        me.update();
        me.updateInterval = window.setInterval(function() {
            me.update();
        }, me.options.updateInterval);
    },

    endIncident: function() {
        var me = this;
        me.options.log && console.log("drawing: end incident ");
        me.incidentNr = null;
        window.clearInterval(me.updateInterval);
        me.button.hide();
    },

    update: function() {
        var me = this;

        if(me.modifiedDebounceTimeout) {
            return;
        }

        if(me.updateJqXHR && me.updateJqXHR.state() === "pending") {
            me.options.log && console.log("drawing: previous request from " + ((new Date().getTime() - me.lastUpdateStart)/1000).toFixed(1) + "s ago still pending!");
            return;
        }

        me.updateJqXHR = $.ajax('api/drawing/' + me.incidentNr + '.json', {
            dataType: 'json',
            cache: true,
            ifModified: true
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            if(jqXHR.status === 404) {
                return;
            }
            console.log("drawing: ajax failure: " + jqXHR.status + " " + textStatus, jqXHR.responseText);
        })
        .done(function(drawing, textStatus, jqXHR) {
            if(textStatus === "notmodified") {
                return;
            }

            var lastModified = jqXHR.getResponseHeader("last-modified");
            console.log("drawing: got drawing, last modified " + lastModified, drawing);

            var geoJsonFormatter = new OpenLayers.Format.GeoJSON();
            me.selectControl.unselectAll();
            me.layer.removeAllFeatures();
            me.layer.addFeatures(geoJsonFormatter.read(drawing));
            me.layer.redraw();

            // TODO restore selected feature?
        });
    },

    modified: function() {
        var me = this;
        if(me.modifiedDebounceTimeout) {
            window.clearTimeout(me.modifiedDebounceTimeout);
        }
        me.modifiedDebounceTimeout = window.setTimeout(function() {
            me.modifiedDebounceTimeout = null;
            me.save();
        }, me.options.saveDebounceTime);
    },

    save: function() {
        var me = this;

        if(me.saveJqXHR != null && me.saveJqXHR.state() === "pending") {
            console.log("drawing: modified but previous save still pending!");
            return;
        }

        // TODO If-Unmodified-Since
        me.saveJqXHR = $.ajax('api/drawing/' + me.incidentNr + '.json', {
            method: 'POST',
            data: { features: new OpenLayers.Format.GeoJSON().write(me.layer.features) }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.log("drawing: saving ajax failure: " + jqXHR.status + " " + textStatus, jqXHR.responseText);
        })
        .done(function(drawing, textStatus, jqXHR) {
            var lastModified = jqXHR.getResponseHeader("last-modified");
            console.log("drawing: saved drawing, last modified " + lastModified, drawing);
        });
    },

    createElements: function() {
        var me = this;

        me.button = $("<a>")
            .attr("id", "btn-drawing")
            .attr("title", i18n.t("drawing.title"))
            .addClass("btn btn-default")
            .hide();
        $("<i/>").addClass("fa fa-pencil-square-o").appendTo(me.button);
        me.button.prependTo($("#bottom_left_buttons"));
        me.button.on("click", me.click.bind(me));

        me.panel = new DrawingPanelWindow(me.options);

        $(me.panel).on("hide", function() {
            me.active = false;
            me.deactivate();
        })
        .on("toggle", function() {
            me.toggleVisibility();
        })
        .on("select", function() {
            me.toggleVisibility(true);
            me.selectControl.unselectAll();
            me.selectMode();
        })
        .on("eraser", function() {
            me.toggleVisibility(true);
            me.selectControl.unselectAll();
            me.eraserMode();
        })
        .on("color", function(e, color) {
            me.toggleVisibility(true);
            me.selectControl.unselectAll();
            me.color = color;
            if (me.drawMode === 'polygon') {
                me.drawPolygon();
            } else {
                me.drawLine();
            }
        })
        .on("symbol", function (e, symbol) {
            me.toggleVisibility(true);
            me.selectControl.unselectAll();
            me.symbol = symbol;
            me.drawPoint();
        })
        .on("line", function(e) {
            me.toggleVisibility(true);
            me.selectControl.unselectAll();
            me.drawLine();
        })
        .on("polygon", function(e) {
            me.toggleVisibility(true);
            me.selectControl.unselectAll();
            me.drawPolygon();
        })
        .on("point", function(e) {
            me.toggleVisibility(true);
            me.selectControl.unselectAll();
            me.drawPoint();
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
                    pointRadius: "${radius}",
                    externalGraphic: "${image}",
                    labelYOffset: "${labelYOffset}",
                    labelOutlineWidth: 2,
                    labelOutlineColor: 'white',
                    strokeColor: "${strokeColor}",
                    strokeWidth: "3",
                    fontSize: 16,
                    rotationPoint: "${rotationPoint}",
                    rotation: "${rotation}",
                    label: "${label}",
                    labelSelect: false,
                    labelOutlineColor: "#ffffff",
                    labelOutlineWidth: 2,
                    labelAlign: "cb",
                    fillColor: "${strokeColor}",
                    fillOpacity: "${fillOpacity}"
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
        // Polygon control
        me.drawPolygonControl = new OpenLayers.Control.DrawFeature(me.layer, OpenLayers.Handler.Polygon, {
            eventListeners: {
                featureadded: function (evt) {
                    me.polygonDrawn(evt.feature);
                }
            },
            handlerOptions: {
                freehand: true,
                freehandToggle: null
            }
        });
        dbkjs.map.addControl(me.drawPolygonControl);
        me.drawPolygonControl.deactivate();
    },

    mapClick: function (lonLat) {
        var me = this;
        if(me.drawMode === "point" && me.symbol) {
            var attributes = $.extend({}, me.symbol, {
                label: "",
            });
            attributes.radius = 20;
            var feature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(lonLat.lon, lonLat.lat), attributes);
            me.layer.addFeatures(feature);
            me.pointDrawn(feature);
        }
    },

    click: function() {
        if(!this.active) {
            this.active = true;
            this.color = this.options.defaultColor;
            this.activate();
        }
    },

    activate: function(setVisibleOnly) {
        var me = this;
        this.layer.setVisibility(true);
        // Put our layer on top of other vector layers
        dbkjs.map.raiseLayer(dbkjs.modules.drawing.layer, dbkjs.map.layers.length);

        if(this.options.editAuthorized) {
            dbkjs.selectControl.deactivate();
        }

        if(!setVisibleOnly) {
            this.panel.show();
            this.color = this.options.defaultColor;
            if(this.options.editAuthorized) {
                this.drawLine();
            }
        }
    },

    deactivate: function(keepPanelOpen) {
        if(!keepPanelOpen) {
            this.panel.hide();
        }
        this.active = false;
        this.drawLineControl.deactivate();
        this.selectControl.deactivate();
        dbkjs.selectControl.activate();
    },

    toggleVisibility: function(optionalVisible) {
        if(typeof optionalVisible !== 'undefined') {
            this.visible = optionalVisible;
        } else {
            this.visible = !this.visible;
        }

        if(this.visible) {
            this.activate(true);
        } else {
            this.deactivate(true);
            this.layer.setVisibility(false);
        }
        this.panel.setToggleState(this.visible);
    },

    selectMode: function() {
        $(dbkjs).triggerHandler("deactivate_exclusive_map_controls");
        this.drawLineControl.deactivate();
        this.drawPolygonControl.deactivate();
        this.panel.lineModeDeactivated();
        this.panel.polygonModeDeactivated();
        this.panel.pointModeDeactivated();
        this.selectControl.activate();
        this.panel.selectModeActivated();
        this.symbol = null;
    },

    eraserMode: function() {
        $(dbkjs).triggerHandler("deactivate_exclusive_map_controls");
        this.selectControl.deactivate();
        this.drawPolygonControl.deactivate();
        this.panel.lineModeDeactivated();
        this.panel.polygonModeDeactivated();
        this.drawLineControl.activate();
        this.drawMode = "eraser";
        this.panel.eraserModeActivated();
        this.panel.pointModeDeactivated();
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
        this.modified();
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
                                    var newAttributes = f.attributes;
                                    if(j > 0) {
                                        newAttributes = {
                                            strokeColor: f.attributes.strokeColor,
                                            label: ""
                                        };
                                    }
                                    newAttributes.rotationPoint = 0;
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

    drawLine: function() {
        $(dbkjs).triggerHandler("deactivate_exclusive_map_controls");
        this.selectControl.deactivate();
        this.drawPolygonControl.deactivate();
        this.drawLineControl.activate();
        this.panel.eraserModeDeactivated();
        this.panel.polygonModeDeactivated();
        this.panel.lineModeActivated();
        this.panel.pointModeDeactivated();
        this.drawMode = "line";
    },

    drawPolygon: function () {
        $(dbkjs).triggerHandler("deactivate_exclusive_map_controls");
        this.selectControl.deactivate();
        this.drawLineControl.deactivate();
        this.drawPolygonControl.activate();
        this.panel.eraserModeDeactivated();
        this.panel.polygonModeActivated();
        this.panel.lineModeDeactivated();
        this.panel.pointModeDeactivated();
        this.drawMode = "polygon";
    },

    drawPoint: function () {
        $(dbkjs).triggerHandler("deactivate_exclusive_map_controls");
        this.selectControl.deactivate();
        this.drawLineControl.deactivate();
        this.drawPolygonControl.deactivate();
        this.panel.eraserModeDeactivated();
        this.panel.polygonModeDeactivated();
        this.panel.lineModeDeactivated();
        this.panel.pointModeActivated();
        this.drawMode = "point";
    },

    lineDrawn: function(feature) {
        var me = this;
        feature.attributes.strokeColor = me.color;
        feature.attributes.label = "";
        me.selectControl.unselectAll();
        me.selectControl.select(feature);
        me.layer.redraw();
        me.modified();
    },

    polygonDrawn: function (feature) {
        var me = this;
        feature.attributes.strokeColor = me.color;
        feature.attributes.fillOpacity = "0.2";
        feature.attributes.label = "";
        me.selectControl.unselectAll();
        me.selectControl.select(feature);
        me.layer.redraw();
        me.modified();
    },

    pointDrawn: function (feature) {
        var me = this;
        feature.attributes.fillOpacity = "1";
        me.selectControl.unselectAll();
        me.selectControl.select(feature);
        me.layer.redraw();
        me.modified();
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
        this.modified();
    },

    setLabel: function(label) {
        var f = this.layer.selectedFeatures[0];
        if(f) {
            f.attributes.label = label;
        }
        this.layer.redraw();
        this.modified();
    },

    setRotation: function(rotation) {
        var f = this.layer.selectedFeatures[0];
        if(f) {
            var currentRotation = f.attributes.geometryRotation || 0;
            var rotationPoint = f.attributes.rotationPoint || f.geometry.getCentroid(true);
            f.attributes.rotationPoint = rotationPoint;
            var delta = rotation - currentRotation;
            f.geometry.rotate(delta, rotationPoint);
            f.attributes.geometryRotation = rotation;
            this.layer.redraw();
            this.modified();
        }
    }
};