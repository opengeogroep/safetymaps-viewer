/*
 *  Copyright (c) 2015-2018 B3Partners (info@b3partners.nl)
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
dbkjs.modules.incidents = {
    id: "dbk.module.incidents",
    service: null,
    controller: null,
    featureSelector: null,
    options: null,
    register: function() {
        if(!this.options) {
            this.options = dbkjs.options.incidents;
        }

        this.options = $.extend({
            controller: "MDTIncidentsController",
            featureExactMatchHuisletter: true,
            featureExactMatchToevoeging: false
        }, this.options);

        this.featureSelector = new IncidentFeatureSelector(this.options.featureExactMatchHuisletter, this.options.featureExactMatchToevoeging);

        // Controller can be changed using URL parameter

        var params = OpenLayers.Util.getParameters();
        if(params.mdt && "true" !== params.mdt) {
            this.options.controller = "AGSIncidentsController";
        }
        if(params.webservice === "true") {
            this.options.controller = "FalckIncidentsController";
        }
        
        // XXX unused, remove
        if(params.toonZonderEenheden === "true") {
            this.options.toonZonderEenheden = true;
        }
        
        // Initialize AGS service if needed
        if(this.options.controller === "AGSIncidentsController" || this.options.incidentMonitor) {
            if(this.options.ags) {
                this.service = new AGSIncidentService(this.options.ags.incidentsUrl, this.options.ags.vehiclePosUrl);

                this.service.initialize(this.options.ags.tokenUrl, this.options.ags.user, this.options.ags.password)
                .fail(function(e) {
                    // Avoid map loading messages hiding our error message
                    window.setTimeout(function() {
                        dbkjs.util.alert("Fout bij initialiseren meldingenservice", e, "alert-danger");
                    }, 3000);
                });
            }
        }
        
        //if localstorage is not holding the voertuignummer try to get the voertuignummer from the url
        var vrtg = window.localStorage.getItem("voertuignummer");
        if (!vrtg) {
            if (params.vtg) {
                window.localStorage.setItem("voertuignummer", params.vtg);
            }
        }
        
        if(this.options.incidentMonitor) {
            this.controller = new IncidentMonitorController(this);
        } else if(this.options.controller === "PharosIncidentsController") {
            this.controller = new PharosIncidentsController(this);
        } else if(this.options.controller === "AGSIncidentsController") {
            this.controller = new AGSIncidentsController(this);
        } else if(this.options.controller === "MDTIncidentsController") {
            this.controller = new MDTIncidentsController(this);
        } else if(this.options.controller === "FalckIncidentsController") {
            this.controller = new FalckIncidentsController(this);
            if(this.options.enableVehicleControl){
                this.vehicleController = new FalckIncidentVehicleController(this.controller);
            }
        } else {
            console.log("No incidents controller configured");
        }
    }
};

