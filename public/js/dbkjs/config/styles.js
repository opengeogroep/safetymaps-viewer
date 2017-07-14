/*!
 *  Copyright (c) 2014 Milo van der Linden (milo@dogodigi.net)
 *
 *  This file is part of opendispatcher/safetymapsDBK
 *
 *  opendispatcher is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  opendispatcher is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with opendispatcher. If not, see <http://www.gnu.org/licenses/>.
 *
 */

/* global OpenLayers, imagesBase64 */

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.config = dbkjs.config || {};
OpenLayers.Renderer.symbol.arrow = [0, 2, 1, 0, 2, 2, 1, 0, 0, 2];

// Factor to scale styling elements with
dbkjs.getStyleScaleFactor = function () {
    if (!dbkjs.options.styleScaleAdjust) {
        return 1;
    } else {
        dbkjs.options.originalScale = dbkjs.options.originalScale ? dbkjs.options.originalScale : 595.2744;
        return dbkjs.options.originalScale / dbkjs.map.getScale();
    }
};

dbkjs.redrawScaledLayers = function () {
    dbkjs.protocol.jsonDBK.layerBrandcompartiment.redraw();
    dbkjs.protocol.jsonDBK.layerHulplijn2.redraw();
    dbkjs.protocol.jsonDBK.layerHulplijn1.redraw();
    dbkjs.protocol.jsonDBK.layerHulplijn.redraw();
    dbkjs.protocol.jsonDBK.layerToegangterrein.redraw();
    dbkjs.protocol.jsonDBK.layerBrandweervoorziening.redraw();
    dbkjs.protocol.jsonDBK.layerGevaarlijkestof.redraw();
    dbkjs.protocol.jsonDBK.layerTekstobject.redraw();
};

/**
 *
 * Return a styling value with user size adjustment and scaled according to map
 * map scale (if style scaling is enabled). If featureAttributeValue is not
 * undefined use that instead of the first argument. If attributeScaleFactor
 * is not undefined scale the featureAttributeValue by that factor.
 *
 * @param {type} value
 * @param {type} featureAttributeValue
 * @param {type} attributeScaleFactor
 * @returns {Number|dbkjs.options.originalScaledbkjs.options.originalScale|
 */
dbkjs.scaleStyleValue = function (value, featureAttributeValue, attributeScaleFactor, lineScale) {
    if (featureAttributeValue) {
        attributeScaleFactor = attributeScaleFactor ? attributeScaleFactor : 1;
        value = featureAttributeValue * attributeScaleFactor;
    }
    if(lineScale && dbkjs.options.noLineScaling) {
        return value;
    }
    value = value + (dbkjs.options.styleSizeAdjust ? dbkjs.options.styleSizeAdjust : 0);
    return value * dbkjs.getStyleScaleFactor();
};

