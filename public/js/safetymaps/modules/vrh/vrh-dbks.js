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
 * OpenLayers2 layers for displaying VRH DBKs.
 *
 */

/* global safetymaps, dbkjs, OpenLayers, i18n, Mustache */

var safetymaps = safetymaps || {};
safetymaps.vrh = safetymaps.vrh || {};

safetymaps.vrh.Dbks = function(options) {
    var me = this;
    me.options = $.extend({
        compartmentLabelMinSegmentLength: 7.5,
        compartmentLabelMinScale: 300,
        graphicSize: 15,
        graphicSizeHover: 26,
        graphicSizeSelect: 20,
        options: {
            styleSizeAdjust: 0 // For safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue()
        }
    }, options);

    me.loading = true;

    me.luchtfotoLayer = null;
    $.each(dbkjs.map.layers, function(i, l) {
        if(l.name.toLowerCase().indexOf("luchtfoto") !== -1) {
            me.luchtfotoLayer = l;
            return false;
        }
    });

    me.symbolPath = "js/safetymaps/modules/vrh/assets/dbks/";
    me.vrhSymbols = {
        "Hellingbaan": "Hellingbaan",
        "Tb02": "Brandslanghaspel",
        "Tb1010": "Schacht/kanaal",
        "Tb1010o": "Opstelplaats redvoertuig",
        "Tb1011": "Gas detectiepaneel",
        "Tbe01": "Sleutel of ring paal",
        "Tbe02": "Poller",
        "Tbe05": "Niet toegankelijk",
        "Tbe06": "Parkeerplaats",
        "Tb2024": "Afsluiter omloopleiding",
        "Tb2025": "Afsluiter LPG",
        "Tb4005": "Gesprinklerde ruimte",
        "TbeBus": "Bussluis",
        "TbeHoogte": "Doorrijhoogte",
        "TbeRIJ": "Berijdbaar",
        "Tn05": "Nooduitgang",
        "Tn504": "Indicator/flitslicht",
        "To02": "Slaapplaats",
        "To03": "Noodstroom aggegraat",
        "To04": "Brandweerinfokast",
        "To1001": "Trap",
        "To1002": "Trap rond",
        "To1003": "Trappenhuis"
    };

    me.vrhDangerSymbols = {
        "Tw07": "Tw07",
        "TwTemp": "Temperatuur",
        "Tw21": "Niet blussen met water",
        "Tw22": "Markering lab laag risico",
        "Tw23": "Markering lab middel risico",
        "Tw24": "Markering lab hoog risico"
    };

    me.vrhCompartimenteringStyles = {
        "Tbk5,002": {
            "name": "60 minuten brandwerende scheiding",
            "color": "#5da03b",
            "thickness": 4,
            "pattern": "1.2 1.2",
            "label": "60'"
        },
        "Tbk5,003": {
            "name": "30 minuten brandwerende scheiding",
            "color": "#c1001f",
            "thickness": 2,
            "pattern": "3 1",
            "label": "30'"
        },
        "Tbk5,120": {
            "name": "> 120 minuten brandwerende scheiding",
            "color": "#ff0000",
            "thickness": 4,
            "pattern": "",
            "label": ">120'"
        },
        "Tbk5,000": {
            "name": "Rookwerende scheiding",
            "color": "#009cdd",
            "thickness": 2,
            "pattern": "2 1",
            "label": null
        }
    };

    me.vrhLineStyles = {
        "Default": {
            color1: "#000"
        },
        "Binnenmuur": {
            color1: "#000"
        },
        "Blusleiding": {
            color1: "#0070ff"
        },
        "Inzetdiepte": {
            color1: "#ffff00"
        },
        "Hekwerk": {
            color1: "#000",
            color2: "#000",
            thickness: 2,
            type_viewer: "track"
        },
        "Schadecirkel": {
            color1: "#f00",
            pattern: "1 2"
        },
        "Schadecircel": {
            color1: "#f00",
            pattern: "1 2"
        },
        "Vluchtroute": {
            color1: "#000"
        }
    };

    me.initLayers();
};

