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
    pandLayer: null,
    cache: {
        incidentAddress: null,
    },
    
    register: function() {
        var me = dbkjs.modules.kro;

        me.options = $.extend({
            debug: false,
            enableForObjectTypes: ["object"],
            layerName: "KRO\\Pand risico score",
            bagPandIdFeature: "identificatie",
        }, me.options);

        me.activated = true;

        me.createPandLayer();
        me.getObjectInfoRowConfig()
            .fail(function(msg) {
                console.log("Error fetching KRO row config in KRO module: " + msg);
                me.rowConfig = [
                    { label: i18n.t("creator.adress"), order: 2, source: "dbk", disabled: true },
                    { label: i18n.t("creator.fireAlarmCode"), order: 7, source: "dbk", disabled: true },
                ];
            })
            .done(function(config) {
                me.rowConfig = config;
            });
        
        dbkjs.map.addLayer(me.pandLayer);

       /* me.rowConfig = [
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
            { label: i18n.t("creator.lowestLevel") + " (" + i18n.t("creator.floor") + ")", order: 11, source: "dbk" },
            { label: i18n.t("creator.highestLevel") + " (" + i18n.t("creator.floor") + ")", order: 12, source: "dbk" },
        ];*/
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

        var objectTypeIsEnabled = object.type &&
            me.options.enableForObjectTypes.filter(function(type) { return type.toLowerCase() === object.type.toLowerCase(); }).length > 0;

        return objectTypeIsEnabled;
    },

    shouldShowKroForMapLayer: function(layerName) {
        var me = dbkjs.modules.kro;

        if (!me.shouldShowKro()) {
            return false;
        }

        return layerName === me.options.layerName;
    },

    getBagPandIdFromLayerFeatureAndShowPopup: function(getFeaturesResponse) {
        var me = dbkjs.modules.kro;
        var bagPandId = null;
        var gfi = new OpenLayers.Format.WMSGetFeatureInfo();

        features = gfi.read($.parseXML(getFeaturesResponse.responseText));
        for (var feat in features) {
            for (var j in features[feat].attributes) {
                if (typeof (features[feat].attributes[j]) !== "undefined" 
                    && features[feat].attributes[j] !== ""
                    && j === me.options.bagPandIdFeature) {
                        bagPandId = features[feat].attributes[j];
                    }
            }
        }

        if (bagPandId) {
            me.showPopup(bagPandId, true);
            $("#custompanel").modal('toggle');
        }
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

    getObjectInfoRowConfig: function() {
        var me = dbkjs.modules.kro;
        var params = {
            config: true
        };

        return me.callApi(params);
    },

    getObjectInfoForAddress: function(streetname, housnr, housletter, housaddition, city) {
        var me = dbkjs.modules.kro;
        var params = {
            address: me.createAddressString(streetname, housnr, housletter, housaddition, city),
        };

        me.cache.incidentAddress = me.createIncidentAddressString(streetname, housnr, housletter, housaddition, city);
        
        return me.callApi(params);
    },

    getObjectInfoForBAGvboId: function(bagvboid) {
        var me = dbkjs.modules.kro;
        var params = {
            bagVboId: bagvboid,
        };
        
        return me.callApi(params);
    },

    getObjectInfoForBAGpandId: function(bagpandid) {
        var me = dbkjs.modules.kro;
        var params = {
            addresses: true,
            bagPandId: bagpandid,
        };
        
        return me.callApi(params);
    },

    mergeKroRowsIntoDbkRows: function(dbkRows, kro, isIncident) {
        var me = dbkjs.modules.kro;
        var kroRows = me.createGeneralRows(kro);

        if (isIncident) {
            kroRows.unshift({ l: "Incident adres", t: me.cache.incidentAddress, source: "kro" });
        }

        dbkRows = kroRows.concat(dbkRows);
        dbkRows = me.removeDuplicateObjectInfoRows(dbkRows);
        dbkRows = me.orderAndFilterObjectInfoRows(dbkRows);

        me.setScrollBar();
        me.addPandFeatures(kro.bagpandid);

        return dbkRows;
    },

    showKroForIncidentWithoutDbk: function(kro) {
        var me = dbkjs.modules.kro;
        var rows = me.createGeneralRows(kro);

        rows.unshift({ l: "Incident adres", t: me.cache.incidentAddress, source: "kro" });

        me.setScrollBar();
        me.addPandFeatures(kro.bagpandid);

        safetymaps.infoWindow.addTab('incident', "general", i18n.t("creator.general"), "kro", safetymaps.creator.createInfoTabDiv(rows));
    },

    setScrollBar: function() {
        var me = this;

        setTimeout(function() {
            var content = $("#tab_general.active").parent();
            content.addClass("tab-content--scroll-visible-on-ipad");
        }, 500);
    },

    createGeneralRows: function(kro) {
        var rows = [];
        var typeList = "-";
        var addressTypeList = "-";

        if (kro.pand_objecttypering_ordered) {
            typeList = "<a class='--without-effects' href='#custompanel' data-toggle='modal'><table onClick='dbkjs.modules.kro.showPopup(\"" + kro.bagpandid + "\")'>";
            kro.pand_objecttypering_ordered.map(function(type) {
                typeList += "<tr><td>" + type + "</td></tr>";
            });
            typeList += "</table></a>";
        }

        if (kro.address_objecttypering_ordered) {
            addressTypeList = "<table>";
            kro.address_objecttypering_ordered.map(function(type) {
                addressTypeList += "<tr><td>" + type + "</td></tr>";
            });
            addressTypeList += "</table>";
        }

        rows.push({ l: "Oppervlakte gebouw", t: kro.adres_oppervlak + "m2", source: "kro" });
        rows.push({ l: "Bouwjaar", t: kro.pand_bouwjaar, source: "kro" });
        rows.push({ l: "Maximale hoogte",t: ("" + kro.pand_maxhoogte + "").replace(".", ",") + "m", source: "kro" });
        rows.push({ l: "Geschat aantal bouwlagen bovengronds",t: kro.pand_bouwlagen, source: "kro" });
        rows.push({ l: "Functies binnen dit adres", html: addressTypeList, source: "kro" });
        rows.push({ l: "Alle functies in dit gebouw <a href='#custompanel' data-toggle='modal'><span onClick='dbkjs.modules.kro.showPopup(\"" + kro.bagpandid + "\")'><br/>klik voor meer info</span></a>", html: typeList, source: "kro" },);

        if (kro.pand_status.toLowerCase() !== "pand in gebruik") {
            rows.push({ l: "Status", t: kro.pand_status, source: "kro" });
        }

        if (kro.monument !== "") {
            rows.push({ l: "Monument", t: "Ja", source: "kro" });
        }

        rows.push({ l: "", html: "<br/><br/>", source: "kro" });

        return rows;
    },

    showPopup: function(bagpandid, extended) {
        var me = this;
        var $titleEl = $("#custom_title");
        var $bodyEl = $("#custompanel_b");
        var $bodyTable = $("<table>");

        if (typeof extended === "undefined" || extended === null) {
            extended = false;
        }

        $titleEl.html("Adres en gebruik informatie");

        me.getObjectInfoForBAGpandId(bagpandid)
            .fail(function(msg) { 
                console.log("Error fetching KRO addresses data in KRO Module: " + msg);
            })
            .done(function(kroAddressesData) {
                var rowCss = "odd";
                var bodyHtml = "";

                if (extended) {
                    if(kroAddressesData.length > 0) {
                        bodyHtml += "<table>";
                        var kro = me.createGeneralRows(kroAddressesData[0]);
                        kro.filter(function(kroItm) { return !kroItm.html }).map(function(kroItm) {
                            bodyHtml += "<tr><td>" + kroItm.l + "</td><td>" + kroItm.t + "</td></tr>";
                        });
                        bodyHtml += "</table><br/>";
                    }
                }

                $bodyEl.html(bodyHtml);
                $bodyTable.addClass("table-small-text");
                $bodyTable.append("<thead style='cursor: pointer;'><tr><th>Adres</th><th>Typering</th><th>Bedrijfs-<br/>naam</th><th>Telefoon</th><th>Indicatie<br/>aantal pers.</th></tr></thead><tbody>");

                if(kroAddressesData.length > 0) {
                    kroAddressesData
                        .sort((a, b) => {
                            if ((a.straatnaam + (" " + a.huisnr || "")) > (b.straatnaam + (" " + b.huisnr || ""))) { return -1; }
                            if ((a.straatnaam + (" " + a.huisnr || "")) < (b.straatnaam + (" " + b.huisnr || ""))) { return 1; }
                            return 0;
                        })
                        .map(function(dataRow) {
                            var containsWoTypering = (dataRow.adres_objecttypering
                                ? dataRow.adres_objecttypering.split('||')
                                : ["|"]).map(function(itm) { return itm.split('|')[0].includes("Wo") }).filter(function(itm) { return itm }).length > 0;
                            var adres_typering = (dataRow.adres_objecttypering
                                ? dataRow.adres_objecttypering.split('||')
                                : ["|"]).map(function(itm) { return itm.split('|')[1] }).join(', ');
                            var aanzien_typering = (dataRow.aanzien_objecttypering
                                ? dataRow.aanzien_objecttypering.split('||')
                                : ["|"]).map(function(itm) { return itm.split('|')[1] }).join(', ');
                            var adres = dataRow.straatnaam + (" " + dataRow.huisnr || "") + (" " + dataRow.huisletter || "") + (" " + dataRow.huistoevg || "") + dataRow.plaatsnaam;
                            var rowHtml = "<tr class='" + rowCss + "'><td>" + (adres) + "</td><td>" + (aanzien_typering) + (adres_typering) +
                                "</td><td>" + (containsWoTypering ? '' : dataRow.adres_bedrijfsnaam || "") + "</td><td>" + (containsWoTypering ? '' : dataRow.adres_telefoonnummer || "") +
                                "</td><td>" + (containsWoTypering ? '' : dataRow.adres_aantal_personen || "") + "</td></tr>";

                            $bodyTable.append(rowHtml);

                            rowCss = rowCss === "odd" ? "" : "odd";
                        });
                }

                $bodyTable.append("</tbody></table>");
                $bodyTable.tablesorter();
                $bodyEl.append($bodyTable);
            });
    },

    removeDuplicateObjectInfoRows: function(rows) {
        var me = dbkjs.modules.kro;

        return rows
            .filter(function(row) {
                var configFound = me.rowConfig.filter(function(cr) { return cr.label === row.l; });
                if(configFound.length > 0) {
                    return (typeof row.source === "undefined" ? "dbk" : row.source) === configFound[0].source;
                } else {
                    return true;
                }
            })
            .map(function(row) {
                return row;
            });
    },

    orderAndFilterObjectInfoRows: function(rows) {
        var me = dbkjs.modules.kro;

        return rows
            .map(function(row) {
                var configFound = me.rowConfig.filter(function(cr) { return cr.label === row.l; });
                var order = row.source === "kro" ? 1 : 999; 
                var disabled = typeof row.disabled === "undefined" ? false : row.disabled;
                if(configFound.length > 0) {
                    order = configFound[0].order;
                    disabled = configFound[0].disabled;
                }
                return { l: row.l, t: row.t, html: row.html, o: order, disabled: disabled }
            })
            .filter(function(row) { return row.disabled === false; })
            .sort(function(a, b) { return a.o - b.o; })
            .map(function(row) {
                return { l: row.l, t: row.t, html: row.html, };
            });
    },

    createPandLayer: function() {
        var me = this;

        me.pandLayer = new OpenLayers.Layer.Vector("KRO pand layer", {
            hover: false,
            rendererOptions: {
                zIndexing: true
            },
            styleMap: new OpenLayers.StyleMap({
                default: new OpenLayers.Style({
                    fillColor: "#66ff66",
                    fillOpacity: 0.2,
                    strokeColor: "#66ff66",
                    strokeWidth: 1,
                }),
                temporary: new OpenLayers.Style({}),
                select: new OpenLayers.Style({}),
            }),
        });
    },

    addPandFeatures: function(bagPandId) {
        var me = this;
        var params = {
            pand: true,
            bagPandId: bagPandId,
        };
        
        me.pandLayer.removeAllFeatures();
        me.callApi(params)
            .fail(function(error) {
                console.log(error);
            })
            .done(function(result) {
                var wktParser = new OpenLayers.Format.WKT();
                var features = [];

                $.each(result || [], function(i, pand) {
                    var feature = wktParser.read(pand.pandgeo);
                    feature.attributes.index = i;
                    features.push(feature);
                });

                me.pandLayer.addFeatures(features);
            });
    },

    createAddressString: function(streetname, housenr, houseletter, houseaddition, city) {
       return streetname + "|" + ((housenr === 0 ? '' : housenr) || '') + "|" + (houseletter || '') + "|" + (houseaddition || '') + "|" + city;
    },

    createIncidentAddressString: function(streetname, housenr, houseletter, houseaddition, city) {
        return streetname + " " + ((housenr === 0 ? '' : housenr) || '') + (houseletter + " " || '') + (houseaddition + " " || '') + ", " + city;
    },
}
