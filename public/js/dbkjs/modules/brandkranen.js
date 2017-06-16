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
            if(a.nummer === me.selectedBrandkranen[i]){
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
    brandkraanSelected: function(e) {
        var me = this;
        var a = e.feature.attributes;
        if(me.selectedBrandkranen.indexOf(a.nummer) !== -1){
            var feature = e.feature;
            dbkjs.selectControl.unselect(feature);
            return;
        }
        me.selectedBrandkranen.push(a.nummer);

        $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle">&nbsp;Brandkraan WML #' + a.nummer + '</span>');
        var html = $('<div class="table-responsive"></div>');

        var table = $('<table class="table table-hover"></table>');
        var img = e.object.styleMap.styles.default.context.myicon(e.feature);
        var cap = a.capaciteit ? a.capaciteit.toLocaleString("nl", { useGrouping: true}) : "";
        var nummer = a.nummer ? a.nummer : "";
        var huisnummer = a.huisnummer ? a.huisnummer : "";
        var postcode = a.postcode ? a.postcode : "";
        var currentStreng = null;
        if (a.streng_id) {
            me.strengen.push(a.streng_id);
            currentStreng = a.streng_id;
        }
        me.brandkranen.redraw();
        table.append($(Mustache.render(
        '<tr>' +
            '<td><img class="thumb" src="{{img}}" alt="{{f.symboolcod}}" title="{{f.symboolcod}}"></td>' +
            '<td>Capaciteit: {{capaciteit}} m<sup>3</sup>/uur</td>' +
            '<td>Nummer:{{nummer}}</td>' +
            '<td>Postcode, huisnummer:{{postcode}},{{huisnummer}}</td>' +
            
        '</tr>', {img: img, f: e.feature.attributes, capaciteit: cap, nummer: nummer, postcode:postcode, huisnummer:huisnummer})));
        if(currentStreng) {
            var andere = [];
            $.each(me.brandkranen.features, function(i, brandkraan) {
                if(brandkraan !== e.feature && brandkraan.attributes.streng_id === currentStreng) {
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
            if (streng !== feature.attributes.streng_id) {
                newStrengen.push(streng);
            }
        });
        this.strengen = newStrengen;
        var newBrandkranenSelected = [];
        $.each(me.selectedBrandkranen, function (i, brandkraan) {
            if (brandkraan !== feature.attributes.nummer) {
                newBrandkranenSelected.push(brandkraan);
            }
        });
        this.selectedBrandkranen = newBrandkranenSelected;
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
                minScale: 3000
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
                                if(feature.attributes.nummer === me.selectedBrandkranen[i]){
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
    }
};

