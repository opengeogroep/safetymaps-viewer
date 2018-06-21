/*
 *  Copyright (c) 2018 B3Partners (info@b3partners.nl)
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
 * OpenLayers2 layers for displaying VRH events.
 *
 */

 /* global safetymaps, OpenLayers, i18n */

var safetymaps = safetymaps || {};
safetymaps.vrh = safetymaps.vrh || {};

safetymaps.vrh.EventLayers = function(options) {
    this.options = $.extend({
        graphicSizeHover: 26,
        graphicSizeSelect: 20
    }, options);
};

safetymaps.vrh.EventLayers.prototype.scalePattern = function(pattern, factor) {
    if(!pattern || pattern.trim().length === 0) {
        return "";
    }
    var values = pattern.replace(/\s+/g, " ").split(" ");
    for(var i = 0; i < values.length; i++) {
        values[i] *= factor;
    }
    return values.join(" ");
};

safetymaps.vrh.EventLayers.prototype.createLayers = function() {
    var me = this;

    this.imagePath = "js/safetymaps/modules/vrh/assets";

    this.layers = [];
    this.selectLayers = [];
/*
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
                        /*
                        if (feature.attributes.style) {
                            var def = feature.attributes.style["en"];
                            var local = feature.attributes.style[dbkjsLang];
                            return local && local !== "" ? local : def;
                        }
                        * /
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
*/

    me.locationPolygonStyle = {
        "bas": {
            fill: "rgb(57,128,70)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Backstage"
        },
        "scp": {
            fill: "rgb(209,255,115)",
            stroke: "rgb(110,110,110)",
            label: "Scanpoort"
            // TODO hatch, pattern
        },
        "cat": {
            fill: "rgb(115,0,76)",
            stroke: "#000",
            strokeWidth: 0.4,
            label: "Catering"
        },
        "cot": {
            fill: "rgb(255,0,0)",
            stroke: "rgb(85,255,0)",
            strokeWidth: 4,
            stroke2: "rgb(115,0,0)",
            strokeWidth2: 1.3,
            label: "Coordinatieteam"
        },
        "ent": {
            fill: "rgb(192,96,247)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Entertainment"
        },
        "eva": {
            fill: "rgb(255,255,115)",
            stroke: "rgb(0,0,0)",
            label: "Entertainment algemeen"
        },
        "evo": {
            fill: "rgb(56,168,0)",
            stroke: "rgb(0,0,0)",
            strokeWidth: 0.4,
            label: "Entertainment onderdeel"
        },
        "foh": {
            fill: "rgb(132,0,168)",
            stroke: "#000",
            strokeWidth: 0.4,
            label: "Front of house"
        },
        "hud": {
            fill: "rgb(255,170,0)",
            stroke: "#f00",
            label: "Hulpdiensten"
        },
        "kas": {
            fill: "rgb(54,52,133)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Kassa"
        },
        "klk": {
            fill: "rgb(105,250,238)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Kleedkamer"
        },
        "lig": {
            fill: "rgb(162,245,103)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Lineup gate"
        },
        "med": {
            fill: "rgb(227,143,203)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Media"
        },
        "ops": {
            fill: "rgb(158,170,215)",
            stroke: "rgb(68,79,137)",
            strokeWidth: 0.4,
            label: "Opslag"
        },
        "par": {
            fill: "rgb(130,130,130)",
            stroke: "rgb(0,38,115)",
            strokeWidth: 0.4,
            strokePattern: "1 3",
            label: "Parkeerlocatie"
        },
        "pec": {
            fill: "rgb(128,47,106)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Perscontainer"
        },
        "pla": {
            fill: "rgb(147,137,240)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Pijlaanduiding"
        },
        "pdm": {
            fill: "rgb(223,115,255)",
            stroke: "#000",
            strokeWidth: 1.3,
            label: "Podium"
        },
        "poc": {
            fill: "rgb(79,140,134)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Portocabine"
        },
        "rez": {
            fill: "rgb(0,255,197)",
            stroke: "rgb(0,115,76)",
            strokeWidth: 0.4,
            label: "Reclamezuil"
        },
        "reg": {
            fill: "rgb(242,167,155)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Regie"
        },
        "sta": {
            fill: "rgb(250,167,90)",
            stroke: "#000",
            strokeWidth: 0.4,
            label: "Stands"
        },
        "tnt": {
            fill: "#fff",
            stroke: "#000",
            strokeWidth: 1.5,
            label: "Tent"
        },
        "trs": {
            fill: "rgb(205,170,102)",
            stroke: "#000",
            strokeWidth: 0.4,
            label: "Terras"
        },
        "wcl": {
            fill: "rgb(190,232,255)",
            stroke: "rgb(0,77,168)",
            strokeWidth: 0.4,
            label: "Toiletlocatie"
        },
        "trb": {
            fill: "rgb(255,235,175)",
            stroke: "#000",
            strokeWidth: 2,
            label: "Tribune"
            // TODO hatch
        },
        "trl": {
            fill: "rgb(104,104,104)",
            stroke: "#000",
            strokeWidth: 0.4,
            label: "Voertuigen"
        },
        "rpl": {
            fill: "rgb(215,194,158)",
            stroke: "rgb(104,104,104)",
            strokeWidth: 0.4,
            label: "Rijplaten"
        },
        "evt": {
            fill: "rgb(233,255,190)",
            stroke: "rgb(0,115,76)",
            strokeWidth: 1,
            label: "Evenementterrein"
        },
        "vrk": {
            fill: "rgb(237,128,85)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Vc Nederlandse Rode Kruis"
        },
        "vip": {
            fill: "rgb(212,74,168)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Vip"
        },
        "vz1": {
            fill: "rgb(255,255,255)",
            stroke: "rgb(255,0,0)",
            strokeWidth: 2,
            label: "Vrij houden"
            // TODO hatch
        },
        "vz2": {
            fill: "rgb(228,238,204)",
            stroke: "rgb(228,238,204)",
            strokeWidth: 2,
            label: "Veiligheidszone 2"
        },
        "vz3": {
            fill: "rgb(80,204,82)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Veiligheidszone 3"
        },
        "vz4": {
            fill: "rgb(84,107,240)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Veiligheidszone 4"
        }
    };
    this.layerLocationPolygon = new OpenLayers.Layer.Vector("Event location polygons", {
        hover:false,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                fillColor: "${fillColor}",
                strokeColor: "${strokeColor}",
                strokeWidth: "${strokeWidth}",
                strokeDashstyle: "${strokePattern}"
            }, {
                context: {
                    fillColor: function(feature) {
                        var s = me.locationPolygonStyle[feature.attributes.vlaksoort];
                        return s ? s.fill : "";
                    },
                    strokeColor: function(feature) {
                        var s = me.locationPolygonStyle[feature.attributes.vlaksoort];
                        return s ? s.stroke : "";
                    },
                    strokeWidth: function(feature) {
                        var s = me.locationPolygonStyle[feature.attributes.vlaksoort];
                        return s ? s.strokeWidth : 2;
                    },
                    strokePattern: function(feature) {
                        var s = me.locationPolygonStyle[feature.attributes.vlaksoort];
                        return s ? s.strokePattern : "";
                    }
                }
            }),
            temporary: new OpenLayers.Style({}),
            select: new OpenLayers.Style({})
        })
    });
    this.layers.push(this.layerLocationPolygon);
    this.selectLayers.push(this.layerLocationPolygon);

    me.routePolygonStyle = {
        "evt": {
            fill: "rgb(255,190,190)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Evenementterrein"
        },
        "kab": {
            fill: "rgb(255,255,0)",
            stroke: "rgb(255,0,0)",
            strokePattern: "15 6 1 3 1 3",
            label: "Kabelbrug"
        },
        "obg": {
            fill: "rgb(255,255,255)",
            stroke: "#000",
            strokeWidth: 2,
            label: "Onderbrekingsgebied"
            // TODO hatch
        },
        "vz1": {
            fill: "rgb(69,196,81)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Veiligheidszone 1"
        },
        "vz2": {
            fill: "rgb(117,226,250)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Veiligheidszone 2"
        },
        "vz3": {
            fill: "rgb(90,81,224)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Veiligheidszone 3"
        },
        "vz4": {
            fill: "rgb(70,91,140)",
            stroke: "rgb(110,110,110)",
            strokeWidth: 0.4,
            label: "Veiligheidszone 4"
        }
    };
    this.layerRoutePolygon = new OpenLayers.Layer.Vector("Event route polygons", {
        hover:false,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                fillColor: "${fillColor}",
                strokeColor: "${strokeColor}",
                strokeWidth: "${strokeWidth}",
                strokeDashstyle: "${strokePattern}"
            }, {
                context: {
                    fillColor: function(feature) {
                        var s = me.routePolygonStyle[feature.attributes.vlaksoort];
                        return s ? s.fill : "";
                    },
                    strokeColor: function(feature) {
                        var s = me.routePolygonStyle[feature.attributes.vlaksoort];
                        return s ? s.stroke : "";
                    },
                    strokeWidth: function(feature) {
                        var s = me.routePolygonStyle[feature.attributes.vlaksoort];
                        return s ? s.strokeWidth : 2;
                    },
                    strokePattern: function(feature) {
                        var s = me.routePolygonStyle[feature.attributes.vlaksoort];
                        return s ? s.strokePattern : "";
                    }
                }
            }),
            temporary: new OpenLayers.Style({}),
            select: new OpenLayers.Style({})
        })
    });
    this.layers.push(this.layerRoutePolygon);
    this.selectLayers.push(this.layerRoutePolygon);

    me.locationLineStyle = {
        "hkh": {
            label: "Hekwerk hoog",
            stroke: "#a70683",
            strokeWidth: 1,
            stroke2: "black",
            strokeWidth2: 2,
            strokePattern2: "2 6"
        },
        "hkb": {
            label: "Hekwerk hoogblind",
            stroke: "#00ffc4",
            strokeWidth: 1,
            stroke2: "#730200",
            strokeWidth2: 1,
            strokePattern2: "3 8",
            stroke3: "#730200",
            strokeWidth3: 3,
            strokePattern3: "0 1 1 9" // xxx dash-offset van 1 voor +
        },
        "hkl": {
            label: "Hekwerk laag",
            stroke: "#e69700",
            strokeWidth: 1,
            stroke2: "black",
            strokeWidth2: 4,
            strokePattern2: "1 9"
        },
        "hl": {
            label: "Hekwerk laag",
            stroke: "#e69700",
            strokeWidth: 1,
            stroke2: "black",
            strokeWidth2: 4,
            strokePattern2: "1 9"
        },
        "stb": {
            label: "Stagebarrier",
            stroke: "#ffbde7",
            strokeWidth: 1,
            stroke2: "#686868",
            strokePattern2: "7 7"
        },
        "ort": {
            label: "Ontruimingsrichting",
            stroke: "#55ff00",
            strokeWidth: 4.5,
            stroke2: "#00a683",
            strokeWidth2: 2.5
        }
    };
    this.layerLocationLine = new OpenLayers.Layer.Vector("Event location lines", {
        hover:false,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                strokeLinecap: "butt",
                strokeColor: "${strokeColor}",
                strokeWidth: "${strokeWidth}",
                strokeDashstyle: "${strokePattern}"
            }, {
                context: {
                    strokeColor: function(feature) {
                        var s = me.locationLineStyle[feature.attributes.lijnsoort];
                        return s ? s.stroke : "";
                    },
                    strokeWidth: function(feature) {
                        var s = me.locationLineStyle[feature.attributes.lijnsoort];
                        return s ? s.strokeWidth*2 : 2;
                    },
                    strokePattern: function(feature) {
                        var s = me.locationLineStyle[feature.attributes.lijnsoort];
                        return s ? me.scalePattern(s.strokePattern,2) || "none" : "none";
                    }
                }
            }),
            temporary: new OpenLayers.Style({}),
            select: new OpenLayers.Style({})
        })
    });
    this.layerLocationLine2 = new OpenLayers.Layer.Vector("Event location lines 2", {
        hover:false,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
               // display: "${display}",
                strokeLinecap: "butt",
                strokeColor: "${strokeColor}",
                strokeWidth: "${strokeWidth}",
                strokeDashstyle: "${strokePattern}"
            }, {
                context: {
                    display: function(feature) {
                        var s = me.locationLineStyle[feature.attributes.lijnsoort];
                        return s ? "visible" : "none";
                    },
                    strokeColor: function(feature) {
                        var s = me.locationLineStyle[feature.attributes.lijnsoort];
                        return s ? s.stroke2 : "";
                    },
                    strokeWidth: function(feature) {
                        var s = me.locationLineStyle[feature.attributes.lijnsoort];
                        return s ? s.strokeWidth2*2 : "1";
                    },
                    strokePattern: function(feature) {
                        var s = me.locationLineStyle[feature.attributes.lijnsoort];
                        return s ? me.scalePattern(s.strokePattern2,2) || "none" : "none";
                    }
                }
            }),
            temporary: new OpenLayers.Style({}),
            select: new OpenLayers.Style({})
        })
    });
    this.layerLocationLine3 = new OpenLayers.Layer.Vector("Event location lines 3", {
        hover:false,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
               // display: "${display}",
                strokeLinecap: "butt",
                strokeColor: "${strokeColor}",
                strokeWidth: "${strokeWidth}",
                strokeDashstyle: "${strokePattern}"
            }, {
                context: {
                    display: function(feature) {
                        var s = me.locationLineStyle[feature.attributes.lijnsoort];
                        return s ? "visible" : "none";
                    },
                    strokeColor: function(feature) {
                        var s = me.locationLineStyle[feature.attributes.lijnsoort];
                        return s ? s.stroke3 : "";
                    },
                    strokeWidth: function(feature) {
                        var s = me.locationLineStyle[feature.attributes.lijnsoort];
                        return s ? s.strokeWidth3*2 : "1";
                    },
                    strokePattern: function(feature) {
                        var s = me.locationLineStyle[feature.attributes.lijnsoort];
                        return s ? me.scalePattern(s.strokePattern3,2) || "none" : "none";
                    }
                }
            }),
            temporary: new OpenLayers.Style({}),
            select: new OpenLayers.Style({})
        })
    });
    this.layers.push(this.layerLocationLine);
    this.layers.push(this.layerLocationLine2);
    this.layers.push(this.layerLocationLine3);
    this.selectLayers.push(this.layerLocationLine);
    this.selectLayers.push(this.layerLocationLine2);
    this.selectLayers.push(this.layerLocationLine3);


    this.layerLabels = new OpenLayers.Layer.Vector("Event labels", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({
                fontSize: "${tekstgroot}",
                label: "${tekstreeks}",
                rotation: "${teksthoek}",
                labelOutlineColor: "#ffffff",
                labelOutlineWidth: 1
            }, {
                context: {
                }
            })
        })
    });
    this.layers.push(this.layerLabels);
    
    this.layerLocationSymbols = new OpenLayers.Layer.Vector("Event location symbols", {
        hover:true,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                externalGraphic: me.imagePath + "/${type}.png",
                pointRadius: 14,
                rotation: "${hoek}"
            },{
                context: {
                }
            }),
            temporary: new OpenLayers.Style({pointRadius: me.options.graphicSizeHover}),
            select: new OpenLayers.Style({pointRadius: me.options.graphicSizeSelect})
        })
    });
    this.layers.push(this.layerLocationSymbols);
    this.selectLayers.push(this.layerLocationSymbols);

    this.layerRouteSymbols = new OpenLayers.Layer.Vector("Event route symbols", {
        hover:true,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                externalGraphic: me.imagePath + "/${soort}.png",
                pointRadius: 14,
                rotation: "${hoek}"
            },{
                context: {
                }
            }),
            temporary: new OpenLayers.Style({pointRadius: me.options.graphicSizeHover}),
            select: new OpenLayers.Style({pointRadius: me.options.graphicSizeSelect})
        })
    });
    this.layers.push(this.layerRouteSymbols);
    this.selectLayers.push(this.layerRouteSymbols);


    return this.layers;
};

