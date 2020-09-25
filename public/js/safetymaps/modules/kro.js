/* 
 * Copyright (c) 2020 B3Partners (info@b3partners.nl) & Safety C&T (info@safetyct.com)
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

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};

dbkjs.modules.kro = {
    id: "dbk.module.kro",
    options: null,
    activated: false,
    rowConfig: null,
    infoWindow: null,
    
    register: function() {
        var me = dbkjs.modules.kro;

        me.options = $.extend({
            debug: false,
            enableForObjectTypes: ["Object"]
        });

        me.activated = true;

        // TODO: 
        // * Api call to get roworder
        // * In api add vrh labels
        me.rowConfig = [
            { label: i18n.t("creator.formal_name"), order: 0, source: "dbk" },
            { label: i18n.t("creator.informal_name"), order: 1, source: "dbk" },
            { label: i18n.t("creator.adress"), order: 2, source: "dbk" },
            { label: i18n.t("creator.check_date"), order: 3, source: "dbk" },
            { label: i18n.t("creator.emergencyResponderPresent"), order: 4, source: "dbk" },
            { label: i18n.t("creator.respondingProcedure"), order: 5, source: "dbk" },
            { label: i18n.t("creator.buildingConstruction"), order: 6, source: "dbk" },
            { label: i18n.t("creator.fireAlarmCode"), order: 7, source: "dbk" },
            { label: i18n.t("creator.usage"), order: 8, source: "dbk" },
            { label: i18n.t("creator.usage_specific"), order: 9, source: "dbk" },
            { label: i18n.t("creator.level"), order: 10, source: "dbk" },
            { label: i18n.t("creator.lowestLevel"), order: 11, source: "dbk" },
            { label: i18n.t("creator.highestLevel"), order: 12, source: "dbk" },
        ];
    },

    shouldShowKro: function() {
        var me = dbkjs.modules.kro;

        return me.activated;
    },

    shouldShowKroForObject: function(object) {
        var me = dbkjs.modules.kro;

        if (!me.shouldShowKro()) {
            return false;
        }

        var objectTypeIsEnabled = object.symbool &&
            me.options.enableForObjectTypes.filter(function(type) { return type === object.symbool; }).length > 0;

        return objectTypeIsEnabled;
    },

    callApi: function(params) {
        var me = dbkjs.modules.kro;
        var d = $.Deferred();
        
        if(!me.activated) {
            return;
        }

        $.ajax({
            dataType: "json",
            url: 'api/kro',
            data: params,
            cache: false
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            d.reject(safetymaps.utils.getAjaxError(jqXHR, textStatus, errorThrown));
        })
        .done(function(data, textStatus, jqXHR) {
            d.resolve(data);
        });
        return d.promise();
    },

    getObjectInfoForAddress: function(streetname, housnr, housletter, housaddition, city) {
        var me = dbkjs.modules.kro;
        var params = {
            address: me.createAddressString(streetname, housnr, housletter, housaddition, city),
        };
        
        return me.callApi(params);
    },

    getObjectInfoForBAGvboId: function(bagvboid) {
        var me = dbkjs.modules.kro;
        var params = {
            bagId: bagvboid,
        };
        
        return me.callApi(params);
    },

    getObjectInfoForBAGpandId: function(bagpandid) {

    },

    mergeKroRowsIntoDbkRows: function(dbkRows, kro) {
        var me = dbkjs.modules.kro;
        var kroRows = me.createRows(kro);

        dbkRows = dbkRows.concat(kroRows);
        dbkRows = me.removeDuplicateObjectInfoRows(dbkRows);
        dbkRows = me.orderObjectInfoRows(dbkRows);

        return dbkRows;
    },

    showKroForIncidentWithoutDbk: function(kro) {
        safetymaps.infoWindow.addTab('incident', "general", i18n.t("creator.general"), "kro", safetymaps.creator.createInfoTabDiv(me.createRows(kro)));
        console.log(me.infoWindow);
    },

    createRows: function(kro) {
        return [
            { l: "BAG pand id", t: kro.bagpandid, source: "kro" },
        ];
    },

    removeDuplicateObjectInfoRows: function(rows) {
        var me = dbkjs.modules.kro;

        return rows
            .filter(function(row) {
                var configFound = me.rowConfig.filter(function(cr) { return cr.label === row.l; });
                if(configFound.length > 0) {
                    return (typeof(row.source) === "undefined" ? "dbk" : row.source) === configFound[0].source;
                } else {
                    return true;
                }
            })
            .map(function(row) {
                return { l: row.l, t: row.t, html: row.html, };
            });
    },

    orderObjectInfoRows: function(rows) {
        var me = dbkjs.modules.kro;

        return rows
            .map(function(row) {
                var configFound = me.rowConfig.filter(function(cr) { return cr.label === row.l; });
                var order = 999;
                if(configFound.length > 0) {
                    order = configFound[0].order;
                }
                return { l: row.l, t: row.t, html: row.html, o: order, }
            })
            .sort(function(a, b) { return a.o - b.o; })
            .map(function(row) {
                return { l: row.l, t: row.t, html: row.html, };
            });
    },

    createAddressString: function(streetname, housenr, houseletter, houseaddition, city) {
        return `${ streetname }|${ (housenr === 0 ? '' : housenr) || '' }|${ houseletter || '' }|${ houseaddition || '' }|${ city }`;
    },
}
