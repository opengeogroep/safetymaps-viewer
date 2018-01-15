/*!
 *  Copyright (c) 2014 Milo van der Linden (milo@dogodigi.net)
 *
 *  This file is part of opendispatcher/safetymapsDBK
 *
 *  opendispatcher is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  opendispatcher is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with opendispatcher. If not, see <http://www.gnu.org/licenses/>.
 *
 */

/* global dbkjsbuildinfo, parseFloat */

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.layout = {
    id: 'dbk.layout',
    activate: function () {
        var _obj = dbkjs.layout;
        _obj.settingsDialog('#settingspanel_b');
    },
    settingsDialog: function (parent) {
        $(parent).append("<h4>" + i18n.t("settings.layout") + "</h4>");
        $(parent).append('<label><input type="checkbox" id="checkbox_scaleStyle">' + i18n.t("settings.scaleStyle") +
                '</label>');
/*
        $(parent).append('<p><div class="row"><div class="col-xs-12">' +
                '<label><input type="checkbox" id="checkbox_scaleStyle">' + i18n.t("settings.scaleStyle") +
                '</label></div></div></p>' +
                '<p><hr/><div class="row"><div class="col-xs-12">' +
                '<p style="padding-bottom: 15px">' + i18n.t('settings.styleSizeAdjust') + '</p>' +
                '<input id="slider_styleSizeAdjust" style="width: 210px" data-slider-id="styleSizeAdjustSlider" type="text" ' +
                ' data-slider-min="' + (dbkjs.options.styleSizeMin ? dbkjs.options.styleSizeMin : '-4') + '" ' +
                ' data-slider-max="' + (dbkjs.options.styleSizeMax ? dbkjs.options.styleSizeMax : '10') + '" data-slider-step="1"/>' +
                '</div></div></p><hr>'
                );

        $("#slider_styleSizeAdjust").slider({
            value: dbkjs.options.styleSizeAdjust,
            tooltip: "always"
        });
        $("#slider_styleSizeAdjust").on('slide', function(e) {
            dbkjs.options.styleSizeAdjust = e.value;
            dbkjs.redrawScaledLayers();
        });

        $("#checkbox_scaleStyle").prop("checked", dbkjs.options.styleScaleAdjust);
        $("#checkbox_scaleStyle").on('change', function(e) {
            dbkjs.options.styleScaleAdjust = e.target.checked;
            dbkjs.redrawScaledLayers();
        });
*/      
        $("#checkbox_scaleStyle").prop("checked", dbkjs.options.styleScaleAdjust);
        $("#checkbox_scaleStyle").on('change', function(e) {
            dbkjs.options.styleScaleAdjust = e.target.checked;
        });
        
        
        $(parent).append("<hr><h4>" + i18n.t("settings.version") + "</h4><br>");
        $(parent).append('<p><strong>' + dbkjs.options.APPLICATION + '</strong> ' + dbkjs.options.VERSION + '</p>');
        if(dbkjs.options.CONFIG !== "_CONFIG_") {
            $(parent).append('<p>' + i18n.t("settings.version_deploy") + ': ' + dbkjs.options.CONFIG + '</p>');
        }
    }
};

