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

function IncidentVectorLayer(enableLabels) {
    var me = this;
    me.enableLabels = enableLabels;

    // Layer name starts with _ to hide in support module layer list
    me.layer = new OpenLayers.Layer.Vector("_Incident vectors", {
        rendererOptions: { zIndexing: true },
        styleMap: new OpenLayers.StyleMap({
            "default": new OpenLayers.Style({
                externalGraphic: "${icon}",
                graphicWidth: 24,
                graphicHeight: 26,
                label: "${label}",
                fontColor: "black",
                fontSize: "12px",
                fontWeight: "bold",
                labelYOffset: -20,
                labelOutlineColor: "yellow",
                labelOutlineWidth: 7,
                opacity: "${opacity}"
            }, {
                context: {
                    label: function(feature) {
                        return me.enableLabels && !me.hideLabel ? feature.attributes.label : "";
                    }
                }
            })
        })
    });
    me.layer.events.register("featureselected", me, me.featureSelected);
    dbkjs.map.addLayer(me.layer);

    if(me.enableLabels) {
        me.hideLabel =  window.localStorage.getItem("IncidentVectorLayer.hideLabel") === "true";
        $("#settingspanel_b").append('<hr/>');
        var l = $("<label/>");
        var input = $("<input type='checkbox' " + (me.hideLabel ? 'checked' : '') + ">");
        input.click(function(e) {
            me.setHideLabel(e.target.checked);
        });
        l.append(input);
        l.append("<span>Geen label tonen bij incidenten");
        $("#settingspanel_b").append(l);
    }

};

IncidentVectorLayer.prototype.setHideLabel = function(hideLabel) {
    this.hideLabel = hideLabel;
    this.layer.redraw();
    window.localStorage.setItem("IncidentVectorLayer.hideLabel", hideLabel);
};

IncidentVectorLayer.prototype.addIncident = function(incident, gray, singleMarker) {
    var me = this;
    var falck = incident.IncidentNummer;

    var x, y;

    if(falck) {
        if(!incident.IncidentLocatie.XCoordinaat && incident.IncidentLocatie.YCoordinaat) {
            return;
        }
        x = incident.IncidentLocatie.XCoordinaat;
        y = incident.IncidentLocatie.YCoordinaat;
    } else {
        var xy = AGSIncidentService.prototype.getIncidentXY(incident);
        x = xy.x, y = xy.y;
    }

    if(singleMarker) {
        if(x === me.x && y === me.y) {
            return;
        }

        this.layer.clearFeatures();

        me.x = x;
        me.y = y;
    }

    var icon = !gray ? "images/bell.png" : "images/bell-gray.png";

    var classificatie = incident.classificaties;
    if(classificatie && classificatie.indexOf(",") !== -1) {
        var classificaties = classificatie.split(",");
        classificatie = classificaties[0] + ", " + classificaties[1];
    }
    var label = "P" + incident.prio + " " + classificatie + " – " + incident.locatie + " " + incident.plaats;
    var feature = new OpenLayers.Feature.Vector(
            new OpenLayers.Geometry.Point(x, y),
            {
                label: label,
                incident: incident,
                icon: icon,
                incident_id: falck ? incident.IncidentNummer : incident.INCIDENT_ID
            });

    this.layer.addFeatures(feature);

    return feature;
};

IncidentVectorLayer.prototype.setZIndexFix = function() {
//    this.layer.setZIndex(100000);
};

IncidentVectorLayer.prototype.removeMarker = function(marker) {
    this.layer.removeFeatures([marker]);
    marker.destroy();
};

IncidentVectorLayer.prototype.clear = function() {
    this.layer.destroyFeatures();
};

IncidentVectorLayer.prototype.featureSelected = function(e) {
    console.log("incident feature selected", e);
    dbkjs.selectControl.unselectAll();
    var a = e.feature.attributes;
    $(this).triggerHandler('click', { incident: a.incident, archief: a.archief});
};
