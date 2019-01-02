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
 * OpenLayers2 layers for displaying SafetyMaps Creator objects.
 *
 */

var safetymaps = safetymaps || {};
safetymaps.creator = safetymaps.creator || {};

safetymaps.creator.CreatorObjectLayers = function(options) {
    this.options = $.extend({
        compartmentLabelMinSegmentLength: 7.5,
        compartmentLabelMinScale: 300,
        graphicSizeHover: 26,
        graphicSizeSelect: 20
    }, options);
};

safetymaps.creator.CreatorObjectLayers.prototype.getStyleScaleFactor = function (scope) {
    if (!scope.options.options.styleScaleAdjust) {
        return 1;
    } else {
        scope.options.options.originalScale = scope.options.options.originalScale ? scope.options.options.originalScale : 595.2744;
        return scope.options.options.originalScale / scope.options.map.getScale();
    }
};

safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue = function (scope, value, featureAttributeValue, attributeScaleFactor, lineScale) {
    if (featureAttributeValue) {
        attributeScaleFactor = attributeScaleFactor ? attributeScaleFactor : 1;
        value = featureAttributeValue * attributeScaleFactor;
    }
    if (lineScale && scope.options.options.noLineScaling) {
        return value;
    }
    value = value + (scope.options.options.styleSizeAdjust ? scope.options.options.styleSizeAdjust : 0);
    return value * safetymaps.creator.CreatorObjectLayers.prototype.getStyleScaleFactor(scope);
};
safetymaps.creator.CreatorObjectLayers.prototype.scalePattern = function(pattern, factor) {
    if(!pattern || pattern.trim().length === 0) {
        return "";
    }
    var values = pattern.replace(/\s+/g, " ").split(" ");
    for(var i = 0; i < values.length; i++) {
        values[i] *= factor;
    }
    return values.join(" ");
};

