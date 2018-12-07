/*
 *  Copyright (c) 2015-2018 B3Partners (info@b3partners.nl)
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
dbkjs.modules = dbkjs.modules || {};
dbkjs.modules.connectionmonitor = {
    id: "dbk.module.connectionmonitor",
    connected: null,
    okTimer: null,
    connectionCheckTimer: null,
    register: function() {

        this.options = $.extend({
            interval: 5
        }, this.options);
        this.options.interval = this.options.interval * 1000;

        this.connected = true;

        $(".main-button-group").append($("<div class=\"btn-group pull-left connection-btn-group\">" +
            "<a id=\"connection\" href=\"#\" title=\"" + i18n.t("connectionmonitor.button") + "\" class=\"btn navbar-btn btn-default\">" +
            "<i id=\"connectionicon\" class=\"fa fa-signal\" style=\"color: green\"></i></a>"));

        var me = this;
        $("#connection").click(function() {
            if(!me.connected) {
                dbkjs.util.alert("Fout", "Geen verbinding", "alert-danger");
            } else {
                window.location.reload();
            }
        });

        me.connectionCheckTimer = setTimeout(function() {
            me.checkConnectivity();
        }, me.options.interval);
    },
    onConnectionError: function() {
        this.connected = false;

        $("#connectionicon").attr("class", "fa fa-exclamation");
        $("#connectionicon").attr("style", "color: red");

        if(this.okTimer !== null) {
            clearTimeout(this.okTimer);
            this.okTimer = null;
        }
    },
    onConnectionOK: function() {
        if(this.connected) {
            return;
        }

        this.connected = true;

        var me = this;
        if(me.okTimer === null) {
            $("#connectionicon").attr("class", "fa fa-signal");
            $("#connectionicon").attr("style", "color: gray");
            me.okTimer = setTimeout(function() {
                $("#connectionicon").attr("style", "color: green");
                $("#connectionicon").attr("class", "fa fa-signal");
                clearTimeout(me.okTimer);
                me.okTimer = null;
            }, 8000);
        }
    },
    // Call when other module (gms or geolocate) does regular Ajax requests and
    // calls onConnectionError() or onConnectionOK() so this module does not
    // have to do it
    cancelConnectivityCheck: function() {
        if(this.connectionCheckTimer !== null) {
            clearTimeout(this.connectionCheckTimer);
            this.connectionCheckTimer = null;
        }
    },
    checkConnectivity: function() {
        var me = this;
        $.ajax("api/organisation.json", {
            dataType: "json",
            cache: false,
            ifModified: true,
            timeout: 5000,
            complete: function(jqXHR, textStatus) {
                if(textStatus === "success" || textStatus === "notmodified") {
                    me.onConnectionOK();
                } else {
                    me.onConnectionError();
                }

                me.connectionCheckTimer = setTimeout(function() {
                    me.checkConnectivity();
                }, me.options.interval);
            }
        });
    }
};
