/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


dbkjs.modules.fotoFunctionaliteit = {
    id: "dbk.module.fotoFunctionaliteit",
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
            keyupTimeout: 100,
            minSearchLength: 3
        }, this.options);

        me.createButton();
        me.createPopup();

        $(dbkjs).one("dbkjs_init_complete", function () {
            me.initCarousel();
            if (dbkjs.modules.incidents && dbkjs.modules.incidents.controller) {
                $(dbkjs.modules.incidents.controller).on("new_incident", function (event, commonIncident, incident) {
                    me.getFotoForIncident(incident, true);
                });
                $(dbkjs.modules.incidents.controller).on("incidents.vehicle.update", function (event, incident) {
                    me.getFotoForIncident(incident, false);
                });
                $(dbkjs.modules.incidents.controller).on("voertuigNummerUpdated", function (bool) {
                    me.carouselItems = [];
                    me.resetCarousel();
                    dbkjs.modules.incidents.controller.button.setFotoAlert(false);
                });
                $(dbkjs.modules.incidents.controller).on("end_incident", function () {
                    me.carouselItems = [];
                    me.resetCarousel();
                    dbkjs.modules.incidents.controller.button.setFotoAlert(false);
                });
            }
        });
    },

    createButton: function () {
        var me = this;
        var fotoContainer = $("<div id='foto_buttons'/>").css({
                "position": "absolute",
                "left": "20px",
                "top": "20px",
                "z-index": "3000"
            });
        fotoContainer.appendTo("#mapc1map1");
        $("#btn_fotoFunc").css({"display": "block", "font-size": "24px"}).removeClass("navbar-btn").appendTo(fotoContainer).show();
        $("#btn_fotoFunc").click(function(e){
            e.preventDefault();
                    me.takePicture();
        });
    },

    createPopup: function () {
        var me = this;

        this.popup = dbkjs.util.createModalPopup({
            title: i18n.t("search.foto")
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
                });

        me.button = $("<a></a>")
                .attr({
                    id: "btn_fotoSave",
                    class: "btn btn-default navbar-btn",
                    href: "#",
                    title: i18n.t("search.button"),
                })
                .append("<i class='fa fa-save'></i>")
                .click(function (e) {
                    e.preventDefault();
                    me.savePicture();
                });

        this.popup.getView().append(me.img);
        this.popup.getView().append(me.button);
        this.popup.getView().append("<div><input type='text' disabled id='input_filename'></div>");
        this.popup.getView().append("<textarea id='input_textfield'></textarea>");
    },

    takePicture: function () {
        console.log("foto aan het maken..");
        var me = this;
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
        xhr.open('POST', dbkjs.dataPath + 'foto', true);
        xhr.onload = function () {
            if (xhr.status === 200) {
                // File(s) uploaded.
                var response = JSON.parse(xhr.responseText);
                alert(response.message);
                //me.carouselItems.push(me.fileName);
                me.popup.hide();
            } else {
                alert('An error occurred! wiht status code: ' + xhr.status);
            }
        };
        xhr.send(formData);
    },

    getFotoForIncident: function (incident, isNew) {
        var me = this;
        $.ajax(dbkjs.dataPath + "foto?fotoForIncident", {data: {incidentNummer: incident.IncidentNummer}})
                .done(function (result) {
                    me.buildFotoWindow(result, isNew);
                });
    },

    buildFotoWindow: function (data, isNew) {
        var me = this;
        $("#t_foto_title").text("Foto (" + data.length + ")");
        var isFirst = me.carouselItems.length === 0;
        if (data.length > me.carouselItems.length && me.carouselItems.length !== 0 ) {
            me.alertFoto(true);
        }
        if (data.length > 0) {
            $.each(data, function (i, object) {
                if (!me.objectIsinList(object.filename)) {
                    var path = safetymaps.creator.api.fotoPath + object.filename;
                    var info = (object.omschrijving === "" ? "Geen opmerkingen" : object.omschrijving)
                    me.image_carousel_inner.append('<div class="item"><img class="img-full" style="width: 100%" src="' + path +
                            '"><div class="carousel-caption"><h3>' + info + '</h3></div></div>');
                    me.image_carousel_nav.append('<li data-target="#foto_carousel" data-slide-to="' + i + '"></li>');
                }
            });
        }
        if (isFirst && data.length > 0) {
            $('.item').first().addClass('active');
        }
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

    objectIsinList: function (filename) {
        var me = this;
        if (me.carouselItems.length === 0) {
            me.carouselItems.push(filename);
            return false;
        } else {
            var found = false;
            for (var i = 0; i < me.carouselItems.length; i++) {
                if (filename === me.carouselItems[i]) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                me.carouselItems.push(filename);
            }
            return found;
        }
    },

    resetCarousel: function () {
        var me = this;
        me.image_carousel = $('<div id="foto_carousel" class="carousel slide" data-interval="false"></div>');
        me.image_carousel_inner = $('<div class="carousel-inner"></div>');
        me.image_carousel_nav = $('<ol class="carousel-indicators"></ol>');
        me.initCarousel();
    },
    
    alertFoto: function (alertFoto) {
        dbkjs.modules.incidents.controller.button.setFotoAlert(alertFoto);
    }
};