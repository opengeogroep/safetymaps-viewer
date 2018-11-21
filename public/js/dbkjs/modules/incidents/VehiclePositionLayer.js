/*
 *  Copyright (c) 2016 B3Partners (info@b3partners.nl)
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

function VehiclePositionLayer() {
    OpenLayers.Renderer.symbol.pointer = [1, -7, 0, -9, -1, -7, 1, -7];

    var me = this;

    this.showMoving = window.localStorage.getItem("VehiclePositionLayer.showMoving") === "true";
    this.visibility = !(window.localStorage.getItem("VehiclePositionLayer.hidden") === "true");

    function displayFunction(feature) {
        if(!me.showMoving) {
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
                label: "${Voertuigsoort} ${Roepnummer} ${speed}",
                fontColor: "black",
                fontSize: "12px",
                fontWeight: "bold",
                labelYOffset: -20,
                labelOutlineColor: "white",
                labelOutlineWidth: 3,
                display: "${display}"
            }, {
                context: {
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
    this.layer.setVisibility(this.visibility);
    this.layer2.setVisibility(this.visibility);

    dbkjs.map.addLayer(this.layer);
    dbkjs.map.addLayer(this.layer2);

    var me = this;

    this.layer.events.register("featureselected", me, me.selectFeature);
    this.layer.events.register("featureunselected", me, me.unselectFeature);
//    dbkjs.selectControl.layers.push(this.layer);
/*
    this.selectControl = new OpenLayers.Control.SelectFeature(this.layer, {
            onSelect: function(f) {
                me.selectFeature(f);
            },
            onUnselect: function(f) {
                me.unselectFeature(f);
            }
    });
    dbkjs.map.addControl(this.selectControl);
    this.selectControl.activate();
*/

    // Add config option
    $(dbkjs).one("dbkjs_init_complete", function() {
        $("#row_layout_settings").append('<div class="col-xs-12"><label><input type="checkbox" id="checkbox_showvehicles" ' + (me.visibility ? 'checked' : '') + '>Toon voertuigposities</label></div>');
        $("#checkbox_showvehicles").on('change', function (e) {
            me.setVisibility(e.target.checked);
        });
    });
};

VehiclePositionLayer.prototype.setShowMoving = function(showMoving) {
    this.showMoving = showMoving;
    this.layer.redraw();
    this.layer2.redraw();
    window.localStorage.setItem("VehiclePositionLayer.showMoving", showMoving);
};

VehiclePositionLayer.prototype.selectFeature = function(e) {
    console.log("vehicle select", arguments);
    var me = this;
    var f = e.feature;
    me.selectedFeature = f;
    me.removePopup();

    function onPopupClose(evt) {
        me.unselectFeature(me.selectedFeature);
    };

    var dateTime = moment(f.attributes.PosDate + " " + f.attributes.PosTime, "DD-MM-YYYY HH:mm:ss");
    me.popup = new OpenLayers.Popup.FramedCloud(null,
                             f.geometry.getBounds().getCenterLonLat(),
                             null,
                             "<div style='font-size: 12px; overflow: hidden'>Pos. van " + dateTime.fromNow() + "<br>Status: " + f.attributes.Status + "<br>Mobile ID: " + f.attributes.MobileID +" </div>",
                             null, true, onPopupClose);
    f.popup = me.popup;
    dbkjs.map.addPopup(me.popup);
};

VehiclePositionLayer.prototype.unselectFeature = function(e) {
    console.log("vehicle unselect", arguments);

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

VehiclePositionLayer.prototype.features = function(features) {
    var me = this;
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
    this.visibility = visible;
    this.layer.setVisibility(visible);
    this.layer2.setVisibility(visible);
    window.localStorage.setItem("VehiclePositionLayer.hidden", !visible);
};