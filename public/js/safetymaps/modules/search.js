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

dbkjs.modules.search = {
    id: "dbk.module.search",
    button: null,
    popup: null,
    first: null,
    searchTabs: null,
    searchInput: null,
    searchConfigs: null,
    activeConfig: null,
    keyupTimeout: null,
    results: null,
    layer: null,

    register: function() {
        var me = this;

        this.options = $.extend({
            keyupTimeout: 100,
            minSearchLength: 3,
            defaultTab: null,
            focusOnShow: false, // Whether to focus on input field on popup show, may scroll input field out of view on iOS
            icon: "<i class='fa fa-search'></i>"
        }, this.options);

        me.searchConfigs = [];
        me.first = true;

        me.createButton();
        me.createPopup();
        this.layer = new OpenLayers.Layer.Vector('_search');
        dbkjs.map.addLayer(this.layer);
    },

    createButton: function() {
        var me = this;
        me.button = $("<a></a>")
        .attr({
            id: "btn_opensearch",
            class: "btn btn-default navbar-btn",
            href: "#",
            title: i18n.t("search.button"),
            "data-sid":me.options.index
        })
        .append(me.options.icon)
        .click(function(e) {
            e.preventDefault();
            me.showPopup();
        });

        me.button.appendTo('#btngrp_3');
    },

    activateDefaultConfig: function() {
        var me = this;
        if(me.options.defaultTab) {
            var defIndex = -1;
            $.each(me.searchConfigs, function(i, c) {
                if(c.name === me.options.defaultTab) {
                    defIndex = i;
                    return false;
                }
            });
            if(defIndex !== -1) {
                me.activateSearch(defIndex);
            }
        }
    },

    showPopup: function() {
        if(this.first) {
            this.first = false;
            this.activateDefaultConfig();
        }
        this.popup.show();
        this.activeConfig.search(this.searchInput.val());
        if(this.options.focusOnShow) {
            this.searchInput.focus();
        }
    },

    createPopup: function() {
        var me = this;

        this.popup = dbkjs.util.createModalPopup({
            title: i18n.t("search.title")
        });
        this.popup.getView().addClass("modal-popup-view-sticky");

        var div = $("<div></div>").addClass("input-group input-group-lg").css({"width":"100%","flex-shrink":"0"});

        this.searchTabs = $("<ul id='search_tabs' class='nav nav-pills' style='margin-bottom: 10px'></ul>");
        this.searchInput = $("<input id='search_input' autocomplete='off' class='form-control' placeholder=''>");

        div.append(this.searchTabs);
        div.append(this.searchInput);

        this.searchInput.keyup(function(e) {
            if(me.activeConfig) {

                if(me.keyupTimeout) {
                    window.clearTimeout(me.keyupTimeout);
                }
                if(me.options.minSearchLength === 0 || e.target.value.length >= me.options.minSearchLength || e.target.value.trim().length === 0) {
                    me.keyupTimeout = window.setTimeout(function() {
                        me.activeConfig.search(e.target.value);
                    }, me.options.keyupTimeout);
                }
            }
        });

        this.popup.getView().append(div);

        this.popup.getView().append($("<div class='row modal-popup-row-sticky'><div class='col-lg-12' id='search_results'></div></div>"));

        $("#search_results").on("click", "[x-index]", function(e) {
            var resultIndex = Number($(e.target).attr("x-index"));
            me.popup.hide();
            me.activeConfig.resultSelected(me.results[resultIndex]);
        });

        this.popup.getView().scroll(function(e) {
            $("#search_input").blur();
        });
    },

    createTabs: function() {
        var me = this;

        $("#search_tabs li").remove();

        $.each(me.searchConfigs, function(i, config) {
            var li = $("<li></li>");
            if(me.activeConfig === config) {
                li.addClass("active");
            }
            li.attr("x-search-index", i);
            var a = $("<a data-toggle='tab' href='#' id='search_tab_" + i + "'>");
            a.append(config.tabContents);
            li.append(a);
            me.searchTabs.append(li);
        });

        $("#search_tabs li a").click(function(e) {
            var index = Number($(e.currentTarget).attr("id").substring("search_tab_".length));
            me.activateSearch(index);
        });
    },

    activateSearch: function(index) {
        this.activeConfig = this.searchConfigs[index];

        $("#search_tabs li").removeClass("active");
        $("#search_tabs li[x-search-index=" + index + "]").addClass("active");

        this.searchInput.val("");
        $(this.searchInput).attr("placeholder", this.activeConfig.placeholder);

        this.searchInput.focus();
        this.activeConfig.search("");
    },

    addSearchConfig: function(config, first) {
        if(first) {
            this.searchConfigs.unshift(config);
        } else {
            this.searchConfigs.push(config);
        }

        if(this.searchConfigs.length === 1 || first) {
            this.activateSearch(0);
        }

        this.createTabs();
    },

    showResults: function(results, displayFunction, dontHtmlEscape) {
        var me = this;

        $("#search_results ul").remove();
        me.results = results;

        var ul = $("<ul class='nav nav-pills nav-stacked'></ul>");
        $.each(results, function(i, r) {
            var t = displayFunction(r);
            if(!dontHtmlEscape) {
                t = Mustache.escape(t);
            }
            ul.append($("<li><a href='#' x-index='" + i + "'>" + t + "</a></li>"));
        });
        $("#search_results").append(ul);
    },
    
    zoomAndPulse: function(lonlat,secondsToDisplay){
        var me = this;
        me.layer.removeAllFeatures();
        var point = new OpenLayers.Geometry.Point(lonlat.lon, lonlat.lat);
        me.layer.addFeatures([
            new OpenLayers.Feature.Vector(
                point,
                {},
                {
                    graphicName: 'circle',
                    fillColor: '#BE81F7',
                    strokeColor: '#BE81F7',
                    strokeWidth: 3,
                    fillOpacity: 0.9,
                    pointRadius: 10
                }
            )
        ]);
        setTimeout(function(){
            me.layer.removeAllFeatures();
        }, secondsToDisplay);
    }
    // TODO add show error
 };