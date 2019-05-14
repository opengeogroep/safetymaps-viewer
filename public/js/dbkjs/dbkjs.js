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
dbkjs.modules = dbkjs.modules || [];
dbkjs.overlays = dbkjs.overlays || [];
dbkjs.map = dbkjs.map || null;

dbkjs.init = function () {
    if (!dbkjs.map) {
        dbkjs.map = new OpenLayers.Map(dbkjs.options.map.options);
    }

    dbkjs.getOrganisation();

    dbkjs.mapcontrols.createMapControls();

    dbkjs.layers.checkHiDPI();

    dbkjs.layers.createBaseLayers();

    dbkjs.showStatus = false;
};

dbkjs.hideOverlayLayer = function(name) {
    var l = dbkjs.map.getLayersByName(name);
    if(l.length > 0) {
        l[0].setVisibility(false);
        $(".panel-heading[data-layer-gid=" + l[0].gid + "]").removeClass("active");
    }
};

dbkjs.activateClick = function () {
    dbkjs.map.events.register('click', dbkjs.map, dbkjs.util.onClick);

    // TODO: OpenLayers.Handler.Click with pixelTolerance instead of this?
    if(!dbkjs.options.minTouchMoveEndDistance || dbkjs.options.minTouchMoveEndDistance === 0) {
        dbkjs.map.events.register('touchend', dbkjs.map, dbkjs.util.onClick);
    } else {
        var touchmove = null;

        dbkjs.map.events.register('touchend', dbkjs.map, function(e) {
            // Set on featureselected/featureunselected, as this also fires a
            // touchend, but a click event on feature (un)selected is swallowed
            if(dbkjs.ignoreNextTouchend) {
                dbkjs.ignoreNextTouchend = false;
                return;
            }
            var closeTouch = false;
            e.xy = {x: e.lastTouches[0].clientX , y: e.lastTouches[0].clientY};
            if(touchmove !== null && touchmove.xy && e.xy) {
                closeTouch = Math.abs(touchmove.xy.x - e.xy.x) < dbkjs.options.minTouchMoveEndDistance &&
                        Math.abs(touchmove.xy.y - e.xy.y) < dbkjs.options.minTouchMoveEndDistance;
            }
            if(touchmove === null || closeTouch) {
                dbkjs.util.onClick(e);
            }
            touchmove = null;
        });

        dbkjs.map.events.register('touchmove', dbkjs.map, function(e) {
            if(touchmove === null) {
                touchmove = e;
            }
        });
    }
};

dbkjs.getOrganisation = function() {
    var params = {srid: dbkjs.options.projection.srid};
    $.ajax({
        dataType: "json",
        url: 'api/organisation.json',
        data: params,
        cache: false
    })
    .fail(function(jqXHR, textStatus, errorThrown) {

        if(jqXHR.status === 200 && jqXHR.responseText.indexOf('<form method="post" action="j_security_check">')) {
            console.log("Login required, showing login popup...");

            $("#loginsubmit").on("click", function() {
                var username = $("#j_username").val();
                var password = $("#j_password").val();
                console.log("Logging in with username " + username);

                $("#loginsubmit").attr("disabled", "disabled");
                $("#loginsubmit").text("Bezig met inloggen...");

                $.ajax("../j_security_check", {
                    method: "POST",
                    data: {
                        j_username: username,
                        j_password: password
                    },
                    dataType: "html"
                })
                .always(function() {
                    $("#loginsubmit").removeAttr("disabled");
                    $("#loginsubmit").text("Inloggen");
                })
                .fail(function(jqXHR) {
                    if(jqXHR.status === 403) {
                        $("#loginmesg").text("Uw account heeft geen rechten op de viewer. U bent uitgelogd.");
                        $.ajax("../logout.jsp");
                        $(".form-group").hide();
                        $("#loginsubmit").hide();
                        $("#loginrefresh").show();
                        dbkjs.getOrganisation();
                        return;
                    }

                    $("#loginmesg").text("Unknown login error (HTTP " + jqXHR.status + ") - check console");
                    console.log("Login Ajax failure", arguments);
                    if(jqXHR.status === 400 || jqXHR.status === 408) {
                        $("#loginmesg").text("");
                        console.log("Bad request 400 or timeout 408, trying again...");
                        // TODO: get organisation and immediately try POST login again on .fail()?
                        dbkjs.getOrganisation();
                    }
                })
                .done(function(data) {
                    try {
                        var data = JSON.parse(data);
                        if(data.organisation) {
                            console.log("Successful login, organisation", data.organisation);
                            $("#loginpanel").modal("hide");
                            dbkjs.options.organisation = data.organisation;
                            dbkjs.gotOrganisation();
                            return;
                        }
                    } catch(err) {
                        var i = data.indexOf("Fout");
                        if(i !== -1) {
                            var msg = data.substring(i);
                            i = msg.indexOf("</p>");
                            msg = msg.substring(0,i);
                            console.log("Got login error message: " + msg);
                            $("#loginmesg").text(msg);
                            return;
                        }
                    }
                    $("#loginmesg").text("Unknown login error - check console");
                    console.log("Login error", arguments);
                });
            });

            $("#loginpanel").modal({backdrop:'static',keyboard:false, show:true});
        } else if(jqXHR.status === 403) {
            $("#loginmesg").text("Uw account heeft geen rechten op de viewer. U bent uitgelogd.");
            $.ajax("../logout.jsp");
            dbkjs.getOrganisation();
        }
    })
    .done(function (data) {
        if (data.organisation) {
            dbkjs.options.organisation = data.organisation;

            dbkjs.gotOrganisation();
        }
    });
};

