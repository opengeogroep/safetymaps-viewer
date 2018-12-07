/*
 *  Copyright (c) 2016-2018 B3Partners (info@b3partners.nl)
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
dbkjs.modules.autoreload = {
    id: "dbk.module.autoreload",
    options: null,
    timeout: null,
    refreshPageInterval: null,
    lastEventTime: null,
    lastIncidentUpdate: null,
    register: function() {
        this.options = $.extend({
            checkInterval: 300,
            refreshPageAt: false,
            refreshPageIdleTime: 300 * 1000,
            showIdleDimmer: true
        }, this.options);

        this.setTimer();

        if(this.options.refreshPageAt) {
            this.initPageRefresh();
        }
    },
    setTimer: function() {
        var me = this;
        me.timeout = window.setTimeout(function() {
            me.checkReload();
        }, me.options.checkInterval * 1000);
    },
    initPageRefresh: function() {
        var me = this;

        me.refreshPageMoment = new moment(me.options.refreshPageAt, "HH:mm");
        if(new moment().isAfter(me.refreshPageMoment)) {
            me.refreshPageMoment = me.refreshPageMoment.add(1, "day");
        }
        console.log("Checking refresh page at " + me.refreshPageMoment.format("LLLL") + ", idle time " + me.options.refreshPageIdleTime / 1000 + "s");

        var resetIdleTime = function() {
            me.lastEventTime = new Date().getTime();

            $("#dimmer").toggle(false);
            $("#dimmerText").toggle(false);

            return true;
        };
        resetIdleTime();

        $(window).on("mousemove mousedown click scroll touchstart keypress", resetIdleTime);
        dbkjs.map.events.register("moveend", me, resetIdleTime);
        dbkjs.map.events.register("zoomend", me, resetIdleTime);
        dbkjs.map.events.register("mouseup", me, resetIdleTime);
        dbkjs.map.events.register("mousedown", me, resetIdleTime);

        $(dbkjs).on("incidents.updated", function() {
            console.log("Incident updated");
            me.lastIncidentUpdate = new Date().getTime();

            $("#dimmer").toggle(false);
            $("#dimmerText").toggle(false);
        });

        $("body").append("<div id='dimmer' style='display: none; position: fixed; width: 100%; height: 100%; background-color: #000; opacity: 0.5; z-index: 99999; top: 0; left: 0;'/>");
        $("body").append("<div id='dimmerText' style='display: none; font-size: 34pt; position: fixed; width: 100%; height: 100%; z-index: 999999; top: 0; left: 0; text-align: center; vertical-align: middle; color: white;'>Inactief</div>");

        this.refreshPageInterval = window.setInterval(function() {
            var idleTime = new Date().getTime() - me.lastEventTime;
            var isIdle = idleTime > me.options.refreshPageIdleTime;
            console.log("Check refresh time reached, idle time " + (idleTime/1000).toFixed() + ", idle: " + isIdle);
            if(isIdle && me.lastIncidentUpdate && new Date().getTime() - me.lastIncidentUpdate < 30 * 60 * 1000) {
                console.log("Idle but last incident update less than 30 minutes ago");
                isIdle = false;
            }
            if(new moment().isAfter(me.refreshPageMoment)) {
                console.log("Refresh time reached, idle time: " + (idleTime/1000).toFixed());
                if(isIdle) {
                  window.location.reload(true); // forceReload=true
                } else {
                    console.log("Idle time to short");
                }
            }

            if(me.options.showIdleDimmer) {
                $("#dimmer").toggle(isIdle);
                $("#dimmerText").toggle(isIdle);
                $("#dimmerText").text("Inactief sinds " + new moment(me.lastEventTime).fromNow());
            }

        }, 60000);

    },
    checkReload: function() {
        var me = this;
        $.ajax({
            dataType: "json",
            url: 'api/organisation.json',
            data: {srid: dbkjs.options.projection.srid},
            cache: false
        })
        .always(function(data, textStatus, jqXHR) {
            if(textStatus === "success") {
              var newSequence = null;
              $.each(data.organisation.modules, function(i, m) {
                  if(m.name === "autoreload") {
                      newSequence = m.options.sequence;
                      return false;
                  };
              });
              if(newSequence === null) {
                  console.log("autoreload: no new sequence in organisation autoreload module options", data);
              } else if(newSequence !== me.options.sequence) {
                  console.log("autoreload: new sequence different, reloading!", newSequence);
                  window.location.reload(true); // forceReload=true
              } else {
                  console.log("autoreload: same sequence, no reload");
              }
            } else {
                console.log("error getting organisation.json autoreload info: " + textStatus, jqXHR);
            }
            me.setTimer();
        });
    }
};

