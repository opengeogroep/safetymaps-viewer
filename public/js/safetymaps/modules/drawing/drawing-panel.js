/*
 * Copyright (c) 2019 B3Partners (info@b3partners.nl)
 *
 * This file is part of safetymaps-viewer.
 *
 * safetymaps-viewer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * safetymaps-viewer is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 *  along with safetymaps-viewer. If not, see <http://www.gnu.org/licenses/>.
 */

/* global dbkjs, i18n, SplitScreenWindow */

function DrawingPanelWindow(options) {
    SplitScreenWindow.call(this, "drawingPanel");
    var me = this;

    me.widthPercent = 20;

    me.createElements(i18n.t("drawing.title"));

    var view = me.getView();

    me.hideSplitScreenSwitch();

    var buttons = $("<div id='drawing_buttons'/>");
    buttons.appendTo(view);

    if(options.showMeasureButtons) {
        $(dbkjs).one("dbkjs_init_complete", function() {
            $("#btn_measure_area").prependTo(buttons);
            $("#btn_measure_distance").prependTo(buttons);
        });

        $(me).on("hide", function() {
            dbkjs.modules.measure.toggleMeasureArea(false);
            dbkjs.modules.measure.toggleMeasureDistance(false);
        });
    }

    $('<a id="btn_drawing_select" class="btn btn-default navbar-btn" href="#" title="' + i18n.t("drawing.select") + '"><i class="fa fa-hand-pointer-o"></i></a>').appendTo(buttons);
    $("#btn_drawing_select").on("click", function() {
        $(me).triggerHandler("select");
    });

    var colors = $("<div id='drawing_colors'/>");

    $.each(options.colors, function(i, colorCode) {
        $("<div class='drawing_color' style='background-color: " + colorCode + "'/>").appendTo(colors);
    });
    colors.appendTo(view);

    colors.on("click", function(e) {
        var color = $(e.target).css("background-color");
        if(color !== "") {
            $("#drawing_colors .drawing_color").removeClass("active");
            $(e.target).addClass("active");
            $(me).triggerHandler("color", [ color ]);
        }
    });
};

DrawingPanelWindow.prototype = Object.create(SplitScreenWindow.prototype);
DrawingPanelWindow.prototype.constructor = DrawingPanelWindow;

DrawingPanelWindow.prototype.unselectColor = function() {
    $("#drawing_colors .drawing_color").removeClass("active");
};