safetymaps.vrh.EventLayers.prototype.removeAllFeatures = function(object) {
    if(this.layers) {
        $.each(this.layers, function(i, layer) {
            layer.removeAllFeatures();
        });
    }
};

safetymaps.vrh.EventLayers.prototype.addFeaturesForObject = function(object) {
    /*this.addBuildingFeatures(object);
    this.addCustomPolygonFeatures(object);
    this.addFireCompartmentationFeatures(object);
    this.addLineFeatures(object);
    this.addApproachRouteFeatures(object);
    this.addCommunicationCoverageFeatures(object);
    this.addSymbolFeatures(object);
    this.addDangerSymbolFeatures(object);*/

    var wktParser = new OpenLayers.Format.WKT();

    this.layerLocationPolygon.addFeatures(object.locatie_vlak.map(function(d) {
        var f = wktParser.read(d.geom);
        f.attributes = d;
        return f;
    }));
    // TODO add label points, or text symbolizer for polygon?
    this.layerLocationLine.addFeatures(object.locatie_lijn.map(function(d) {
        var f = wktParser.read(d.geom);
        f.attributes = d;
        return f;
    }));
    this.layerLocationLine2.addFeatures(object.locatie_lijn.map(function(d) {
        var f = wktParser.read(d.geom);
        f.attributes = d;
        return f;
    }));
    this.layerLocationLine3.addFeatures(object.locatie_lijn.map(function(d) {
        var f = wktParser.read(d.geom);
        f.attributes = d;
        return f;
    }));

    this.layerRoutePolygon.addFeatures(object.route_vlak.map(function(d) {
        var f = wktParser.read(d.geom);
        f.attributes = d;
        return f;
    }));
    // TODO add label points, or text symbolizer for polygon?
   /* this.layerRouteLine.addFeatures(object.route_lijn.map(function(d) {
        var f = wktParser.read(d.geom);
        f.attributes = d;
        return f;
    }));*/

    this.layerLabels.addFeatures(object.teksten.map(d => new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(d.x, d.y), d)));

    this.layerLocationSymbols.addFeatures(object.locatie_punt.map(d => new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(d.x, d.y), d)));
    this.layerRouteSymbols.addFeatures(object.route_punt.map(d => new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(d.x, d.y), d)));

    console.log("Added event layers", this.layers);
};
/*
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

    var features = [];
    $.each(object.symbols || [], function(i, detail) {
        var f = wktParser.read(detail.location);
        f.attributes.index = i;
        f.attributes.description = detail.omschrijving;
        f.attributes.rotation = detail.rotation;
        f.attributes.code = detail.code;
        features.push(f);
    });
    this.layerSymbols.addFeatures(features);
    if(features.length > 0) console.log("added symbols", features);
};

safetymaps.creator.CreatorObjectLayers.prototype.addDangerSymbolFeatures = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    var features = [];
    $.each(object.danger_symbols || [], function(i, detail) {
        var f = wktParser.read(detail.location);
        f.attributes.index = i;
        f.attributes.description = detail.omschrijving;
        f.attributes.symbol = detail.symbol;
        f.attributes.geviCode = detail.gevi_code;
        f.attributes.unNr = detail.un_nr;
        f.attributes.amount = detail.hoeveelheid;
        f.attributes.substance_name = detail.naam_stof;
        features.push(f);
    });
    this.layerDangerSymbols.addFeatures(features);
    if(features.length > 0) console.log("added danger symbols", features);
};
*/
