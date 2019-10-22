/*
 *  Copyright (c) 2014-2018 2014 Milo van der Linden (milo@dogodigi.net), B3Partners (info@b3partners.nl)
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

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.layers = {
    checkHiDPI: function() {
        dbkjs.layers.hiDPIAvailable = dbkjs.options.enableHiDPI && (OpenLayers.Util.getParameters()["hiDPI"] === "true" || window.devicePixelRatio > 1);
        dbkjs.layers.hiDPI = false;

        var baselayersLowDPI = [];
        dbkjs.options.baselayersHiDPI = [];

        $.each(dbkjs.options.baselayers, function(i, layer) {
            if(!layer.options.hiDPI) {
                baselayersLowDPI.push(layer);
            }
        });
        $.each(baselayersLowDPI, function(i, layer) {
            // Find high DPI layer in original baselayers with the same name
            $.each(dbkjs.options.baselayers, function(j, orgConfigLayer) {
                if(orgConfigLayer !== layer && orgConfigLayer.options.hiDPI && orgConfigLayer.name === layer.name) {
                    //console.log("Found HiDPI baselayer " + layer.name);
                    dbkjs.options.baselayersHiDPI[i] = orgConfigLayer;
                    return false;
                }
            });
        });
        dbkjs.options.baselayers = baselayersLowDPI;

        if(dbkjs.layers.hiDPIAvailable) {
            OpenLayers.Layer.WMS.prototype.getURL = function (bounds) {
                bounds = this.adjustBounds(bounds);

                var imageSize = this.getImageSize(bounds);
                var newParams = {};
                // WMS 1.3 introduced axis order
                var reverseAxisOrder = this.reverseAxisOrder();
                newParams.BBOX = this.encodeBBOX ?
                    bounds.toBBOX(null, reverseAxisOrder) :
                    bounds.toArray(reverseAxisOrder);

                newParams.WIDTH = imageSize.w;
                newParams.HEIGHT = imageSize.h;

                var hiDPI = false;
                if(dbkjs.layers.hiDPI) {
                    hiDPI = this.options.hiDPI;
                    if(!hiDPI && dbkjs.options.defaultOverlayHiDPI) {
                        // Use HiDPI by default if we can figure out the parameter
                        // to draw scaled up. We know this for GeoServer and MapServer
                        hiDPI = this.url.indexOf("/geoserver") || this.url.indexOf("/mapserv");
                    }
                }
                // Double WIDTH and HEIGHT for high resolution if layer configured it works
                if(hiDPI) {
                    newParams.WIDTH = imageSize.w * 2;
                    newParams.HEIGHT = imageSize.h * 2;

                    // Add custom parameter for high DPI or defaults for GeoServer and MapServer
                    if(this.options.hiDPIParam && this.options.hiDPIParam.indexOf("=") !== -1) {
                        var paramName = this.options.hiDPIParam.split("=",1)[0];
                        newParams[paramName] = this.options.hiDPIParam.substring(paramName.length + 1);
                    } else if(this.url.indexOf("/geoserver") !== -1) {
                        // https://docs.geoserver.org/latest/en/user/services/wms/vendor.html#format-options

                        // Note: drops this.params.format_options and assumes
                        // default low dpi is 90.
                        // TODO: parse format_options and double DPI if exists or
                        // add dpi:180 if not and keep other format_options

                        newParams.format_options = "dpi:180";
                    } else if(this.url.indexOf("/mapserv") !== -1) {
                        var defaultDPI = 72;
                        // If map_resolution set in this.params, use that
                        for(var p in this.params) {
                            if(p.toLowerCase() === "map_resolution") {
                                try {
                                    defaultDPI = Number(this.params[p]);
                                    break;
                                } catch(e) {
                                }
                            }
                        }
                        newParams.map_resolution = Number(defaultDPI * 2).toFixed();
                    }
                    //console.log("HiDPI layer " + this.name + " request: " + this.getFullRequestString(newParams));
                }
                var requestString = this.getFullRequestString(newParams);
                return requestString;
            };

            // TODO ArcGIS93Rest

            $(dbkjs).one("dbkjs_init_complete", function() {
                $("#row_layout_settings").append('<div class="col-xs-12"><label><input type="checkbox" id="checkbox_hidpi">' + i18n.t("settings.hiDPI") + '</label></div>');
                $("#checkbox_hidpi").prop("checked", dbkjs.layers.hiDPI);
                $("#checkbox_hidpi").on('change', function(e) {
                    dbkjs.layers.setHiDPI(e.target.checked);
                });
            });

            dbkjs.layers.hiDPI = (window.localStorage.getItem("hiDPI") === null && dbkjs.options.defaultHiDPI) || window.localStorage.getItem("hiDPI") === "true";
        }
    },

    setHiDPI: function(enabled) {
        if(!dbkjs.layers.hiDPIAvailable) {
            return;
        }
        if(dbkjs.layers.hiDPI === enabled) {
            return;
        }
        var previouslyEnabled = dbkjs.layers.hiDPI;

        window.localStorage.setItem("hiDPI", enabled);
        $("#checkbox_hidpi").prop("checked", enabled);
        dbkjs.layers.hiDPI = enabled;

        $.each(dbkjs.options.baselayersHiDPI, function(i, l) {
            if(l) {
                var lowDPILayer = dbkjs.options.baselayers[i];
                var hiDPILayer = l;

                var visible = previouslyEnabled ? hiDPILayer.visibility : lowDPILayer.visibility;

                if(visible) {
                    //console.log("Switch visible layer " + lowDPILayer.name + " to " + (enabled ? "hi DPI" : "low DPI"));
                    lowDPILayer.setVisibility(!enabled);
                    hiDPILayer.setVisibility(enabled);
                    dbkjs.map.setBaseLayer(enabled ? hiDPILayer : lowDPILayer);
                }
            }
        });

        // Redraw overlay HiDPI layers
        $.each(dbkjs.map.layers, function(i, layer) {
            if(layer.CLASS_NAME === "OpenLayers.Layer.WMS") {
                // WMS layer will double WIDTH and HEIGHT in overwritten
                // OpenLayers.Layer.WMS.prototype.getURL()
                layer.mergeNewParams();
            }

            // TODO ArcGIS93Rest
        });
    },

    createBaseLayers: function() {
        var baselayer_ul = $('<ul id="baselayerpanel_ul" class="nav nav-pills nav-stacked">');
        $.each(dbkjs.options.baselayers, function(bl_index, bl) {
            var _li = $('<li class="bl" id="bl' + bl_index + '"><a href="#">' + bl.name + '</a></li>');
            baselayer_ul.append(_li);
            bl.events.register("loadstart", bl, function() {
                dbkjs.util.loadingStart(bl);
            });
            bl.events.register("loadend", bl, function() {
                dbkjs.util.loadingEnd(bl);
            });
            if(dbkjs.options.baselayersHiDPI[bl_index]) {
                //console.log("Add HiDPI layer " + bl.name);
                dbkjs.map.addLayer(dbkjs.options.baselayersHiDPI[bl_index]);
            }
            dbkjs.map.addLayer(bl);
            if(bl_index === 0 && dbkjs.options.baselayersHiDPI[bl_index] && !dbkjs.layers.hiDPI) {
                //console.log("HiDPI not active, set low DPI layer visible");
                dbkjs.options.baselayersHiDPI[bl_index].setVisibility(false);
                bl.setVisibility(true);
                dbkjs.map.setBaseLayer(bl);
            }
            _li.on('click',function() {
                dbkjs.layers.toggleBaseLayer(bl_index);
                dbkjs.util.getModalPopup('baselayerpanel').hide();
            });
        });
        $('#baselayerpanel_b').append(baselayer_ul);
        return baselayer_ul;
    },

    /**
     * Function to update the visibility for baseLayers
     * @param {integer} nr
     */
    toggleBaseLayer: function (nr) {
        var layerbuttons = $(".bl");
        var i;
        for (i = 0; i < layerbuttons.length; i++) {
            var layer = dbkjs.options.baselayers[i];
            if(dbkjs.layers.hiDPI && dbkjs.options.baselayersHiDPI[i]) {
                layer = dbkjs.options.baselayersHiDPI[i];
                console.log("Set HiDPI layer " + layer.name + " visibility: " + (i === nr));
            }
            if (i !== nr) {
                $(layerbuttons[i]).removeClass("active", true);
                layer.setVisibility(false);
            } else {
                $(layerbuttons[nr]).addClass("active", true);
                layer.setVisibility(true);
                dbkjs.map.setBaseLayer(layer);
            }
        }
    },

    loadFromWMSGetCapabilities: function () {
        var me = this;
        if(!dbkjs.options.organisation.wms) {
            return;
        }

        $.each(dbkjs.options.organisation.wms, function (wms_k, wms_v) {
          var options;
          var params;
          var parent;
          var layertype;
          var metadata;
          var myLayer;
          var onlySearch = wms_v.options && wms_v.options.wfsSearch && wms_v.options.wfsSearch.onlySearch;
          var index = wms_v.index || 0;
          if (wms_v.getcapabilities === true && !onlySearch) {
              options = {
                  url: wms_v.url,
                  title: wms_v.name,
                  proxy: wms_v.proxy,
                  index: index,
                  parent: wms_v.parent
              };
              /**
               * Should extend options and params if they are
               * passed from the organisation JSON (issue #413)
               */
              options.options = wms_v.options || {};
              options.params = wms_v.params || {};
              if (!dbkjs.util.isJsonNull(wms_v.pl)) {
                  options.pl = wms_v.pl;
              }
              var myCapabilities = new dbkjs.Capabilities(options);
          } else if (!wms_v.baselayer && !onlySearch) {
              params = wms_v.params || {};
              options = wms_v.options || {};
              parent = wms_v.parent || null;
              metadata = {};
              if (!dbkjs.util.isJsonNull(wms_v.abstract)) {
                  metadata.abstract = wms_v.abstract;
              }
              if (!dbkjs.util.isJsonNull(wms_v.pl)) {
                  metadata.pl = wms_v.pl;
              }
              if (!dbkjs.util.isJsonNull(wms_v.legend)) {
                  metadata.legend = wms_v.legend;
              }
              layertype = wms_v.layertype || null;
              myLayer = new dbkjs.Layer(
                  wms_v.name,
                  wms_v.url,
                  params,
                  options,
                  parent,
                  index,
                  metadata,
                  layertype,
                  wms_v.gid
              );
          } else if(!onlySearch) {
              params = wms_v.params || {};
              options = wms_v.options || {};
              options = OpenLayers.Util.extend({isBaseLayer: true}, options);
              parent = wms_v.parent || null;
              metadata = {};
              if (!dbkjs.util.isJsonNull(wms_v.abstract)) {
                  metadata.abstract = wms_v.abstract;
              }
              if (!dbkjs.util.isJsonNull(wms_v.pl)) {
                  metadata.pl = wms_v.pl;
              }
              if (!dbkjs.util.isJsonNull(wms_v.legend)) {
                  metadata.legend = wms_v.legend;
              }
              layertype = wms_v.layertype || null;
              myLayer = new dbkjs.Layer(
                  wms_v.name,
                  wms_v.url,
                  params,
                  options,
                  parent,
                  index,
                  metadata,
                  layertype
              );
          }
          
            if (!onlySearch) {
                wms_v.uniqueid = myLayer.layer.id;
                wms_v.div = myLayer.div;
            }
            if (wms_v.options && wms_v.options.wfsSearch) {
                me.makeSearchConfig(wms_v, wms_v.options);
            }
        });
    },
    
    listenToIncidents: function () {
        var me = this;
        $(dbkjs.modules.incidents.controller).on("new_incident", function () {
            me.toggleBaseLayer(0);
            $.each(dbkjs.options.organisation.wms, function (wms_k, wms_v) {
                if(!(wms_v.options && wms_v.options.wfsSearch && wms_v.options.wfsSearch.onlySearch)){
                    var layer  = dbkjs.map.getLayer(wms_v.uniqueid);
                    layer.setVisibility(wms_v.options.visibility);
                    if(wms_v.options.visibility){
                        $($(wms_v.div).children()[0]).addClass('active');
                    } else {
                        $($(wms_v.div).children()[0]).removeClass('active');
                    }
                }
            });
        });
    },
    
    makeSearchConfig: function(layer,options){
        if(!dbkjs.modules.search) {
            console.log("WFS-search requires search module, disabled");
            return;
        }
        var icon = "<i class='fa fa-home'></i> ";
        if(options.wfsSearch.icon){
            icon = options.wfsSearch.icon;
        }
        dbkjs.modules.search.addSearchConfig({
            name: "WFS",
            tabContents: icon + options.wfsSearch.name,
            placeholder: i18n.t("creator.search_placeholder"),
            options:{layer:layer,options:options},
            search: function(value) {
                
                var columns  = this.options.options.wfsSearch.kolom.split(',');
                var values = value.split(' ').filter(function(el){
                    if(el.length === 0){
                        return[""];
                    }
                    return el.length !== 0;
                });
                var filter = "";
                var operator = "OR";
                if (columns.length > 1) {
                    if (values.length === 1) {
                        var filter = "<Filter><" + operator + ">";
                        for (var i = 0; i < columns.length; i++) {
                            var column = columns[i];
                            var searchValue = values[0];
                            filter += "<PropertyIsLike matchCase='false' wildCard='*' singleChar='.' escapeChar='!'><PropertyName>" + column + "</PropertyName><Literal>*" + searchValue + "*</Literal></PropertyIsLike>";
                        }
                        filter += "</" + operator + "></Filter>"; 
                    } else {
                        operator = "AND";
                        var filter = "<Filter><" + operator + ">";
                        for(var i = 0; i < values.length; i++ ){
                            var column = columns[i];
                            var searchValue = values[i];
                            filter += "<PropertyIsLike matchCase='false' wildCard='*' singleChar='.' escapeChar='!'><PropertyName>" + column + "</PropertyName><Literal>*" + searchValue + "*</Literal></PropertyIsLike>";
                        }
                        filter += "</" + operator + "></Filter>";
                    }
                } else {
                    filter = "<Filter><PropertyIsLike matchCase='false' wildCard='*' singleChar='.' escapeChar='!'><PropertyName>" + this.options.options.wfsSearch.kolom + "</PropertyName><Literal>*"+value+"*</Literal></PropertyIsLike></Filter>";
                }
                
                OpenLayers.Request.GET({
                    url: this.options.layer.url,
                    params: {
                        REQUEST: "GetFeature",
                        SERVICE: "WFS",
                        VERSION: "1.0.0",
                        TYPENAME: this.options.options.wfsSearch.typeName,
                        MAXFEATURES:50,
                        FILTER: filter

                    },
                    scope:options,
                    callback: function(data){
                        var parser = new OpenLayers.Format.GML();
                        var result = parser.read(data.responseText);
                        var displayNames = this.wfsSearch.displayName.split(",");
                        var mustacheString = "";
                        if(displayNames.length === 0){
                            console.log("Configureer displayName");
                            return;
                        }
                        for(var i = 0; i < displayNames.length; i++){
                            mustacheString +="{{"+displayNames[i]+"}} ";
                        }
                        dbkjs.modules.search.showResults(result, function(a) {
                            return Mustache.render(mustacheString, a.data);
                        }, true);
                    }
                }); 
            },
            resultSelected: function(result) {
                console.log(result);
                if(result.geometry){
                    dbkjs.map.setCenter([result.geometry.x,result.geometry.y],dbkjs.options.zoom);
                }
            }
        },false);
    }
};
