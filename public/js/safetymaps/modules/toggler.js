/* 
 * Copyright (c) 2018 B3Partners (info@b3partners.nl)
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


 /* global safetymaps, dbkjs, OpenLayers, i18n, Mustache */

 dbkjs.modules.toggler = {
    id: "dbk.module.toggler",
    defaultButtonParent: "#btngrp_object",

    register: function() {
        var me = this;

        this.options = $.extend({
            buttons: [],
            wmsLayers: [],
            typeParams: {}
        }, this.options);

        me.createButtons();

        $(dbkjs).one("dbkjs_init_complete", function() {
            me.hideLegends();

            me.checkTypeParams();

            me.listenToIncidents();

            me.resetToDefault();
        });
    },

    createButtons: function() {
        var me = this;
        $.each(me.options.buttons, function(i, button) {
            var i;
            if(button.img) {
                i = $("<img/>")
                .attr({
                    src: button.img,
                    style: (button.style || "")
                });
            } else {
                i = $("<i/>")
                .attr({
                    class: "fa " + button.icon
                });
            }

            var toggle = $('<a/>');
            button.a = toggle;
            toggle.attr({
                id: 'btn_' + button.id,
                class: 'btn btn-default navbar-btn',
                href: '#',
                title: button.label
            })
            .append(i)
            .click(function(e) {
                me.buttonClick(button);
            })
            .appendTo(button.parent || me.defaultButtonParent);
            if(button.css) {
                toggle.css(button.css);
            }
        });
    },

    checkTypeParams: function() {
        var me = this;
        var type = null;
        var typeParam = OpenLayers.Util.getParameters().type;
        $.each(me.options.typeParams, function(param, config) {
            if(param === typeParam || (typeof typeParam === "undefined" && config.default)) {
                type = param;

                if(config.showMeasureButtons && dbkjs.modules.measure) {
                    dbkjs.modules.measure.createButtons();
                    dbkjs.sortModuleButtons();
                }

                if(config.buttonsActive && dbkjs.modules.toggler) {
                    // Change defaults
                    $.each(dbkjs.modules.toggler.options.buttons, function(i, button) {
                        button.active = config.buttonsActive.indexOf(button.id) !== -1;
                    });
                    dbkjs.modules.toggler.resetToDefault();
                }

                $.each(config.hideWmsLayers || [], function(i, wmsLayer) {
                    dbkjs.hideOverlayLayer(wmsLayer);
                });
            }
        });
        if(type) {
            $("body").append("<span class='topleft_status'>" + type + "</span>");
        }
    },

    findButtonLayers: function(button) {
        var organisationLayers = [];
        var olLayers = [];
        $.each(button.wmsLayers || [], function(i, layer) {
            $.each(dbkjs.options.organisation.wms, function(j, wms) {
                if(wms.name === layer || wms.abstract === layer) {
                    organisationLayers.push(wms);
                    olLayers = olLayers.concat(dbkjs.map.getLayersByName(wms.name));
                }
            });
        });
        return {
            organisation: organisationLayers,
            ol: olLayers
        };
    },

    hideLegends: function() {
        var me = this;
        $.each(me.options.buttons, function(i, button) {
            var layers = me.findButtonLayers(button);
            $.each(layers.organisation, function(j, l) {
                //console.log("toggler: hiding legend for " + l.name + " gid " + l.gid);
                $("div[data-layer-gid=" + l.gid + "]").parent().hide();
            });
        });
    },

    listenToIncidents: function() {
        var me = this;

        if(dbkjs.modules.incidents && dbkjs.modules.incidents.controller) {
            $(dbkjs.modules.incidents.controller).on("new_incident", function() {
                me.resetToDefault();
            });
        }
    },

    resetToDefault: function() {
        var me = this;
        console.log("toggler: reset to default");

        $.each(this.options.buttons, function(i, button) {
            if(button.active) {
                me.activateButton(button);
            } else {
                me.deactivateButton(button);
            }
        });
    },

    buttonClick: function(button) {
        if(button.a.hasClass("on")) {
            this.deactivateButton(button);
        } else {
            this.activateButton(button);
        }
    },

    activateButton: function(button) {
        console.log("toggler: activate ", button.label);
        button.a.addClass("on");
        this.setButtonWmsVisibility(button);

        if(button.showTab) {
            safetymaps.infoWindow.showTab(button.showTab, true);
        }

        $(this).triggerHandler("button_change", [button.id, true, button]);
    },
    
    deactivateButton: function(button) {
        console.log("toggler: deactivate ", button.label);
        button.a.removeClass("on");
        this.setButtonWmsVisibility(button);
        $(this).triggerHandler("button_change", [button.id, false, button]);
    },

    setButtonWmsVisibility: function(button) {
        var me = this;
        $.each(me.findButtonLayers(button).ol, function(j, l) {
            console.log("Set layer visibility", l.name);
            l.setVisibility(me.getButtonState(button.id));
        });
    },

    getButtonState: function(id) {
        var active = false;
        $.each(this.options.buttons, function(i, button) {
            if(button.id === id) {
                active = button.a.hasClass("on");
            }
        });
        return active;
    }
};
