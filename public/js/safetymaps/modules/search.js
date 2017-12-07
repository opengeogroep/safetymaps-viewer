/*
 *  Copyright (c) 2017 B3Partners (info@b3partners.nl)
 *
 *  This file is part of safetymaps-viewer
 *
 *  safetymapDBK is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  safetymapDBK is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with safetymapDBK. If not, see <http://www.gnu.org/licenses/>.
 *
 */

 /* global safetymaps, dbkjs, OpenLayers, i18n, Mustache */

 dbkjs.modules.search = {
    id: "dbk.module.search",
    button: null,
    popup: null,
    searchTabs: null,
    searchInput: null,
    searchConfigs: null,
    activeConfig: null,
    keyupTimeout: null,
    results: null,

    register: function() {
        var me = this;

        this.options = $.extend({
            keyupTimeout: 100,
            minSearchLength: 3
        }, this.options);

        me.searchConfigs = [];

        me.createButton();
        me.createPopup();
    },

    createButton: function() {
        var me = this;
        me.button = $("<a></a>")
        .attr({
            id: "btn_opensearch",
            class: "btn btn-default navbar-btn",
            href: "#",
            title: i18n.t("search.search")
        })
        .append("<i class='fa fa-search'></i>")
        .click(function(e) {
            e.preventDefault();
            me.showPopup();
        });

        me.button.appendTo('#btngrp_3');
    },

    showPopup: function() {
        if(this.popup === null) {
            this.createPopup();
        }
        this.popup.show();
        this.searchInput.focus();
    },

    createPopup: function() {
        var me = this;

        this.popup = dbkjs.util.createModalPopup({
            title: i18n.t("search.search")
        });

        var div = $("<div></div>").addClass("input-group input-group-lg");

        this.searchTabs = $("<ul id='search_tabs' class='nav nav-pills' style='margin-bottom: 10px'></ul>");
        this.searchInput = $("<input id='search_input' autocomplete='off' class='form-control' placeholder='" + i18n.t("search.dbkplaceholder") + "'>");

        div.append(this.searchTabs);
        div.append(this.searchInput);

        this.searchInput.keyup(function(e) {
            if(me.activeConfig) {

                if(me.keyupTimeout) {
                    window.clearTimeout(me.keyupTimeout);
                }
                if(me.options.minSearchLength === 0 || e.target.value.length >= me.options.minSearchLength) {
                    me.keyupTimeout = window.setTimeout(function() {
                        me.activeConfig.search(e.target.value);
                    }, me.options.keyupTimeout);
                }
            }
        });

        this.popup.getView().append(div);

        this.popup.getView().append($("<div class='row'><div class='col-lg-12' id='search_results'></div></div>"));
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
            var index = Number($(e.target).attr("id").substring("search_tab_".length));
            me.activateSearch(index);
        });
    },

    activateSearch: function(index) {
        this.activeConfig = this.searchConfigs[index];

        this.searchInput.val("");

        this.searchInput.focus();
        if(this.activeConfig.showDefaultResults) {
            this.activeConfig.showDefaultResults();
        } else {
            this.showResults([]);
        }
    },

    addSearchConfig: function(config) {
        this.searchConfigs.push(config);

        if(this.searchConfigs.length === 1) {
            this.activateSearch(0);
        }

        this.createTabs();
    },

    showResults: function(results, displayFunction) {
        var me = this;

        $("#search_results ul").remove();
        me.results = results;

        var ul = $("<ul class='nav nav-pills nav-stacked'></ul>");
        $.each(results, function(i, r) {
            ul.append($("<li><a href='#' x-index='" + i + "'>" + Mustache.escape(displayFunction(r)) + "</a></li>"));
        });
        ul.click(function(e) {
            var resultIndex = Number($(e.target).attr("x-index"));
            me.popup.hide();
            me.activeConfig.resultSelected(me.results[resultIndex]);
        });
        $("#search_results").append(ul);
    }
 };