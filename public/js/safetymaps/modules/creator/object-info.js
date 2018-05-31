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

/*
 * Render HTML with info about SafetyMaps Creator objects.
 *
 */

/* global safetymaps, OpenLayers, Mustache, i18n, moment, PDFObject */

var safetymaps = safetymaps || {};
safetymaps.creator = safetymaps.creator || {};

safetymaps.creator.renderInfoTabs = function(object, div) {

    var tabContent = $('<div class="tab-content"></div>');
    var tabs = $('<ul class="nav nav-pills"></ul>');
    div.append(tabContent);
    div.append(tabs);

    var rows;

    rows = safetymaps.creator.renderGeneral(object);
    safetymaps.creator.createHtmlTabDiv("general", i18n.t("creator.general"), safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

    detailTabs = safetymaps.creator.renderDetails(object);
    $.each(detailTabs, function(i, detailTab) {
        safetymaps.creator.createHtmlTabDiv("details_" + i, detailTab.name, safetymaps.creator.createInfoTabDiv(detailTab.rows), tabContent, tabs);
    });

    rows = safetymaps.creator.renderContacts(object);
    safetymaps.creator.createHtmlTabDiv("contacts", i18n.t("creator.contacts"), safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

    rows = safetymaps.creator.renderOccupancy(object);
    safetymaps.creator.createHtmlTabDiv("occupancy", i18n.t("creator.occupancy"), safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

    var content = safetymaps.creator.renderMedia(object);
    safetymaps.creator.createHtmlTabDiv("media", i18n.t("creator.media"), content, tabContent, tabs);

    safetymaps.creator.embedPDFs(content);

    rows = safetymaps.creator.renderDangerSymbols(object);
    safetymaps.creator.createHtmlTabDiv("danger_symbols", i18n.t("creator.danger_symbols"), safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

    rows = safetymaps.creator.renderFloors(object);
    safetymaps.creator.createHtmlTabDiv("floors", i18n.t("creator.floors"), safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);

    rows = safetymaps.creator.renderSymbols(object);
    safetymaps.creator.createHtmlTabDiv("symbols", i18n.t("creator.symbols"), safetymaps.creator.createInfoTabDiv(rows), tabContent, tabs);
};

safetymaps.creator.renderGeneral = function(object) {

    var lowestFloor = null, highestFloor = null;
    if(object.bouwlaag_min && object.bouwlaag_min !== "") {
        var n = Number(object.bouwlaag_min);
        lowestFloor = n === 0 ? 0 : (-n) + " (" + (-n) + ")";
    }
    if(object.bouwlaag_max && object.bouwlaag_max !== "") {
        var n = Number(object.bouwlaag_max);
        highestFloor = n === 0 ? 0 : n + " (" + (n-1) + ")";
    }
    if(object.huisnummer === 0) object.huisnummer = "";
    return [
        {l: i18n.t("creator.formal_name"), t: object.formele_naam},
        {l: i18n.t("creator.informal_name"), t: object.informele_naam},
        {l: i18n.t("creator.adress"), html: Mustache.render("{{straatnaam}} {{huisnummer}} {{huisletter}} {{toevoeging}}<br>{{postcode}} {{plaats}}", object)},
        {l: i18n.t("creator.check_date"), t: new moment(object.datum_controle).format("LL")},
        {l: i18n.t("creator.modified_date"), t: new moment(object.datum_actualisatie).format("LLLL")},
        {l: i18n.t("creator.emergencyResponderPresent"), html:
                '<span class="label label-' + (object.bhv_aanwezig ? 'success' : 'warning') + '">' +
                i18n.t("creator.emergencyResponderPresent" + (object.bhv_aanwezig ? 'Yes' : 'No')) + '</span>'},
        {l: i18n.t("creator.respondingProcedure"), t: object.inzetprocedure},
        {l: i18n.t("creator.buildingConstruction"), t: object.gebouwconstructie},
        {l: i18n.t("creator.fireAlarmCode"), t: object.oms_nummer},
        {l: i18n.t("creator.usage"), t: object.gebruikstype},
        {l: i18n.t("creator.usage_specific"), t: object.gebruikstype_specifiek},
        {l: i18n.t("creator.level"), t: object.bouwlaag},
        {l: i18n.t("creator.lowestLevel") + " (" + i18n.t("creator.floor") + ")", t: lowestFloor},
        {l: i18n.t("creator.highestLevel") + " (" + i18n.t("creator.floor") + ")", t: highestFloor}
    ];
};

safetymaps.creator.renderContacts = function(object) {

    var rows = [];
    if(object.contacten) {
        rows.push([ "<b>" + i18n.t("creator.contact_role") + "</b>", "<b>" + i18n.t("creator.contact_name") + "</b>", "<b>" + i18n.t("creator.contact_phone") + "</b>"]);

        $.each(object.contacten, function(i, contact) {
            rows.push([
                contact.functie,
                contact.naam,
                contact.telefoonnummer
            ].map(Mustache.escape));
        });
    }

    return rows;
};

safetymaps.creator.renderDetails = function(object) {

    var tabs = [];

    var header = {l: "<b>" + i18n.t("creator.details_type") + "</b>", html: "<b>" + i18n.t("creator.details_value") + "</b>"};

    var rows = [header];
    var objectDetails = [
        {l: i18n.t("creator.details_general"), property: "bijzonderheden"},
        {l: i18n.t("creator.details_general"), property: "bijzonderheden2"},
        {l: i18n.t("creator.details_preparative"), property: "prep_bijz_1"},
        {l: i18n.t("creator.details_preparative"), property: "prep_bijz_2"},
        {l: i18n.t("creator.details_preventative"), property: "prev_bijz_1"},
        {l: i18n.t("creator.details_preventative"), property: "prev_bijz_2"},
        {l: i18n.t("creator.details_repressive"), property: "repr_bijz_1"},
        {l: i18n.t("creator.details_repressive"), property: "repr_bijz_2"}
    ];
    $.each(objectDetails, function(i, od) {
        if(object[od.property]) {

            // If label is the same as the last row, add line to last row

            var lastRow = rows[rows.length-1];
            if(lastRow.l === od.l) {
                lastRow.html += "<br>" + Mustache.escape(object[od.property]);
            } else {
                rows.push({
                    l: od.l,
                    html: Mustache.escape(object[od.property])
                });
            }
        }
    });
    // Only show tab if one of the fields has contents
    if(rows.length > 1) {
        tabs.push({ name: i18n.t("creator.details"),
              rows: rows
        });
    }

    if(object.bijzonderhedenlijst) {
        $.each(object.bijzonderhedenlijst, function(i, b) {
            var tab = null;
            $.each(tabs, function(j, t) {
                if(t.name === b.tabblad) {
                    tab = t;
                    return false;
                }
            });
            if(tab === null) {
                tab = { name: b.tabblad, rows: [header] };
                tabs.push(tab);
            }
            // If label is the same as the lastrow, add line to last row

            var lastRow = tab.rows[tab.rows.length-1];
            if(lastRow.l === b.soort) {
                lastRow.html += "<br>" + Mustache.escape(b.tekst);
            } else {
                tab.rows.push({ l: b.soort, html: Mustache.escape(b.tekst)});
            }
        });
    }

    return tabs.filter(function(tab) {
        // Remove tabs with only header as row
        return tab.rows.length > 1;
    });
};

safetymaps.creator.renderOccupancy = function(object) {

    var rows = [];
    if(object.verblijf) {
        rows.push([
            "<b>" + i18n.t("creator.occupancy_from") + "</b>",
            "<b>" + i18n.t("creator.occupancy_to") + "</b>",
            "<b>" + i18n.t("creator.occupancy_number") + "</b>",
            "<b>" + i18n.t("creator.occupancy_notSelfReliant") + "</b>",
            "<b>" + i18n.t("creator.occupancy_group") + "</b>",
            "<b>" + i18n.t("creator.occupancy_days") + "</b>"
        ]);

        $.each(object.verblijf, function(i, v) {
            var days = "";
            $.each(["maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag","zondag"], function(j, d) {
                days += '<span class="label label-' + (v[d] ? 'success' : 'default') + '">' + moment.weekdaysMin(j+1 % 7) + '</span>';
            });
            rows.push([
                v.begintijd.substring(0,2) + ':' + v.begintijd.substring(3,5),
                v.eindtijd.substring(0,2) + ':' + v.eindtijd.substring(3,5),
                Number(v.aantal) || 0,
                Number(v.aantal_nzr) || 0,
                Mustache.escape(v.groep),
                days
            ]);
        });
    }

    return rows;
};

safetymaps.creator.renderMedia = function(object) {

    var image_carousel = null;

    if(object.media) {
        var carouselId = "media_carousel";
        image_carousel = $('<div id="' + carouselId + '" class="carousel slide" data-interval="false"></div>');
        var image_carousel_inner = $('<div class="carousel-inner"></div>');
        var image_carousel_nav = $('<ol class="carousel-indicators"></ol>');

        $.each(object.media, function(i, m) {
            var active = i === 0 ? "active" : "";
            var path = safetymaps.creator.api.mediaPath + m.filename;

            if(path.match(/pdf$/i)) {
                image_carousel_inner.append(
                    '<div class="item ' + active + '">' +
                        '<h3 class="pdf-heading" style="margin: 0; text-align: center; height: 28px">' + m.filename + '</h3>' +
                        '<div class="pdf-embed" id="pdf_embed_' + i + '" data-url="' + path + '"/>' +
                    '</div>'
                );
            } else if(path.match(/(jpeg|gif|jpg|png)$/i)) {
                image_carousel_inner.append('<div class="item ' + active + '"><img class="img-full" style="width: 100%" src="' + path +
                        '"><div class="carousel-caption"><h3>' +  m.filename + '</h3></div></div>');
            } else {
                image_carousel_inner.append('<div class="item ' + active + '"><img src="'+safetymaps.creator.api.imagePath+'missing.gif"><div class="carousel-caption"><a href="' + m.filename +
                        '" target="_blank"><h1><i class="fa fa-external-link fa-3"></i></h1><h2>' +
                        m.filename + '</h2></a></div></div>'
                );
            }
        });
        image_carousel.append(image_carousel_nav);
        image_carousel.append(image_carousel_inner);
        if(object.media.length > 1) {
            // Style "bottom: auto" om alleen pijlen bovenaan te hebben, niet
            // over PDFs heen
            image_carousel.append('<a class="left carousel-control" style="bottom: auto" href="#' + carouselId + '" data-slide="prev">' +
                    '<span class="fa fa-arrow-left"></span></a>');
            image_carousel.append('<a class="right carousel-control" style="bottom: auto" href="#' + carouselId + '" data-slide="next">' +
                    '<span class="fa fa-arrow-right"></span></a>');
        }
    }

    return image_carousel;
};

safetymaps.creator.embedPDFs = function(element) {
    $.each($(element).find(".pdf-embed"), function(i, pdf) {
        if(pdf.children.length === 0) {
            var url = safetymaps.utils.getAbsoluteUrl($(pdf).attr("data-url"));
            console.log("embedding PDF " + url);
            // Add cache buster to avoid unexpected server response (206) on iOS 10 safari webapp
            PDFObject.embed(url + "?t=" + new Date().getTime(), pdf, {
                // Use custom built pdf.js with src/core/network.js function
                // PDFNetworkStreamFullRequestReader_validateRangeRequestCapabilities
                // always returning false to also avoid 206 error
                PDFJS_URL: "js/libs/pdfjs-1.6.210-disablerange-minified/web/viewer.html",
                forcePDFJS: !!dbkjs.options.forcePDFJS
            });

            // Remove buttons from PDFJS toolbar
            // XXX hack, use PDFJS documentloaded event?
            function removeToolbar() {
                var iframe = $("iframe").contents();
                if(iframe.find("#download")[0] || iframe.find("#secondaryDownload")[0] ) {
                    console.log("found PDFJS toolbar buttons, removing");
                    iframe.find("#download").remove();
                    iframe.find("#openFile").remove();
                    iframe.find("#print").remove();
                    iframe.find("#secondaryDownload").remove();
                    iframe.find("#secondaryOpenFile").remove();
                    iframe.find("#secondaryPrint").remove();
                } else {
                    console.log("PDFJS toolbar not found, waiting")
                    window.setTimeout(removeToolbar, 500);
                }
            }
            //this check is needed. If the program is not using PDFJS then we can't remove buttons.
            if(PDFObject.supportsPDFs || !!dbkjs.options.forcePDFJS ){
                removeToolbar();
            }
        }
    });
};

safetymaps.creator.renderFloors = function(object) {

    var rows = [];
    if(object.verdiepingen) {
        rows.push([
            "<b>" + i18n.t("creator.floor").charAt(0).toUpperCase() + i18n.t("creator.floor").slice(1) + "</b>",
            "<b>" + i18n.t("name") + "</b>"
        ]);

        $.each(object.verdiepingen, function(i, v) {
            var current = v.id === object.id;
            var b = (current ? "<b>" : "");
            var b2 = (current ? "</b>" : "");
            var name = v.formele_naam;
            if(v.informele_naam && v.informele_naam !== v.formele_naam) {
                name += " (" + v.informele_naam + ")";
            }
            rows.push([
                b + v.bouwlaag + b2,
                b + name + b2
            ]);
        });

    }

    return rows;
};

safetymaps.creator.renderSymbols = function(object) {

    var rows = [];
    if(object.symbols || object.communication_coverage) {
        rows.push([
            "<b>" + i18n.t("creator.symbol_icon") + "</b>",
            "<b>" + i18n.t("creator.symbol_name") + "</b>",
            "<b>" + i18n.t("dialogs.information") + "</b>"
        ]);

        // Display legend of symbols, only one symbol even if used multiple times

        var symbolsDisplayed = {};

        $.each(object.symbols, function(i, s) {
            if(symbolsDisplayed[s.code]) {
                return true;
            }
            symbolsDisplayed[s.code] = true;

            rows.push([
                '<img style="width: 20%" src="' + safetymaps.creator.api.imagePath + 'symbols/' + s.code + '.png' + '" alt="' + s.code + '" title="' + s.code + '">',
                i18n.t("symbol." + s.code),s.omschrijving // TODO get from safetymaps.creator.api.styles info
            ]);
        });

        if(object.communication_coverage) {
            rows.push([
                '<img style="width: 20%" src="' + safetymaps.creator.api.imagePath + 'coverage.png">',
                i18n.t("creator.symbol_communication_coverage"),""
            ]);
            rows.push([
                '<img style="width: 20%" src="' + safetymaps.creator.api.imagePath + 'no_coverage.png">',
                i18n.t("creator.symbol_no_communication_coverage"), ""
            ]);
        }
    }

    return rows;
};


safetymaps.creator.renderDangerSymbols = function(object) {

    var rows = [];
    if(object.danger_symbols) {
        rows.push([
            "<b>" + i18n.t("creator.danger_symbol_icon") + "</b>",
            "<b>" + i18n.t("creator.danger_symbol_hazard_identifier") + "</b>",
            "<b>" + i18n.t("creator.danger_symbol_name") + "</b>",
            "<b>" + i18n.t("creator.danger_symbol_quantity") + "</b>",
            "<b>" + i18n.t("creator.danger_symbol_information") + "</b>"
        ]);

        // Display one row per danger_symbol

        $.each(object.danger_symbols, function(i, ds) {

            var symbolName = i18n.t("danger_symbol." + ds.symbol);
            rows.push([
                '<img style="width: 20%" src="' + safetymaps.creator.api.imagePath + 'danger_symbols/' + ds.symbol + '.png' + '" alt="' + symbolName + '" title="' + symbolName + '">',
                '<div class="gevicode">' + ds.gevi_code + '</div><div class="unnummer">' + ds.un_nr + '</div>',
                Mustache.escape(ds.naam_stof),
                Mustache.escape(ds.hoeveelheid),
                Mustache.escape(ds.omschrijving)
            ]);
        });
    }

    return rows;
};

safetymaps.creator.renderObjectFeatureInfoTab = function(object, div) {
};

safetymaps.creator.createHtmlTabDiv = function(id, label, content, tabContent, tabs) {

    if(content !== null) {
        id = 'tab_pane_' + id;

        // Make tab active when no contents yet
        var active = tabContent.find("div").length === 0;

        var bv_div = $('<div class="tab-pane ' + (active ? "active" : "") + '" id="' + id + '"></div>');
        bv_div.append(content);
        tabContent.append(bv_div);
        tabs.append('<li class="' + (active ? "active" : "") + '"><a data-toggle="tab" href="#' + id + '">' + label + '</a></li>');
    }
};

safetymaps.creator.createInfoTabDiv = function(rows) {
    if(rows.length === 0) {
        return null;
    }

    var div = $('<div class="table-responsive"></div>');
    var table = $('<table class="table table-hover"></table>');

    $.each(rows, function(i, row) {
        if($.isArray(row)) {
            // Row of escaped cell values
            var tr = "<tr>";
            for(var j = 0; j < row.length; j++) {
                tr += "<td>" + row[j] + "</td>";
            }
            table.append(tr + "</tr>");
        } else {
            // Row for 2 column table row: l for first label column (escaped) and t (non-escaped) or html (escaped) for second value column
            if((row.hasOwnProperty("t") && row.t !== null && typeof row.t !== "undefined") || row.html) {
                table.append('<tr><td>' + row.l + '</td><td>' + (row.html ? row.html : Mustache.escape(row.t)) + '</td></tr>');
            }
        }
    });

    div.append(table);
    return div;
};

