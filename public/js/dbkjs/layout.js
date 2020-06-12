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
dbkjs.layout = {
    id: 'dbk.layout',
    activate: function () {
        var _obj = dbkjs.layout;
        _obj.settingsDialog('#settingspanel_b');
    },
    settingsDialog: function (parent) {
        $(parent).append("<h4 id='h_settings_layout'>" + i18n.t("settings.layout") + "</h4>");

        $(parent).append('<p><div id="row_layout_settings" class="row"><div class="col-xs-12">' +
                '<label><input type="checkbox" id="checkbox_scaleStyle">' + i18n.t("settings.scaleStyle") +
                '</label></div></div></p>');

        $("#checkbox_scaleStyle").prop("checked", dbkjs.options.styleScaleAdjust);
        $("#checkbox_scaleStyle").on('change', function(e) {
            dbkjs.options.styleScaleAdjust = e.target.checked;
        });
        
        $(parent).append("<hr id='h_settings_version'><h4>" + i18n.t("settings.version") + "</h4><br>");
        $(parent).append('<p id="settings_version"><strong>' + dbkjs.options.APPLICATION + '</strong> ' + dbkjs.options.VERSION + '</p>');
        if(dbkjs.options.CONFIG !== "_CONFIG_") {
            $(parent).append('<p>' + i18n.t("settings.version_deploy") + ': ' + dbkjs.options.CONFIG + '</p>');
        }
    }
};

