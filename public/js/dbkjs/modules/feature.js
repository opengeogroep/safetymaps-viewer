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

/* global i18n */

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};
dbkjs.modules.feature = {
    id: "dbk.modules.feature",
    /**
     * URL naar een statisch boringen bestand in gml formaat
     */
    features: [],
    /**
     * Laag. Wordt geiniteerd met de functie dbkobject.show() kan worden overruled
     */
    highlightlayer: null,
    timer: null,
    showlabels: true,
    layer: null,
    currentCluster: [],
    selection: null,
    autoUpdateInterval: null,
    /**
     * The layer that will hold the incidents
     */

    /**
     * The layer that will hold the incident sketches such as catchement areas and route
     */
//    sketch: new OpenLayers.Layer.Vector("Feature_sketch", {
//        rendererOptions: {
//            zIndexing: true
//        }
//    }),
    caches: {},
    getActive: function() {
        var _obj = dbkjs.modules.feature;
        if (_obj.active){
            return feature;
        } else {
        var feature;
        var _search_field = 'identificatie';
        var _search_value;
        if (!dbkjs.util.isJsonNull(dbkjs.options.dbk)) {
            _search_field = 'identificatie';
            _search_value = dbkjs.options.dbk;
        } else if (!dbkjs.util.isJsonNull(dbkjs.options.omsnummer)) {
            _search_field = 'OMSNummer';
            _search_value = dbkjs.options.omsnummer;
        }
        if (_search_value) {
            $.each(_obj.layer.features, function(fi, fv) {
                if (fv.cluster) {
                    $.each(fv.cluster, function(ci, cv) {
                        if (cv.attributes[_search_field]) {
                            if (cv.attributes[_search_field].toString() === _search_value.toString()) {
                                feature = cv;
                            }
                        }
                    });
                } else {
                    if (fv.attributes[_search_field]) {
                        if (fv.attributes[_search_field].toString() === _search_value.toString()) {
                            feature = fv;
                        }
                    }
                }
            });

            if (feature) {
                dbkjs.options.dbk = feature.attributes.identificatie;
                dbkjs.modules.updateFilter(dbkjs.options.dbk);
                return feature;
            } else {
                return false;
            }
        }
    }
    },
    register: function(options) {
        var _obj = dbkjs.modules.feature;
        _obj.namespace = dbkjs.options.organisation.workspace;
        _obj.url = 'geoserver/';
        _obj.visibility = true;
        _obj.layer = new OpenLayers.Layer.Vector(i18n.t('app.features'), {
            rendererOptions: {
                zIndexing: true
            },
            strategies: [
                new OpenLayers.Strategy.Cluster({
                    distance: 100,
                    threshold: 2
                })
            ],
            styleMap: dbkjs.config.styles.dbkfeature
        });
        _obj.layer.setZIndex(2006);
        _obj.layer.displayInLayerSwitcher = false;
        dbkjs.map.addLayer(_obj.layer);
        dbkjs.selectControl.setLayer((dbkjs.selectControl.layers || dbkjs.selectControl.layer).concat(_obj.layer));
        dbkjs.selectControl.activate();
        _obj.layer.events.on({
            "featureselected": _obj.getfeatureinfo,
            "featuresadded": function() {},
            "featureunselected": function(e) {}
        });

        _obj.get();

        if(dbkjs.options.autoFeatureUpdateInterval) {
            _obj.autoUpdateInterval = window.setInterval(function() {
                _obj.get();
            }, dbkjs.options.autoFeatureUpdateInterval);
        }
    },
    get: function() {
        var _obj = dbkjs.modules.feature;
        if(_obj.layer){
            _obj.layer.destroyFeatures();
        }
        var params = {
            srid: dbkjs.options.projection.srid,
            timestamp: new Date().getTime(),
            version: "2"
        };
        dbkjs.util.loadingStart(_obj.layer);
        $.getJSON(dbkjs.dataPath + 'features.json', params).done(function(data) {
            var geojson_format = new OpenLayers.Format.GeoJSON();
                _obj.features = geojson_format.read(data);

            if(_obj.features.length > 0) {
                $.each(_obj.features, function(i, feature) {
                    if(feature.attributes.selectiekader) {
                        feature.attributes.selectiekader = new OpenLayers.Format.GeoJSON().read(feature.attributes.selectiekader, "Geometry");
                    }
                });
            }

            if(dbkjs.modules.filter && dbkjs.modules.filter.selectie.length > 0 ) {
                var selfeat = [];
                $.each(_obj.features, function(fix,feat){
                    if($.inArray(feat.attributes.identificatie, dbkjs.modules.filter.selectie) !== -1){
                        //create a subselection from the features
                        selfeat.push(feat);
                    }
                });
                if(selfeat.length > 0){
                    _obj.layer.addFeatures(selfeat);
                }
            } else {
                if(_obj.features){
                    _obj.layer.addFeatures(_obj.features);
                }
            }
            $(_obj).triggerHandler("loaded");
            dbkjs.util.loadingEnd(_obj.layer);
            $('#btn_refresh > i').removeClass('fa-spin');

            _obj.clearSearchCaches();
        }).fail(function( jqxhr, textStatus, error ) {
            $('#btn_refresh > i').removeClass('fa-spin');
            dbkjs.options.feature = null;
            dbkjs.gui.showError(" " + i18n.t('app.errorfeatures'));
        });
    },
    featureInfohtml: function(feature) {
        var v = {};
        if(feature.attributes.typeFeature === "WO") {
            v.id = feature.attributes.id;
            v.name = feature.attributes.locatie;
        } else {
            v.id = feature.attributes.identificatie;
            v.name = feature.attributes.formeleNaam;
            v.extraName = feature.attributes.informeleNaam;
        }
        var link = $(Mustache.render('<li><a id="{{id}}" href="#">{{name}}{{#extraName}} ({{extraName}}){{/extraName}}</a></li>', v));
        $(link).click(function() {
            dbkjs.protocol.jsonDBK.process(feature, function() {
                dbkjs.modules.feature.zoomToFeature(feature)
            });
            return false;
        });
        return $(link);
    },
    /* Override this function to customize the search (and display) string of DBK's,
     * for example to include address:
     *
     * dbkjs.modules.feature.getDbkSearchValue = function(feature) {
     *     var t = feature.attributes.formeleNaam + ' ' + (dbkjs.util.isJsonNull(feature.attributes.informeleNaam) ? '' : feature.attributes.informeleNaam);
     *     if(feature.attributes.adres && feature.attributes.adres.length > 0) {
     *         var a = feature.attributes.adres[0];
     *         t += ", " + a.openbareRuimteNaam;
     *         t += !dbkjs.util.isJsonNull(a.huisnummer) ? " " + a.huisnummer : "";
     *         t += !dbkjs.util.isJsonNull(a.huisletter) ? a.huisletter : "";
     *         t += !dbkjs.util.isJsonNull(a.huisnummertoevoeging) ? " " + a.huisnummertoevoeging : "";
     *         if(!dbkjs.util.isJsonNull(a.postcode) || !dbkjs.util.isJsonNull(a.woonplaatsNaam)) {
     *             t += ", ";
     *         }
     *         t += !dbkjs.util.isJsonNull(a.postcode) ? a.postcode : "";
     *         t += !dbkjs.util.isJsonNull(a.woonplaatsNaam) ? " " + a.woonplaatsNaam : "";
     *     }
     *     return t;
     * }
     */
    getDbkSearchValue: function(feature) {
        return feature.attributes.formeleNaam + ' ' + (dbkjs.util.isJsonNull(feature.attributes.informeleNaam) ? '' : feature.attributes.informeleNaam)
    },
    getDbkSearchValues: function() {
        var _obj = dbkjs.modules.feature;
        var dbk_naam_array = [];
        if(_obj.caches.hasOwnProperty('dbk')) {
            return _obj.caches.dbk;
        }
        $.each(_obj.features, function(key, value) {
            dbk_naam_array.push({
                value: _obj.getDbkSearchValue(value),
                geometry: value.geometry,
                id: value.attributes.identificatie,
                attributes: value.attributes
            });
        });
        _obj.caches.dbk = dbk_naam_array;
        return _obj.caches.dbk;
    },
    getOmsSearchValues: function() {
        var _obj = dbkjs.modules.feature,
            oms_naam_array = [];
        if(_obj.caches.hasOwnProperty('oms')) {
            return _obj.caches.oms;
        }
        $.each(_obj.features, function(key, feature) {
            if (!dbkjs.util.isJsonNull(feature.attributes.OMSNummer)) {
                // Extend feature object with value and id for searching
                feature.value = feature.attributes.OMSNummer + ' ' + feature.attributes.formeleNaam;
                feature.id = feature.attributes.identificatie;
                oms_naam_array.push(feature);
            }
        });
        _obj.caches.oms = oms_naam_array;
        return _obj.caches.oms;
    },
    clearSearchCaches: function() {
        delete this.caches.dbk;
        delete this.caches.oms;
    },
    handleDbkOmsSearch: function(object) {
        var _obj = dbkjs.modules.feature;
        dbkjs.protocol.jsonDBK.process(object, function() {
            _obj.zoomToFeature(object);
        });
    },
    zoomToFeature: function(feature) {
        dbkjs.options.dbk = feature === null ? null : feature.attributes.identificatie;
        dbkjs.modules.updateFilter(dbkjs.options.dbk);
        if(dbkjs.options.dbk) {

            if(feature.attributes.typeFeature === "WO") {
                dbkjs.map.zoomToExtent(dbkjs.util.extendBounds(OpenLayers.Bounds.fromString(feature.attributes.bounds)));
            } else if(!dbkjs.options.zoomToPandgeometrie) {
                if (dbkjs.map.zoom < dbkjs.options.zoom) {
                    dbkjs.map.setCenter(feature.geometry.getBounds().getCenterLonLat(), dbkjs.options.zoom);
                } else {
                    dbkjs.map.setCenter(feature.geometry.getBounds().getCenterLonLat());
                }
            } else {
                this.zoomToPandgeometrie();
            }
        };
        // getActive() changed, hide it
        this.layer.redraw();
    },
    updateFilter: function() {
        this.layer.redraw();
    },
    /**
     * Show only features with the typeFeature attribute in the specified array
     */
    setTypeFilter: function(types) {
        this.typeFilter = types;
        this.layer.redraw();
    },
    isFiltered: function(feature) {
        return this.typeFilter && this.typeFilter.length > 0 && this.typeFilter.indexOf(feature.attributes.typeFeature) === -1;
    },
    setDisableClustering: function(disableClustering) {
        this.disableClustering = disableClustering;
    },
    zoomToPandgeometrie: function() {
        // Pandgeometrie layer must be loaded

        var bounds = dbkjs.protocol.jsonDBK.layerPandgeometrie.getDataExtent();

        // Also zoom to include custom polygons if they exist
        var customPolyBounds = dbkjs.protocol.jsonDBK.layerCustomPolygon.getDataExtent();
        if(customPolyBounds) {
            if(!bounds) {
                bounds = customPolyBounds;
            } else {
                bounds.extend(customPolyBounds);
            }
        }
        if(bounds) {
            dbkjs.map.zoomToExtent(dbkjs.util.extendBounds(bounds, dbkjs.options.zoomToPandgeometrieMargin));
        }
    },
    getfeatureinfo: function(e) {
        var _obj = dbkjs.modules.feature;
        if (typeof(e.feature) !== "undefined") {
            dbkjs.gui.infoPanelUpdateHtml('');
            if (e.feature.cluster) {
                if (e.feature.cluster.length === 1) {
                    // XXX should never come here because feature.cluster should be false, only do else part here
                    _obj.zoomToFeature(e.feature.cluster[0]);
                } else {
                    _obj.currentCluster = e.feature.cluster.slice();
                    _obj.currentCluster.sort(function(lhs, rhs) {
                        if(!lhs.attributes.formeleNaam || !rhs.attributes.formeleNaam) {
                            return 0;
                        }
                        return lhs.attributes.formeleNaam.localeCompare(rhs.attributes.formeleNaam);
                    });
                    var item_ul = $('<ul id="dbklist" class="nav nav-pills nav-stacked"></ul>');
                    for(var i = 0; i < _obj.currentCluster.length; i++) {
                        item_ul.append(_obj.featureInfohtml(_obj.currentCluster[i]));
                    }
                    dbkjs.gui.infoPanelAddItems(item_ul);
                    dbkjs.util.getModalPopup('infopanel').setHideCallback(function() {
                        if(_obj.layer.selectedFeatures.length === 0) {
                            return;
                        }
                        for(var i = 0; i < _obj.layer.features.length; i++) {
                            dbkjs.selectControl.unselect(_obj.layer.features[i]);
                        }
                    });
                    //$("#dbklist").on("click", "a", _obj.handleFeatureTitleClick);
                    dbkjs.util.getModalPopup('infopanel').show();
                }
            } else {
                _obj.currentCluster = [];
                dbkjs.protocol.jsonDBK.process(e.feature);
                dbkjs.util.getModalPopup('infopanel').hide();
            }
        }
    },
    handleFeatureTitleClick: function(e) {
        var _obj = dbkjs.modules.feature;
        e.preventDefault();
        dbkjs.options.dbk = $ (this).attr("id");
        var feature = _obj.getActive();
        dbkjs.protocol.jsonDBK.process(feature);
        _obj.zoomToFeature(feature);
        return false;
    }
};
