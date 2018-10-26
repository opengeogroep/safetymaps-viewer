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

 /* global dbkjs, safetymaps, OpenLayers, i18n */

var safetymaps = safetymaps || {};
safetymaps.vrh = safetymaps.vrh || {};

safetymaps.vrh.Events = function(options) {
    this.options = $.extend({
        graphicSizeHover: 26,
        graphicSizeSelect: 20
    }, options);

    this.initLayers();
};

safetymaps.vrh.Events.prototype.scalePattern = function(pattern, factor) {
    if(!pattern || pattern.trim().length === 0) {
        return "";
    }
    var values = pattern.replace(/\s+/g, " ").split(" ");
    for(var i = 0; i < values.length; i++) {
        values[i] *= factor;
    }
    return values.join(" ");
};

safetymaps.vrh.Events.prototype.initLayers = function() {
    var me = this;

    dbkjs.map.addLayers(me.createLayers());

    $.each(me.selectLayers, function(i, l) {
        dbkjs.selectControl.layers.push(l);
        if(l.hover) dbkjs.hoverControl.layers.push(l);
        l.events.register("featureselected", me, me.layerFeatureSelected);
        l.events.register("featureunselected", me, dbkjs.modules.vrh_objects.objectLayerFeatureUnselected);
    });

};

