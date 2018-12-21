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

dbkjs.modules.library = {
    id: "dbk.module.library",
    library: null,

    register: function () {
        var me = this;


        if (!dbkjs.modules.search) {
            console.log("bag address module requires search module, disabled");
            return;
        }

        me.initData();

        dbkjs.modules.search.addSearchConfig({
            tabContents: "<i class='fa fa-file-pdf-o'></i> " + i18n.t("search.library"),
            placeholder: i18n.t("creator.search_placeholder"),
            search: function (value) {
                value = value.toLowerCase();
                console.log("search library " + value);
                var searchResults = [];
                $.each(me.library, function (i, l) {
                    value = value.toLowerCase();
                    if (value === "" || l.Omschrijving.toLowerCase().indexOf(value) !== -1) {
                        searchResults.push(l);
                    }
                });
                dbkjs.modules.search.showResults(searchResults, function (a) {
                    return Mustache.render("{{Omschrijving}}", a);
                }, true);
            },
            resultSelected: function (result) {
                console.log("Library search result selected ", result);
                me.showLibraryItem(result);
            }
        }, false);

    },

    initLibraryPopup: function () {
        var me = this;

        if (me.libraryPopup) {
            return;
        }
        me.libraryPopup = dbkjs.util.createModalPopup({
            name: 'library',
            title: i18n.t("search.title") + ' | ' + i18n.t("search.library"),
            hideCallback: function () {
                //me.libraryPopup.getView().html("");
            }
        });

        var updateContentHeight = function () {
            var view = me.libraryPopup.getView();
            if (view) {
                console.log("updating library pdf div height to " + view.height() - view.find(".pdf-heading").height());
                me.libraryPopup.getView().find(".pdf-embed").css("height", view.height() - view.find(".pdf-heading").height());
            }
        };

        $(window).resize(updateContentHeight);

        var event = dbkjs.util.getTransitionEvent();
        if (event) {
            me.libraryPopup.getView().parent().on(event, updateContentHeight);
        } else {
            updateContentHeight();
        }
    },
    
    showLibraryItem: function (item) {
        var me = this;
        me.initLibraryPopup();
        
        var realpath = "media/bibliotheek/" + item.Documentnaam;
        var url = safetymaps.utils.getAbsoluteUrl(realpath);
        me.libraryPopup.getView().html("");
        me.libraryPopup.getView().append('<h3 class="pdf-heading" style="margin: 0; text-align: center; height: 28px"><a href="' + realpath + '" target="_blank">' + item.Omschrijving + ' (' + item.Documentnaam + ')</a></h3>' +
                '<div class="pdf-embed" id="pdf_embed_library"/>');
        me.libraryPopup.show();

        // Add cache buster to avoid unexpected server response (206) on iOS 10 safari webapp
        PDFObject.embed(url + "?t=" + new Date().getTime(), $("#pdf_embed_library"), {
            // Use custom built pdf.js with src/core/network.js function
            // PDFNetworkStreamFullRequestReader_validateRangeRequestCapabilities
            // always returning false to also avoid 206 error
            PDFJS_URL: "js/libs/pdfjs-1.6.210-disablerange-minified/web/viewer.html",
            forcePDFJS: !!dbkjs.options.forcePDFJS
        });
    },

    initData: function () {
        var me = this;
        me.library = [];
        $.ajax("api/library.json", {
            dataType: "json",
            ifModified: true
        }).done(function (data) {
            me.library = data.items;
            console.log("Got " + me.library.length + " library items");
        });
    }

};