safetymaps.creator.CreatorObjectLayers.prototype.createLayers = function() {
    var me = this;

    this.layers = [];
    this.selectLayers = [];

    this.layerCustomPolygon = new OpenLayers.Layer.Vector("Creator custom polygons", {
        hover:false,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                fillColor: "${fillColor}",
                fillOpacity: "${fillOpacity}",
                strokeColor: "${strokeColor}",
                strokeWidth: "${strokeWidth}"
            }, {
                context: {
                    fillColor: function(feature) {
                        if(feature.attributes.style.color)return feature.attributes.style.color;
                        else return "#000000";
                    },
                    fillOpacity: function(feature) {
                        if(feature.attributes.style.opacity)return feature.attributes.style.opacity;
                        else return 0.2;
                    },
                    strokeColor: function(feature) {
                        if(feature.attributes.style.strokeColor)return feature.attributes.style.strokeColor;
                    },
                    strokeWidth: function(feature) {
                        if(feature.attributes.style.strokeWidth)return feature.attributes.style.strokeWidth;
                        else return 1;
                    }
                }
            }),
            temporary: new OpenLayers.Style({}),
            select: new OpenLayers.Style({})
        })
    });
    this.layers.push(this.layerCustomPolygon);
    this.selectLayers.push(this.layerCustomPolygon);

    this.layerBuildings = new OpenLayers.Layer.Vector("Creator buildings", {
        rendererOptions: {
            zIndexing: true
        },
        // TODO add VRH functionality for switching style when aerial basemap
        // is enabled
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                fillColor: "#66ff66",
                fillOpacity: 0.2,
                strokeColor: "#66ff66",
                strokeWidth: 1
            }, {
                context: {
                }
            })
        })
    });
    this.layers.push(this.layerBuildings);

    this.layerFireCompartmentation = new OpenLayers.Layer.Vector("Creator fire compartmentation", {
        hover:false,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                strokeColor: "${color}",
                strokeWidth: "${width}",
                strokeLinecap: "butt",
                strokeDashstyle: "${dashstyle}"
            }, {
                context: {
                    color: function(feature) {
                        if(feature.attributes.style && feature.attributes.style.color)return feature.attributes.style.color;
                        else return "#000000";
                    },
                    width: function(feature) {
                        // TODO: scaling
                        if(feature.attributes.style && feature.attributes.style.thickness)return feature.attributes.style.thickness;
                        else return 2;
                    },
                    dashstyle: function(feature) {
                        // TODO: scaling
                        if(feature.attributes.style && feature.attributes.style.pattern)return me.scalePattern(feature.attributes.style.pattern, 3);
                        else return me.scalePattern("", 3);
                    }
                }
            }),

            select: new OpenLayers.Style({strokeWidth: 7, strokeColor:"#FF00FF"})
        })
    });
    this.layers.push(this.layerFireCompartmentation);
    this.selectLayers.push(this.layerFireCompartmentation);
    
    this.layerFireCompartmentationLabels = new OpenLayers.Layer.Vector("Creator fire compartmentation labels", {
        minScale: me.options.compartmentLabelMinScale,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({
                fontSize: "${size}",
                label: "${label}",
                labelSelect: false,
                rotation: "${rotation}",
                labelOutlineColor: "#ffffff",
                labelOutlineWidth: 2,
                labelAlign: "cb",
                labelXOffset: "${labelXOffset}",
                labelYOffset: "${labelYOffset}"
            }, {
                context: {
                    size: function(feature) {
                        return 16;
                    },
                    label: function(feature) {
                        if(feature.attributes.label){
                            return feature.attributes.label;
                        } else {
                            return "";
                        }
                    },
                    labelYOffset: function(feature) {
                        return Math.sin(feature.attributes.theta + Math.PI/2) * 5;
                    },
                    labelXOffset: function(feature) {
                        return Math.cos(feature.attributes.theta + Math.PI/2) * 5;
                    }
                }
            })
        })
    });
    this.layers.push(this.layerFireCompartmentationLabels);

    this.layerLines1 = new OpenLayers.Layer.Vector("Creator lines 1", {
        hover: false,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                strokeColor: "${color}",
                strokeDashstyle: "${dashstyle}",
                fillColor: "${color}",
                strokeWidth: "${strokeWidth}",
                graphicName: "${graphicName}",
                rotation: "${rotation}",
                pointRadius: 5,
                label: "${description}"
            }, {
                context: {
                    color: function(feature) {
                        if(feature.attributes.style.color1)return feature.attributes.style.color1;
                        else  return "#000000";
                    },
                    strokeWidth: function(feature) {
                        if (feature.attributes.style.type_viewer) {
                            var type = feature.attributes.style.type_viewer;
                            if (type === "doubletrack" || type === "tube") {
                                return feature.attributes.style.thickness * 1.5 + 2;
                            }else{
                            return feature.attributes.style.thickness * 1.5;
                        }
                        }else{
                            return 2 * 1.5 + 2;
                        }
                    },
                    dashstyle: function(feature) {
                        if(feature.attributes.style.pattern)return me.scalePattern(feature.attributes.style.pattern, 5);
                        else return me.scalePattern("", 3);
                    },
                    graphicName: function(feature) {
                        if(feature.attributes.style.type_viewer === "arrow") {
                            return "triangle";
                            console.log("triangle");
                        }
                    },
                    rotation: function(feature) {
                        if(feature.attributes.lineAngle) {
                            // Subtract angle from 90 because triangle with 0 rotation is pointing north
                            return 90 - feature.attributes.lineAngle;
                        }
                        return 0;
                    }

                }
            })
        })
    });
    this.layers.push(this.layerLines1);
    this.layerLines2 = new OpenLayers.Layer.Vector("Creator lines 2", {
        hover: false,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                strokeColor: "${color}",
                strokeLinecap: "butt",
                strokeWidth: "${strokeWidth}",
                strokeDashstyle: "${dashstyle}"
            }, {
                context: {
                    color: function(feature) {
                        if(feature.attributes.style.color2)return feature.attributes.style.color2;
                        else  return "#000000";
                    },
                    strokeWidth: function(feature) {
                        if(feature.attributes.style.thickness) return feature.attributes.style.thickness * 1.5;
                        else return 2 * 1.5;
                    },
                    dashstyle: function(feature) {
                        if(feature.attributes.style.type_viewer === "tube") {
                            return me.scalePattern("8 8", 1);
                        }
                        return "";
                    }
                }
            })
        })
    });
    this.layers.push(this.layerLines2);
    
    this.layerLines3 = new OpenLayers.Layer.Vector("Creator lines 3", {
        hover: false,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                strokeColor: "${color}",
                strokeWidth: "${strokeWidth}",
                strokeDashstyle: "${dashstyle}",
                strokeLinecap: "butt"
            }, {
                context: {
                    color: function(feature) {
                        if(feature.attributes.style.color1)return feature.attributes.style.color1;
                        else  return "#000000";
                    },
                    strokeWidth: function(feature) {
                        if(feature.attributes.style.thickness) return feature.attributes.style.thickness * 1.5 + 6;
                        else return 2 * 1.5 + 6;
                    },
                    dashstyle: function(feature) {
                        return me.scalePattern("1 20", 1);
                    }
                }
            })
        })
    });
    this.layers.push(this.layerLines3);
    
    this.layerApproachRoutes = new OpenLayers.Layer.Vector("Creator approach routes", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                strokeColor: "${color}",
                fillColor: "${color}",
                strokeWidth: "${strokeWidth}",
                graphicName: "triangle",
                rotation: "${rotation}",
                pointRadius: 5
            }, {
                context: {
                    color: function(feature) {
                        switch(feature.attributes.style) {
                            case 1: return "#ff0000";
                            case 2: return "#0000ff";
                            case 3: return "#00a000";
                        }
                        return "#000000";
                    },
                    strokeWidth: function(feature) {
                        return 1.5;
                    },
                    rotation: function(feature) {
                        if(feature.attributes.lineAngle) {
                            // Subtract angle from 90 because triangle with 0 rotation is pointing north
                            return 90 - feature.attributes.lineAngle;
                        }
                        return 0;
                    }
                }
            })
        })
    });
    this.layers.push(this.layerApproachRoutes);

    this.layerCommunicationCoverage = new OpenLayers.Layer.Vector("Creator communication coverage", {
        hover:true,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                externalGraphic: "${symbol}",
                pointRadius: "${myradius}"
            }, {
                context: {
                    symbol: function(feature) {
                        return safetymaps.creator.api.imagePath + (feature.attributes.coverage ? "" : "no_") + "coverage.png";
                    },
                    myradius: function(feature){
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,14, feature.attributes.radius);
                    }
                }
            }),
            temporary: new OpenLayers.Style({pointRadius: me.options.graphicSizeHover}),
            select: new OpenLayers.Style({pointRadius: me.options.graphicSizeSelect})
        })
    });
    this.layers.push(this.layerCommunicationCoverage);
    this.selectLayers.push(this.layerCommunicationCoverage);

    this.layerSymbols = new OpenLayers.Layer.Vector("Creator symbols", {
        hover:true,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                externalGraphic: "${symbol}",
                pointRadius: "${myradius}",
                rotation: "-${rotation}"
            }, {
                context: {
                    symbol: function(feature) {
                        var symbol = feature.attributes.code;
                        if(feature.attributes.description.trim().length > 0) {
                            symbol += "_i";
                        }
                        return safetymaps.creator.api.imagePath + 'symbols/' + symbol + '.png';
                    },
                    myradius: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,14, feature.attributes.radius);
                    }
                }
            }),
            temporary: new OpenLayers.Style({pointRadius: me.options.graphicSizeHover}),
            select: new OpenLayers.Style({pointRadius: me.options.graphicSizeSelect})
        })
    });
    this.layers.push(this.layerSymbols);
    this.selectLayers.push(this.layerSymbols);

    this.layerDangerSymbols = new OpenLayers.Layer.Vector("Creator danger symbols", {
        hover:true,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                externalGraphic: safetymaps.creator.api.imagePath + "/danger_symbols/${symbol}.png",
                pointRadius: "${myradius}"
            },{
                context: {
                    myradius: function (feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,18, feature.attributes.radius);
                    }
                }
            }),
            temporary: new OpenLayers.Style({pointRadius: me.options.graphicSizeHover}),
            select: new OpenLayers.Style({pointRadius: me.options.graphicSizeSelect})
        })
    });
    this.layers.push(this.layerDangerSymbols);
    this.selectLayers.push(this.layerDangerSymbols);

    this.layerLabels = new OpenLayers.Layer.Vector("Creator labels", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({
                fontSize: "${size}",
                label: "${label}",
                rotation: "-${rotation}",
                labelOutlineColor: "#ffffff",
                labelOutlineWidth: 1
            }, {
                context: {
                    size: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,14,feature.attributes.size);
                    }
                }
            })
        })
    });
    this.layers.push(this.layerLabels);

    return this.layers;
};