safetymaps.vrh.Dbks.prototype.initLayers = function() {
    var me = this;

    dbkjs.map.addLayers(me.createLayers());

    $.each(me.selectLayers, function(i, l) {
        dbkjs.selectControl.layers.push(l);
        if(l.hover) dbkjs.hoverControl.layers.push(l);
        l.events.register("featureselected", me, me.layerFeatureSelected);
        l.events.register("featureunselected", me, dbkjs.modules.vrh_objects.objectLayerFeatureUnselected);
    });
};

safetymaps.vrh.Dbks.prototype.createLayers = function() {
    var me = this;

    this.layers = [];
    this.selectLayers = [];

    this.layerPand = new OpenLayers.Layer.Vector("DBK Panden", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                fillColor: "#ffffff",
                fillOpacity: "${fillOpacity}",
                strokeColor: "#ff0000",
                strokeWidth: 3
            }, {
                context: {
                    fillOpacity: function(feature) {
                        return me.luchtfotoLayer && me.luchtfotoLayer.visibility ? 0.3 : 1;
                    }
                }
            })
        })
    });
    this.layers.push(this.layerPand);

    this.layerFireCompartmentation = new OpenLayers.Layer.Vector("DBK brandcompartimenten", {
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
                        if(feature.attributes.style && feature.attributes.style.pattern)return safetymaps.creator.CreatorObjectLayers.prototype.scalePattern(feature.attributes.style.pattern, 3);
                        else return safetymaps.creator.CreatorObjectLayers.prototype.scalePattern("", 3);
                    }
                }
            }),

            select: new OpenLayers.Style({strokeWidth: 7, strokeColor:"#FF00FF"})
        })
    });
    this.layers.push(this.layerFireCompartmentation);
    this.selectLayers.push(this.layerFireCompartmentation);

    this.layerFireCompartmentationLabels = new OpenLayers.Layer.Vector("DBK brandcompartiment labels", {
        minScale: me.options.compartmentLabelMinScale,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({
                fontSize: "16",
                label: "${label}",
                fontColor: "${color}",
                labelSelect: false,
                rotation: "${rotation}",
                labelOutlineColor: "#ffffff",
                labelOutlineWidth: 2,
                labelAlign: "cb",
                labelXOffset: "${labelXOffset}",
                labelYOffset: "${labelYOffset}"
            }, {
                context: {
                    label: function(feature) {
                        return feature.attributes.style.label;
                    },
                    color: function(feature) {
                        return feature.attributes.style.color;
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

    this.layerLines1 = new OpenLayers.Layer.Vector("DBK lines 1", {
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
                pointRadius: 5
            }, {
                context: {
                    color: function(feature) {
                        return feature.attributes.style.color1 || "#000000";
                    },
                    strokeWidth: function(feature) {
                        if (feature.attributes.style.type_viewer) {
                            var type = feature.attributes.style.type_viewer;
                            if(type === "doubletrack" || type === "tube") {
                                return feature.attributes.style.thickness + 2;
                            } else {
                                return feature.attributes.style.thickness;
                            }
                        } else {
                            return 2;
                        }
                    },
                    dashstyle: function(feature) {
                        if(feature.attributes.style.pattern) {
                            return safetymaps.creator.CreatorObjectLayers.prototype.scalePattern(feature.attributes.style.pattern, 5);
                        } else {
                            return "";
                        }
                    },
                    graphicName: function(feature) {
                        return feature.attributes.style.type_viewer === "arrow" ? "triangle" : "";
                    }
                }
            })
        })
    });
    this.layers.push(this.layerLines1);
    this.layerLines2 = new OpenLayers.Layer.Vector("DBK lines 2", {
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
                        return feature.attributes.style.color2 || "#000";
                    },
                    strokeWidth: function(feature) {
                        return feature.attributes.style.thickness || 2;
                    },
                    dashstyle: function(feature) {
                        if(feature.attributes.style.type_viewer === "tube") {
                            return safetymaps.creator.CreatorObjectLayers.prototype.scalePattern("8 8", 1);
                        }
                        return "";
                    }
                }
            })
        })
    });
    this.layers.push(this.layerLines2);

    this.layerLines3 = new OpenLayers.Layer.Vector("DBK lines 3", {
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
                        return feature.attributes.style.color1 || "#000000";
                    },
                    strokeWidth: function(feature) {
                        return (feature.attributes.style.thickness || 2) + 6;
                    },
                    dashstyle: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scalePattern("1 20", 1);
                    }
                }
            })
        })
    });
    this.layers.push(this.layerLines3);

    this.layerSymbols = new OpenLayers.Layer.Vector("DBK symbols", {
        hover: true,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                externalGraphic: "${symbol}",
                pointRadius: "${myradius}",
                rotation: "${rotation}",
                fontWeight: "bold",
                fontSize: "${fontSize}",
                label: "${label}"
            }, {
                context: {
                    myradius: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me, me.options.graphicSize);
                    },
                    label: function(feature) {
                        if(feature.attributes.code === "TbeHoogte") {
                            return feature.attributes.bijzonderh;
                        }
                        return "";
                    },
                    fontSize: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,12, feature.attributes.radius) + "px";
                    }
                }
            }),
            temporary: new OpenLayers.Style({
                pointRadius: "${myradius}",
                fontSize: "${fontSize}"
            }, {
                context: {
                    myradius: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me, me.options.graphicSizeHover);
                    },
                    fontSize: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,18, feature.attributes.radius) + "px";
                    }
                }
            }),
            select: new OpenLayers.Style({
                pointRadius: "${myradius}",
                fontSize: "${fontSize}"
            }, {
                context: {
                    myradius: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me, me.options.graphicSizeSelect);
                    },
                    fontSize: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,14, feature.attributes.radius) + "px";
                    }
                }
            })
        })
    });
    this.layers.push(this.layerSymbols);
    this.selectLayers.push(this.layerSymbols);

    this.layerDangerSymbols = new OpenLayers.Layer.Vector("DBK danger symbols", {
        hover: true,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                externalGraphic: "${symbol}",
                pointRadius: "${myradius}"
            }, {
                context: {
                    myradius: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me, me.options.graphicSize);
                    }
                }
            }),
            temporary: new OpenLayers.Style({
                pointRadius: "${myradius}"
            }, {
                context: {
                    myradius: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me, me.options.graphicSizeHover);
                    }
                }
            }),
            select: new OpenLayers.Style({
                pointRadius: "${myradius}"
            }, {
                context: {
                    myradius: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me, me.options.graphicSizeSelect);
                    }
                }
            })
        })
    });
    this.layers.push(this.layerDangerSymbols);
    this.selectLayers.push(this.layerDangerSymbols);

    this.layerLabels = new OpenLayers.Layer.Vector("DBK labels", {
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({
                fontSize: "${size}",
                label: "${tekst}",
                rotation: "${rotation}",
                labelOutlineColor: "#ffffff",
                labelOutlineWidth: 1
            }, {
                context: {
                    size: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,14,feature.attributes.symboolgro);
                    }
                }
            })
        })
    });
    this.layers.push(this.layerLabels);
    this.selectLayers.push(this.layerLabels); // Alleen om bovenop andere lagen te komen

    return this.layers;
};

