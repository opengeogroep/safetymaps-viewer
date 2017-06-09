/*
 *  Copyright (c) 2017 B3Partners (info@b3partners.nl)
 *
 *  This file is part of safetymapDBK
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

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};
dbkjs.modules.brandkranen = {
    id: "dbk.module.brandkranen",
    options: null,
    brandkranen: null,
    leidingen: null,
    strengen:null,
    register: function() {
        var me = this;
        me.strengen = [];
        this.options = $.extend({
            // add default options here
        }, this.options);

        this.init();

        // wait to load brandkranen until after dbk features loaded
        $(dbkjs.modules.feature).on("loaded", function() {
            me.load();
        });
    },
    load: function() {
        var me = this;
        console.time("brandkranen_ajax");
        $.ajax((dbkjs.options.serverUrlPrefix ? dbkjs.options.serverUrlPrefix : "") + "action/vrln", {
            method: "GET",
            data: {
//                bounds: "POLYGON ((205023 371652, 205023 378577, 212870 378577, 212870 371652, 205023 371652))" // Venlo
                bounds: "POLYGON ((197890 371652, 197890 378577, 205737 378577, 205737 371652, 197890 371652))" // Maasbree
//                bounds: "POLYGON ((197890 371652, 197890 380003, 212320 380003, 212320 371652, 197890 371652))" // Venlo en Maasbree
            },
            dataType: "json"
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.timeEnd("brandkranen_ajax");
            dbkjs.gui.showError("Fout bij inladen brandkranen: " + errorThrown);
        }).done(function(data) {
            console.timeEnd("brandkranen_ajax");
            if(!data.success) {
                dbkjs.gui.showError("Fout bij inladen brandkranen: " + data.error);
                return;
            }
            var features = new OpenLayers.Format.GeoJSON().read(data.brandkranen_wml);
            console.log("Aantal brandkranen: " + features.length);
            me.brandkranen.addFeatures(features);
            var features = new OpenLayers.Format.GeoJSON().read(data.leidingen_wml);
            console.log("Aantal leidingen: " + features.length);
            me.leidingen.addFeatures(features);
        });
    },
    brandkraanSelected: function(e) {
        var me = this;
        console.log("brandkraan selected", arguments);
        var a = e.feature.attributes;

        $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle">&nbsp;Brandkraan WML #' + a.nummer + '</span>');
        var html = $('<div class="table-responsive"></div>');

        var table = $('<table class="table table-hover"></table>');
        var img = e.object.styleMap.styles.default.context.myicon(e.feature);
        var cap = a.capaciteit ? a.capaciteit.toLocaleString("nl", { useGrouping: true}) : "";
        var strengd = "";
        var currentStreng = null;
        if(a.streng_id) {
            $.each(me.leidingen.features, function(i, leiding) {
                if(leiding.attributes.streng_id === a.streng_id) {
                    me.strengen.push(leiding);
                    currentStreng = leiding;
                    strengd = ", nominale druk: " + leiding.attributes.nominale_d.toLocaleString("nl", { useGrouping: true});
                    return false;
                }
            });
        }
        me.brandkranen.redraw();
        table.append($(Mustache.render(
        '<tr>' +
            '<td><img class="thumb" src="{{img}}" alt="{{f.symboolcod}}" title="{{f.symboolcod}}"></td>' +
            '<td>Capaciteit: {{capaciteit}}</td>' +
            '<td>{{f.streng_id}}{{streng_d}}</td>' +
        '</tr>', {img: img, f: e.feature.attributes, capaciteit: cap, streng_d: strengd})));
        if(currentStreng) {
            var andere = [];
            $.each(me.brandkranen.features, function(i, brandkraan) {
                if(brandkraan !== e.feature && brandkraan.attributes.streng_id === currentStreng.attributes.streng_id) {
                    andere.push(brandkraan);
                }
            });
            if(andere.length === 1) {
                table.append($("<td colspan='3'>Er is &eacute;&eacute;n andere brandkraan op deze streng (grijs)</td>"));
            } else if(andere.length > 0) {
                table.append($("<td colspan='3'>Er zijn " + andere.length + " andere brandkranen op deze streng (grijs)</td>"));
            } else {
                table.append($("<td colspan='3'>Er zijn geen andere brandkranen op deze streng</td>"));
            }
        }
        var andere = [];
        console.log("streng", me.strengen, "andere", andere);
        html.append(table);
        $('#vectorclickpanel_b').html('').append(html);
        $('#vectorclickpanel').show();
    },
    brandkraanUnselected: function(e) {
        $('#vectorclickpanel').hide();
        var feature = e.feature;
        var me = this;
        var newStrengen = [];
        $.each(me.strengen, function (i, streng) {
            if (streng.attributes.streng_id !== feature.attributes.streng_id) {
                newStrengen.push(streng);
            }
        });
        this.strengen = newStrengen;
        this.brandkranen.redraw();
    },
    init: function() {
        this.createLayers();
    },
    createLayers: function() {
        var me = this;
        this.leidingen = new OpenLayers.Layer.Vector("Leidingen WML", {
            rendererOptions: {
                zIndexing: true
            },
            options: {
                minScale: 5000
            },
            styleMap: new OpenLayers.StyleMap({
                'default': new OpenLayers.Style({
                    strokeColor: "blue",
                    strokeWidth: "${width}"
                }, {
                    context: {
                        stroke: function(feature) {
                            return "blue";
                        },
                        width: function(feature) {
                            return feature.attributes.streng_id ? 1 : 2;
                        }
                    }
                })
            })
        });
        dbkjs.map.addLayer(this.leidingen);
        this.brandkranen = new OpenLayers.Layer.Vector("Brandkranen WML", {
            rendererOptions: {
            },
            options: {
                minScale: 5000
            },
            styleMap: new OpenLayers.StyleMap({
                'default': new OpenLayers.Style({
                    cursor: "pointer",
                    externalGraphic: "${myicon}",
                    pointRadius: 16,
                    label: "${label}",
                    fontColor: "black",
                    fontSize: "12px",
                    fontWeight: "bold",
                    labelYOffset: -20,
                    labelOutlineColor: "white",
                    labelOutlineWidth: 3,

                }, {
                    context: {
                        myicon: function(feature) {
                            var gray = "";
                            $.each(me.strengen, function (i, streng) {
                                if (streng && streng.attributes.streng_id === feature.attributes.streng_id) {
                                    gray = "_g";
                                    return false;
                                }
                            });
                            var img = feature.attributes.soort === "Bovengronds" ? "Tb4001" : "Tb4002";
                            return typeof imagesBase64 === 'undefined' ? dbkjs.basePath + "images/nen1414/" + img + gray + ".png" : imagesBase64["images/nen1414/" + img + gray + ".png"];
                        },
                        label: function(feature) {
                            if(dbkjs.map.getScale() > 4000) {
                                return "";
                            } else {
                                return (feature.attributes.capaciteit / 1000).toFixed();
                            }
                        }
                    }
                }),
                'select': new OpenLayers.Style({pointRadius: 20, externalGraphic: "${myicon}"}, {
                    context: {
                        myicon: function(feature) {
                            var img = feature.attributes.soort === "Bovengronds" ? "Tb4001" : "Tb4002";
                            return typeof imagesBase64 === 'undefined' ? dbkjs.basePath + "images/nen1414/" + img + "_s.png" : imagesBase64["images/nen1414/" + img + "_s.png"];
                        }
                    }
                }),
                'temporary': new OpenLayers.Style({pointRadius: 20})
            })
        });
        this.brandkranen.events.register("featureselected", this, this.brandkraanSelected);
        this.brandkranen.events.register("featureunselected", this, this.brandkraanUnselected);
        dbkjs.map.addLayer(this.brandkranen);
        dbkjs.hoverControl.deactivate();
        dbkjs.hoverControl.layers.push(this.brandkranen);
        dbkjs.hoverControl.activate();
        dbkjs.selectControl.deactivate();
        dbkjs.selectControl.layers.push(this.brandkranen);
        if(!dbkjs.selectControl.multiselectlayers){
            dbkjs.selectControl.multiselectlayers = [];
        }
        dbkjs.selectControl.multiselectlayers.push(this.brandkranen);
        dbkjs.selectControl.activate();
    }
};

