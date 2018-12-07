/*
 *  Copyright (c) 2018 B3Partners (info@b3partners.nl)
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

/* global vrh */

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};
dbkjs.modules.vrh_waterwinning = {
    id: "dbk.module.vrh_waterwinning",
    options: null,
    infoWindow: null,
    div: null,
    incident: null,
    lineFeature:null,
    test: null,
    testMarker: null,
    noRouteTrim: null,
    register: function () {
        var me = this;

        // Button to open waterwinning window
        $("#btngrp_object").append($('<a id="btn_waterwinning" href="#" title="Waterwinning" style="background-color: rgb(45, 45, 255); color: white" class="btn navbar-btn btn-default"><img src="images/brandkraan.png" style="height: 36px; margin-bottom: 5px"></a>'));
        $("#btn_waterwinning")
        .click(function() {
            safetymaps.infoWindow.showTab(me.infoWindow.getName(), "waterwinning", true);
        });

        me.infoWindow = safetymaps.infoWindow.addWindow("waterwinning", "Waterwinning");
        me.div = $('<i> '+ i18n.t("dialogs.noinfo") + '</i>' );
        safetymaps.infoWindow.addTab("waterwinning", "waterwinning", "Waterwinning", "waterwinning", me.div, "last");

        if(vrh.isDev) {
            this.options.url = "api/vrh/waterwinning.json";
        } else {
            // Keep same protocol, http://localhost/... onboard and https://vrh-safetymaps.nl/...
            // for online
            this.options.url = window.location.protocol + this.options.url.substring(this.options.url.indexOf("//"));
            console.log("Using waterwinning URL: " + this.options.url);
        }

        me.createLayer();

        var params = OpenLayers.Util.getParameters();
        me.test = params.ww === "test";
        me.noRouteTrim = params.wwnoroutetrim === "true";
        if(me.test) {
            $(dbkjs).one("dbkjs_init_complete", function () {
                window.setTimeout(function() {
                    me.newIncident({x: params.wwx, y: params.wwy}, true, true);
                }, 3000);
            });
        } else  {
            $(dbkjs).one("dbkjs_init_complete", function () {
                if (dbkjs.modules.incidents && dbkjs.modules.incidents.controller) {
                    $(dbkjs.modules.incidents.controller).on("new_incident", function (event, incident) {
                        me.newIncident(incident);
                    });
                    $(dbkjs.modules.incidents.controller).on("end_incident", function () {
                        me.resetTab();
                    });
                }
            });
        }
    },
    createLayer: function () {
        var me = this;
        this.Layer = new OpenLayers.Layer.Vector("waterwinning", {
            rendererOptions: {
                zIndexing: true
            },
            options: {
                minScale: 10000
            },
            styleMap: new OpenLayers.StyleMap({
                default: new OpenLayers.Style({
                    cursor:"pointer",
                    externalGraphic: "${img}",
                    pointRadius: 18
                }),
                'select': new OpenLayers.Style({
                    pointRadius: 25
                })
            })
        });
        this.Layer.events.register("featureselected", me, me.selectFeature);
        dbkjs.map.addLayer(this.Layer);
        dbkjs.selectControl.setLayer((dbkjs.selectControl.layers || dbkjs.selectControl.layer).concat([this.Layer]));
    },
    selectFeature: function(feature){
        this.drawLine(feature.feature.attributes.ww);
        $("#wwlist tr").removeClass("active");
        $("#wwrow_" + feature.feature.attributes.fid).addClass("active");
    },
    drawLine: function (destination, id) {
        var me = this;
        //dbkjs.selectControl.select(test);
        if(me.routingFeatures){
            me.Layer.removeFeatures(me.routingFeatures);
        }
        me.routingFeatures = [];
        if (me.incident) {

            // As the crow flies line, black
            var endPt = new OpenLayers.Geometry.Point(destination.x, destination.y);
            var startPt = new OpenLayers.Geometry.Point(me.incident.x, me.incident.y);
            var geom = new OpenLayers.Geometry.LineString([startPt, endPt]);
            var style = {strokeColor: "black", strokeOpacity: 0.5, strokeWidth: 3};
            me.routingFeatures.push(new OpenLayers.Feature.Vector(geom, {}, style));

            if(destination.route) {
                console.log("Using route for waterwinning point", destination);
                if(destination.route.data.features) {
                    geom = new OpenLayers.Format.GeoJSON().read(destination.route.data.features[0].geometry)[0].geometry;
                } else {
                    geom = new OpenLayers.Format.GeoJSON().read(destination.route.data.paths[0].points)[0].geometry;
                }
                console.log("Line to point", geom);
                var points = geom.getVertices();
                var reprojected = [];
                reprojected.push(new OpenLayers.Geometry.Point(me.incident.x, me.incident.y));
                for(var i = 0; i < points.length; i++) {
                    var p = new Proj4js.Point(points[i].x, points[i].y);
                    var t = Proj4js.transform(new Proj4js.Proj("EPSG:4326"), new Proj4js.Proj(dbkjs.options.projection.code), p);
                    reprojected.push(new OpenLayers.Geometry.Point(t.x, t.y));
                }
                geom = new OpenLayers.Geometry.LineString(reprojected);
                console.log("Reprojected line to point", geom);
                var style = {strokeColor: "red", strokeOpacity: 0.5, strokeWidth: 10};
                me.routingFeatures.push(new OpenLayers.Feature.Vector(geom, {}, style));

                var lastRoutePoint = reprojected[reprojected.length-1];
                var coords = [new OpenLayers.Geometry.Point(lastRoutePoint.x, lastRoutePoint.y), new OpenLayers.Geometry.Point(destination.x, destination.y)];
                // Line from end of route to incident
                me.routingFeatures.push(new OpenLayers.Feature.Vector(new OpenLayers.Geometry.LineString(coords), {}, {
                    strokeColor: "red", strokeOpacity: 0.8, strokeWidth: 3, strokeDashstyle: "dash"
                }));
            }

            this.Layer.addFeatures(me.routingFeatures);
        }
    },
    newIncident: function(incident, zoom, addTestMarker) {
        var me = this;
        me.incident = incident;
        me.resetTab();
        me.div.html("<i>Ophalen gegevens...</i>");

        if(addTestMarker) {
            var location = new OpenLayers.Geometry.Point(me.incident.x, me.incident.y);
            var marker = new OpenLayers.Feature.Vector(location, {});
            marker.attributes ={
                "img": "images/marker-red.png"
            };
            me.Layer.addFeatures([marker]);
        }
        me.requestData(incident)
        .done(function(data) {
            me.renderData(data);
            if(zoom) {
                dbkjs.map.setCenter(new OpenLayers.LonLat(me.incident.x, me.incident.y), dbkjs.options.zoom);
            }
        })
        .fail(function(error) {
            console.log("error requesting waterwinning data", arguments);
            me.div.html("<i>Fout bij ophalen gegevens: " + Mustache.escape(error) + "</i>");
        });
    },
    renderData: function(data) {
        console.log("rendering waterwinning data", data);

        var me = this;
        var ww_table_div = $('<div class="table-responsive"></div>');
        if(me.test) {
            ww_table_div.append('<input type="button" class="btn btn-primary" id="ww_test_btn" value="Test nieuwe locatie door klik op kaart"><p>');
            ww_table_div.append('<a href="?ww=test&wwx=' + me.incident.x + '&wwy=' + me.incident.y + '&wwnoroutetrim=' + me.noRouteTrim + '">Permalink test waterwinning op deze locatie</a><p>');
        }

        var ww_table = $('<table id="wwlist" class="table table-hover"></table>');
        ww_table.append('<tr><th>Soort</th><th>Afstand</th><th>Extra info</th></tr>');
        var all = data.primary.concat(data.secondary);
        all.sort(function(lhs, rhs) {
            var ld = lhs.distance;
            if(lhs.route && lhs.route.success) {
                ld = lhs.route.distance;
            }
            var rd = rhs.distance;
            if(rhs.route && rhs.route.success) {
                rd = rhs.route.distance;
            }
            return ld - rd;
        });
        $.each(all, function (i, ww) {
            var img = "images/nen1414/Tb4.002.png";
            if(ww.type === "bovengronds") {
                img = "images/nen1414/Tb4.001.png";
            } else if(ww.type === "open_water") {
                img = "images/other/Falck20.png";
            } else if(ww.type === "bluswaterriool") {
                img = "images/other/Falck19.png";
            } else if(ww.type === "geboorde_put") {
                img = "images/nen1414/Tb4003.png";
            } else if(ww.type === "ondergronds schroef") {
                img = "images/nen1414/Tb4002_s.png";
            }
            var fid = "ww_" + i;
            var routeDist = "";
            if(ww.route) {
                routeDist = "<span style='color:rgba(255,0,0,0.5)'>" + Math.round(ww.route.distance) + "m</span><br>";
            }
            var eigenTerrein = ww.tabel === "brandkranen_eigen_terrein" ? "<br>Brandkraan eigen terrein" : "";
            var myrow = $('<tr id="wwrow_' + fid + '">' +
                    '<td><img style="width: 42px" src="' + img + '"></td>' +
                    '<td style="color:rgba(0,0,0,0.5)">' + routeDist + ww.distance.toFixed() + 'm' + '</td>' +
                    '<td>' + (ww.info ? ww.info : '') + eigenTerrein + '</i></td> +'
                    + '</tr>'
            ).click(function (e) {
                var feature = me.Layer.getFeaturesByAttribute("fid", fid)[0];

                dbkjs.selectControl.unselectAll();
                // Calls drawLine() and updates selected row in tab
                dbkjs.selectControl.select(feature);

                // Select feature does not zoom
                me.zoomToOverview(ww);
            });
            ww_table.append(myrow);
            var location = new OpenLayers.Geometry.Point(ww.x, ww.y);
            var marker = new OpenLayers.Feature.Vector(location, {});
            marker.attributes ={
                "img": img,
                "fid": fid,
                "ww": ww
            };
            me.testMarker = marker;
            me.Layer.addFeatures([marker]);
        });
        if(data.primary.length === 0) {
            ww_table.append('<tr><td colspan="3" style="font-style: italic">Geen primaire waterwinning binnen 500 meter gevonden!</td></tr>');
        }
        if(data.secondary.length === 0) {
            ww_table.append('<tr><td colspan="3" style="font-style: italic">Geen secondaire waterwinning binnen 3000 meter gevonden!</td></tr>');
        }

        ww_table_div.append(ww_table);
        me.div.html(ww_table_div);

        if(me.test) {
            $("#ww_test_btn").click(function() {
                $("#ww_test_btn").attr("disabled");
                $("#ww_test_btn").val("Klik op de kaart...");
                dbkjs.map.events.register('click', me, me.mapClickTest);
            });
        }
        $("#wwrow_ww_0").click();
        dbkjs.map.setLayerIndex(this.Layer,99);

        //dbkjs.protocol.jsonDBK.addMouseoverHandler("#wwlist",me.Layer);
    },
    mapClickTest: function(e) {
        var me = this;
        dbkjs.map.events.unregister('click', me, me.mapClickTest);

        var pos = dbkjs.map.getLonLatFromPixel(e.xy);
        me.newIncident({x: pos.lon, y: pos.lat}, true, true);
    },
    resetTab: function () {
        this.div.html($('<i> ' + i18n.t("dialogs.noinfo") + '</i>'));
        this.Layer.removeAllFeatures();
    },
    zoomToOverview: function (ww) {
        var me = this;
        if (ww && me.incident){
            var x = (parseInt(ww.x,10)+parseInt(me.incident.x,10))/2;
            var y = (parseInt(ww.y,10)+parseInt(me.incident.y,10))/2;
            dbkjs.map.setCenter(new OpenLayers.LonLat(x, y), dbkjs.options.zoom);
            me.checkIfPointsInScreen(ww);
        }
    },

    checkIfPointsInScreen: function(destination){
        var me = this;

        if(me.lineFeature) {
            dbkjs.map.zoomToExtent(dbkjs.util.extendBounds(me.lineFeature.geometry.getBounds(), 100), true);
            if(dbkjs.map.getZoom() > dbkjs.options.zoom) {
                dbkjs.map.setCenter(dbkjs.map.getCenter(), dbkjs.options.zoom);
            }
            return;
        }

        var pointsInScreen = false;
        var i = 0;
        while(!pointsInScreen){
            var bounds = dbkjs.map.calculateBounds();
                if(bounds.containsLonLat({lon:destination.x, lat:destination.y}) && bounds.containsLonLat({lon:me.incident.x, lat:me.incident.y})){
                pointsInScreen = true;
            }else {
                i++;
                    dbkjs.map.zoomOut();
                }
            if(i>25){
                console.log("points are not found");
                pointsInScreen = true;
            }
        }
        return pointsInScreen;
    },

    requestData:function(incident){
        var me = this;
        var d = $.Deferred();
        console.log("requesting waterwinning data", incident);

        $.ajax(me.options.url, {
            data: {
                x: Number(incident.x).toFixed(),
                y: Number(incident.y).toFixed(),
                noRouteTrim: me.noRouteTrim
            }
        })
        .done(function(data) {
            if(data.success) {
                d.resolve(data.value);
            } else {
                d.reject(data.error);
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            d.reject("Ajax error: HTTP status " + jqXHR.status + " " + jqXHR.statusText + ", " + jqXHR.responseText);
        });
        return d.promise();
    }
};
