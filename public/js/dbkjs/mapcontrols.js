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
dbkjs.mapcontrols = {
    createMapControls: function() {
        dbkjs.map.addControl(new OpenLayers.Control.TouchNavigation({
            dragPanOptions: {
                enableKinetic: false
            },
            autoActivate: true
        }));

        $("#zoom_buttons").toggle(dbkjs.options.showZoomButtons);
        if (dbkjs.options.showZoomButtons) {
            $("#zoom_in").on("click", function () {
                dbkjs.map.zoomIn();
            });
            $("#zoom_out").on("click", function () {
                dbkjs.map.zoomOut();
            });
        }

        // XXX button removed
        // Added touchstart event to trigger click on. There was some weird behaviour combined with FastClick,
        // this seems to fix the issue
        $('#zoom_extent').on('click touchstart', function () {
            dbkjs.zoomToExtent();
        });

        if(window.location.search.indexOf("res=true") !== -1) {
            $("<span id='res' style='position: absolute; left: 0; top:0; font-size: 14pt'></span>").appendTo(document.body);
            dbkjs.map.events.register("zoomend", undefined, function(e) {
                    $("#res").text("Zoom: " + e.object.getZoom().toFixed(2) + ", res: " + e.object.getResolution().toFixed(4));
            });
        }
    }
};
