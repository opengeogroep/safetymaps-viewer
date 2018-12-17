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

 dbkjs.modules.bagAddressSearch = {
    id: "dbk.module.bagAddressSearch",

    register: function() {
        var me = this;
        
        this.options = $.extend({
            // default options here
            maxSearchResults: 30
        }, this.options);
        
        if(!dbkjs.modules.search) {
            console.log("bag address module requires search module, disabled");
            return;
        }
        
        dbkjs.modules.search.addSearchConfig({
            name: "address",
            tabContents: "<i class='fa fa-home'></i> " + i18n.t("creator.queryAddress"),
            placeholder: i18n.t("creator.search_placeholder"),
            search: function(value) {
                if(value.trim().length === 0) {
                    dbkjs.modules.search.showResults([]);
                } else {
                    $.ajax("api/autocomplete/"+value, {
                        term: value
                    })
                    .done(function(data) {
                        dbkjs.modules.search.showResults(data, function(a) {
                            return Mustache.render("{{display_name}}", a);
                        }, true);
                    });
                }
            },
            resultSelected: function(result) {
                console.log("bag adddress search result selected " + result.lon + ", " + result.lat, result);
                dbkjs.map.setCenter([result.lon,result.lat], dbkjs.options.zoom);
            }
        },false);
    }
};