safetymaps.vrh.Dbks.prototype.showFeatureInfo = function(title, code, image, label, description, labelStyle) {
    $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle">&nbsp;' + title + '</span>');
    var html = $('<div class="table-responsive"></div>');
    var table = $('<table class="table table-hover"></table>');
    var row = '<tr>';
    table.append(row);
    if(image) {
        row += '<th style="width: 110px">Symbool</th>';
    }
    row += ('<th>' + i18n.t("name") + '</th><th>' + i18n.t("dialogs.information") + '</th></tr>');
    table.append(row);
    row = '<tr>';
    if(image) {
        row += '<td><img class="thumb" src="' + image + '" alt="' + code + '" title="' + code + '"></td>';
    }
    labelStyle = labelStyle || "width: 20%";
    row += '<td style="' + labelStyle + '">' + label + '</td><td>' + (description || "") + '</td></tr>';
    table.append(row);
    html.append(table);
    $('#vectorclickpanel_b').html('').append(html);
    $('#vectorclickpanel').show();
};

safetymaps.vrh.Dbks.prototype.showGevaarlijkeStof = function(title, f) {
    $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle">&nbsp;' + title + '</span>');
    var html = $('<div class="table-responsive"></div>');
    var table = $('<table class="table table-hover"></table>');
    table.append('<tr><th width="100px">Symbool</th><th width="60px">Gevi</th><th>Naam</th><th>Hoeveelheid</th><th>Bijzonderheden</th><th>ERIC-kaart</th></tr>');
    table.append('<tr><td><img class="thumb" src="' + f.symbol_noi + '" alt="' + f.symboolcod + '" title="' + f.symboolcod + '"></td>'
        + '<td><div class="gevicode">' + f.gevi_code + '</div><div class="unnummer">' + f.vn_nummer + '</div></td>'
        + '<td>' + f.stofnaam + '</td><td>' + f.hoeveelhei + '</td><td>' + f.description + '</td><td>' + f.eric_kaart + '</td></tr>');
    html.append(table);
    $('#vectorclickpanel_b').html('').append(html);
    $('#vectorclickpanel').show();
};

