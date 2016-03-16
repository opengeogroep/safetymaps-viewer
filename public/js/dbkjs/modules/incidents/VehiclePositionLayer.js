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
            "default": {
                externalGraphic: "images/zwaailicht.gif",
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
            }
        })
    });

    dbkjs.map.addLayer(this.layer);

    var me = this;
    var selectedFeature;

    function onPopupClose(evt) {
        me.selectControl.unselect(selectedFeature);
    };

    this.selectControl = new OpenLayers.Control.SelectFeature(this.layer, {
            onSelect: function(f) {
                console.log("feature select", f);
                me.selectedFeature = f;

                me.removePopup();

                var dateTime = moment(f.attributes.PosDate + " " + f.attributes.PosTime, "DD-MM-YYYY HH:mm:ss");
                me.popup = new OpenLayers.Popup.FramedCloud(null,
                                         f.geometry.getBounds().getCenterLonLat(),
                                         null,
                                         "<div style='font-size: 12px'>Pos. van " + dateTime.fromNow() + "<br>Status: " + f.attributes.Status + "<br>Snelheid / richting: " + f.attributes.Speed + " / " + f.attributes.Direction + "<br>Aanrijtijd: " + f.attributes.Aanrijtijd + "</div>",
                                         null, true, onPopupClose);
                f.popup = me.popup;
                dbkjs.map.addPopup(me.popup);
            },
            onUnselect: function(f) {
                this.removePopup();
                f.popup = null;
            }
    });
    dbkjs.map.addControl(this.selectControl);
    this.selectControl.activate();
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
    this.removePopup();
    this.layer.destroyFeatures();
    this.layer.addFeatures(features);
};
