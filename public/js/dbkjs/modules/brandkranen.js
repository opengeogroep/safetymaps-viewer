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
    rtBrandkranen:null,
    brandkranen: null,
    selectedBrandkranen:null,
    currentlySelectedBrandkraan:null,
    strengen:null,
    register: function() {
        var me = this;
        me.strengen = [];
        me.selectedBrandkranen = [];
        this.options = $.extend({
            // add default options here
        }, this.options);
        this.init();

        // wait to load brandkranen until after dbk features loaded
         $(dbkjs).one("dbkjs_init_complete", function() {
            me.loadBrandkranen();
         });
    },
    loadBrandkranen: function() {
        var me = this;
        var url = dbkjs.options.onboard ? "api/brandkranen.json" : (dbkjs.options.serverUrlPrefix ? dbkjs.options.serverUrlPrefix : "") + "action/vrln";
        $.ajax(url, {
            method: "GET",
            data: {},
            dataType: "json"
        }).fail(function(jqXHR, textStatus, errorThrown) {
            dbkjs.gui.showError("Fout bij inladen brandkranen: " + errorThrown);
        }).done(function(data) {
            if(!data.success) {
                dbkjs.gui.showError("Fout bij inladen brandkranen: " + data.error);
                return;
            }
            var features = data.brandkranen_wml;
            me.rtBrandkranen = RTree();
            me.initTree(features,me.rtBrandkranen);
            dbkjs.map.events.register ("moveend",me, me.update);
        });
    },
    beforeBrandkraanSelected: function(e){
        var a = e.feature.attributes;
        var me = this;
        for(var i = 0 ; i< me.selectedBrandkranen.length;i++){
            if(a.nummer === me.selectedBrandkranen[i].nummer){
                return true;
            }
        }
        for (var i = 0 ; i < me.strengen.length ;i++){
            if (me.strengen[i] === a.streng_id) {
                return false;
            }
        }
        return true;
        
    },
    brandkraanSelected: function(e, dontunselect) {
        var me = this;
        var a = e.feature.attributes;
        if(!dontunselect){
            for(var i = 0 ; i< me.selectedBrandkranen.length;i++){
                if(a.nummer === me.selectedBrandkranen[i].nummer){
                    var feature = e.feature;
                    dbkjs.selectControl.unselect(feature);
                    return;
                }
            }
        }

        me.selectedBrandkranen.push(a);
        this.currentlySelectedBrandkraan = a;

        $('#vectorclickpanel_h').css("position","relative").html('<span class="h4"><i class="fa fa-info-circle">&nbsp;Brandkraan WML #' + a.nummer + ' </span><div class="h4" style="position: absolute; left:0; right:0; top:0; text-align:center;"><a href="#" id="deselect_all">Deselecteer alles</a> </div>');
        var html = $('<div class="table-responsive"></div>');
        $("#deselect_all").on("click", (function (e) {
            e.preventDefault();
            e.stopPropagation();
            this.deselectAllBrandkranen();
        }).bind(this));
        
        var table = $('<table class="table table-hover"></table>');
        var img = e.object.styleMap.styles.default.context.myicon(e.feature);
        var cap = a.capaciteit ? (a.capaciteit/1000).toLocaleString("nl", { useGrouping: true}) + "m<sup>3</sup>/uur" : "Niet bekend";
        var nummer = a.nummer ? a.nummer : "";
        var huisnummer = a.huisnummer ? a.huisnummer : "";
        var straatnaam = a.straatnaam ? a.straatnaam : "";
        var adres = straatnaam ? straatnaam + " " + huisnummer : "";
        var currentStreng = null;
        if (a.streng_id) {
            me.strengen.push(a.streng_id);
        }
        me.brandkranen.redraw();
        table.append($(Mustache.render(
        '<tr>' +
            '<td><img class="thumb" src="{{img}}" alt="{{f.symboolcod}}" title="{{f.symboolcod}}"></td>' +
            '<td>Capaciteit: ' + cap + ' </td>' +
            '<td>Adres: {{adres}} </td>' +
            
        '</tr>', {img: img, f: e.feature.attributes,  nummer: nummer, adres:adres})));
        
        html.append(table);
        $('#vectorclickpanel_b').html('').append(html);
        $('#vectorclickpanel').show();
    },
    brandkraanUnselected: function(e) {
        var feature = e.feature;
        
        var me = this;
        var newStrengen = [];
        $.each(me.strengen, function (i, streng) {
            if (streng !== feature.attributes.streng_id) {
                newStrengen.push(streng);
            }
        });
        this.strengen = newStrengen;
        var newBrandkranenSelected = [];
        $.each(me.selectedBrandkranen, function (i, brandkraan) {
            if (brandkraan.nummer !== feature.attributes.nummer) {
                newBrandkranenSelected.push(brandkraan);
            }
        });
        this.selectedBrandkranen = newBrandkranenSelected;

        if(this.selectedBrandkranen.length === 0){
            $('#vectorclickpanel').hide();
        }else{
            if (this.currentlySelectedBrandkraan.nummer === feature.attributes.nummer){
                // huidige bekeken brandkraan wordt gedeselecteerd
                var f = this.selectedBrandkranen[0];
                var feat;
                for(var j = 0 ; j < this.brandkranen.features.length ; j++){
                    if(this.brandkranen.features[j].attributes.nummer === f.nummer){
                        feat = this.brandkranen.features[j];
                        break;
                    }
                }

                var evt = {
                    feature: feat,
                    object: this.brandkranen
                };
                this.brandkraanSelected(evt,true);
            }
        }
        this.brandkranen.redraw();
    },
    init: function() {
        this.createLayers();
    },
    createLayers: function() {
        var me = this;
      
        this.brandkranen = new OpenLayers.Layer.Vector("Brandkranen WML", {
            rendererOptions: {
            },
            options: {
                minScale: 7000
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
                    labelOutlineWidth: 3
                }, {
                    context: {
                        myicon: function(feature) {
                            var postfix = "";
                            var currentlySelected = false;
                            for(var i = 0 ; i< me.selectedBrandkranen.length;i++){
                                if(feature.attributes.nummer === me.selectedBrandkranen[i].nummer){
                                    currentlySelected =  true;
                                    break;
                                }
                            }
                            if(!currentlySelected){
                                $.each(me.strengen, function (i, streng) {
                                    if (streng && streng === feature.attributes.streng_id) {
                                        postfix = "_g";
                                        return false;
                                    }
                                });
                            }else{
                                postfix = "_s";
                            }
                            var img = feature.attributes.soort === "Bovengronds" ? "Tb4001" : "Tb4002";
                            return typeof imagesBase64 === 'undefined' ? dbkjs.basePath + "images/nen1414/" + img + postfix + ".png" : imagesBase64["images/nen1414/" + img + postfix + ".png"];
                        },
                        label: function(feature) {
                            if(dbkjs.map.getScale() > 4000) {
                                return "";
                            } else if(feature.attributes.capaciteit === 0){
                                return "N.B.";
                            }else{
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
        dbkjs.protocol.jsonDBK.layers.push(this.brandkranen);
        this.brandkranen.events.register("featureselected", this, this.brandkraanSelected);
        this.brandkranen.events.register("beforefeatureselected", this, this.beforeBrandkraanSelected);
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
        
    },
    initTree: function(features, rtree) {
        if (rtree.getTree().nodes.length > 0) {
            // Purge old data from RTree, prevents double points in vectorlayers
            rtree = RTree();
        }
        rtree.geoJSON(features);
        this.update();
    },
    update: function(object,bbox) {
        if(!dbkjs.map.getExtent()){
            setTimeout(this.update.bind(null, object, bbox), 100);
            return;
        }
        if(!bbox){
            bbox = dbkjs.map.getExtent().toArray();
        }
        var left = [bbox[0],bbox[1]];
        var right = [bbox[2],bbox[3]];
        var currentResolution = dbkjs.map.getResolution();
        
        if(this.rtBrandkranen){
            var brandkraanFeatures =  this.rtBrandkranen.bbox(left,right);
            this.removeAllBrandkranen();

            if(!this.pause && this.brandkranen.maxResolution > currentResolution){
                this.insertIntoVectorlayer(brandkraanFeatures, this.brandkranen);
            }
        }
    },
    insertIntoVectorlayer:function(features, layer){
        var featureCollection = {
            type: "FeatureCollection",
            features: features
        };
        var geojson = new OpenLayers.Format.GeoJSON().read(featureCollection);
        layer.addFeatures(geojson);
        layer.redraw();
    },
    removeAllBrandkranen:function(){
        this.brandkranen.removeAllFeatures();
    },
    deselectAllBrandkranen:function(){
        this.selectedBrandkranen = [];
        this.strengen = [];
        this.update();
        $('#vectorclickpanel').hide();
    }
};