safetymaps.vrh.Dbks.prototype.layerFeatureSelected = function(e) {
    var me = this;
    var layer = e.feature.layer;
    var f = e.feature.attributes;
    console.log(layer.name + " feature selected", e);
    if(layer === me.layerSymbols) {
        me.showFeatureInfo("Brandweervoorziening", f.symboolcod, f.symbol_noi, me.vrhSymbols[f.code] || i18n.t("symbol." + f.code) || "", f.description);
    } else if(layer === me.layerDangerSymbols) {
        if(f.stofnaam) {
            me.showGevaarlijkeStof("Gevaarlijke stof", f);
        } else {
            me.showFeatureInfo("Gevaar", f.symboolcod, f.symbol_noi, me.vrhDangerSymbols[f.code] || i18n.t("symbol." + f.code) || "", f.description);
        }
    } else if(layer === me.layerFireCompartmentation) {
        me.showFeatureInfo("Brandcompartiment", null, null, f.style.name, f.bijzonderh, " ");
    } else {
        $("#vectorclickpanel").hide();
    }
};

safetymaps.vrh.Dbks.prototype.removeAllFeatures = function(object) {
    if(this.layers) {
        $.each(this.layers, function(i, layer) {
            layer.removeAllFeatures();
        });
    }
};

safetymaps.vrh.Dbks.prototype.addFeaturesForObject = function(object) {
    var me = this;
    var wktParser = new OpenLayers.Format.WKT();

    var wktReader = function(d) {
        var f = wktParser.read(d.geometry);
        delete d.geom;
        delete d.geometry;
        f.attributes = d;
        return f;
    };

    this.layerPand.addFeatures(object.pand.map(wktReader));

    this.layerFireCompartmentation.addFeatures((object.compartimentering || []).map(wktReader).map(function(f) {
        f.attributes.style = me.vrhCompartimenteringStyles[f.attributes.symboolcod];
        if(!f.attributes.style) {
            console.log("Ongeldige symboolcode voor brandcompartiment: " + f.attributes.symboolcod);
        }

        if(f.attributes.style.label) {
            var labelPoints = safetymaps.utils.geometry.createMultiLineStringLabelPointFeatures(f.geometry, me.options.compartmentLabelMinSegmentLength);

            me.layerFireCompartmentationLabels.addFeatures(labelPoints.map(function(labelFeature) {
                labelFeature.attributes.style = f.attributes.style;
                return labelFeature;
            }));
        }

        return f;
    }));

    var lineFeatures2 = [];
    var lineFeatures3 = [];
    var lineFeatures1 = (object.aanpijling || []).map(wktReader).map(function(f) {
        f.attributes.style = {
            type_viewer: "line",
            color1: "#000",
            thickness: 2
        };
        return f;
    });
    lineFeatures1 = lineFeatures1.concat((object.slagboom || []).map(wktReader).map(function(f) {
        f.attributes.description = "";
        f.attributes.style = {
            type_viewer: "tube",
            color1: "#f00",
            color2: "#fff",
            thickness: 2
        };
        lineFeatures2.push(f.clone());
        return f;
    }));
    lineFeatures1 = lineFeatures1.concat((object.overige_lijnen || []).map(wktReader).map(function(f) {
        f.attributes.style = me.vrhLineStyles[f.attributes.type] || me.vrhLineStyles["Default"];
        if(f.attributes.style) {
            if(["doubletrack", "tube"].indexOf(f.attributes.style.type_viewer) !== -1) {
                lineFeatures2.push(f.clone());
            }
            if(["doubletrack", "track"].indexOf(f.attributes.style.type_viewer) !== -1) {
                lineFeatures3.push(f.clone());
            }
        }
        return f;
    }));
    lineFeatures1 = lineFeatures1.concat((object.aanrijroute || []).map(wktReader).map(function(f) {
        f.attributes.style = {
            color1: "#000",
            type_viewer: "arrow"
        };
        // Create two geometries: one line and a point at the end of the
        // line to display the arrow
        var vertices = f.geometry.getVertices();
        var end = vertices[vertices.length - 1];

        // Rotation for triangle graphic rendered at end of line
        f.attributes.rotation = 90 - safetymaps.utils.geometry.getLastLineSegmentAngle(f.geometry);

        f.geometry = new OpenLayers.Geometry.Collection([f.geometry, end]);
        return f;
    }));

    this.layerLines1.addFeatures(lineFeatures1);
    this.layerLines2.addFeatures(lineFeatures2);
    this.layerLines3.addFeatures(lineFeatures3);

    var vrhSymbol = function(f) {
        if(f.attributes.symboolcod) {
            f.attributes.code = f.attributes.symboolcod.replace(/,/, "");
        }
        f.attributes.description = f.attributes.omschrijvi || "";
        if(f.attributes.bijzonderh && f.attributes.bijzonderh.trim() !== "-") {
            f.attributes.description += "; " + f.attributes.bijzonderh;
        }
        f.attributes.rotation = -(360-f.attributes.symboolhoe) || 0;

        var symbol = f.attributes.code;
        var path = safetymaps.creator.api.imagePath + 'symbols/';
        if(me.vrhSymbols[f.attributes.code]) {
            path = me.symbolPath;
        }
        f.attributes.symbol_noi = path + symbol + '.png';
        if(f.attributes.description.trim().length > 0) {
            symbol += "_i";
        }
        f.attributes.symbol = path + symbol + '.png';

        return f;
    };

    this.layerSymbols.addFeatures((object.brandweervoorziening || []).map(wktReader).map(vrhSymbol));
    this.layerSymbols.addFeatures((object.toegang_pand || []).map(wktReader).map(vrhSymbol));
    this.layerSymbols.addFeatures((object.toegang_terrein|| []).map(wktReader).map(vrhSymbol));
    this.layerSymbols.addFeatures((object.opstelplaats || []).map(wktReader).map(function(f) {
        // Voor deze laag betekent code Tb1,010 niet schacht/kanaal maar opstelplaats redvoertuig
        if(f.attributes.symboolcod === "Tb1,010") {
            f.attributes.symboolcod = "Tb1,010o";
        }
        return f;
    }).map(vrhSymbol));
    this.layerSymbols.addFeatures((object.hellingbaan || []).map(wktReader).map(function(f) {
        f.attributes.symboolcod = "Hellingbaan";
        f.attributes.omschrijvi = f.attributes.bijzonderh;
        delete f.attributes.bijzonderh;
        return f;
    }).map(vrhSymbol));

    this.layerDangerSymbols.addFeatures((object.gevaren || []).map(wktReader).map(function(f) {
        f.attributes.code = f.attributes.symboolcod;

        if(f.attributes.code === "Tw03") {
            f.attributes.code = "TwTemp";
        }

        f.attributes.description = f.attributes.bijzonderh && f.attributes.bijzonderh.trim() !== "-" ? f.attributes.bijzonderh : "";
        if(f.attributes.soort_geva && f.attributes.soort_geva.trim() !== "-") {
            f.attributes.description += f.attributes.description !== "" ? "; " : "";
            f.attributes.description += f.attributes.soort_geva;
        }
        if(f.attributes.locatie && f.attributes.locatie.trim() !== "-") {
            f.attributes.description += f.attributes.description !== "" ? "; " : "";
            f.attributes.description += "Locatie: " + f.attributes.locatie;
        }

        var symbol = f.attributes.code;
        var path = safetymaps.creator.api.imagePath + 'danger_symbols/';
        if(me.vrhDangerSymbols[f.attributes.code]) {
            path = me.symbolPath;
        }
        f.attributes.symbol_noi = path + symbol + '.png';
        if(f.attributes.description.trim().length > 0) {
            symbol += "_i";
        }
        f.attributes.symbol = path + symbol + '.png';
        return f;
    }));

    this.layerDangerSymbols.addFeatures((object.gevaarlijke_stoffen || []).map(wktReader).map(function(f) {
        f.attributes.code = f.attributes.symboolcod;

        f.attributes.description = f.attributes.bijzonderh && f.attributes.bijzonderh.trim() !== "-" ? f.attributes.bijzonderh : "";
        if(f.attributes.etiket && f.attributes.etiket.trim() !== "-") {
            f.attributes.description += f.attributes.description !== "" ? ", " : "";
            f.attributes.description += "Etiket: " + f.attributes.etiket;
        }
        if(f.attributes.ruimte && f.attributes.ruimte.trim() !== "-") {
            f.attributes.description += f.attributes.description !== "" ? ", " : "";
            f.attributes.description += "Ruimte: " + f.attributes.ruimte;
        }

        var symbol = f.attributes.code;
        var path = safetymaps.creator.api.imagePath + 'danger_symbols/';
        if(me.vrhDangerSymbols[f.attributes.code]) {
            path = me.symbolPath;
        }
        f.attributes.symbol_noi = path + symbol + '.png';
        if(f.attributes.description.trim().length > 0) {
            symbol += "_i";
        }
        f.attributes.symbol = path + symbol + '.png';
        return f;
    }));

    this.layerLabels.addFeatures((object.teksten || []).map(wktReader).map(function(f) {
        f.attributes.rotation = f.attributes.symboolhoe-90 || 0;
        return f;
    }));

    console.log("Added DBK layer features", this.layers);
};

