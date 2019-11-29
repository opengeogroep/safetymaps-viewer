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


/* global dbkjs, i18n, Mustache */

dbkjs.modules.coordinateSearch = {
    id: "dbk.module.coordinateSearch",
    register: function () {
        var me = this;

        if (!dbkjs.modules.search) {
            console.log("coordinate search module requires search module, disabled");
            return;
        }

        dbkjs.modules.search.addSearchConfig({
            name: "coordinate",
            tabContents: "<i class='fa fa-map-marker'></i> " + "Coördinaten",
            placeholder: i18n.t("creator.search_placeholder"),
            search: function (value) {
                if (value.trim().length === 0) {
                    dbkjs.modules.search.showResults([]);
                } else {
                    if (me.checkValidCoordinate(value)) {
                        dbkjs.modules.search.showResults([value], function (a) {
                            return a;
                        }, true);
                    } else {
                        dbkjs.modules.search.showResults(["Geen geldig coördinaat"], function (a) {
                            return a;
                        }, true);
                    }
                }
            },
            resultSelected: function (result) {
                var p = new OpenLayers.Geometry.Point(result.split(' ')[0], result.split(' ')[1]);
                dbkjs.map.setCenter([p.x, p.y], dbkjs.options.zoom);
            }
        }, false);
    },

    checkValidCoordinate: function (coordinate) {
        if (coordinate.split(' ').length <= 1) {
            return false;
        } else if (coordinate.split(' ').length === 2) {
            var x = coordinate.split(' ')[0];
            var y = coordinate.split(' ')[1];
            x = x.replace(',','.');
            y = y.replace(',','.');
            
            var maxExtent = dbkjs.map.getMaxExtent();
            
            if( x >= maxExtent.left && x <= maxExtent.right && y >= maxExtent.bottom && y <= maxExtent.top){
                return true;
            }
            
            return false;
        }
    }

};