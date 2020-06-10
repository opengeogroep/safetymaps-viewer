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
    controller: null,
    featureSelector: null,
    options: null,
    register: function() {
        var me = this;

        this.options = $.extend({
            controller: "VehicleIncidentsController",
            featureExactMatchHuisletter: true,
            featureExactMatchToevoeging: false,
            excludeManuallyCreatedIncidents: false
        }, this.options);

        this.featureSelector = new IncidentFeatureSelector(this.options.featureExactMatchHuisletter, this.options.featureExactMatchToevoeging);

        me.createControls();

        // If localstorage is not holding the voertuignummer try to get the voertuignummer from the url
        var vrtg = window.localStorage.getItem("voertuignummer");
        if (!vrtg) {
            var params = OpenLayers.Util.getParameters();
            if (params.vtg) {
                window.localStorage.setItem("voertuignummer", params.vtg);
            }
        }
        
        if(this.options.controller === "PharosIncidentsController") {
            this.controller = new PharosIncidentsController(this);
        } else if(this.options.controller === "MDTIncidentsController"  || this.options.vehicleController === "MDTIncidentsController") {
            this.controller = new MDTIncidentsController(this);
        } else {
            this.controller = new VehicleIncidentsController(this.options, this.featureSelector);
        }
    },

    createControls: function() {
        $("body").append("<a id='incident_bottom_right' class='btn btn-default'></a>");
        $(window).on("resize orientationchange", function() {
            // Calculate the max width so bottom left buttons not overlapped
            var maxWidth = $("body").outerWidth() - $("#bottom_left_buttons").offset().left - $("#bottom_left_buttons").outerWidth() - 20;
            $('#incident_bottom_right').css("max-width", maxWidth + "px");
        });
    }
};

