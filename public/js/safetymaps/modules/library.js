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

        this.options = $.extend({
            path: "media/bibliotheek/"
        }, this.options);
        
        if (!dbkjs.modules.search) {
            console.log("bag address module requires search module, disabled");
            return;
        }

        me.initData();
        var searchTabtext = me.options.searchTabText || i18n.t("search.library");

        dbkjs.modules.search.addSearchConfig({
            tabContents: "<span onClick='dbkjs.modules.library.initData()'><i class='fa fa-file-pdf-o'></i> " + searchTabtext + "</span>",
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
        
        var url = safetymaps.utils.getAbsoluteUrl(me.options.path+encodeURIComponent(item.Documentnaam));
        me.libraryPopup.getView().html("");
        me.libraryPopup.getView().append('<h3 class="pdf-heading" style="margin: 0; text-align: center; height: 28px"><a href="' + url + '" target="_blank">' + item.Omschrijving + ' (' + item.Documentnaam + ')</a></h3>' +
                '<div class="pdf-embed" id="pdf_embed_library"/>');
        me.libraryPopup.show();
        
        //check if path is set for backend use
        if(me.options.path.includes("?")){
            url += "&t=" + new Date().getTime();
        } else {
            url += "?t=" + new Date().getTime();
        }
        // Add cache buster to avoid unexpected server response (206) on iOS 10 safari webapp
        PDFObject.embed(url , $("#pdf_embed_library"), {
            // Use custom built pdf.js with src/core/network.js function
            // PDFNetworkStreamFullRequestReader_validateRangeRequestCapabilities
            // always returning false to also avoid 206 error
            PDFJS_URL: "js/libs/pdfjs-1.6.210-disablerange-minified/web/viewer.html",
            forcePDFJS: !!dbkjs.options.forcePDFJS
        });
        var removeTries = 0;
        // Remove buttons from PDFJS toolbar
        // XXX hack, use PDFJS documentloaded event?
        function removeToolbar() {
            var iframe = $("iframe").contents();
            if (iframe.find("#toolbarViewer")[0]) {
                console.log("Found PDFJS toolbar buttons, removing for URL " + url);
                iframe.find("#toolbarViewerLeft").remove();
                iframe.find("#toolbarViewerRight").remove();
            } else {
                if (++removeTries >= 10) {
                    console.log("PDFJS toolbar not found after " + removeTries + " tries (loading failed?), cannot remove for URL " + url);
                } else {
                    window.setTimeout(removeToolbar, 1000);
                }
            }
        }
        //this check is needed. If the program is not using PDFJS then we can't remove buttons.
        if (PDFObject.supportsPDFs || !!dbkjs.options.forcePDFJS) {
            removeToolbar();
        }
    },

    initData: function () {
        var me = this;
        me.library = [];
        $.ajax("api/library.json", {
            dataType: "json",
            ifModified: true,
            cache: false
        }).done(function (data) {
            me.library = data.items;
            console.log("Got " + me.library.length + " library items");
        });
    }

};