dbkjs.config.styles = {
    dbkfeature: new OpenLayers.StyleMap({
        "default": new OpenLayers.Style({
            cursor: "pointer",
            display: "${mydisplay}",
            graphicWidth: "${mygraphicwidth}",
            graphicHeight: "${mygraphicheight}",
            fontColor: "${myfontcolor}",
            fontSize: "${myfontsize}",
            fontWeight: "${myfontweight}",
            externalGraphic: "${myicon}",
            label: "${labeltext}",
            labelSelect: true,
            labelAlign: "${mylabelalign}",
            labelXOffset: "${mylabelxoffset}",
            labelYOffset: "${mylabelyoffset}",
            labelOutlineWidth: 5,
            labelOutlineColor: '#000000'
        }, {
            context: {
                mydisplay: function (feature) {
                    if (dbkjs.map.getResolution() > 1) {
                        // pandgeometrie not visible above resolution 1, always show feature icon
                        return "true";
                    } else {
                        if (dbkjs.options.alwaysShowDbkFeature) {
                            // Always show feature except the active feature
                            if (dbkjs.options.dbk && feature.attributes.identificatie === dbkjs.options.dbk) {
                                return "none";
                            } else {
                                // Controleer of actieve DBK  meerdere verdiepingen heeft
                                // en feature om display van te bepalen niet het hoofdobject
                                // is van de actieve DBK. Zo ja, dan niet tonen
                                // Gebied heeft geen verdiepingen
                                if (feature.attributes.typeFeature === 'Object' && dbkjs.options.feature && dbkjs.options.feature.verdiepingen && dbkjs.options.feature.verdiepingen.length > 1) {
                                    // Het ID van de dbk waarvan we de display property
                                    // bepalen
                                    var verdiepingCheckDbkId = feature.attributes.identificatie;

                                    // Loop over alle verdiepingen van actieve feature en check
                                    // of verdieping id overeenkomt met dbkId
                                    for (var i = 0; i < dbkjs.options.feature.verdiepingen.length; i++) {
                                        var verdieping = dbkjs.options.feature.verdiepingen[i];
                                        if (verdieping.identificatie === verdiepingCheckDbkId) {
                                            return "none";
                                        }
                                    }
                                }
                                return "true";
                            }
                        } else {
                            // User should switch layer "Naburige DBK's" on (if configured)
                            return "none";
                        }
                    }
                },
                mygraphicheight: function (feature) {
                    if (feature.cluster) {
                        return 65;
                    } else {
                        if (feature.attributes.typeFeature === 'Object') {
                            return 38;
                        } else if(feature.attributes.typeFeature === "WO" || feature.attributes.typeFeature === "Waterongevallen") {
                            return 40;
                        } else {
                            return 65;
                        }
                    }

                },
                mygraphicwidth: function (feature) {
                    if (feature.cluster) {
                        return 85;
                    } else {
                        if (feature.attributes.typeFeature === 'Object') {
                            return 24;
                        } else if(feature.attributes.typeFeature === "WO" || feature.attributes.typeFeature === "Waterongevallen") {
                            return 40;
                        } else {
                            return 85;
                        }
                    }
                },
                myfontweight: function (feature) {
                    if (feature.cluster) {
                        return "bold";
                    } else {
                        return "normal";
                    }
                },
                myfontsize: function (feature) {
                    return "10.5px";
                },
                mylabelalign: function (feature) {
                    if (feature.cluster) {
                        return "cc";
                    } else {
                         if(feature.attributes.typeFeature === "WO" || feature.attributes.typeFeature === "Waterongevallen") {
                            return "cb";
                         } else {
                            return "rb";
                        }
                    }
                },
                mylabelxoffset: function (feature) {
                    if (feature.cluster) {
                        return 0;
                    } else {
                         if(feature.attributes.typeFeature === "WO" || feature.attributes.typeFeature === "Waterongevallen") {
                            return 0;
                         } else {
                            return -16;
                        }
                    }
                },
                mylabelyoffset: function (feature) {
                    if (feature.cluster) {
                        return -4;
                    } else {
                         if(feature.attributes.typeFeature === "WO" || feature.attributes.typeFeature === "Waterongevallen") {
                            return -32;
                         } else {
                            return -9;
                        }
                    }
                },
                myfontcolor: function (feature) {
                    if (feature.cluster) {
                        return "#ffffff";
                    } else {
                        if(feature.attributes.typeFeature === "WO" || feature.attributes.typeFeature === "Waterongevallen") {
                            return "white";
                        } else {
                            return "#000000";
                        }
                    }
                },
                myicon: function (feature) {
                    if (feature.cluster) {
                        return typeof imagesBase64 === 'undefined' ? dbkjs.basePath + "images/jcartier_city_3.png" : imagesBase64["images/jcartier_city_3.png"];
                    } else {
                        if (feature.attributes.typeFeature === 'Object') {
                            var img;
                            if (feature.attributes.verdiepingen || feature.attributes.verdiepingen !== 0) {
                                img = "images/jcartier_building_1.png";
                            } else {
                                img = "images/jcartier_building_2.png";
                            }
                            return typeof imagesBase64 === 'undefined' ? dbkjs.basePath + img : imagesBase64[img];
                        } else if(feature.attributes.typeFeature === 'WO' || feature.attributes.typeFeature === "Waterongevallen") {
                            return typeof imagesBase64 === 'undefined' ? dbkjs.basePath + "images/wo/wo.png" : imagesBase64["images/wo/wo.png"];
                        } else {
                            return typeof imagesBase64 === 'undefined' ? dbkjs.basePath + "images/jcartier_event_1.png" : imagesBase64["images/jcartier_event_1.png"];
                        }
                    }
                },
                labeltext: function (feature) {
                    if (dbkjs.modules.feature.showlabels) {
                        if (feature.cluster) {
                            var lbl_txt, c;
                            if (feature.cluster.length > 1) {
                                lbl_txt = feature.cluster.length + "";
                            } else {
                                //lbl_txt = feature.cluster[0].attributes.formeleNaam;
                                lbl_txt = "";
                            }
                            return lbl_txt;
                        } else {
                            if((feature.attributes.typeFeature === "WO" || feature.attributes.typeFeature === "Waterongevallen") && dbkjs.map.getResolution() <= dbkjs.options.featureLabelResolution) {
                                return feature.attributes.locatie || feature.attributes.formeleNaam;
                            } else {
                                return "";
                            }
                        }
                    } else {
                        return "";
                    }
                }
            }
        }),
        "select": new OpenLayers.Style({
            fontColor: "${myfontcolor}"
        }, {
            context: {
                myfontcolor: function(feature) {
                    if (feature.cluster || feature.attributes.typeFeature === "WO" || feature.attributes.typeFeature === "Waterongevallen") {
                        return "#fff722";
                    } else {
                        return "#000000";
                    }
                }
            }
        })
    }),
    dbkpand: new OpenLayers.StyleMap({
        'default': new OpenLayers.Style({
            fillColor: "${mycolor}",
            fillOpacity: 0.2,
            strokeColor: "${mycolor}",
            strokeWidth: 1
        }, {
            context: {
                mycolor: function (feature) {
                    if (feature.attributes.type) {
                        if (feature.attributes.type === "gebied") {
                            return "#B45F04";
                        } else {
                            return "#66ff66";
                        }
                    } else {
                        return "#66ff66";
                    }
                }
            }
        }),
        'select': new OpenLayers.Style({
            strokeWidth: 4,
            fillOpacity: 0.7
        }),
        'temporary': new OpenLayers.Style({
            strokeWidth: 3,
            fillOpacity: 0.4
        })
    }),
    dbkcompartiment: new OpenLayers.StyleMap({
        'default': new OpenLayers.Style({
            strokeColor: "${mycolor}",
            strokeWidth: "${mystrokewidth}",
            strokeLinecap: "butt",
            strokeDashstyle: "${mystrokedashstyle}"
        }, {
            context: {
                mycolor: function (feature) {
                    switch (feature.attributes.type) {
                        case "30 minuten brandwerende scheiding":
                            return "#c1001f";
                        case "60 minuten brandwerende scheiding":
                            return "#5da03b";
                        case "> 60 minuten brandwerende scheiding":
                        case "> 120 minuten brandwerende scheiding":
                            return "#ff0000";
                        case "Rookwerende scheiding":
                            return "#009cdd";
                        default:
                            return "#000000";
                    }

                },
                mystrokewidth: function (feature) {
                    switch (feature.attributes.type) {
                        case "60 minuten brandwerende scheiding":
                        case "> 60 minuten brandwerende scheiding":
                        case "> 120 minuten brandwerende scheiding":
                            return dbkjs.scaleStyleValue(4,null,null,true);
                        default:
                            return dbkjs.scaleStyleValue(2,null,null,true);
                    }

                },
                mystrokedashstyle: function (feature) {
                    switch (feature.attributes.type) {
                        case "30 minuten brandwerende scheiding":
                            return dbkjs.scaleStyleValue(8,null,null,true) + " " + dbkjs.scaleStyleValue(4,null,null,true);
                        case "60 minuten brandwerende scheiding":
                            return dbkjs.scaleStyleValue(4,null,null,true) + " " + dbkjs.scaleStyleValue(4,null,null,true);
                        case "> 60 minuten brandwerende scheiding":
                        case "> 120 minuten brandwerende scheiding":
                            return "solid";
                        case "Rookwerende scheiding":
                            return dbkjs.scaleStyleValue(8,null,null,true) + " " + dbkjs.scaleStyleValue(4,null,null,true);
                        default:
                            return dbkjs.scaleStyleValue(10,null,null,true) + " " + dbkjs.scaleStyleValue(10,null,null,true);
                    }
                }
            }
        }),
        "temporary": new OpenLayers.Style({strokeColor: "#009FC3"}),
        "select": new OpenLayers.Style({strokeColor: "#8F00C3"})
    }),
    compartimentlabel: new OpenLayers.StyleMap({
        "default": new OpenLayers.Style({
            fontColor: "${mycolor}",
            fontSize: "16px",
            labelSelect: false,
            labelOutlineColor: "#ffffff",
            labelOutlineWidth: 2,
            label: "${mylabel}",
            labelAlign: "cb",
            rotation: "${rotation}",
            labelXOffset: "${labelXOffset}",
            labelYOffset: "${labelYOffset}"
        }, {
            context: {
                mycolor: function(feature) {
                    return dbkjs.config.styles.dbkcompartiment.styles.default.context.mycolor(feature);
                },
                mylabel: function(feature) {
                    if(feature.attributes.label) {
                        return feature.attributes.label;
                    }
                    switch(feature.attributes.type) {
                        case "30 minuten brandwerende scheiding":
                            return "30'";
                        case "60 minuten brandwerende scheiding":
                            return "60'";
                        case "> 60 minuten brandwerende scheiding":
                            return ">60'";
                        case "> 120 minuten brandwerende scheiding":
                            return ">120'";
                        default:
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
    }),
    hulplijn: new OpenLayers.StyleMap({
        'default': new OpenLayers.Style({
            strokeColor: "${mycolor}",
            strokeLinecap: "butt",
            strokeDashstyle: "${mydash}",
            fillColor: "${mycolor}",
            fillOpacity: "${myopacity}",
            strokeWidth: "${mywidth}",
            pointRadius: 5,
            rotation: "${myrotation}",
            graphicName: "${mygraphic}",
            label: "${information}"
        }, {
        context: {
            myopacity: function (feature) {
                switch (feature.attributes.type) {
                    case "Arrow":
                        return 0.8;
                    default:
                        return 1;
                }
            },
            myrotation: function (feature) {
                if (feature.attributes.rotation) {
                    return -feature.attributes.rotation;
                } else {
                    return 0;
                }
            },
            mywidth: function (feature) {
                switch (feature.attributes.type) {
                    case "Conduit":
                    case "Gate":
                    case "Fence":
                    case "Fence_O":
                        return dbkjs.scaleStyleValue(8,null,null,true);
                     case "HEAT":
                        return dbkjs.scaleStyleValue(3,null,null,true);
                    case "Broken":
                        return dbkjs.scaleStyleValue(1,null,null,true);
                    case "Arrow":
                        return dbkjs.scaleStyleValue(2,null,null,true);
                    case "Diepte 15":
                    case "Diepte 9 m":
                    case "Diepte 3 m":
                    case "Waterkant":
                    case "Depth3m":
                    case "Depth9m":
                    case "Depth15m":
                    case "WS_OK":
                    case "WS_NOK":
                        return dbkjs.scaleStyleValue(3,null,null,true);
                    default:
                        return dbkjs.scaleStyleValue(2,null,null,true);
               }
            },
            mydash: function (feature) {
                switch (feature.attributes.type) {
                    case "Cable":
                    case "Bbarrier":
                    case "Depth9m":
                        return dbkjs.scaleStyleValue(10,null,null,true) + " " + dbkjs.scaleStyleValue(10,null,null,true);
                    case "Conduit":
                    case "Gate":
                    case "Fence":
                    case "Fence_O":
                        return dbkjs.scaleStyleValue(1,null,null,true) + " " + dbkjs.scaleStyleValue(20,null,null,true);
                    case "Broken":
                    case "Depth3m":
                        return dbkjs.scaleStyleValue(3,null,null,true) + " " + dbkjs.scaleStyleValue(2,null,null,true);
                    default:
                        return "solid";
                }
            },
            mycolor: function (feature) {
                switch (feature.attributes.type) {
                    //Bbarrier
                    //Gate
                    case "Bbarrier":
                        return "#ffffff";
                    case "Arrow":
                        return "#040404";
                    case "Gate":
                    case "Fence":
                        return "#000000";
                    case "Fence_O":
                        return "#ff7f00";
                    case "Cable":
                        return "#ffff00";
                    case "Conduit":
                        return "#ff00ff";
                    case "HEAT":
                        return "#ff0000";
                    case "Diepte 15":
                        return "#0000a0";
                    case "Diepte 9 m":
                        return "#0000de";
                    case "Diepte 3 m":
                        return "#0f80ff";
                    case "Waterkant":
                        return "black";
                    case "Depth3m":
                        return "#527dfd";
                    case "Depth9m":
                        return "#2b00fd";
                    case "Depth15m":
                        return "#4723fd";
                    case "WS_OK":
                        return "#41ff1b";
                    case "WS_NOK":
                        return "#f7001d";
                    default:
                        return "#000000";
                }

            },
            mygraphic: function (feature) {
                switch (feature.attributes.type) {
                    case "Arrow":
                        return "triangle";
                    default:
                        return "";
                }
            }
        }
    }),
    "temporary": new OpenLayers.Style({strokeColor: "#009FC3"}),
    "select": new OpenLayers.Style({strokeColor: "#8F00C3"})}),
    hulplijn1: new OpenLayers.StyleMap({
        'default': new OpenLayers.Style({
            strokeColor: "${mycolor}",
            strokeDashstyle: "${mydash}",
            strokeWidth: "${mywidth}"
        }, {
        context: {
            mywidth: function (feature) {
                switch (feature.attributes.type) {
                    case "Cable":
                    case "Bbarrier":
                        return dbkjs.scaleStyleValue(4,null,null,true);
                    case "Conduit":
                    case "Gate":
                    case "Fence":
                    case "Fence_O":
                        return dbkjs.scaleStyleValue(2,null,null,true);
                    default:
                        return dbkjs.scaleStyleValue(2,null,null,true);
                }
            },
            mydash: function (feature) {
                switch (feature.attributes.type) {
                    default:
                        return "none";
                }
            },
            mycolor: function (feature) {
                switch (feature.attributes.type) {
                    case "Conduit":
                        return "#ff00ff";
                    case "Bbarrier":
                        return "#ff0000";
                    case "Gate":
                        return "#ffffff";
                    case "Fence_O":
                        return "#ff7f00";
                    default:
                        return "#000000";
                }
            }
        }
    }),
    "temporary": new OpenLayers.Style({strokeColor: "#009FC3"}),
    "select": new OpenLayers.Style({strokeColor: "#8F00C3"})}),
    hulplijn2: new OpenLayers.StyleMap({
        'default': new OpenLayers.Style({
            strokeColor: "${mycolor}",
            strokeDashstyle: "${mydash}",
            strokeWidth: "${mywidth}"
        }, {
        context: {
            mywidth: function (feature) {
                switch (feature.attributes.type) {
                     case "Gate":
                        return dbkjs.scaleStyleValue(5,null,null,true);
                    default:
                        return dbkjs.scaleStyleValue(2,null,null,true);
                }
            },
            mydash: function (feature) {
                switch (feature.attributes.type) {
                    case "Gate":
                        return "none";
                    default:
                        return "none";
                }
            },
            mycolor: function (feature) {
                switch (feature.attributes.type) {
                     case "Gate":
                        return "#000000";
                    default:
                        return "#000000";
                }
            }
        }
    }),
    "temporary": new OpenLayers.Style({strokeColor: "#009FC3"}),
    "select": new OpenLayers.Style({strokeColor: "#8F00C3"})}),
    toegangterrein: new OpenLayers.StyleMap({
        'default': new OpenLayers.Style({
            strokeColor: "${mycolor}",
            fillColor: "${mycolor}",
            fillOpacity: 0.9,
            strokeWidth: "${mywidth}",
            pointRadius: 5,
            rotation: "${myrotation}",
            graphicName: "${mygraphic}"
        }, {
        context: {
            myrotation: function(feature) {
                if (feature.attributes.rotation) {
                    return -feature.attributes.rotation;
                } else {
                    return 0;
                }
            },
            mycolor: function (feature) {
                switch (feature.attributes.primary) {
                    case true:
                        return "#ff0000";
                    default:
                        return "#00ff00";
                }
            },
            mygraphic: function (feature) {
                return "triangle";
             },
            mywidth: function (feature) {
                return dbkjs.scaleStyleValue(1,null,null,true);
            }
        }
    }),
    'select': new OpenLayers.Style({}),
    'temporary': new OpenLayers.Style({})}),
    pandstylemap: new OpenLayers.StyleMap({
        fillColor: "yellow",
        fillOpacity: 0.4,
        strokeColor: "red",
        strokeWidth: 2,
        pointRadius: 5
    }),
    vbostylemap: new OpenLayers.StyleMap({
        fillColor: "black",
        fillOpacity: 0.4,
        strokeColor: "black",
        strokeWidth: 1,
        pointRadius: 3
    }),
    brandweervoorziening: new OpenLayers.StyleMap({
        "default": new OpenLayers.Style({
            pointRadius: "${myradius}",
            externalGraphic: "${myicon}",
            rotation: "${myrotation}",
            display: "${mydisplay}",
            graphicOpacity: "${myGraphicOpacity}"

        }, {
            context: {
                myicon: function(feature) {
                    // feature.brandweervoorziening2
                    if(feature.attributes.icon) {
                        return feature.attributes.icon;
                    }

                    var icon = feature.attributes.type;
                    if(feature.attributes.information && feature.attributes.information !== "") {
                        if(typeof imagesBase64 !== 'undefined') {
                            var imgi = "images/" + feature.attributes.namespace.toLowerCase() + "/" + icon + "_i.png";
                            if(typeof imagesBase64[imgi] !== 'undefined') {
                                icon += "_i";
                            }
                        }
                    }
                    var img = "images/" + feature.attributes.namespace.toLowerCase() + "/" + icon + ".png";
                    return typeof imagesBase64 === 'undefined' ? dbkjs.basePath + img : imagesBase64[img];
                },
                myrotation: function(feature) {
                    if (feature.attributes.rotation) {
                        return -feature.attributes.rotation;
                    } else {
                        return 0;
                    }
                },
                myradius: function(feature) {
                    return dbkjs.scaleStyleValue(12, feature.attributes.radius);
                },
                mydisplay: function(feature) {
                    if (dbkjs.options.visibleCategories && feature.attributes.category &&
                        dbkjs.options.visibleCategories[feature.attributes.category] === false) {
                        return "none";
                    } else {
                        // any string except "none" works here
                        return "true";
                    }
                }
            }
        }), 'select': new OpenLayers.Style({
            pointRadius: "${myradius}"
        }, {
            context: {
                myradius: function(feature) {
                    return dbkjs.scaleStyleValue(20, feature.attributes.radius, 1.66);
                }
            }
        }), 'temporary': new OpenLayers.Style({
            pointRadius: "${myradius}"
        }, {
            context: {
                myradius: function(feature) {
                    return dbkjs.scaleStyleValue(24, feature.attributes.radius, 2);
                }
            }
        })
    }),
    gevaarlijkestof: new OpenLayers.StyleMap({
        "default": new OpenLayers.Style({
            pointRadius: "${myradius}",
            externalGraphic: "${myicon}"
        }, {
            context: {
                myradius: function(feature) {
                    return dbkjs.scaleStyleValue(12);
                },
                myicon: function(feature) {
                    var icon = feature.attributes.type;
                    if(feature.attributes.information && feature.attributes.information !== "") {
                        if(typeof imagesBase64 !== 'undefined') {
                            var imgi = "images/" + feature.attributes.namespace.toLowerCase() + "/" + icon + "_i.png";
                            if(typeof imagesBase64[imgi] !== 'undefined') {
                                icon += "_i";
                            }
                        }
                    }
                    var img = "images/" + feature.attributes.namespace.toLowerCase() + "/" + icon + ".png";
                    return typeof imagesBase64 === 'undefined' ? dbkjs.basePath + img : imagesBase64[img];
                }
            }
        }), 'select': new OpenLayers.Style({
            pointRadius: "${myradius}"
        }, {
            context: {
                myradius: function(feature) {
                    return dbkjs.scaleStyleValue(20);
                }
            }
        }), 'temporary': new OpenLayers.Style({
            pointRadius: "${myradius}"
        }, {
            context: {
                myradius: function(feature) {
                    return dbkjs.scaleStyleValue(25);
                }
            }
        })
    }),
    tekstobject: new OpenLayers.StyleMap({
        "default": new OpenLayers.Style({
            pointRadius: 0,
            fontSize: "${mysize}",
            label: "${title}",
            rotation: "${myRotation}",
            labelSelect: true,
            labelOutlineColor: "#ffffff",
            labelOutlineWidth: 1
        }, {
            context: {
                mysize: function(feature) {
                    return dbkjs.scaleStyleValue(12, feature.attributes.scale);
                },
                myRotation: function(feature) {
                    if (parseFloat(feature.attributes.rotation) !== 0.0) {
                        var ori = parseFloat(feature.attributes.rotation);
                        return -ori;
                    } else {
                        return parseFloat(0);
                    }
                }
            }
        }),
        'select': new OpenLayers.Style({}),
        'temporary': new OpenLayers.Style({})
    }),
    comm: new OpenLayers.StyleMap({
         "default": new OpenLayers.Style({
             pointRadius: "${myradius}",
             externalGraphic: "${myicon}"
         }, {
             context: {
                 myradius: function (feature) {
                     return dbkjs.scaleStyleValue(12);
                 },
                 myicon: function (feature) {
                     var img = "images/" + feature.attributes.namespace + "/" + feature.attributes.type + ".png";
                     return typeof imagesBase64 === 'undefined' ? dbkjs.basePath + img : imagesBase64[img];
                 }
             }
         }), 'select': new OpenLayers.Style({
             pointRadius: "${myradius}"
         }, {
             context: {
                 myradius: function (feature) {
                     return dbkjs.scaleStyleValue(20);
                 }
             }
         }), 'temporary': new OpenLayers.Style({
             pointRadius: "${myradius}"
         }, {
             context: {
                 myradius: function (feature) {
                     return dbkjs.scaleStyleValue(25);
                 }
             }
         })
     }),
    getCustomPolygonColor: function(soort) {
        switch(soort) {
            case ">15 meter": return "#f72e3a";
            case "10-15 meter": return "#4729fd";
            case "5-10 meter": return "#6c92fe";
            case "0-5 meter": return "#c9ffff";
            case "Eiland": return "#55ff40";
            case "Ponton": return "#3c3b3c";
        }
        return "";
    },
    customPolygon: new OpenLayers.StyleMap({
        'default': new OpenLayers.Style({
            fillColor: "${fill}",
            strokeWidth: 0,
            fillOpacity: 0.6
        }, {
            context: {
                fill: function (feature) {
                    return dbkjs.config.styles.getCustomPolygonColor(feature.attributes["Soort"], "fill");
                }
            }
        }),
        'select': new OpenLayers.Style({}),
        'temporary': new OpenLayers.Style({})
     })
};