safetymaps.creator.CreatorObjectLayers.prototype.removeAllFeatures = function(object) {
    if(this.layers) {
        $.each(this.layers, function(i, layer) {
            layer.removeAllFeatures();
        });
    }
};

safetymaps.creator.CreatorObjectLayers.prototype.addFeaturesForObject = function(object) {
    this.addBuildingFeatures(object);
    this.addCustomPolygonFeatures(object);
    this.addFireCompartmentationFeatures(object);
    this.addLineFeatures(object);
    this.addApproachRouteFeatures(object);
    this.addCommunicationCoverageFeatures(object);
    this.addSymbolFeatures(object);
    this.addDangerSymbolFeatures(object);
    this.addLabelFeatures(object);
};

safetymaps.creator.CreatorObjectLayers.prototype.addBuildingFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    var features = [];
    $.each(object.buildings || [], function(i, buildingWkt) {
        var f = wktParser.read(buildingWkt);
        f.attributes.index = i;
        features.push(f);
    });
    this.layerBuildings.addFeatures(features);
    if(features.length > 0) console.log("added buildings", features);
};

safetymaps.creator.CreatorObjectLayers.prototype.addCustomPolygonFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    var features = [];
    if(object.select_area) {
        // Add special feature to this layer to show the selection area
        console.log("add select area", object.select_area);
        var f = wktParser.read(object.select_area);
        f.attributes.index = 0;
        // Hardcode the style here
        f.attributes.style = {
            "color": "#B45F04",
            "opacity": 0.2,
            "strokeWidth": 1,
            "strokeColor": "#B45F04",
            "en": i18n.t("creator.area")
        };
        features.push(f);
    }
    $.each(object.custom_polygons || [], function(i, detail) {
        var f = wktParser.read(detail.polygon);
        f.attributes.index = i;
        f.attributes.description = detail.omschrijving;
        f.attributes.style = safetymaps.creator.api.styles.custom_polygons[detail.style];
        features.push(f);
    });

    this.layerCustomPolygon.addFeatures(features);
    if(features.length > 0) console.log("added custom polygons", features);
};

