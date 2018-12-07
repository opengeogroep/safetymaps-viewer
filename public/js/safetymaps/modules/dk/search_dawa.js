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

/* Search for adresses using http://data.aws.dk/
 *
 * Not localized because the service is only applicable to Denmark.
 *
 */

dbkjs.modules.search_dawa = {

    register: function() {
        var me = this;

        this.options = $.extend({
            // default options here, change in organisation.modules table
            "adgangsadresserParams": {
                "fuzzy": "true",
                "per_side": 30
            },
            "stednavneParams": {
                "fuzzy": "true",
                "per_side": 40
            }
        }, this.options);

        if(!dbkjs.modules.search) {
            console.log("dkaddress module requires search module, disabled");
            return;
        }

        // Access addresses (Adgangsadresseadresser)
        dbkjs.modules.search.addSearchConfig({
            tabContents: "<i class='fa fa-envelope'></i> Adresser",
            placeholder: i18n.t("creator.search_placeholder"),
            search: function(value) {
                if(value === "") {
                    dbkjs.modules.search.showResults([]);
                    return;
                }
                // We are not using the DAWA /autocomplete because we get x and y
                // with struktur=mini.
                // Modify the q parameter as the autcomplete does: add wildcard
                // to latest term when it does not end with a space.
                var q = value;
                if(!/ $/.test(value)) {
                    q += "*";
                }
                var data = $.extend(me.options.adgangsadresserParams, {
                    "q": q,
                    "struktur": "mini",
                    "srid": dbkjs.options.projection.srid
                });
                console.log("search DAWA adgangsadresse: ", data);
                $.ajax(window.location.protocol + "//dawa.aws.dk/adgangsadresser", {
                    data: data
                })
                .done(function(data) {
                    dbkjs.modules.search.showResults(data, function(a) {
                        return Mustache.render("{{adresseringsvejnavn}} {{husnr}}, {{postnr}} {{postnrnavn}}", a);
                    }, true);
                });
            },
            resultSelected: function(result) {
                console.log("DAWA search result selected " + result.x + ", " + result.y, result);
                dbkjs.map.setCenter(new OpenLayers.LonLat(result.x, result.y), dbkjs.options.zoom);
            }
        });

        // Geographical names (Stednavne)
        dbkjs.modules.search.addSearchConfig({
            tabContents: "<i class='fa fa-thumb-tack'></i> Stednavne",
            placeholder: i18n.t("creator.search_placeholder"),
            search: function(value) {
                if(value === "") {
                    dbkjs.modules.search.showResults([]);
                    return;
                }
                // Use autocomplete, no need to add wildcard
                var data = $.extend(me.options.stednavneParams, {
                    "q": value,
                    "srid": dbkjs.options.projection.srid
                });
                console.log("search DAWA adgangsadresse: ", data);
                $.ajax(window.location.protocol + "//dawa.aws.dk/stednavne", {
                    data: data
                })
                .done(function(data) {
                    dbkjs.modules.search.showResults(data, function(a) {
                        a.kommune = a.kommuner && a.kommuner.length > 0 ? ", " + a.kommuner[0].navn : "";
                        return Mustache.render("{{navn}} ({{hovedtype}}){{kommune}}", a);
                    }, true);
                });
            },
            resultSelected: function(result) {
                console.log("DAWA search result selected", result);
                dbkjs.map.setCenter(new OpenLayers.LonLat(result.visueltcenter[0], result.visueltcenter[1]), dbkjs.options.zoom);
            }
        });
    }
};
