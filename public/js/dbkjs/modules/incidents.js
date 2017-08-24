/*
 *  Copyright (c) 2015 B3Partners (info@b3partners.nl)
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

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};
dbkjs.modules.incidents = {
    id: "dbk.module.incidents",
    service: null,
    controller: null,
    options: null,
    register: function() {
        if(!this.options) {
            this.options = dbkjs.options.incidents;
        }

        var params = OpenLayers.Util.getParameters();
        if(params.mdt && "true" !== params.mdt) {
            this.options.mdt = false;
        }
        if(params.webservice === "true") {
            this.options.falck = true;
        }

        if(this.options.controller === "pharos") {
            this.controller = new PharosIncidentsController(this);
        } else if(this.options.falck) {
            this.controller = new FalckIncidentsController(this);
        } else if(this.options.incidentMonitor || !this.options.mdt) {
            this.service = new AGSIncidentService(this.options.ags.incidentsUrl, this.options.ags.vehiclePosUrl);

            if(this.options.incidentMonitor) {
                this.controller = new IncidentMonitorController(this);
            } else {
                this.controller = new VoertuigInzetController(this);
            }

            this.service.initialize(this.options.ags.tokenUrl, this.options.ags.user, this.options.ags.password)
            .fail(function(e) {
                // Avoid map loading messages hiding our error message
                window.setTimeout(function() {
                    dbkjs.util.alert("Fout bij initialiseren meldingenservice", e, "alert-danger");
                }, 3000);
            });
        } else if(!this.options.mdt) {
            this.controller = new VoertuigInzetController(this);
        } else {
            this.controller = new MDTController(this);
        }
    }
};