safetymaps.vrh.Events.prototype.createLayers = function() {
    var me = this;

    this.imagePath = "js/safetymaps/modules/vrh/assets/events";

    this.layers = [];
    this.selectLayers = [];

    this.layerTerrain = new OpenLayers.Layer.Vector("Event terrain", {
        hover:false,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                fillColor: "rgb(255,190,190)",
                fillOpacity: 0.5,
                strokeColor: ""
            })
        })
    });
    this.layers.push(this.layerTerrain);

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
        maxResolution: 0.21,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                fillColor: "${fillColor}",
                strokeColor: "${strokeColor}",
                strokeWidth: "${strokeWidth}",
                strokeDashstyle: "${strokePattern}",
                label: "${label}",
                fontColor: "black",
                fontSize: "12px",
                labelOutlineColor: "white",
                labelOutlineWidth: 3
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
                    },
                    label: function(feature) {
                        return feature.attributes["omschrijvi"] || "";
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
        maxResolution: 0.84,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                display: "${display}",
                fillColor: "${fillColor}",
                strokeColor: "${strokeColor}",
                strokeWidth: "${strokeWidth}",
                strokeDashstyle: "${strokePattern}",
                label: "${label}",
                fontColor: "black",
                fontSize: "12px",
                labelOutlineColor: "white",
                labelOutlineWidth: 3
            }, {
                context: {
                    display: function(feature) {
                        var s = me.routePolygonStyle[feature.attributes.vlaksoort];
                        return s ? "visible" : "none";
                    },
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
                    },
                    label: function(feature) {
                        return feature.attributes["vlakomschr"] || "";
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
            strokePattern3: "0 1 1 9" // dash-offset van 1 voor + met 0 aan begin
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
            strokeWidth: 2,
            stroke2: "#686868",
            strokeWidth2: 2,
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
        maxResolution: 0.84,
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
        maxResolution: 0.84,
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
        maxResolution: 0.84,
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

    me.routeLineStyle = {
        "ara": {
            label: "Afvoerroute ambulance",
            stroke: "#ffff00",
            strokeWidth: 2,
            stroke2: "#005de6",
            strokeWidth2: 2,
            strokePattern2: "2 2"
        },
        "c1r": {
            label: "Calamiteitenroute 1 richting",
            stroke: "white",
            strokeWidth: 2,
            stroke2: "red",
            strokeWidth2: 2,
            strokePattern2: "2 2"
        },
        "c2r": {
            label: "Calamiteitenroute 2 richting",
            stroke: "white",
            strokeWidth: 2,
            stroke2: "red",
            strokeWidth2: 2,
            strokePattern2: "2 2"
        },
        "vek": {
            label: "Verkeersring",
            stroke: "#0070ff",
            strokeWidth: 2,
            stroke2: "white",
            strokeWidth2: 1,
            strokePattern2: "2 2"
        },
        "ro1": {
            label: "Route 1",
            stroke: "white",
            strokeWidth: 2,
            stroke2: "#55ff00",
            strokeWidth2: 2,
            strokePattern2: "2 2"
        },
        "ro2": {
            label: "Route 2",
            stroke: "white",
            strokeWidth: 2,
            stroke2: "#00c4ff",
            strokeWidth2: 2,
            strokePattern2: "2 2"
        },
        "ro3": {
            label: "Route 3",
            stroke: "white",
            strokeWidth: 2,
            stroke2: "#ffa900",
            strokeWidth2: 2,
            strokePattern2: "2 2"
        },
        "ro4": {
            label: "Route 4",
            stroke: "white",
            strokeWidth: 2,
            stroke2: "#de73ff",
            strokeWidth2: 2,
            strokePattern2: "2 2"
        },
        "ro5": {
            label: "Route 5",
            stroke: "black",
            strokeWidth: 1
        }
    };
    // TODO https://gist.github.com/pgiraud/6131715
    this.layerRouteLine = new OpenLayers.Layer.Vector("Event route lines", {
        hover:false,
        maxResolution: 3.36,
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
                        var s = me.routeLineStyle[feature.attributes.routetype];
                        return s ? s.stroke : "";
                    },
                    strokeWidth: function(feature) {
                        var s = me.routeLineStyle[feature.attributes.routetype];
                        return s ? s.strokeWidth*2 : 2;
                    },
                    strokePattern: function(feature) {
                        var s = me.routeLineStyle[feature.attributes.routetype];
                        return s ? me.scalePattern(s.strokePattern,2) || "none" : "none";
                    }
                }
            }),
            temporary: new OpenLayers.Style({}),
            select: new OpenLayers.Style({})
        })
    });
    this.layerRouteLine2 = new OpenLayers.Layer.Vector("Event route lines 2", {
        hover:false,
        maxResolution: 3.36,
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
                        var s = me.routeLineStyle[feature.attributes.routetype];
                        return s ? s.stroke2 : "";
                    },
                    strokeWidth: function(feature) {
                        var s = me.routeLineStyle[feature.attributes.routetype];
                        return s ? s.strokeWidth2*2 : "1";
                    },
                    strokePattern: function(feature) {
                        var s = me.routeLineStyle[feature.attributes.routetype];
                        return s ? me.scalePattern(s.strokePattern2,2) || "none" : "none";
                    }
                }
            }),
            temporary: new OpenLayers.Style({}),
            select: new OpenLayers.Style({})
        })
    });
    this.layerRouteLine3 = new OpenLayers.Layer.Vector("Event route lines 3", {
        hover:false,
        maxResolution: 3.36,
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
                        var s = me.routeLineStyle[feature.attributes.routetype];
                        return s ? s.stroke3 : "";
                    },
                    strokeWidth: function(feature) {
                        var s = me.routeLineStyle[feature.attributes.routetype];
                        return s ? s.strokeWidth3*2 : "1";
                    },
                    strokePattern: function(feature) {
                        var s = me.routeLineStyle[feature.attributes.routetype];
                        return s ? me.scalePattern(s.strokePattern3,2) || "none" : "none";
                    }
                }
            }),
            temporary: new OpenLayers.Style({}),
            select: new OpenLayers.Style({})
        })
    });
    this.layers.push(this.layerRouteLine);
    this.layers.push(this.layerRouteLine2);
    this.layers.push(this.layerRouteLine3);
    this.selectLayers.push(this.layerRouteLine);
    this.selectLayers.push(this.layerRouteLine2);
    this.selectLayers.push(this.layerRouteLine3);

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

    this.locationSymbolTypes = {
        "agg": "Aggegraat",
        "dga": "Doorgang algemeen",
        "dgh": "Doorgang hekwerk",
        "dgn": "Doorgang nood",
        "dgp": "Doorgang publiek",
        "inf": "Informatiepunt",
        "inv": "Invalideplaats",
        "wck": "Kruis urinoir",
        "lim": "Lichtmast",
        "paa": "Parkeren auto",
        "paf": "Parkeren fiets",
        "pam": "Parkeren motor",
        "pla": "Pijlaanduiding",
        "wca": "Wc algemeen"
    };
    this.layerLocationSymbols = new OpenLayers.Layer.Vector("Event location symbols", {
        hover:true,
        maxResolution: 0.84,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                externalGraphic: "${graphic}",
                pointRadius: 14,
                rotation: "${hoek}",
                label: "${label}",
                labelAlign: "lb",
                labelXOffset: "10",
                labelYOffset: "10",
                fontColor: "black",
                fontSize: "12px",
                labelOutlineColor: "white",
                labelOutlineWidth: 3
            },{
                context: {
                    graphic: function(feature) {
                        return me.imagePath + "/" + feature.attributes.type + (feature.attributes.ballonteks ? "_i" : "") + ".png";
                    },
                    label: function(feature) {
                        return feature.attributes["ballonteks"] || "";
                    }
                }
            }),
            temporary: new OpenLayers.Style({pointRadius: me.options.graphicSizeHover}),
            select: new OpenLayers.Style({pointRadius: me.options.graphicSizeSelect})
        })
    });
    this.layers.push(this.layerLocationSymbols);
    this.selectLayers.push(this.layerLocationSymbols);

    me.routeSymbolTypes = {
        "afz": "Afzetting",
        "amb": "Ambulance",
        "bev": "Beveiliging",
        "bkm": "Blokkade mobiel",
        "bkv": "Blokkade vast",
        "brb": "Boot reddingsbrigade",
        "brw": "Brandweer",
        "bwi": "Brandweeringang",
        "cop": "Comprimeerpunt",
        "doa": "Doorlaatpost algemeen",
        "dov": "Doorlaatpost voetgangers",
        "ehb": "Ehbo",
        "ghr": "Ghor",
        "hel": "Helicopter",
        "hok": "Hoogwerkerkraan",
        "mcb": "Mobiele commando BRW",
        "mcg": "Mobiele commando GHOR",
        "mcp": "Mobiele commando Politie",
        "mcr": "Mobiele commando Rode Kruis",
        "moa": "Motor Ambulance",
        "mob": "Motor Brandweer",
        "pol": "Politie",
        "pos": "Politie servicepunt",
        "poh": "Poller hulpdiensten",
        "rok": "Rode Kruis",
        "dpl": "Drinkplaats",
        "siv": "Snelle interventie voertuig",
        "tas": "Tankautospuit",
        "ver": "Verkeersregelaar",
        "vaf": "Vlag finish",
        "vas": "Vlag start"
    };
    this.layerRouteSymbols = new OpenLayers.Layer.Vector("Event route symbols", {
        hover:true,
        maxResolution: 0.84,
        rendererOptions: {
            zIndexing: true
        },
        styleMap: new OpenLayers.StyleMap({
            default: new OpenLayers.Style({
                externalGraphic: "${graphic}",
                pointRadius: 14,
                rotation: "${hoek}",
                label: "${label}",
                labelAlign: "lb",
                labelXOffset: "10",
                labelYOffset: "10",
                fontColor: "black",
                fontSize: "12px",
                labelOutlineColor: "white",
                labelOutlineWidth: 3
            },{
                context: {
                    graphic: function(feature) {
                        return me.imagePath + "/" + feature.attributes.soort + (feature.attributes.ballonteks ? "_i" : "") + ".png";
                    },
                    label: function(feature) {
                        return feature.attributes["ballonteks"] || "";
                    }
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

safetymaps.vrh.Events.prototype.showFeatureInfo = function(title, label, description) {
    dbkjs.modules.vrh_objects.showFeatureInfo(title, label, description);
};

safetymaps.vrh.Events.prototype.layerFeatureSelected = function(e) {
    var me = this;
    var layer = e.feature.layer;
    var f = e.feature.attributes;
    console.log(layer.name + " feature selected", e);
    if(layer === me.layerLocationPolygon) {
        var s = me.locationPolygonStyle[f.vlaksoort];
        me.showFeatureInfo("Locatie", s.label, f.omschrijvi);
        layer.redraw();
    } else if(layer === me.layerRoutePolygon) {
        var s = me.routePolygonStyle[f.vlaksoort];
        me.showFeatureInfo("Route", s.label, f.vlakomschr);
        layer.redraw();
    } else if(layer === me.layerLocationSymbols) {

        me.showFeatureInfo("Locatie", me.locationSymbolTypes[f.type] || "", f.ballonteks);
        layer.redraw();
    } else if(layer === me.layerRouteSymbols) {
        me.showFeatureInfo("Route", me.routeSymbolTypes[f.soort] || "", f.ballonteks);
        layer.redraw();
    } else if(layer.name.startsWith("Event location lines")) {
        me.showFeatureInfo("Locatie", me.locationLineStyle[f.lijnsoort].label, f.lijnbeschr);
        layer.redraw();
    } else if(layer.name.startsWith("Event route lines")) {
        me.showFeatureInfo("Route", me.routeLineStyle[f.routetype].label, f.routebesch);
        layer.redraw();
    } else {
        $("#vectorclickpanel").hide();
    }
};


safetymaps.vrh.Events.prototype.removeAllFeatures = function(object) {
    if(this.layers) {
        $.each(this.layers, function(i, layer) {
            layer.removeAllFeatures();
        });
    }
};

safetymaps.vrh.Events.prototype.addFeaturesForObject = function(object) {
    var wktParser = new OpenLayers.Format.WKT();

    var wktReader = function(d) {
        var f = wktParser.read(d.geom);
        f.attributes = d;
        return f;
    };

    var terrein = wktReader(object.terrein);
    this.layerTerrain.addFeatures([terrein]);

    this.layerLocationPolygon.addFeatures(object.locatie_vlak.map(wktReader));
    // TODO add label points, or text symbolizer for polygon?
    this.layerLocationLine.addFeatures(object.locatie_lijn.map(wktReader));
    this.layerLocationLine2.addFeatures(object.locatie_lijn.map(wktReader));
    this.layerLocationLine3.addFeatures(object.locatie_lijn.map(wktReader));

    this.layerRoutePolygon.addFeatures(object.route_vlak.map(wktReader));
    // TODO add label points, or text symbolizer for polygon?
    this.layerRouteLine.addFeatures(object.route_lijn.map(wktReader));
    this.layerRouteLine2.addFeatures(object.route_lijn.map(wktReader));
    this.layerRouteLine3.addFeatures(object.route_lijn.map(wktReader));

    this.layerLabels.addFeatures(object.teksten.map(d => new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(d.x, d.y), d)));

    this.layerLocationSymbols.addFeatures(object.locatie_punt.map(d => new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(d.x, d.y), d)));
    this.layerRouteSymbols.addFeatures(object.route_punt.map(d => new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(d.x, d.y), d)));

    console.log("Added event layers", this.layers);
};

safetymaps.vrh.Events.prototype.updateInfoWindow = function(tab, object) {
    var me = this;

    var div = $('<div class="tabbable"></div>');

    var tabContent = $('<div class="tab-content"></div>');
    var tabs = $('<ul class="nav nav-pills"></ul>');
    div.append(tabContent);
    div.append(tabs);

    var rows = [];

    //rows.push({l: "Gemeente",                               t: t.gemeente});
    //rows.push({l: "Begindatum",                             t: t.sbegin});
    //rows.push({l: "Aanvrager",                              t: t.aanvrager});

    var t = object.terrein;
    rows.push({l: "Naam evenement",                         t: t.evnaam});
    rows.push({l: "Locatie",                                t: t.locatie});
    rows.push({l: "Adres",                                  t: t.adres});
    rows.push({l: "Soort evenement",                        t: t.soort_even});
    rows.push({l: "Contactpersoon organisatie",             t: t.contactper});
    rows.push({l: "Programma",                              t: t.programma});
    rows.push({l: "Bijzonderheden",                         t: t.bijzonderh});
    safetymaps.creator.createHtmlTabDiv("algemeen", "Evenementgegevens algemeen", safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

    rows = [];
    rows.push({l: "Tijden",                                 t: t.tijden});
    rows.push({l: "Aantal bezoekers",                       t: t.aantal_bez});
    rows.push({l: "Personeel EHBO",                         t: t.personeel_});
    rows.push({l: "Personeel security",                     t: t.personeel1});
    rows.push({l: "Personeel BHV",                          t: t.personee_1});
    rows.push({l: "Omroepinstallatie",                      t: t.omroepinst});
    rows.push({l: "Veiligheidsplan",                        t: t.veiligheid});
    rows.push({l: "Verzamelplaats",                         t: t.verzamelpl});
    rows.push({l: "Bijzonderheden",                         t: t.bijzonde_1});
    safetymaps.creator.createHtmlTabDiv("aanwezigheid", "Aanwezige personen", safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

    rows = [];
    rows.push({l: "Aantal tijdelijke bouwsels",             t: t.aantal_tij});
    rows.push({l: "Herpositionering voertuigen",            t: t.herpositio});
    rows.push({l: "OD uitrukvolgorde",                      t: t.od_uitrukv});
    rows.push({l: "Locatie CoPI",                           t: t.locatie_co});
    rows.push({l: "Toegangswegen",                          t: t.toegangswe});
    rows.push({l: "Bijzonderheden evenement",               t: t.bijzonde_2});
    safetymaps.creator.createHtmlTabDiv("gegevens", "Gegevens evenement", safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

    rows = [];
    rows.push({l: "Publieksprofiel",                        t: t.publiekspr});
    rows.push({l: "Activiteiten profiel",                   t: t.activiteit});
    rows.push({l: "Ruimtelijk profiel",                     t: t.ruimtelijk});
    safetymaps.creator.createHtmlTabDiv("risico", "Risico-inventarisatie", safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

    rows = [];
    rows.push({l: "Voertuigen",                             t: t.voertuigen});
    rows.push({l: "Functionarissen",                        t: t.functionar});
    safetymaps.creator.createHtmlTabDiv("maatregelen", "Maatregelen", safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

    rows = [];
    rows.push({l: "Coördinatie ter plaatse",                t: t.coordinati});
    rows.push({l: "Communicatie & verbindingen",              t: t.communicat});
    rows.push({l: "Informatievoorziening",                  t: t.informatie});
    rows.push({l: "Logistiek",                              t: t.logistiek});
    safetymaps.creator.createHtmlTabDiv("leiding", "Leiding & Coördinatie", safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

    rows = [];
    rows.push({l: "Commandant van Dienst naam",             t: t.commandant});
    rows.push({l: "Commandant van Dienst telefoon",         t: t.commanda_1});
    rows.push({l: "Hoofd officier van Dienst naam",         t: t.hoofd_offi});
    rows.push({l: "Hoofd officier van Dienst telefoon",     t: t.hoofd_of_1});
    rows.push({l: "AC Brandweer naam",                      t: t.ac_brandwe});
    rows.push({l: "AC Brandweer telefoon",                  t: t.ac_brand_1 });
    rows.push({l: "Leider CoPI naam",                       t: t.leider_cop});
    rows.push({l: "Leider CoPI telefoon",                   t: t.leider_c_1});
    rows.push({l: "Officier van dienst naam",               t: t.officier_v });
    rows.push({l: "Officier van dienst telefoon",           t: t.officier_1 });
    rows.push({l: "Reserve Officier van dienst 1 naam",     t: t.reserve_of});
    rows.push({l: "Reserve Officier van dienst 1 telefoon", t: t.reserve__1});
    rows.push({l: "Reserve Officier van dienst 2 naam",     t: t.reserve__2});
    rows.push({l: "Reserve Officier van dienst 2 telefoon", t: t.reserve__3});
    rows.push({l: "AGS naam",                               t: t.ags_naam});
    rows.push({l: "AGS telefoon",                           t: t.ags_telefo});
    rows.push({l: "Woordvoerder naam",                      t: t.woordvoerd});
    rows.push({l: "Woordvoerder telefoon",                  t: t.woordvoe_1});
    rows.push({l: "HON naam",                               t: t.hon_naam});
    rows.push({l: "HON telefoon",                           t: t.hon_telefo});
    rows.push({l: "Centralist naam",                        t: t.centralist});
    rows.push({l: "Centralist telefoon",                    t: t.centrali_1});
    rows.push({l: "PID naam",                               t: t.pid_naam});
    rows.push({l: "PID telefoon",                           t: t.pid_telefo});
    rows.push({l: "Objectofficier naam",                    t: t.objectoffi });
    rows.push({l: "Object officier telefoon",               t: t.objectof_1});
    rows.push({l: "HIN naam",                               t: t.hin_naam});
    rows.push({l: "HIN telefoon",                           t: t.hin_telefo});
    rows.push({l: "Medewerker OV naam",                     t: t.medewerker});
    rows.push({l: "Medewerker OV telefoon",                 t: t.medewerk_1});
    rows.push({l: "Brandweer in de wijk naam",              t: t.brandweer_});
    rows.push({l: "Brandweer in de wijk telefoon",          t: t.brandweer1});
    rows.push({l: "MOB naam",                               t: t.mob_naam});
    rows.push({l: "MOB naam",                               t: t.mob_telefo});
    safetymaps.creator.createHtmlTabDiv("functionarissen", "Functionarissen BRW", safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

    safetymaps.creator.createHtmlTabDiv("legenda", "Legenda", safetymaps.creator.createInfoTabDiv(me.createEventLegend()), tabContent, tabs);

    tab.html(div);
};

safetymaps.vrh.Events.prototype.createEventLegend = function() {
    var me = this;

    var rows = [];
    var rowsWithoutInfo = [];

    if(me.layerLocationPolygon.features.length > 0) {
        rows.push([
            "<b>Locatie vlak</b>",
            "<b>Soort</b>",
            "<b>Omschrijving</b>"
        ]);

        var soortenDisplayed = {};

        $.each(me.layerLocationPolygon.features, function(i, f) {
            var soort = f.attributes.vlaksoort;
            var omschrijving = f.attributes.omschrijvi || null;
            if(soortenDisplayed[soort] && omschrijving === null) {
                return true;
            }
            soortenDisplayed[soort] = true;

            var style = me.locationPolygonStyle[soort];

            var tr = [
                "<div style='width: 150px; height: 40px; border: 2px solid " + style.stroke + "; background-color: " + style.fill + ";'></div>",
                style.label,
                omschrijving || ""
            ];


            if(omschrijving === null) {
                rowsWithoutInfo.push(tr);
            } else {
                rows.push(tr);
            }
        });
        rowsWithoutInfo.sort(function(lhs, rhs) {
            return lhs[1].localeCompare(rhs[1]);
        });
        rows.push.apply(rows, rowsWithoutInfo);
    }
    rowsWithoutInfo = [];

    if(me.layerRoutePolygon.features.length > 0) {
        rows.push([
            "<b>Route vlak</b>",
            "<b>Soort</b>",
            "<b>Omschrijving</b>"
        ]);

        var soortenDisplayed = {};

        $.each(me.layerRoutePolygon.features, function(i, f) {
            var soort = f.attributes.vlaksoort;
            var omschrijving = f.attributes.vlakomschr || null;
            if(soortenDisplayed[soort] && omschrijving === null) {
                return true;
            }
            soortenDisplayed[soort] = true;

            var style = me.routePolygonStyle[soort];

            var tr = [
                "<div style='width: 150px; height: 40px; border: 2px solid " + style.stroke + "; background-color: " + style.fill + ";'></div>",
                style.label,
                omschrijving || ""
            ];


            if(omschrijving === null) {
                rowsWithoutInfo.push(tr);
            } else {
                rows.push(tr);
            }
        });
        rowsWithoutInfo.sort(function(lhs, rhs) {
            return lhs[1].localeCompare(rhs[1]);
        });
        rows.push.apply(rows, rowsWithoutInfo);
    }
    rowsWithoutInfo = [];

    if(me.layerLocationLine.features.length > 0) {
        rows.push([
            "<b>Locatie lijn</b>",
            "<b>Soort</b>",
            "<b>Omschrijving</b>"
        ]);

        var soortenDisplayed = {};

        $.each(me.layerLocationLine.features, function(i, f) {
            var soort = f.attributes.lijnsoort;
            var omschrijving = f.attributes.lijnbeschr || null;
            if(soortenDisplayed[soort] && omschrijving === null) {
                return true;
            }
            soortenDisplayed[soort] = true;

            var style = me.locationLineStyle[soort];

            var tr = [
                "<img style='width: 40%' src='" + me.imagePath + '/lines/' + soort + ".png'>",
                style.label,
                omschrijving || ""
            ];


            if(omschrijving === null) {
                rowsWithoutInfo.push(tr);
            } else {
                rows.push(tr);
            }
        });
        rowsWithoutInfo.sort(function(lhs, rhs) {
            return lhs[1].localeCompare(rhs[1]);
        });
        rows.push.apply(rows, rowsWithoutInfo);
    }
    rowsWithoutInfo = [];

    if(me.layerRouteLine.features.length > 0) {
        rows.push([
            "<b>Route lijn</b>",
            "<b>Soort</b>",
            "<b>Omschrijving</b>"
        ]);

        var soortenDisplayed = {};

        $.each(me.layerRouteLine.features, function(i, f) {
            var soort = f.attributes.routetype;
            var omschrijving = f.attributes.routebesch || null;
            if(soortenDisplayed[soort] && omschrijving === null) {
                return true;
            }
            soortenDisplayed[soort] = true;

            var style = me.routeLineStyle[soort];

            var tr = [
                "<img style='width: 40%' src='" + me.imagePath + '/lines/' + soort + ".png'>",
                style.label,
                omschrijving || ""
            ];

            if(omschrijving === null) {
                rowsWithoutInfo.push(tr);
            } else {
                rows.push(tr);
            }
        });
        rowsWithoutInfo.sort(function(lhs, rhs) {
            return lhs[1].localeCompare(rhs[1]);
        });
        rows.push.apply(rows, rowsWithoutInfo);
    }
    rowsWithoutInfo = [];

    if(me.layerLocationSymbols.features.length > 0) {
        rows.push([
            "<b>Locatie symbool</b>",
            "<b>Soort</b>",
            "<b>Omschrijving</b>"
        ]);

        var soortenDisplayed = {};

        $.each(me.layerLocationSymbols.features, function(i, f) {
            var soort = f.attributes.type;
            var omschrijving = f.attributes.ballonteks || null;
            if(soortenDisplayed[soort] && omschrijving === null) {
                return true;
            }
            soortenDisplayed[soort] = true;

            var label = me.locationSymbolTypes[soort];

            var tr = [
                "<img style='width: 20%' src='" + me.imagePath + '/' + soort + ".png'>",
                label,
                omschrijving || ""
            ];

            if(omschrijving === null) {
                rowsWithoutInfo.push(tr);
            } else {
                rows.push(tr);
            }
        });
        rowsWithoutInfo.sort(function(lhs, rhs) {
            return lhs[1].localeCompare(rhs[1]);
        });
        rows.push.apply(rows, rowsWithoutInfo);
    }
    rowsWithoutInfo = [];

    if(me.layerRouteSymbols.features.length > 0) {
        rows.push([
            "<b>Route symbool</b>",
            "<b>Soort</b>",
            "<b>Omschrijving</b>"
        ]);

        var soortenDisplayed = {};

        $.each(me.layerRouteSymbols.features, function(i, f) {
            var soort = f.attributes.soort;
            var omschrijving = f.attributes.ballonteks || null;
            if(soortenDisplayed[soort] && omschrijving === null) {
                return true;
            }
            soortenDisplayed[soort] = true;

            var label = me.routeSymbolTypes[soort];
            var tr = [
                "<img style='width: 20%' src='" + me.imagePath + '/' + soort + ".png'>",
                label,
                omschrijving || ""
            ];

            if(omschrijving === null) {
                rowsWithoutInfo.push(tr);
            } else {
                rows.push(tr);
            }
        });
        rowsWithoutInfo.sort(function(lhs, rhs) {
            return lhs[1].localeCompare(rhs[1]);
        });
        rows.push.apply(rows, rowsWithoutInfo);
    }

    return rows;
};
