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
    .done(function (data) {
        if (data.organisation) {
            dbkjs.options.organisation = data.organisation;
            if (dbkjs.options.organisation.title) {
                document.title = dbkjs.options.organisation.title;
            }
            dbkjs.gotOrganisation();
        }
    });
};

dbkjs.gotOrganisation = function () {
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
    $(dbkjs).trigger('dbkjs_init_complete');
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
        $('#tb02').attr("title",i18n.t("layer.layers"));
        // We are removing / moving some existing DIVS from HTML to convert prev. popups to fullscreen modal popups
        $('#baselayerpanel').remove();
        $('#overlaypanel').attr('id', 'tmp_overlaypanel');
        var baseLayerPopup = dbkjs.util.createModalPopup({name: 'baselayerpanel'});
        baseLayerPopup.getView().append($('<div></div>').attr({'id': 'baselayerpanel_b'}));
        var overlaypanelPopup = dbkjs.util.createModalPopup({name: 'overlaypanel'});
        overlaypanelPopup.getView().append($('#tmp_overlaypanel .tabbable'));
        $('#tmp_overlaypanel').remove();

        $(dbkjs).one("dbkjs_init_complete", function() {
            $('#layer_basic').text(i18n.t("layer.basic"));
            $("#baselayerpanel_b").prepend("<div style='padding-bottom: 5px'><h4>"+i18n.t("layer.background")+":</h4></div>");
            $("#baselayerpanel_b").append("<div style='padding-top: 10px; padding-bottom: 5px'><h4>"+i18n.t("layer.layers")+":</h4></div>");

            $("#overlaypanel_div").parent().appendTo("#baselayerpanel_b");
            $("#tb01").remove();
        });

        $('#tb01, #tb02').on('click', function (e) {
            e.preventDefault();
            var panelId = $(this).attr('href').replace('#', '');
            if (panelId === 'baselayerpanel') {
                $.each(dbkjs.options.baselayers, function (bl_index, bl) {
                    if (bl.getVisibility()) {
                        $('#bl' + bl_index).addClass('active');
                    }
                });
            }
            dbkjs.util.getModalPopup(panelId).show();
        });

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

                // Hide all modal popups when settings is opened
                $("#c_settings").on('click', function(e) {
                    $(dbkjs).triggerHandler('modal_popup_show', {popupName: 'settings'});
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

