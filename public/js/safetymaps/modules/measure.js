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
dbkjs.modules = dbkjs.modules || {};

dbkjs.modules.measure = {
    id: "dbk.modules.measure",
    distance_control: null,
    area_control: null,
    register: function() {
        var _obj = dbkjs.modules.measure;

        _obj.options = $.extend({
            showButtons: true,
            round: 3
        }, _obj.options);

        if(_obj.options.showButtons) {
            _obj.createButtons();
        }

        // style the sketch fancy
        var sketchSymbolizers = {
            "Point": {
                pointRadius: 4,
                graphicName: "square",
                fillColor: "white",
                fillOpacity: 1,
                strokeWidth: 1,
                strokeOpacity: 1,
                strokeColor: "#333333"
            },
            "Line": {
                strokeWidth: 3,
                strokeOpacity: 1,
                strokeColor: "#666666",
                strokeDashstyle: "dash"
            },
            "Polygon": {
                strokeWidth: 2,
                strokeOpacity: 1,
                strokeColor: "#666666",
                fillColor: "white",
                fillOpacity: 0.3
            }
        };
        var style = new OpenLayers.Style();
        style.addRules([
            new OpenLayers.Rule({symbolizer: sketchSymbolizers})
        ]);
        var styleMap = new OpenLayers.StyleMap({"default": style});
        _obj.distance_control = new OpenLayers.Control.Measure(
            OpenLayers.Handler.Path, {
                persist: true,
                handlerOptions: {
                    layerOptions: {
                        styleMap: styleMap
                    }
                }
            }
        );
        _obj.distance_control.events.on({
            "measure": _obj.handleMeasurements,
            "measurepartial": _obj.handleMeasurements
        });
        dbkjs.map.addControl(_obj.distance_control);
        _obj.area_control = new OpenLayers.Control.Measure(
            OpenLayers.Handler.Polygon, {
                persist: true,
                handlerOptions: {
                    layerOptions: {
                        styleMap: styleMap
                    }
                }
            }
        );
        _obj.area_control.events.on({
            "measure": _obj.handleMeasurements,
            "measurepartial": _obj.handleMeasurements
        });
        dbkjs.map.addControl(_obj.area_control);
        
        $(dbkjs).one("dbkjs_init_complete", function () {
            _obj.listenToIncidents();
        });
        
        
    },

    createButtons: function() {
        var _obj = this;
        var buttonParent;
        if(dbkjs.options.extraButtonGroupDropdown){
            buttonParent = '#btngrp_4';
        } else {
            buttonParent = '#btngrp_3';
        }
        
        if($("#btn_measure_distance").length === 0) {
            $(buttonParent).append('<a id="btn_measure_distance" data-sid="'+_obj.options.indexD+'" class="btn btn-default navbar-btn" href="#" title="' +
                    i18n.t('map.measureDistance') + '"><i class="fa fa-arrows-v fa-rotate-45"></i></a>');
            $(buttonParent).append('<a id="btn_measure_area" data-sid="'+_obj.options.indexA+'" class="btn btn-default navbar-btn" href="#" title="' +
                    i18n.t('map.measureArea') + '"><i class="fa fa-bookmark-o fa-rotate-45"></i></a>');
            $('#btn_measure_distance').click(function() {
                _obj.toggleMeasureDistance();
            });
            $('#btn_measure_area').click(function() {
                _obj.toggleMeasureArea();
            });
        }
    },

    setMeasureActive: function(distanceOrArea, toggle, active) {
        var me = this;
        $('#measure').html('');
        $('#measure').hide();

        var control = distanceOrArea === "distance" ? me.distance_control : me.area_control;
        var otherControl = control === me.distance_control ? me.area_control : me.distance_control;

        var newStateActive = toggle ? !control.active : active;

        if(newStateActive) {
        }

    },
    toggleMeasureDistance: function(activate) {
        var me = this;
        var newStateIsActive = typeof activate === "undefined" ? !me.distance_control.active : activate;
        this.clearMeasure();
        if(newStateIsActive) {
            $('#btn_measure_distance').addClass('active');
            me.toggleMeasureArea(false);
            me.distance_control.activate();
        } else {
            me.area_control.deactivate();
            me.distance_control.deactivate();
            $('#btn_measure_distance').removeClass("active");
        }
    },
    toggleMeasureArea: function(activate) {
        var me = this;
        var newStateIsActive = typeof activate === "undefined" ? !me.area_control.active : activate;
        this.clearMeasure();
        if(newStateIsActive) {
            $('#btn_measure_area').addClass('active');
            me.toggleMeasureDistance(false);
            me.area_control.activate();
        } else {
            me.area_control.deactivate();
            me.distance_control.deactivate();
            $('#btn_measure_area').removeClass("active");
        }
    },
    clearMeasure: function() {
        $('#measure').html('');
        $('#measure').hide();
    },
    handleMeasurements: function(event) {
        //var geometry = event.geometry;
        var me = dbkjs.modules.measure;
        var units = event.units;
        var order = event.order;
        var measure = event.measure;
        var out = "";
        if (order === 1) {
            out += i18n.t("measure.distance")+": " + measure.toFixed(me.options.round) + " " + units;
        } else {
            out += i18n.t("measure.area")+": " + measure.toFixed(me.options.round) + " " + units + "<sup>2</" + "sup>";
        }
        $('#measure').show();
        $('#measure').html(out);
    },
    listenToIncidents: function () {
        var me = this;
        if (dbkjs.options.resetToDefaultOnIncident) {
            $(dbkjs.modules.incidents.controller).on("new_incident", function () {
                me.distance_control.deactivate();
                me.area_control.deactivate();
                me.clearMeasure();
            });
        }
    }
};