safetymaps.creator.CreatorObjectLayers.prototype.addFireCompartmentationFeatures = function(object) {
    var me = this;

    var wktParser = new OpenLayers.Format.WKT();

    var features = [];
    var labelFeatures = [];
    $.each(object.fire_compartmentation || [], function(i, detail) {
        var f = wktParser.read(detail.line);
        f.attributes.index = i;
        f.attributes.description = detail.omschrijving;
        f.attributes.label = detail.label;
        f.attributes.style = safetymaps.creator.api.styles.compartments[detail.style];
        features.push(f);

        var line = f.geometry;

        // MultiLineString
        for(var j = 0; j < line.components.length; j++) {
            for(var k = 0; k < line.components[j].components.length-1; k++) {
                var start = line.components[j].components[k];
                var end = line.components[j].components[k+1];

                console.log("segment length " + start.distanceTo(end) + ", min " + me.options.compartmentLabelMinSegmentLength);
                if(start.distanceTo(end) < me.options.compartmentLabelMinSegmentLength) {
                    continue;
                }

                var midx = start.x + (end.x - start.x)/2;
                var midy = start.y + (end.y - start.y)/2;

                var opposite = (end.y - start.y);
                var adjacent = (end.x - start.x);
                var theta = Math.atan2(opposite, adjacent);
                var angle = -theta * (180/Math.PI);

                var labelPoint = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(midx, midy), {
                    index: i,
                    style: f.attributes.style,
                    label: f.attributes.label,
                    rotation: angle,
                    theta: theta
                });
                labelFeatures.push(labelPoint);
            }
        }
    });
    this.layerFireCompartmentation.addFeatures(features);
    this.layerFireCompartmentationLabels.addFeatures(labelFeatures);
    if(features.length > 0) console.log("added fire compartmentation", features, labelFeatures);
};

