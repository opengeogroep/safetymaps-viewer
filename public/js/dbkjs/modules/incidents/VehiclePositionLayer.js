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
    // Layer name starts with _ to hide in support module layer list
    this.layer = new OpenLayers.Layer.Vector("_Vehicle positions", {
        styleMap: new OpenLayers.StyleMap({
            "default": new OpenLayers.Style({
                externalGraphic: "${graphic}",
                graphicWidth: 16,
                graphicHeight: 16,
                pointRadius: 8,
                label: "${Voertuigsoort} ${Roepnummer}",
                fontColor: "black",
                fontSize: "12px",
                fontWeight: "bold",
                labelYOffset: -16,
                labelOutlineColor: "white",
                labelOutlineWidth: 3
            }, {
                context: {
                    graphic: function(feature) {
                        return feature.attributes.Status === 1 ? "images/zwaailicht-uit.png" : "images/zwaailicht.gif";
                    }
                }
            })
        })
    });

    dbkjs.map.addLayer(this.layer);

    var me = this;

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

    $("#baselayerpanel_b").append('<hr/><label><input type="checkbox" checked onclick="dbkjs.modules.incidents.controller.vehiclePositionLayer.layer.setVisibility(event.target.checked)">Toon voertuigposities</label>');
}

VehiclePositionLayer.prototype.selectFeature = function(f) {
    var me = this;
    me.selectedFeature = f;
    me.removePopup();

    function onPopupClose(evt) {
        me.unselectFeature(me.selectedFeature);
    };

    var dateTime = moment(f.attributes.PosDate + " " + f.attributes.PosTime, "DD-MM-YYYY HH:mm:ss");
    me.popup = new OpenLayers.Popup.FramedCloud(null,
                             f.geometry.getBounds().getCenterLonLat(),
                             null,
                             "<div style='font-size: 12px; overflow: hidden'>Pos. van " + dateTime.fromNow() + "<br>Status: " + f.attributes.Status + "</div>",
                             null, true, onPopupClose);
    f.popup = me.popup;
    dbkjs.map.addPopup(me.popup);
};

VehiclePositionLayer.prototype.unselectFeature = function(f) {
    var me = this;
    me.selectedFeature = null;
    me.removePopup();
    f.popup = null;
}

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
    var selected = me.selectedFeature;
    if(selected) {
        me.unselectFeature(selected);
    }
    this.layer.destroyFeatures();
    this.layer.addFeatures(features);

    var reselected = null;
    if(selected) {
        $.each(features, function(i, f) {
            if(f.attributes.Voertuigsoort === selected.attributes.Voertuigsoort && f.attributes.Roepnaam === selected.attributes.Roepnaam) {
                reselected = f;
                return false;
            }
        });
    }
    if(reselected) {
        console.log("reselecting feature ", reselected.attributes);
        me.selectFeature(reselected);
    }
};
