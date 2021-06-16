/*
 *  Copyright (c) 2017-2018 B3Partners (info@b3partners.nl)
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
/* global AGSIncidentService */

function IncidentVectorLayer(enableLabels) {
    var me = this;
    me.enableLabels = enableLabels;

    // Layer name starts with _ to hide in support module layer list
    me.layer = new OpenLayers.Layer.Vector("_Incident vectors", {
        rendererOptions: { zIndexing: true },
        styleMap: new OpenLayers.StyleMap({
            "default": new OpenLayers.Style({
                externalGraphic: "${icon}",
                graphicWidth: 26,
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
        function addConfig() {
            $("#row_layout_settings").append('<div class="col-xs-12"><label><input type="checkbox" id="checkbox_hideincidentlabel" ' + (me.hideLabel ? 'checked' : '') + '>Geen label tonen bij incidenten</label></div>');
            $("#checkbox_hideincidentlabel").on('change', function (e) {
                me.setHideLabel(e.target.checked);
            });
        };
        if(dbkjs.initialized) {
            addConfig();
        } else {
            $(dbkjs).one("dbkjs_init_complete", function() { addConfig(); });
        }
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
    var isManuallyCreated = incident.IncidentId && incident.IncidentId.includes("FLK");

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

    var icon = !gray 
        ? isManuallyCreated ? "images/bell-orange.png" : "images/bell.png" 
        : "images/bell-gray.png";

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