safetymaps.creator.CreatorObjectLayers.prototype.addLineFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    var features1 = [];
    var features2 = [];
    var features3 = [];
    $.each(object.lines || [], function(i, detail) {
        var f = wktParser.read(detail.line);

        var style = safetymaps.creator.api.styles.custom_lines[detail.style];

        if(style.type_viewer === "arrow") {
            // Create two geometries: one line and a point at the end of the
            // line to display the arrow
            var vertices = f.geometry.getVertices();
            var end = vertices[vertices.length - 1];

            // Rotation for triangle graphic rendered at end of line
            f.attributes.lineAngle = safetymaps.utils.geometry.getLastLineSegmentAngle(f.geometry);

            f.geometry = new OpenLayers.Geometry.Collection([f.geometry, end]);
        }

        f.attributes.index = i;
        f.attributes.description = detail.omschrijving;
        f.attributes.style = style;
        features1.push(f);

        if(style.type_viewer === "doubletrack" || style.type_viewer === "tube") {
            features2.push(f.clone());
        }
        if(style.type_viewer === "track" || style.type_viewer === "doubletrack") {
            features3.push(f.clone());
        }
    });
    this.layerLines1.addFeatures(features1);
    this.layerLines2.addFeatures(features2);
    this.layerLines3.addFeatures(features3);
    if(features1.length > 0) console.log("added lines", features1, features2, features3);
};

safetymaps.creator.CreatorObjectLayers.prototype.addApproachRouteFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    var features = [];
    $.each(object.approach_routes || [], function(i, detail) {
        var f = wktParser.read(detail.line);
        f.attributes.index = i;
        f.attributes.description = detail.omschrijving;
        f.attributes.name = detail.naam;
        f.attributes.style = detail.style;

        // Create two geometries: one line and a point at the end of the
        // line to display the arrow
        var vertices = f.geometry.getVertices();
        var end = vertices[vertices.length - 1];

        // Rotation for triangle graphic rendered at end of line
        f.attributes.lineAngle = safetymaps.utils.geometry.getLastLineSegmentAngle(f.geometry);

        f.geometry = new OpenLayers.Geometry.Collection([f.geometry, end]);
        features.push(f);
    });
    this.layerApproachRoutes.addFeatures(features);
    if(features.length > 0) console.log("added approach routes", features);
};

safetymaps.creator.CreatorObjectLayers.prototype.addCommunicationCoverageFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    var features = [];
    $.each(object.communication_coverage || [], function(i, detail) {
        var f = wktParser.read(detail.location);
        f.attributes.index = i;
        f.attributes.info = detail.aanvullende_informatie;
        f.attributes.coverage = detail.dekking;
        f.attributes.alternative = detail.alternatief;
        features.push(f);
    });
    this.layerCommunicationCoverage.addFeatures(features);
    if(features.length > 0) console.log("added communication coverage", features);
};

safetymaps.creator.CreatorObjectLayers.prototype.addSymbolFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();
    var prefix = "safetymaps_creatorSymbolsId:";
    var features = [];
    $.each(object.symbols || [], function(i, detail) {
        var f = wktParser.read(detail.location);
        f.attributes.index = prefix+i;
        f.attributes.description = detail.omschrijving;
        f.attributes.rotation = detail.rotation;
        f.attributes.code = detail.code;
        features.push(f);
        detail.id= prefix+i;
        object.symbols[i] = detail;
    });
    this.layerSymbols.addFeatures(features);
    if(features.length > 0) console.log("added symbols", features);
};

safetymaps.creator.CreatorObjectLayers.prototype.addDangerSymbolFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();
    var prefix = "safetymaps_creatorDangerSymbolsId:";
    var features = [];
    $.each(object.danger_symbols || [], function(i, detail) {
        var f = wktParser.read(detail.location);
        f.attributes.index = prefix+i;
        f.attributes.description = detail.omschrijving;
        f.attributes.symbol = detail.symbol;
        f.attributes.geviCode = detail.gevi_code;
        f.attributes.unNr = detail.un_nr;
        f.attributes.amount = detail.hoeveelheid;
        f.attributes.substance_name = detail.naam_stof;
        features.push(f);
        detail.id= prefix+i;
        object.danger_symbols[i] = detail;
    });
    this.layerDangerSymbols.addFeatures(features);
    if(features.length > 0) console.log("added danger symbols", features);
};

safetymaps.creator.CreatorObjectLayers.prototype.addLabelFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    var features = [];
    $.each(object.labels || [], function(i, detail) {
        var f = wktParser.read(detail.location);
        f.attributes.index = i;
        f.attributes.label = detail.text;
        f.attributes.rotation = detail.rotation;
        f.attributes.size = detail.size;
        features.push(f);
    });
    this.layerLabels.addFeatures(features);
    if(features.length > 0) console.log("added labels", features);
};