dbkjs.gotOrganisation = function () {
    if (dbkjs.options.organisation.title) {
        document.title = dbkjs.options.organisation.title;
    }
    dbkjs.hoverControl = new OpenLayers.Control.SelectFeature(
            [],
            {
                hover: true,
                highlightOnly: true,
                clickTolerance: 30,
                renderIntent: "temporary"
            }
    );
    dbkjs.hoverControl.handlers.feature.stopDown = false;
    dbkjs.hoverControl.handlers.feature.stopUp = false;
    dbkjs.map.addControl(dbkjs.hoverControl);
    dbkjs.selectControl = new OpenLayers.Control.SelectFeature(
            [],
            {
                clickout: true,
                clickTolerance: 30,
                toggle: true,
                multiple: false
            }
    );
    dbkjs.selectControl.handlers.feature.stopDown = false;
    dbkjs.selectControl.handlers.feature.stopUp = false;
    dbkjs.map.addControl(dbkjs.selectControl);

    //register modules
    $.each(dbkjs.modules, function (name, module) {
        var enabled = false;
        $.each(dbkjs.options.organisation.modules, function(i, m) {
            if(m.name === name) {
                enabled = true;
                module.options = m.options;
                return false;
            }
        });
        enabled = enabled || dbkjs.options.additionalModules && $.inArray(name, dbkjs.options.additionalModules) > -1;

        if(enabled && module.register) {
            try {
                module.register();
            } catch(e) {
                console.log("Error initializing module " + name + ": " + e + ", options: ", module.options);
                if(e.stack) {
                    console.log(e.stack);
                }
            }
        }
    });

    dbkjs.sortModuleButtons();
    dbkjs.layers.loadFromWMSGetCapabilities();
    dbkjs.finishMap();
    dbkjs.initialized = true;

    if(dbkjs.options.organisation.integrated) {
        $("#settingspanel_b").append('<button class="btn btn-default btn-success btn-block" onclick="window.location.href=\'../logout.jsp\'"><span class="glyphicon glyphicon-log-out"></span> Uitloggen</button>');
    }


    $(dbkjs).trigger('dbkjs_init_complete');
};

dbkjs.layoutButtonGroup = function() {
    $(window).on("resize", dbkjs.resizeButtonGroup);
    window.setInterval(dbkjs.resizeButtonGroup, 300);
    dbkjs.resizeButtonGroup();
};

