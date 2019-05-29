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

dbkjs.modules.fotoFunction = {
    id: "dbk.module.fotoFunction",
    popup: null,
    picture: null,
    incidentNr: null,
    fileName: null,
    extensie: null,
    carouselId: "foto_carousel",
    image_carousel: $('<div id="foto_carousel" class="carousel slide" data-interval="false"></div>'),
    image_carousel_inner: $('<div class="carousel-inner"></div>'),
    image_carousel_nav: $('<ol class="carousel-indicators"></ol>'),
    carouselItems: [],

    register: function () {
        var me = this;

        this.options = $.extend({
            showGallery: false,
            path: "foto/"
        }, this.options);

        me.createButton();
        me.createPopup();

        $(dbkjs).one("dbkjs_init_complete", function () {
            me.initCarousel();
            if (dbkjs.modules.incidents && dbkjs.modules.incidents.controller) {
                $(dbkjs.modules.incidents.controller).on("new_incident", function (event, commonIncident, incident) {
                    me.resetCarousel();
                    me.getFotoForIncident(incident, true);
                });
                $(dbkjs.modules.incidents.controller).on("incidents.vehicle.update", function (event, incident) {
                    me.getFotoForIncident(incident, false);
                });
                $(dbkjs.modules.incidents.controller).on("voertuigNummerUpdated", function (bool) {
                    me.resetCarousel();
                    dbkjs.modules.incidents.controller.button.setFotoAlert(false);
                });
                $(dbkjs.modules.incidents.controller).on("end_incident", function () {
                    me.resetCarousel();
                    dbkjs.modules.incidents.controller.button.setFotoAlert(false);
                });
            }
        });
        if(me.options.showGallery){
            $("#fotoConnector").removeAttr("capture");
        }
    },

    createButton: function () {
        var me = this;        
        $(".main-button-group").append($("<div class=\"btn-group pull-left\">" +
            "<a id=\"btn_fotoFunc\" title=\"" + i18n.t("photo.photoButton") + "\" class=\"btn navbar-btn btn-default\">" +
            "<i id=\"btn_fotoFuncIcon\" class=\"fa fa-camera\"></i></a>"));
        $("#btn_fotoFunc").click(function(e){
            e.preventDefault();
            me.takePicture();
        });
    },
    createPopup: function () {
        var me = this;

        this.popup = dbkjs.util.createModalPopup({
            title: i18n.t("photo.savePictureTitle")
        });

        var div = $("<div></div>").addClass("input-group input-group-lg");

        this.popup.getView().append(div);
        me.img = $("<img></img>")
                .attr({
                    id: "pictured",
                    src: "",
                    alt: "fotoConnector",
                    width: 500,
                    height: 500
                })
                .css('border', "solid 8px black"
                    
               );
                
        me.button = $("<a></a>")
                .attr({
                    id: "btn_fotoSave",
                    class: "btn btn-default navbar-btn",
                    href: "#",
                    title: i18n.t("search.button")
                })
                .append("<i class='fa fa-save'></i> "+i18n.t("photo.savePhotoButton"))
                .click(function (e) {
                    $("#btn_fotoSave").attr("disabled","disabled");
                    e.preventDefault();
                    me.savePicture();
                });

        this.popup.getView().append(me.img);
        this.popup.getView().append(me.button);
        this.popup.getView().append("<div><label for='input_filename'>Bestandsnaam: </label><input type='text' disabled id='input_filename' size='28'></div>");
        this.popup.getView().append("<div><br><label id='textarea_label' for='input_textfield'>Geef extra informatie op bij de foto: </label><textarea id='input_textfield' name='input_textfield' rows ='3' cols='33' maxlength='200' wrap='hard'></textarea></div>");
        $("#textarea_label").css('display', "block");
    },

    takePicture: function () {
        console.log("foto aan het maken..");
        var me = this;
        $("#btn_fotoSave").removeAttr("disabled");
        $("#fotoConnector").click();
        $('#fotoConnector').change(function (event) {
            me.showPicture(event);
        });
    },

    showPicture: function (event) {
        var me = this;
        var fileInput = event.target.files;
        if (dbkjs.modules.incidents.controller.incidentId) {
            me.incidentNr = dbkjs.modules.incidents.controller.incidentId;
        } else {
            me.incidentNr = "";
        }

        me.extensie = fileInput[0].name.split('.').pop();
        var prefix = me.incidentNr !== "" ? "_" : "";
        me.fileName = me.incidentNr + prefix + (new Date).getTime().toString() + "_foto." + me.extensie;
        $("#input_filename").val(me.fileName);
        if (fileInput.length > 0) {
            var windowURL = window.URL || window.webkitURL;
            var picURL = windowURL.createObjectURL(fileInput[0]);
            me.picture = fileInput[0];
            $("#pictured").attr({"src": picURL});
            $("#input_textfield").val("");
            me.showPopup();
        }
    },

    showPopup: function () {
        if (this.popup === null) {
            this.createPopup();
        }
        this.popup.show();
    },

    savePicture: function () {
        var me = this;
        var formData = new FormData();
        formData.append('picture', me.picture);
        formData.append('extraInfo', $("#input_textfield").val());
        formData.append('fileName', me.fileName);
        formData.append('voertuigNummer', $("#input_voertuignummer").val());
        formData.append('incidentNummer', me.incidentNr);
        formData.append('type', me.extensie);

        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'api/foto', true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                // File(s) uploaded.
                var response = JSON.parse(xhr.responseText);
                console.log(response.message);
                //me.carouselItems.push(me.fileName);
                $("#btn_fotoSave").removeAttr("disabled");
                me.popup.hide();
                if(me.incidentNr){
                    me.addSinglePictureToCarousel();
                }
            } else {
                $("#btn_fotoSave").removeAttr("disabled");
                alert('An error occurred! wiht status code: ' + xhr.status);
            }
        };
        xhr.send(formData);
    },

    getFotoForIncident: function (incident, isNew) {
        var me = this;
        $.ajax("api/foto?fotoForIncident", {data: {incidentNummer: incident.IncidentNummer}})
                .done(function (result) {
                    me.buildFotoWindow(result, isNew);
                });
    },

    buildFotoWindow: function (data, isNew) {
        var me = this;
        $("#t_foto_title").text("Foto (" + data.length + ")");
        var isFirst = me.carouselItems.length === 0;
        if (data.length > me.carouselItems.length && !isNew && !dbkjs.modules.incidents.controller.incidentDetailsWindow.isVisible()) {
            me.alertFoto(true);
        }
        if (data.length > 0 && data.length > me.carouselItems.length) { // photo added
            me.addMultiplePicturesToCarousel(data);
        } else if(data.length >= 0 && data.length < me.carouselItems.length){ // photo deleted
           me.resetCarousel();
           me.addMultiplePicturesToCarousel(data);
           $('.item').first().addClass('active');
        } 
        if (isFirst && data.length > 0) {
            $('.item').first().addClass('active');
        }
    },
    
    addMultiplePicturesToCarousel: function (data) {
        var me = this;
        $.each(data, function (i, object) {
            if (!me.objectIsinList(me.carouselItems, object.filename)) {
                me.carouselItems.push(object.filename);
                var path = safetymaps.utils.getAbsoluteUrl(me.options.path + object.filename);
                var info = (object.omschrijving === "" ? "" : object.omschrijving);
                me.image_carousel_inner.append('<div class="item"><img class="img-full" style="width: 100%" src="' + path +
                        '"><div class="carousel-caption"><h3>' + info + '</h3></div></div>');
                me.image_carousel_nav.append('<li data-target="#foto_carousel" data-slide-to="' + i + '"></li>');
            }
        });
    },
    
    addSinglePictureToCarousel: function () {
        var me = this;
        var i;
        var path = safetymaps.utils.getAbsoluteUrl(me.options.path + me.fileName);
        var info = $("#input_textfield").val();
        if(me.carouselItems.length === 0){
            i = 0;
        } else {
            i = me.carouselItems.lenght+1;
        }
        me.image_carousel_inner.append('<div class="item"><img class="img-full" style="width: 100%" src="' + path +
                '"><div class="carousel-caption"><h3>' + info + '</h3></div></div>');
        me.image_carousel_nav.append('<li data-target="#foto_carousel" data-slide-to="' + i + '"></li>');
        if(i===0){
            $('.item').first().addClass('active');
        }
        me.carouselItems.push(me.fileName);
        $("#t_foto_title").text("Foto (" +me.carouselItems.length+")");
    },
    
    initCarousel: function () {
        var me = this;
        me.image_carousel.append(me.image_carousel_nav);
        me.image_carousel.append(me.image_carousel_inner);
        me.image_carousel.append('<a class="left carousel-control" style="bottom: auto" href="#' + me.carouselId + '" data-slide="prev">' +
                '<span class="fa fa-arrow-left"></span></a>');
        me.image_carousel.append('<a class="right carousel-control" style="bottom: auto" href="#' + me.carouselId + '" data-slide="next">' +
                '<span class="fa fa-arrow-right"></span></a>');
        $("#tab_foto").text("");
        me.image_carousel.appendTo("#tab_foto");
        $("#t_foto_title").on("click", function () {
            me.alertFoto(false);
        });
    },

    objectIsinList: function (list,filename) {
        var me = this;
        if (list.length === 0) {
            return false;
        } else {
            var found = false;
            for (var i = 0; i < list.length; i++) {
                if (filename === list[i]) {
                    found = true;
                    break;
                }
            }
            return found;
        }
    },

    resetCarousel: function () {
        var me = this;
        me.carouselItems = [];
        me.image_carousel = $('<div id="foto_carousel" class="carousel slide" data-interval="false"></div>');
        me.image_carousel_inner = $('<div class="carousel-inner"></div>');
        me.image_carousel_nav = $('<ol class="carousel-indicators"></ol>');
        me.initCarousel();
    },
    
    alertFoto: function (alertFoto) {
        dbkjs.modules.incidents.controller.button.setFotoAlert(alertFoto);
    }
};