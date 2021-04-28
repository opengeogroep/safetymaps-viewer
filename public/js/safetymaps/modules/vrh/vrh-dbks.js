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
 * OpenLayers2 layers for displaying VRH DBKs.
 *
 */

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
        wideLineForSelectionExtraWidth: 6,
        wideLineForSelectionOpacity: 0,
        options: {
            styleSizeAdjust: 0 // For safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue()
        }
    }, options);

    safetymaps.creator.api.mediaPath = "api/media/";

    var params = new OpenLayers.Util.getParameters();
    me.options.wideLineForSelectionOpacity = Number(params.selectionLineOpacity) || me.options.wideLineForSelectionOpacity;
    me.options.wideLineForSelectionExtraWidth = Number(params.selectionLineExtraWidth) || me.options.wideLineForSelectionExtraWidth;

    me.loading = true;

    me.luchtfotoLayers = [];
    $.each(dbkjs.map.layers, function(i, l) {
        if(l.name.toLowerCase().indexOf("luchtfoto") !== -1) {
            me.luchtfotoLayers.push(l);
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
        "To1003": "Trappenhuis",
        "Commandokamer": "Commandokamer",
        "Schuimblus": "Schuimblusinstallatie",
        "Maatregelen_C2000": "Maatregelen C2000",
        "NBLA": "Natte blusleiding",
        "HydrofoorBRW": "Hydrofoor brandweer",
        "HydrofoorEIGEN": "Eigen hydrofoor",
        "Sleutelbuis": "Sleutelbuis"
    };
    /* These symbols are flipped 180 degrees compared to the Creator symbols */
    me.vrhSymbolsFlipped = [
        "Tb1007",
        "Tb1007a",
        "Tb4005",
        "NBLA"
    ];
    me.buttonSymbols = {};
    me.buttonSymbols.basis = [
        "TbeRIJ", "TbeBus", "TbeHoogte", "Tbe05", "Tbe06", "Tbe02", "Tbe01", "Tn504", "To04", "Tb1010o",
        "Tb1008",  // Opstelplaats 1e TS
        "Tb1004a", // BMC
        "Tb1004",  // Brandweerpaneel
        "Tb1005",  // Nevenpaneel
        "Tb1001",  // Brandweeringang
        "Tb1002",  // Overige ingangen / neveningang
        "Commandokamer"
    ];
    me.buttonSymbols.brandweergegevens = [
        "Tbk5001", // Brandweerlift
        "Tb1009",  // Opstelplaats overige blusvoertuigen
        "Tb2005",  // Schakelaar rook-/warmteafvoer
        "Tb1011",  // Gas detectiepaneel
        "Maatregelen_C2000",
        "Geen_C2000_dekking"
    ];
    me.buttonSymbols.waterwinning = [
        "Tb2024",  // Afsluiter omloopleiding
        "Tb2026",  // Afsluiter schuimvormend middel
        "Tb2023",  // Afsluiter sprinkler
        "Tb02",    // Brandslanghaspel
        "Tb1007a", // Droge blusleiding afnamepunt
        "Tb4024",  // Gas blusinstallatie / Blussysteem kooldioxide
        "Tb4005",  // Gesprinklerde ruimte
        "Tb1007", // Droge blusleiding
        "Niet_toegankelijk",
        "NBLA",    // Natte blusleiding
        "HydrofoorBRW",
        "HydrofoorEIGEN",
        "Schuimblus"
    ];
    me.buttonSymbols.gebouw = [
        "Tbk7004", // Lift
        "Tn05",     // Nooduitgang
        "To1001",  // Trap
        "To1002",  // Trap rond
        "To1003",  // Trappenhuis
        "Tb2025",  // Afsluiter LPG
        "Tb2021",  // Afsluiter gas
        "Tb2022",  // Afsluiter water
        "Tb2043",  // Noodstop
        "To03",     // Noodstroom aggegraat
        "Tb1010",  // Schacht/kanaal
        "Tb2002",  // Noodschakelaar CV
        "Tb2001",  // Noodschakelaar neon
        "Tb2003",  // Schakelaar elektriciteit
        "Tb2004",  // Schakelaar luchtbehandeling
        "To02",     // Slaapplaats
        "Hellingbaan"
    ];

    me.vrhDangerSymbols = {
        "Tw07": "Tw07",
        "TwTemp": "Temperatuur",
        "Tw21": "Niet blussen met water",
        "Tw22": "Markering lab laag risico",
        "Tw23": "Markering lab middel risico",
        "Tw24": "Markering lab hoog risico",
        "Geen_C2000_dekking": "Geen C2000 dekking",
        "Niet_toegankelijk": "Niet toegankelijk",
        "Wapens_aanwezig": "Wapens aanwezig"
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
            color1: "#000",
            thickness: 0.5,
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
        },
        "Slagboom": {
            type_viewer: "tube",
            color1: "#f00",
            color2: "#fff",
            thickness: 2
        },
        "Aanpijling": {
            type_viewer: "line",
            color1: "#000",
            thickness: 2
        },
        "Aanrijroute": {
            color1: "#f00",
            thickness: 3,
            type_viewer: "arrow"
        },
        "Ventilatierichting RWA": {
            color1: "#000",
            thickness: 3,
            type_viewer: "arrow"
        }
    };
    me.lineButtons = {
        "Hekwerk": "basis",
        "Schadecirkel": "basis",
        "Schadecircel": "basis",
        "Blusleiding": "waterwinning",
        "Binnenmuur": "gebouw"
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
                        var opacity = 1;
                        $.each(me.luchtfotoLayers, function(i, l) {
                            if(l.getVisibility()) {
                                opacity = 0.3;
                                return false;
                            }
                        });
                        return opacity;
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
                strokeDashstyle: "${dashstyle}",
                strokeOpacity: "${opacity}"
            }, {
                context: {
                    color: function(feature) {
                        if(feature.attributes.style && feature.attributes.style.color)return feature.attributes.style.color;
                        else return "#000000";
                    },
                    width: function(feature) {
                        // TODO: scaling
                        var width = feature.attributes.style && feature.attributes.style.thickness ? feature.attributes.style.thickness : 2;
                        if(feature.attributes.wideLineForSelectionTolerance) {
                            width += me.options.wideLineForSelectionExtraWidth;
                        }
                        return width;
                    },
                    dashstyle: function(feature) {
                        if(feature.attributes.wideLineForSelectionTolerance) {
                            return "";
                        }

                        if(feature.attributes.style && feature.attributes.style.pattern)return safetymaps.creator.CreatorObjectLayers.prototype.scalePattern(feature.attributes.style.pattern, 3);
                        else return safetymaps.creator.CreatorObjectLayers.prototype.scalePattern("", 3);
                    },
                    opacity: function(feature) {
                        if(feature.attributes.wideLineForSelectionTolerance) {
                            return me.options.wideLineForSelectionOpacity;
                        } else {
                            return 1;
                        }
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

    lineDisplay = function(feature) {
        if(feature.attributes.type && me.lineButtons[feature.attributes.type]) {
            var button = me.lineButtons[feature.attributes.type];
            var visible = dbkjs.modules.vrh_objects.buttonStates[button];
            return visible ? "visible" : "none";
        }
        if(feature.attributes.button) {
            return dbkjs.modules.vrh_objects.buttonStates[feature.attributes.button] ? "visible" : "none";
        }
        return "visible";
    };

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
                pointRadius: 5,
                display: "${display}"
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
                            return feature.attributes.style && feature.attributes.style.thickness ? feature.attributes.style.thickness : 2;
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
                    },
                    display: lineDisplay
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
                strokeDashstyle: "${dashstyle}",
                display: "${display}"
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
                    },
                    display: lineDisplay
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
                strokeLinecap: "butt",
                display: "${display}"
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
                    },
                    display: lineDisplay
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
                label: "${label}",
                display: "${display}"
            }, {
                context: {
                    myradius: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me, me.options.graphicSize);
                    },
                    label: function(feature) {
                        if(feature.attributes.code === "TbeHoogte") {
                            return feature.attributes.omschrijvi;
                        }
                        return "";
                    },
                    fontSize: function(feature) {
                        return safetymaps.creator.CreatorObjectLayers.prototype.scaleStyleValue(me,12, feature.attributes.radius) + "px";
                    },
                    display: function(feature) {
                        if(me.buttonSymbols.basis.indexOf(feature.attributes.code) !== -1) {
                            return dbkjs.modules.vrh_objects.buttonStates.basis ? "visible" : "none";
                        }
                        if(me.buttonSymbols.brandweergegevens.indexOf(feature.attributes.code) !== -1) {
                            return dbkjs.modules.vrh_objects.buttonStates.brandweergegevens ? "visible" : "none";
                        }
                        if(me.buttonSymbols.waterwinning.indexOf(feature.attributes.code) !== -1) {
                            return dbkjs.modules.vrh_objects.buttonStates.waterwinning ? "visible" : "none";
                        }
                        if(me.buttonSymbols.gebouw.indexOf(feature.attributes.code) !== -1) {
                            return dbkjs.modules.vrh_objects.buttonStates.gebouw ? "visible" : "none";
                        }
                        return "visible";
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
        row += '<td><img src="' + image + '" alt="' + code + '" title="' + code + '"></td>';
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
    table.append('<tr><td><img src="' + f.symbol_noi + '" alt="' + f.symboolcod + '" title="' + f.symboolcod + '"></td>'
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
    // For wide selection lines, propagate selection/unselection if already selected
    if(f.featureToSelect) {
        if(me.wideFeatureSelected === f.featureToSelect) {
            dbkjs.selectControl.unselectAll();
            me.wideFeatureSelected = null;
            dbkjs.selectControl.unselect(e.feature);
        } else {
            dbkjs.selectControl.select(f.featureToSelect);
            me.wideFeatureSelected = f.featureToSelect;
            dbkjs.selectControl.unselect(e.feature);
            $("#vectorclickpanel").show();
        }
        return;
    }
    me.wideFeatureSelected = null;
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

    this.layerPand.addFeatures([wktReader(object.hoofdpand)]);
    this.layerPand.addFeatures((object.subpanden || []).map(wktReader));

    var compartimenteringFeatures = (object.compartimentering || []).map(wktReader);
    this.layerFireCompartmentation.addFeatures(compartimenteringFeatures.map(function(f) {
        var f2 = f.clone();
        f2.attributes.style = me.vrhCompartimenteringStyles[f.attributes.symboolcod];
        f2.attributes.wideLineForSelectionTolerance = true;
        f2.attributes.featureToSelect = f;
        return f2;
    }));
    this.layerFireCompartmentation.addFeatures(compartimenteringFeatures.map(function(f) {
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
        f.attributes.button = "basis";
        f.attributes.style = me.vrhLineStyles["Aanpijling"];
        return f;
    });
    lineFeatures1 = lineFeatures1.concat((object.slagboom || []).map(wktReader).map(function(f) {
        f.attributes.button = "basis";
        f.attributes.description = "";
        f.attributes.style = me.vrhLineStyles["Slagboom"];
        lineFeatures2.push(f.clone());
        return f;
    }));
    lineFeatures1 = lineFeatures1.concat((object.overige_lijnen || []).map(wktReader).map(function(f) {
        f.attributes.button = "basis";
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
        f.attributes.button = "basis";
        f.attributes.style = me.vrhLineStyles["Aanrijroute"];
        return f;
    }));

    // For lines with arrows, add a point feature at the end of the line to
    // display the arrow
    $.each(lineFeatures1, function(i, f) {
        if(f.attributes.style.type_viewer === "arrow") {
            var vertices = f.geometry.getVertices();
            var end = vertices[vertices.length - 1];

            // Rotation for triangle graphic rendered at end of line
            f.attributes.rotation = 90 - safetymaps.utils.geometry.getLastLineSegmentAngle(f.geometry);

            f.geometry = new OpenLayers.Geometry.Collection([f.geometry, end]);
        }
    });

    this.layerLines1.addFeatures(lineFeatures1);
    this.layerLines2.addFeatures(lineFeatures2);
    this.layerLines3.addFeatures(lineFeatures3);

    var vrhSymbol = function(f) {
        if(f.attributes.symboolcod) {
            f.attributes.code = f.attributes.symboolcod.replace(/,/, "");
        }
        f.attributes.description = f.attributes.bijzonderh || "";
        f.attributes.rotation = -(360-f.attributes.symboolhoe) || 0;

        if(me.vrhSymbolsFlipped.indexOf(f.attributes.code) !== -1) {
            f.attributes.rotation += 180;
        }

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
        return f;
    }).map(vrhSymbol));

    this.layerDangerSymbols.addFeatures((object.gevaren || []).map(wktReader).map(function(f) {
        f.attributes.code = f.attributes.symboolcod.replace(/ /g, "_");

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

safetymaps.vrh.Dbks.prototype.updateInfoWindow = function(windowId, object, isIncident) {
    var me = this;

    safetymaps.infoWindow.removeTabs(windowId, "info");

    var rows = [];
    var o = object;
    var p = o.hoofdpand;
    var adres = (p.adres || "") + (p.plaats ? "<br>" + p.plaats : "");
    var is_SB_or_DBL_object = (typeof o.oms_nummer === "undefined") || o.oms_nummer.length === 0 || o.oms_nummer === '';

    if(!adres && o.straatnaam) {
        adres = Mustache.render("{{straatnaam}} {{huisnummer}} {{huisletter}} {{toevoeging}}{{#plaats}}<br>{{plaats}}{{/plaats}}", o);
    }

    rows.push({l: "OMS nummer",                     t: o.oms_nummer});
    rows.push({l: "Naam",                           t: o.naam});
    rows.push({l: "Naam bedrijfspand", t: p.bedrijfsna});
    rows.push({l: "Adres",                          html: adres});
    var oppervlakte = p.bag ? p.bag.oppervlakteverblijfsobject : p.oppervlakt;
    if(oppervlakte) {
        rows.push({l: "Oppervlakte",                html: Number(oppervlakte).toFixed(0) + " m&sup2;"});
    }
    rows.push({l: "Bouwjaar",                       t: p.bag ? p.bag.pandbouwjaar : p.bouwjaar});
    rows.push({l: "Gebruik",                        t: p.gebruiksdo});
    rows.push({l: "Gebruiksdoel BAG",           t: p.bag ? p.bag.verblijfsobjectgebruiksdoel : p.gebruiks_1});
    rows.push({l: "Verdiepingen ondergronds",      t: p.bouwlageno});
    rows.push({l: "Verdiepingen bovengronds",      t: p.bouwlagenb});

    if(p.extra_info && (!p.datum_ei_1 || new moment(p.datum_ei_1).isBefore()) && (!p.eind_datum || new moment(p.eind_datum).isAfter())) {
        rows.push({l: "Extra info 1 " + (p.bron_ei_1 ? "(Bron: " + p.bron_ei_1 + ")" : ""), t: p.extra_info});
    }
    if(p.extra_in_1 && (!p.datum_ei_2 || new moment(p.datum_ei_2).isBefore()) && (!p.eind_dat_1 || new moment(p.eind_dat_1).isAfter())) {
        rows.push({l: "Extra info 2 " + (p.bron_ei_2 ? "(Bron: " + p.bron_ei_2 + ")" : ""), t: p.extra_in_1});
    }

    rows.push({l: "Bijzonderheden gebruik", t: o.bijzonderh});
    rows.push({l: "Instructie bereikbaarheid", t: o.toegang_te});
    rows.push({l: "Operationele Instructie", t: o.inzetproce});
    rows.push({l: "Max. Personeel", t: o.personeel_});
    rows.push({l: "Max. Bezoekers", t: o.bezoekers_});
    rows.push({l: "Max. Slaapplaatsen", t: o.slaapplaat});
    rows.push({l: "BHV aanwezig", t: p.aanwezig_1});

    var bijzonderhedenAanwezigheid = [];
    $.each(o.bijzonderheden_aanwezigheid || [], function(i, bzh) {
        if(bijzonderhedenAanwezigheid.indexOf(bzh) === -1) {
            bijzonderhedenAanwezigheid.push(bzh);
        }
    });

    rows.push({l: "Bijzonderheden aanwezigheid", html: bijzonderhedenAanwezigheid.length > 0 ? bijzonderhedenAanwezigheid.map(Mustache.escape).join("<br>") : null});

    rows.push({l: "Bijzonderheden gebouw", t: p.bijzonderh});
    rows.push({l: "Compartimentering", html: o.compartimentering_beschrijving ? o.compartimentering_beschrijving.map(Mustache.escape).join("<br>") : null});

    rows.push({l: "Brandinstallaties", html: o.brandinstallaties ? o.brandinstallaties.map(Mustache.escape).join("<br>") : null});

    var d = $.Deferred();

    if(dbkjs.modules.kro.shouldShowKroForObject(object, isIncident)) {
        var kroPromise = isIncident 
            ? dbkjs.modules.kro.getObjectInfoForIncidentAddress() 
            : dbkjs.modules.kro.getObjectInfoForAddress(
                object.straatnaam,
                object.huisnummer,
                object.huisletter || '',
                object.toevoeging || '',
                object.plaats,
                object.postcode
            );

        kroPromise
        .fail(function(msg) { 
            console.log("Error fetching KRO data in vrh-dbks module: " + msg);
        })
        .done(function(kro) {
            // Empty rows when object is SB or DBL because no DBK info has to be showed
            if (is_SB_or_DBL_object) {
                rows = [];
            }
            if(kro.length > 0) {
                rows = dbkjs.modules.kro.mergeKroRowsIntoDbkRows(rows, kro[0], isIncident);
            }
        })
        .always(function() {
            if (rows.length > 1) {
                safetymaps.infoWindow.addTab(windowId, "algemeen", "Object info" , "info", safetymaps.creator.createInfoTabDiv(rows, null, ["leftlabel"]));
                safetymaps.vrh.Dbks.prototype.updateRemainingInfoWindow(windowId, object, me);
            }
            d.resolve();
        });
    } else {
        if (!is_SB_or_DBL_object) {
            safetymaps.infoWindow.addTab(windowId, "algemeen", "Object info" , "info", safetymaps.creator.createInfoTabDiv(rows, null, ["leftlabel"]));
            safetymaps.vrh.Dbks.prototype.updateRemainingInfoWindow(windowId, object, me);
        }
        d.resolve();
    }
    return d.promise();
};

safetymaps.vrh.Dbks.prototype.updateRemainingInfoWindow = function(windowId, object, me) {
    var rows = [];
    var o = object;
    var p = o.hoofdpand;

    rows.push({l: "Sleutelbuisklus", t: p.sleutelbui});
    rows.push({l: "Compartimenten", t: p.compartime});
    rows.push({l: "WTS locatie", t: p.wts_locati});
    rows.push({l: "Automatische blusinstallatie", t: p.automatisc});
    rows.push({l: "Rook- en warmteafvoerinstallatie", t: p.rookwarmte});
    rows.push({l: "Overdruk/stuwdrukinstallatie", t: p.overdrukst});
    div = safetymaps.creator.createInfoTabDiv(rows, null, ["leftlabel"]);
    rows = [];
    var rowsWithInfo = [];
    var rowsWithoutInfo = [];

    symbolFeaturesLegend(me.layerSymbols, "symbol", me.vrhSymbols);
    symbolFeaturesLegend(me.layerDangerSymbols, "danger_symbol", me.vrhDangerSymbols);

    function symbolFeaturesLegend(layer, idPrefix, symbolCodeInfo) {
        var codesDisplayed = {};
        $.each(layer.features, function(i, f) {
            if(f.attributes.stofnaam) {
                return true;
            }
            var code = f.attributes.code;
            var description = f.attributes.description || "";
            if(codesDisplayed[f.attributes.code] && description.length === 0) {
                return true;
            }
            codesDisplayed[f.attributes.code] = true;

            // Determine id for click/hover event handler:
            // See call to dbkjs.modules.vrh_objects.addLegendTrEventHandler()
            var id = idPrefix + "_idx_" + i;
            if(description.length === 0) {
                id = idPrefix + "_attr_" + code;
            }

            var tr = [
                "<img id='" + id + "' class='legend_symbol' src='" + f.attributes.symbol_noi + "' alt='" + code + "' title='" + code + "'>",
                symbolCodeInfo[code] || i18n.t("symbol." + code),
                description
            ];
            if(description.length === 0) {
                rowsWithoutInfo.push(tr);
            } else {
                rowsWithInfo.push(tr);
            }
        });
    }
    function legendTrSort(lhs, rhs) {
        return lhs[1].localeCompare(rhs[1]);
    };
    rowsWithInfo.sort(legendTrSort);
    rowsWithoutInfo.sort(legendTrSort);
    rows = rows.concat(rowsWithInfo).concat(rowsWithoutInfo);
    if(rows.length > 0) {
        rows.unshift(["<b>Symbool</b>", "<b>Naam</b>", "<b>Informatie</b>"]);
    }
    div2 = safetymaps.creator.createInfoTabDiv(rows, null, ["leftlabel"]);
    if(div) {
        div.append(div2);
    } else {
        div = div2;
    }
    safetymaps.infoWindow.addTab(windowId, "legenda", "Legenda" , "info", div);
    dbkjs.modules.vrh_objects.addLegendTrEventHandler("tab_legenda", {
        "symbol": me.layerSymbols,
        "danger_symbol": me.layerDangerSymbols
    }, "code");

    rows = [];
    $.each(me.layerDangerSymbols.features, function(i, f) {
        if(!f.attributes.stofnaam) {
            return true;
        }
        var a = f.attributes;
        rows.push(
                '<tr><td width="100px"><img id="gevaarlijke_stof_idx_' + i + '" class="legend_symbol" src="' + a.symbol_noi + '" alt="' + a.symboolcod + '" title="' + a.symboolcod + '"></td>' +
                '<td><div class="gevicode">' + a.gevi_code + '</div><div class="unnummer">' + a.vn_nummer + '</div></td>' +
                '<td>' + a.stofnaam + '</td><td>' + a.hoeveelhei + '</td><td>' + a.description + '</td><td>' + a.eric_kaart + '</td></tr>'
        );
    });
    if(rows.length > 0) {
        rows.unshift(["<b>Symbool</b>", "<b>Gevi</b>", "<b>Naam</b>", "<b>Hoeveelheid</b>", "<b>Bijzonderheden</b>", "<b>ERIC-kaart</b>"]);
    }
    safetymaps.infoWindow.addTab(windowId, "gevaarlijke_stoffen", "Gevaarlijke stoffen", "info", safetymaps.creator.createInfoTabDiv(rows));
    dbkjs.modules.vrh_objects.addLegendTrEventHandler("tab_gevaarlijke_stoffen", {"gevaarlijke_stof" : me.layerDangerSymbols});

    if(object.media) {
        object.media = object.media.map(function(filename) {
            return { filename: filename };
        });
    }
    var content = safetymaps.creator.renderMedia(object);
    safetymaps.infoWindow.addTab(windowId, "media", i18n.t("creator.media"), "info", content);
    if (content) {
        //check if first item in carousel is pdf; Render if true
        if ($("#media_carousel").find('.active').find('.pdf-embed').length !== 0) {
            safetymaps.creator.embedPDFs($("#media_carousel").find('.active'));
        }
        //embed pdf's only if they are requested
        $("#media_carousel").bind('slide.bs.carousel', function (e) {
            safetymaps.creator.embedPDFs(e.relatedTarget);
        });
    }
};