dbkjs.resizeButtonGroup = function(e) {
    var clazz = "";

    var width = $("#map").width();

    if(width < dbkjs.options.maxMapWidthMediumButtons) {
        clazz = "medium";
    }
    if(width < dbkjs.options.maxMapWidthSmallButtons) {
        clazz = "small";
    }

    var el = $(".main-button-group");

    if(!el.hasClass(clazz)) {
        //console.log("map width " + width + ", button group size: " + clazz);
        el.removeClass("medium");
        el.removeClass("small");
        el.addClass(clazz);
    }

    var totalButtonGroupWidth = 0;
    var buttonGroups = el.find(".btn-group");
    buttonGroups.each(function() {
        totalButtonGroupWidth += $(this).outerWidth(true);
    });
    if (el[0].style.paddingLeft) totalButtonGroupWidth += +(el[0].style.paddingLeft.replace("px", ""));
    if (el[0].style.paddingRight) totalButtonGroupWidth += +(el[0].style.paddingRight.replace("px", ""));
    if (totalButtonGroupWidth > width) {
        el.find("#btngrp_object").css("clear", "right");
    } else {
        el.find("#btngrp_object").css("clear", "none");
    }
};

dbkjs.sortModuleButtons = function(){
    $.each($("#btngrp_3")[0].children, function(i,m){
        if($(m).data("sid") === undefined){
            m.setAttribute("data-sid",99);
        }       
    });
    $('#btngrp_3 a').detach().sort(function(a,b){
        var astts = $(a).data('sid');
        var bstts = $(b).data('sid');
        //return astts - bstts;
        return (astts > bstts) ? (astts > bstts) ? 1 : 0 : -1;
    }).appendTo("#btngrp_3");
};
dbkjs.zoomToFixedMapResolutionForBounds = function(bounds) {
    dbkjs.map.zoomToExtent(bounds);

    if(dbkjs.map.options.resolutions) {
        var res = dbkjs.map.getResolution();
        var zoomIndex = 1;
        for(; zoomIndex < dbkjs.map.options.resolutions.length; zoomIndex++) {
            if(dbkjs.map.options.resolutions[zoomIndex] < res) {
                break;
            }
        }
        zoomIndex--;
        console.log("orig res: " + res + ", higher map resolution at index " + zoomIndex + ", res " + dbkjs.map.options.resolutions[zoomIndex]);
        dbkjs.map.setCenter(dbkjs.map.getCenter(), zoomIndex);
    }
};

dbkjs.finishMap = function () {
    //find the div that contains the baseLayer.name
    var listItems = $("#baselayerpanel_ul li");
    listItems.each(function (idx, li) {
        var test = $(li).children(':first').text();
        if (test === dbkjs.map.baseLayer.name) {
            $(li).addClass('active');
        }
    });
    if (dbkjs.layout) {
        dbkjs.layout.activate();
    }
    dbkjs.activateClick();

    dbkjs.selectControl.activate();
    var hrefzoom = dbkjs.util.getQueryVariable('zoom');
    var hreflat = dbkjs.util.getQueryVariable('lat');
    var hreflon = dbkjs.util.getQueryVariable('lon');
    if (hrefzoom && hreflat && hreflon) {
        dbkjs.argparser = new dbkjs.argParser();
        dbkjs.map.addControl(dbkjs.argparser);
    } else {
        if(dbkjs.options.initialZoomed) {
            return;
        }
        dbkjs.options.initialZoomed = true;

        if(dbkjs.options.organisation.extent) {
            var wkt = new OpenLayers.Format.WKT();
            var extent = wkt.read(dbkjs.options.organisation.extent);
            dbkjs.zoomToFixedMapResolutionForBounds(extent.geometry.getBounds().scale(1.3));
        } else if (dbkjs.options.organisation.area) {
            if (dbkjs.options.organisation.area.geometry.type === "Point") {
                dbkjs.map.setCenter(
                        new OpenLayers.LonLat(
                                dbkjs.options.organisation.area.geometry.coordinates[0],
                                dbkjs.options.organisation.area.geometry.coordinates[1]
                                ).transform(
                        new OpenLayers.Projection(dbkjs.options.projection.code),
                        dbkjs.map.getProjectionObject()
                        ),
                        dbkjs.options.organisation.area.zoom
                        );
            } else if (dbkjs.options.organisation.area.geometry.type === "Polygon") {
                var geom = new OpenLayers.Format.GeoJSON().read(dbkjs.options.organisation.area.geometry, "Geometry");
                dbkjs.zoomToFixedMapResolutionForBounds(geom.getBounds());
            }
        } else {
            dbkjs.map.zoomToMaxExtent();
        }
    }
    dbkjs.permalink = new safetymaps.utils.Permalink('permalink');
    dbkjs.map.addControl(dbkjs.permalink);
};

