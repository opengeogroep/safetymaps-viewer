/*
 *  Copyright (c) 2016-2018 B3Partners (info@b3partners.nl)
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

function VehiclePositionLayer(options) {
    var me = this;

    me.options = $.extend({
        showUnassignedButMoving: false,
        showInzetRol: true,
        vehiclePopupTemplate: null
    }, options);

    function displayFunction(feature) {
        if(!me.options.showUnassignedButMoving) {
            return feature.attributes.IncidentID === "" ? "none": "visible";
        }
        return feature.attributes.IncidentID === "" && feature.attributes.Speed <= 5 ? "none" : "visible";
    };

    // Layer name starts with _ to hide in support module layer list
    this.layer = new OpenLayers.Layer.Vector("_Vehicle positions 1", {
        styleMap: new OpenLayers.StyleMap({
            "default": new OpenLayers.Style({
                externalGraphic: "${graphic}",
                graphicWidth: 16,
                graphicHeight: 16,
                label: "${label}",
                fontColor: "black",
                fontSize: "12px",
                fontWeight: "bold",
                labelYOffset: -20,
                labelOutlineColor: "white",
                labelOutlineWidth: 3,
                display: "${display}"
            }, {
                context: {
                    label: function(feature) {
                        var speed = feature.attributes.Speed === 0 ? "" : feature.attributes.Speed + "km/h";
                        var inzetRol = me.options.showInzetRol ? feature.attributes.Voertuigsoort || "" : "";
                        return inzetRol + " " + feature.attributes.Roepnummer + " " + speed;
                    },
                    speed: function(feature) {
                        if(feature.attributes.Speed === 0) {
                            return "";
                        } else {
                            return feature.attributes.Speed + "km/h";
                        }
                    },
                    display: displayFunction,
                    graphic: function(feature) {
                        if(feature.attributes.IncidentID === "") {
                            return "images/zwaailicht-grijs.png";
                        }
                        return "images/zwaailicht-uit.png";
                    }
                }
            })
        })
    });
    OpenLayers.Renderer.symbol.pointer = [1, -7, 0, -9, -1, -7, 1, -7];
    this.layer2 = new OpenLayers.Layer.Vector("_Vehicle positions 2", {
        styleMap: new OpenLayers.StyleMap({
            "default": new OpenLayers.Style({
                strokeColor: "#ff0000",
                fillColor: "#dd0000",
                fillOpacity: 1.0,
                strokeWidth: 1,
                pointRadius: 16,
                display: "${display}",
                graphicName: "pointer",
                rotation: "${Direction}"
            }, {
                context: {
                    display: function(feature) {
                        if(feature.attributes.Direction === null) {
                            return "none";
                        }
                        return displayFunction(feature);
                    }
                }
            })
        })
    });

    dbkjs.map.addLayer(this.layer);
    dbkjs.map.addLayer(this.layer2);

    var me = this;

    this.layer.events.register("featureselected", me, me.selectFeature);
    this.layer.events.register("featureunselected", me, me.unselectFeature);
};

VehiclePositionLayer.prototype.raiseLayers = function() {
    dbkjs.map.setLayerIndex(this.layer, 99);
    dbkjs.map.setLayerIndex(this.layer2, 99);
};

VehiclePositionLayer.prototype.setShowUnassignedButMoving = function(showUnassignedButMoving) {
    this.options.showUnassignedButMoving = showUnassignedButMoving;
    this.layer.redraw();
    this.layer2.redraw();
};

VehiclePositionLayer.prototype.setShowInzetRol = function(showInzetRol) {
    this.options.showInzetRol = showInzetRol;
    this.layer.redraw();
    this.layer2.redraw();
};

VehiclePositionLayer.prototype.selectFeature = function(e) {
    var me = this;
    me.removePopup();

    if(me.options.vehiclePopupTemplate) {
        var f = e.feature;
        me.selectedFeature = f;
        function onPopupClose(evt) {
            me.unselectFeature(me.selectedFeature);
        };

        me.popup = new OpenLayers.Popup.FramedCloud(null,
                                 f.geometry.getBounds().getCenterLonLat(),
                                 null,
                                 Mustache.render(me.options.popupTemplate, f.attributes),
                                 null, true, onPopupClose);
        f.popup = me.popup;
        dbkjs.map.addPopup(me.popup);
    }
};

VehiclePositionLayer.prototype.unselectFeature = function(e) {
    var me = this;
    me.selectedFeature = null;
    me.removePopup();
    e.feature.popup = null;
};

VehiclePositionLayer.prototype.removePopup = function() {
    var me = this;
    if(me.popup) {
        dbkjs.map.removePopup(me.popup);
        me.popup.destroy();
        me.popup = null;
    }
};

/**
 * Call with array of point features with the following attributes:
 * Speed: null or km/h value, shown after label when showSpeed option is true
 * Roepnummer: label
 * Voertuigsoort: when showInzetRol option is true shown in label before Roepnummer
 * Direction: heading in degrees
 * IncidentID: set to non-empty value when vehicle is assigned
 *
 * And any additional attributes to display in popup using vehiclePopupTemplate.
 *
 * @param {type} features
 * @returns {undefined}
 */
VehiclePositionLayer.prototype.features = function(features) {
    var me = this;
    if(!features) {
        return;
    }
    if(me.selectedFeature) {
        me.selectControl.unselectAll();
    }
    this.layer.destroyFeatures();
    this.layer2.destroyFeatures();
    this.layer.addFeatures(features);
    var features2 = [];
    $.each(features, function(i, f) {
        features2.push(f.clone());
    });
    this.layer2.addFeatures(features2);
};

VehiclePositionLayer.prototype.setVisibility = function(visible) {
    this.layer.setVisibility(visible);
    this.layer2.setVisibility(visible);
};