safetymaps.vrh.Dbks.prototype.updateInfoWindow = function(windowId, object) {
    var me = this;

    safetymaps.infoWindow.removeTabs(windowId, "info");

    var rows = [];

    var o = object;

    var p = o.pand[0];
    $.each(o.pand, function(i, pand) {
        if(pand.hoofd_sub === "Hoofdpand") {
            p = pand;
            return false;
        }
        return true;
    });

    var adres = (p.adres || "") + (p.plaats ? "<br>" + p.plaats : "");

    rows.push({l: "OMS nummer",                     t: p.oms_nummer});
    rows.push({l: "Naam",                           t: o.naam});
    rows.push({l: "Adres",                          html: adres});
    if(p.oppervlakt) {
        rows.push({l: "Oppervlakte",                html: Number(p.oppervlakt).toFixed(0) + " m&sup2;"});
    }
    rows.push({l: "Bouwjaar",                       t: p.bouwjaar});
    rows.push({l: "Gebruik",                        t: p.gebruiksdo});
    rows.push({l: "Laagste bouwlaag / verdieping",  t: p.bouwlageno});
    rows.push({l: "Hoogste bouwlaag (verdieping)",  t: p.bouwlagenb === 0 ? "0" : p.bouwlagenb + " (" + (p.bouwlagenb-1) + ")"});
    rows.push({l: "Afwijkende binnendekking",       t: p.afwijkende});
    rows.push({l: "Aanvullende info binnendekking", t: p.binnendekk});
    rows.push({l: "Risicoklasse",                   t: p.risicoklas});
    rows.push({l: "Inzetprocedure",                 t: p.inzetproce});
    rows.push({l: "Aanvalsplan",                    t: p.aanvalspla});
    safetymaps.infoWindow.addTab(windowId, "algemeen", "Algemeen", "info", safetymaps.creator.createInfoTabDiv(rows));

    rows = [];

    rows.push(["<b>Moment</b>", "<b>Aantal</b>", "<b>Groep</b>"]);
    var v;
    v = p.personeel_; if(v) rows.push(["Dag", v, "Personeel"]);
    v = p.bezoekers_; if(v) rows.push(["Dag", v, "Bezoekers"]);
    v = p.slaapplaat; if(v) rows.push(["Dag", v, "Slaapplaatsen"]);
    v = p.bhv_dag;    if(v) rows.push(["Dag", v, "BHV"]);
    v = p.personeel1; if(v) rows.push(["Nacht", v, "Personeel"]);
    v = p.bezoekers1; if(v) rows.push(["Nacht", v, "Bezoekers"]);
    v = p.slaappla_1; if(v) rows.push(["Nacht", v, "Slaapplaatsen"]);
    v = p.bhv_nacht;  if(v) rows.push(["Nacht", v, "BHV"]);
    v = p.personee_1; if(v) rows.push(["Weekend", v, "Personeel"]);
    v = p.bezoeker_1; if(v) rows.push(["Weekend", v, "Bezoekers"]);
    v = p.slaappla_2; if(v) rows.push(["Weekend", v, "Slaapplaatsen"]);
    v = p.bhv_weeken; if(v) rows.push(["Weekend", v, "BHV"]);

    v = p.personee_2; if(v) rows.push("<tr><td colspan='3'>Personeel: " + Mustache.escape(v) + "</td></tr>");
    v = p.bezoeker_2; if(v) rows.push("<tr><td colspan='3'>Bezoekers: " + Mustache.escape(v) + "</td></tr>");
    v = p.slaappla_3; if(v) rows.push("<tr><td colspan='3'>Slaapplaatsen: " + Mustache.escape(v) + "</td></tr>");
    v = p.bhv_omsch; if(v) rows.push("<tr><td colspan='3'>BHV: " + Mustache.escape(v) + "</td></tr>");
    v = p.bijzonde_1; if(v) rows.push("<tr><td colspan='3'>Bijzonderheid aanwezigheid: " + Mustache.escape(v) + "</td></tr>");
    v = p.verzamelpl; if(v) rows.push("<tr><td colspan='3'>Verzamelplaats: " + Mustache.escape(v) + "</td></tr>");

    if(rows.length !== 1) {
        safetymaps.infoWindow.addTab(windowId, "verblijf", "Verblijf", "info", safetymaps.creator.createInfoTabDiv(rows));
    }

    rows = [];

    v = o.sleutelbui; if(v) rows.push("<tr><td colspan='2'>Sleutelbuisklus</td><td>" + Mustache.escape(v) + "</td></tr>");
    v = p.compartime; if(v) rows.push("<tr><td colspan='2'>Compartimenten</td><td>" + Mustache.escape(v) + "</td></tr>");
    v = o.wts_locati; if(v) rows.push("<tr><td colspan='2'>WTS locatie</td><td>" + Mustache.escape(v) + "</td></tr>");
    v = o.automatisc; if(v) rows.push("<tr><td colspan='2'>Automatische blusinstallatie</td><td>" + Mustache.escape(v) + "</td></tr>");
    v = o.rookwarmte; if(v) rows.push("<tr><td colspan='2'>Rook- en warmteafvoerinstallatie</td><td>" + Mustache.escape(v) + "</td></tr>");
    v = o.overdrukst; if(v) rows.push("<tr><td colspan='2'>Overdruk/stuwdrukinstallatie</td><td>" + Mustache.escape(v) + "</td></tr>");

    rows.push(["<b>Symbool</b>", "<b>Naam</b>", "<b>Informatie</b>"]);

    var rowsWithInfo = [];
    var rowsWithoutInfo = [];
    var codesDisplayed = {};

    $.each(me.layerSymbols.features.concat(me.layerDangerSymbols.features), function(i, f) {
        if(f.attributes.stofnaam) {
            return true;
        }
        var code = f.attributes.code;
        var description = f.attributes.description || "";
        if(codesDisplayed[f.attributes.code] && description.length === 0) {
            return true;
        }
        codesDisplayed[f.attributes.code] = true;

        var tr =[
            "<img class='legend_symbol' src='" + f.attributes.symbol_noi + "' alt='" + code + "' title='" + code + "'>",
            me.vrhSymbols[code] || me.vrhDangerSymbols[code] || i18n.t("symbol." + code),
            description
        ];
        if(description.length === 0) {
            rowsWithoutInfo.push(tr);
        } else {
            rowsWithInfo.push(tr);
        }
    });
    function legendTrSort(lhs, rhs) {
        return lhs[1].localeCompare(rhs[1]);
    };
    rowsWithInfo.sort(legendTrSort);
    rowsWithoutInfo.sort(legendTrSort);
    rows = rows.concat(rowsWithInfo).concat(rowsWithoutInfo);

    if(rows.length !== 1) {
        safetymaps.infoWindow.addTab(windowId, "brandweer", "Brandweer", "info", safetymaps.creator.createInfoTabDiv(rows));
    }

    rows = [];

    rows.push(["<b>Symbool</b>", "<b>Gevi</b>", "<b>Naam</b>", "<b>Hoeveelheid</b>", "<b>Bijzonderheden</b>", "<b>ERIC-kaart</b>"]);

    $.each(me.layerDangerSymbols.features, function(i, f) {
        if(!f.attributes.stofnaam) {
            return true;
        }
        var a = f.attributes;
        rows.push(
                '<tr><td width="100px"><img class="legend_symbol" src="' + a.symbol_noi + '" alt="' + a.symboolcod + '" title="' + a.symboolcod + '"></td>' +
                '<td><div class="gevicode">' + a.gevi_code + '</div><div class="unnummer">' + a.vn_nummer + '</div></td>' +
                '<td>' + a.stofnaam + '</td><td>' + a.hoeveelhei + '</td><td>' + a.description + '</td><td>' + a.eric_kaart + '</td></tr>'
        );
    });

    if(rows.length !== 1) {
        safetymaps.infoWindow.addTab(windowId, "gevaarlijke_stoffen", "Gevaarlijke stoffen", "info", safetymaps.creator.createInfoTabDiv(rows));
    }

    rows = [];

    rows.push({l: "Gebouwconstructie", t: p.gebouwcons});
    rows.push({l: "Dakconstructie", t: p.dakconstru});
    rows.push({l: "Bijzondere bouwkundige constructie", t: p.bijz_bouwk});
    rows.push({l: "Liften", t: p.liften});
    v = o.bijzonderh; if(v) rows.push("<tr><td colspan='2'>" + Mustache.escape(v) + "</td></tr>");
    v = p.bijzonderh; if(v) rows.push("<tr><td colspan='2'>" + Mustache.escape(v) + "</td></tr>");
    v = p.bijz_heden; if(v) rows.push("<tr><td colspan='2'>" + Mustache.escape(v) + "</td></tr>");
    v = p.bijz_hed_1; if(v) rows.push("<tr><td colspan='2'>" + Mustache.escape(v) + "</td></tr>");
    v = p.bijz_hed_2; if(v) rows.push("<tr><td colspan='2'>" + Mustache.escape(v) + "</td></tr>");
    rows.push({l: "Bijzonderheden afsluiters", t: o.bijzonde_1});

    safetymaps.infoWindow.addTab(windowId, "gebouw", "Gebouw", "info", safetymaps.creator.createInfoTabDiv(rows));
};