$(document).ready(function () {
    if($(window).width() < dbkjs.options.minSplitScreenWidth) {
        dbkjs.options.splitScreenChecked = false;
    }
    dbkjs.layoutButtonGroup();

    // Make sure i18n is initialized
    i18n.init({
        lng: dbkjsLang, fallbackLng: 'en', debug: false, postProcess: "doReplacements"
    }, function (err,t) {
        i18n.addPostProcessor("doReplacements", function (val, key, options) {
            if (dbkjs.options.i18nReplacements) {
                var lngReplacements = dbkjs.options.i18nReplacements[i18n.lng()];
                if (lngReplacements && lngReplacements[key]) {
                    return lngReplacements[key];
                }
            }
            return val;
        });
        $('#c_settings').attr("title",i18n.t("settings.title"));
        $('#settings_title').text(i18n.t("settings.title"));

        safetymaps.layerWindow.initialize();

        $('body').append(dbkjs.util.createDialog('vectorclickpanel', '<i class="icon-info-sign"></i> ' + i18n.t("dialogs.clickinfo"), 'left:0;bottom:0;margin-bottom:0px;position:fixed'));
        $("#vectorclickpanel").on('click', function() {
            dbkjs.selectControl.unselectAll();
            $('#vectorclickpanel').hide();
        });
        dbkjs.init();

        // dbkjs.options.enableSplitScreen: enable split screen setting
        // dbkjs.options.splitScreenChecked: split screen is enabled
        if(dbkjs.options.enableSplitScreen) {
            $(".main-button-group").css({paddingRight: "10px", width: "auto", float: "right", right: "0%"});

            $(dbkjs).one("dbkjs_init_complete", function() {
                // Add config option to enable / disable split screen
                $("#row_layout_settings").append('<div class="col-xs-12"><label><input type="checkbox" id="checkbox_splitScreen" ' + (dbkjs.options.splitScreenChecked ? 'checked' : '') + '>'+i18n.t("settings.showInformation")+'</label></div>');

                $("#checkbox_splitScreen").on('change', function (e) {
                    dbkjs.options.splitScreenChecked = e.target.checked;
                    $(dbkjs).triggerHandler('setting_changed_splitscreen', dbkjs.options.splitScreenChecked);
                });
            });
        }
        safetymaps.infoWindow.initialize(dbkjs.options.separateWindowMode);

        // Added touchstart event to trigger click on. There was some weird behaviour combined with FastClick,
        // this seems to fix the issue
        $('#zoom_extent').on('click touchstart', function () {
          var areaGeometry = new OpenLayers.Format.GeoJSON().read(dbkjs.options.organisation.area.geometry, "Geometry");
            if (dbkjs.options.organisation.modules.regio) {
                dbkjs.modules.regio.zoomExtent();
            } else {
                if (dbkjs.options.organisation.area.geometry.type === "Point") {
                    dbkjs.map.setCenter(
                            new OpenLayers.LonLat(
                                    dbkjs.options.organisation.area.geometry.coordinates[0],
                                    dbkjs.options.organisation.area.geometry.coordinates[1]
                                    ).transform(
                            new OpenLayers.Projection(dbkjs.options.projection.code),
                            dbkjs.map.getProjectionObject()
                            ),
                            dbkjs.options.organisation.area.zoom
                            );
                } else if (dbkjs.options.organisation.area.geometry.type === "Polygon") {
                    dbkjs.zoomToFixedMapResolutionForBounds(areaGeometry.getBounds());
                }
            }
        });
        FastClick.attach(document.body);
    });
});

