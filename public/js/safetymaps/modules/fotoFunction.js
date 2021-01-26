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
    windowsPopup: null,
    picture: null,
    incidentNr: null,
    fileName: null,
    extensie: null,
    updateFotoTimeout: null,
    useWindowsCamera: false,
    windowsCameras: {devices:[],index:0},
    carouselId: "foto_carousel",
    image_carousel: $('<div id="foto_carousel" class="carousel slide" data-interval="false"></div>'),
    image_carousel_inner: $('<div class="carousel-inner"></div>'),
    image_carousel_nav: $('<ol class="carousel-indicators"></ol>'),
    carouselItems: [],

    register: function () {
        var me = this;

        this.options = $.extend({
            showGallery: false,
            apiPath: dbkjs.options.urls && dbkjs.options.urls.apiPath ? dbkjs.options.urls.apiPath + "foto" : "api/foto",
            interval: 10000
        }, this.options);

        $('<input type="file" id="fotoConnector" accept="image/*" capture="camera" style="display: none;">').appendTo("body");

        me.checkForWindowsCamera();
        if (me.useWindowsCamera) {
            me.createWindowsPopup();
        }
        me.createButton();
        me.createPopup();

        $(dbkjs).one("dbkjs_init_complete", function () {
            me.initCarousel();
            if (dbkjs.modules.incidents && dbkjs.modules.incidents.controller) {
                $(dbkjs.modules.incidents.controller).on("new_incident", function (event, commonIncident, incident) {
                    me.incidentNr = commonIncident.nummer || incident.IncidentNummer;
                    me.resetCarousel();
                    me.getFotoForIncident(incident, true);
                    me.clearTimer();
                    me.updateFotoTimeout = window.setInterval(function() {
                        me.getFotoForIncident(incident, false);
                    }, me.options.interval);
                });
                $(dbkjs.modules.incidents.controller).on("end_incident", function () {
                    me.incidentNr = null;
                    me.resetCarousel();
                    dbkjs.modules.incidents.controller.button.setFotoAlert(false);
                    me.clearTimer();
                });
            }
        });
        if(me.options.showGallery){
            $("#fotoConnector").removeAttr("capture");
        }
    },

    clearTimer: function () {
        if(me.updateFotoTimeout) {
            window.clearInterval(me.updateFotoTimeout);
            me.updateFotoTimeout = null;
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
        if (me.useWindowsCamera) {
            me.startCamera();
            me.showWindowsPopup();
        } else {
            $("#btn_fotoSave").removeAttr("disabled");
            $("#fotoConnector").click();
            $('#fotoConnector').change(function (event) {
                me.showPicture(event);
            });
        }
    },

    showPicture: function (event) {
        var me = this;
        var fileInput = event.target.files;

        me.extensie = fileInput[0].name.split('.').pop();
        var prefix = me.incidentNr ? "_" : "";
        me.fileName = (me.incidentNr || '') + prefix + (new Date).getTime().toString() + "_foto." + me.extensie;
        $("#input_filename").val(me.fileName);
        if (fileInput.length > 0) {
            var windowURL = window.URL || window.webkitURL;
            var picURL = windowURL.createObjectURL(fileInput[0]);
            me.picture = fileInput[0];
            me.resizePhoto(picURL);
            $("#pictured").attr({"src": picURL});
            $("#input_textfield").val("");
            me.showPopup();
        }
    },

    showPictureForWindows: function () {
        var me = this;

        var prefix = me.incidentNr ? "_" : "";
        me.fileName = (me.incidentNr || '') + prefix + (new Date).getTime().toString() + "_foto.png";
        $("#input_filename").val(me.fileName);

        var windowURL = window.URL || window.webkitURL;
        var picURL = windowURL.createObjectURL(me.file);
        me.picture = me.file;
        me.resizePhoto(picURL);
        $("#pictured").attr({"src": picURL});
        $("#input_textfield").val("");
        me.showPopup();

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
        xhr.open('POST', me.options.apiPath, true);
        xhr.withCredentials = true;
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

    resizePhoto: function (photoUrl) {
        var me = this;
        var img = new Image();
        var width = 800;

        img.onload = function() {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext("2d");
            var oc = document.createElement('canvas');
            var octx = oc.getContext('2d');
         
            canvas.width = width; 
            canvas.height = canvas.width * img.height / img.width;
         
            var cur = {
              width: Math.floor(img.width * 0.5),
              height: Math.floor(img.height * 0.5)
            }
         
            oc.width = cur.width;
            oc.height = cur.height;
         
            octx.drawImage(img, 0, 0, cur.width, cur.height);
         
            while (cur.width * 0.5 > width) {
              cur = {
                width: Math.floor(cur.width * 0.5),
                height: Math.floor(cur.height * 0.5)
              };
              octx.drawImage(oc, 0, 0, cur.width * 2, cur.height * 2, 0, 0, cur.width, cur.height);
            }

            ctx.drawImage(oc, 0, 0, cur.width, cur.height, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(function (file) {
                me.picture = file;
            });
         }
        img.src = photoUrl;
    },

    getFotoForIncident: function (incidentInfo, isNew) {
        var me = this;
        $.ajax(me.options.apiPath, {
            data: {
                fotoForIncident: true,
                incidentNummer: incidentInfo.IncidentNummer ? incidentInfo.IncidentNummer : incidentInfo.incident.nummer
            },
            xhrFields: {
                withCredentials: true
            },
            crossDomain: true
        })
        .done(function(result, textStatus, xhr) {
            var currentTitle = $("#t_foto_title").text();
            if(xhr.status !== 200) {
                if (currentTitle.slice(-1) !== '!') {
                    $("#t_foto_title").text($("#t_foto_title").text() + ' !');
                }
            } else {
                me.buildFotoWindow(result, isNew);
            }
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
                var path = safetymaps.utils.getAbsoluteUrl(me.options.apiPath + "?download=t&fileName=" + object.filename);
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
        var path = safetymaps.utils.getAbsoluteUrl(me.options.apiPath + "?download=t&fileName=" + me.fileName);
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
    },

    //TODO gebruiker de keuze geven welke camera gebruikt moet worden -> opslaan in local storage
    checkForWindowsCamera: function () {
        var me = this;
        if (typeof(navigator.mediaDevices) !== "undefined" && (navigator.userAgent.match(/Win64/i) || navigator.userAgent.match(/Win32/i) || navigator.userAgent.match(/Windows/i))) {
            navigator.mediaDevices.enumerateDevices()
                    .then(function (devices) {
                        devices.forEach(function (device) {
                            if (device.kind === "videoinput") {
                                console.log("windows camera found");
                                me.windowsCameras.devices.push(device.deviceId);
                                me.useWindowsCamera = true;
                                me.contsraint = {video: {
                                        deviceId: me.windowsCameras.devices[me.windowsCameras.index]
                                    }
                                };
                            }
                        });
                    });
        }
    },

    createWindowsPopup: function () {
        var me = this;

        this.windowsPopup = dbkjs.util.createModalPopup({
            title: "Foto maken",
            hideCallback: function () {
                if (me.stream && me.stream.active) {
                    me.stream.getVideoTracks()[0].stop();
                }
            }
        });
        
        this.windowsPopup.getView()[0].style = "background-color : black";
        
        me.video = $("<video></video>")
                .attr({
                    id: "cameraView",
                    src: "",
                    alt: "windows",
                    width: 800,
                    height: 600,
                    autoplay: true
                })
                .css({
                    border: "solid 8px black",
                    "margin-left": "25%"
                });

        me.canvas = $("<canvas></canvas>")
                .attr({
                    id: "cameraCanvas",
                    src: "",
                    alt: "windows",
                    width: 1920,
                    height: 1440
                })
                .css({border: "solid 8px black", display: "none"});

        me.preview = $("<img></img>")
                .attr({
                    id: "preview",
                    src: "",
                    alt: "fotoConnector",
                    width: 800,
                    height: 600
                })
                .css({border: "solid 8px black", display: "none"});

        me.takePhotoButton = $("<button>Maak foto</button>")
                .attr({
                    id: "takePhoto",
                    class: "btn btn-primary"
                });

        me.cancelPhotoButton = $("<button>Annuleer</button>")
                .attr({
                    id: "cancelPhoto",
                    class: "btn btn-primary"
                });
        
        me.changeCameraButton = $("<button>Verander camera</button>")
                .attr({
                    id: "changeCamera",
                    class: "btn btn-primary"
                });
        
        me.usePhotoButton = $("<button>Gebruik</button>")
                .attr({
                    id: "usePhoto",
                    class: "btn btn-primary"
                })
                .css({display: "none"});
        me.remakePhotoButton = $("<button>opnieuw</button>")
                .attr({
                    id: "remakePhoto",
                    class: "btn btn-primary"
                })
                .css({display: "none"});
        this.windowsPopup.getView().append(me.video);
        this.windowsPopup.getView().append(me.canvas);
        this.windowsPopup.getView().append(me.preview);
        this.windowsPopup.getView().append(me.takePhotoButton);
        this.windowsPopup.getView().append(me.cancelPhotoButton);
        this.windowsPopup.getView().append(me.changeCameraButton);
        this.windowsPopup.getView().append(me.usePhotoButton);
        this.windowsPopup.getView().append(me.remakePhotoButton);

        me.takePhotoButton.click(function () {
            $("#takePhoto").hide();
            $("#cancelPhoto").hide();
            $("#changeCamera").hide();
            $("#cameraCanvas")[0].getContext("2d").drawImage($("#cameraView")[0], 0, 0);
            $("#cameraCanvas")[0].toBlob(function (file) {
                me.file = file;
                var windowURL = window.URL || window.webkitURL;
                var picURL = windowURL.createObjectURL(file);
                $("#preview").attr({"src": picURL});
            });
            $("#cameraView").hide();
            $("#cameraView")[0].srcObject = null;
            $("#preview").show();
            $("#usePhoto").show();
            $("#remakePhoto").show();
        });

        me.cancelPhotoButton.click(function () {
            me.stream.getVideoTracks()[0].stop();
            me.windowsPopup.hide();
        });


        me.usePhotoButton.click(function () {
            me.stream.getVideoTracks()[0].stop();
            me.windowsPopup.hide();
            me.showPictureForWindows();
        });
        
        me.remakePhotoButton.click(function(){
            me.takePicture();
        });
        
        me.changeCameraButton.click(function(){
            me.changeCamera();
        });
    },

    startCamera: function () {
        var me = this;
        navigator.mediaDevices.getUserMedia(me.contsraint)
                .then(function (stream) {
                    if(me.stream && me.stream.active){
                        me.stream.getVideoTracks()[0].stop();
                    }
                    me.stream = stream;
                    var track = stream.getVideoTracks()[0];
                    var cap = track.getCapabilities();
                    $("#cameraView")[0].srcObject = stream;
                    track.applyConstraints({
                        width: {min: 640, ideal: cap.width.max},
                        height: {min: 480, ideal: cap.height.max}});
                    })
                .catch(function (error) {
                    console.error("Oops. Something is broken.", error);
                });
    },
    
    changeCamera: function() {
        var me = this;
        me.windowsCameras.index++;
        if(me.windowsCameras.index > me.windowsCameras.devices.length - 1 ){
            me.windowsCameras.index = 0;
        }
        me.contsraint = {video: {
                deviceId: me.windowsCameras.devices[me.windowsCameras.index]
            }
        };
        me.takePicture();
        
    },
    
    resetWindowsPopup: function () {
        $("#takePhoto").show();
        $("#cancelPhoto").show();
        $("#changeCamera").show();
        $("#cameraView").show();
        $("#preview").hide();
        $("#usePhoto").hide();
        $("#remakePhoto").hide();
    },

    showWindowsPopup: function () {
        if (this.windowsPopup === null) {
            this.createWindowsPopup();
        }
        this.resetWindowsPopup();
        this.windowsPopup.show();
    }
};
