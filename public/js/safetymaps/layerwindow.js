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

/* global dbkjs, safetymaps, OpenLayers, Proj4js, jsts, moment, i18n, Mustache, PDFObject, SplitScreenWindow */

/**
 * Layer switching window
 */

var safetymaps = safetymaps || {};

safetymaps.layerWindow = {
    window: null,

    initialize: function() {
        var me = this;


        //console.log("layerWindow: initialize");

        this.window = new SplitScreenWindow("layerWindow");

        var reshowWindowName, reshowWindow;
        this.window.show = function() {
            reshowWindowName = null;

            if(dbkjs.options.reopenWindowAfterLayerWindowClose) {
                $(dbkjs).one('modal_popup_hide', function(e, params) {
                    console.log("Opening layer window, this open popup will be reopened when layer window closed: " + params.popupName);
                    reshowWindowName = params.popupName;
                    reshowWindow = params.window;
                });
            }

            SplitScreenWindow.prototype.show.call(this);
        };
        this.window.hide = function() {
            var visible = this.isVisible();
            SplitScreenWindow.prototype.hide.call(this);
            if(visible && reshowWindowName && reshowWindowName !== "layerWindow") {
                console.log("Layer window closed, reshowing window: " + reshowWindowName);
                reshowWindow.show();
            }
        };

        this.window.createElements();

        this.window.getView().append($("<div id='baselayerpanel_b'></div>"));
        $("#baselayerpanel_b").append("<div style='padding-bottom: 5px'><h4>" + i18n.t("layer.background") + ":</h4></div>");

        this.window.getView().append("<div style='padding-top: 10px; padding-bottom: 5px'><h4>"+i18n.t("layer.layers")+":</h4></div>");

        this.window.getView().append(
            '<ul id="overlaypanel_ul" class="nav nav-tabs">' +
            '  <li class="active"><a id="layer_basic" data-toggle="tab" href="#overlay_tabdef">'+i18n.t("layer.basic")+'</a></li>' +
            '</ul>' +
            '<div id="overlaypanel_div" class="tab-content">' +
            '  <div id="overlay_tabdef" class="tab-pane active">' +
            '    <div id="overlaypanel_b2" class="panel-group"></div>' +
            '  </div>' +
            '</div>');

        if (dbkjs.options.extraButtonGroupDropdown) {
            buttonParent = '#btngrp_4';
        } else {
            buttonParent = '#btngrp_3';
        }
        $(buttonParent).append('<a id="btn_layers" data-sid="3" class="btn btn-default navbar-btn" href="#" title="' + i18n.t('layer.layers') + '"><img style="position: relative; width: 32px; top: -3px" src="images/layer-group-solid.svg"></a>');

        $("#btn_layers").on("click", function() {
            me.window.toggle();
        });

        // TODO: move dbkjs code here
    }
};
