/* global OpenLayers */

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

        if(dbkjs.options.showZoomButtons) {

            var zoomContainer = $("<div id='zoom_buttons'/>").css({
                "position": "absolute",
                "left": "20px",
                "bottom": "80px",
                "z-index": "3000"
            });
            zoomContainer.appendTo("#mapc1map1");

            $("#zoom_in").css({"display": "block", "font-size": "24px"}).removeClass("navbar-btn").appendTo(zoomContainer).show();
            $("#zoom_out").css({"display": "block", "font-size": "24px"}).removeClass("navbar-btn").appendTo(zoomContainer).show();
            dbkjs.map.addControl(new OpenLayers.Control.Zoom({
                    zoomInId: "zoom_in",
                    zoomOutId: "zoom_out"
                })
            );
        }

        if(window.location.search.indexOf("res=true") !== -1) {
            $("<span id='res' style='position: absolute; left: 0; top:0; font-size: 14pt'></span>").appendTo(document.body);
            dbkjs.map.events.register("zoomend", undefined, function(e) {
                    $("#res").text("Zoom: " + e.object.getZoom().toFixed(2) + ", res: " + e.object.getResolution().toFixed(4));
            });
        }
    },
    //dbkjs.js: init
    registerMapEvents: function() {
        // not needed this was for the old office viewer
    }
};
