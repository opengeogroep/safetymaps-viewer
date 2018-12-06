/*!
 *  Copyright (c) 2014 Milo van der Linden (milo@dogodigi.net)
 *
 *  This file is part of opendispatcher/safetymapsDBK
 *
 *  opendispatcher is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  opendispatcher is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with opendispatcher. If not, see <http://www.gnu.org/licenses/>.
 *
 */

/* global OpenLayers, dbkjs, i18n */

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};
dbkjs.modules.support = {
    id: "dbk.modules.support",
    register: function () {
        var _obj = dbkjs.modules.support;

        _obj.options = $.extend({
            hideGeneralSubject: false,
            hideTel: false,
            subjectSplit: ",",
            savedUntilBackInStation: false
        }, _obj.options);

        _obj.layer = new OpenLayers.Layer.Vector("Support");
        dbkjs.map.addLayer(_obj.layer);

        _obj.markerStyle = {externalGraphic: 'images/supportmarker.png', graphicHeight: 32, graphicWidth: 32, graphicXOffset: -16, graphicYOffset: -32};
        var mark = dbkjs.util.getQueryVariable('mark');

        if (mark) {
            var coords = mark.split(",");
            var feature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(coords[0], coords[1]),
                {},
                _obj.markerStyle
            );
            _obj.layer.addFeatures(feature);
        }

        if (dbkjs.options.organisation.support) {

            var div = $("<div id='btn_support'/>").attr("style", "position: absolute; width: 48px; left: 20px; bottom: 20px; z-index: 3000");
            var a = $("<a/>")
                    .attr("id", "foutknop-mobile")
                    .attr("title", dbkjs.options.organisation.support.button)
                    .addClass("btn btn-default olButton")
                    .attr("style", "display: block; font-size: 24px")
                    .on("click", function() {
                        _obj.open();
                    });
            $("<i/>").addClass("fa fa-at").appendTo(a);
            a.appendTo(div);
            div.appendTo("#mapc1map1");

            _obj.supportpanel = dbkjs.util.createDialog('supportpanel', '<i class="fa fa-envelope-o"></i> ' + dbkjs.options.organisation.support.button, 'bottom:0;left:0;');
            $('body').append(_obj.supportpanel);
            _obj.supportpanel.find('.close').click(function () {
                _obj.layer.destroyFeatures();
                _obj.drag.deactivate();
                dbkjs.map.removeControl(_obj.drag);
                dbkjs.hoverControl.activate();
                dbkjs.selectControl.activate();
                $('#supportpanel').hide();
                $('#btn_support').show();
            });
        }
    },

    open: function() {
        var _obj = this;

        dbkjs.hoverControl.deactivate();
        dbkjs.selectControl.deactivate();
        _obj.layer.destroyFeatures();
        dbkjs.map.raiseLayer(_obj.layer, dbkjs.map.layers.length);
        var center = dbkjs.map.getCenter();
        var feature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(center.lon, center.lat),
                {some: 'data'},
                _obj.markerStyle
        );
        _obj.feature = feature;
        _obj.layer.addFeatures(feature);
        _obj.drag = new OpenLayers.Control.DragFeature(_obj.layer, {
            'onDrag': function (feature, pixel) {
                _obj.feature = feature;
            }
        });
        dbkjs.map.addControl(_obj.drag);
        _obj.drag.activate();
        $('#supportpanel_b').html('').css('padding-top', '0px');
        //Selectie voor kaartlagen
        var layerarray = [];
        $.each(dbkjs.map.layers, function (l_index, layer) {
            // TODO: prefix the layers with _, remove hardcoded list here
            if (layer.name.indexOf("Creator") !== 0 && $.inArray(layer.name, ["Object cluster", 'Support']) === -1) {
                if (layer.name.indexOf("OpenLayers_") !== 0 && layer.name.indexOf("_") !== 0 && layer.getVisibility()) {
                    layerarray.push(layer.name);
                }
            }
        });
        layerarray.sort();
        var p = $('<form id="support-form"  class="form-horizontal" role="form"></form>');
        $("#supportpanel_b").prepend('<p id="email_help"><i>' + i18n.t('email.help') + ' ' + (_obj.options.savedUntilBackInStation ? i18n.t('email.savedUntilBackInStation') : '') + '</i></p>');
        var laag_input = $('<div class="form-group"></div>');
        var select = $('<select name="subject" class="form-control"></select>');
        if(!_obj.options.hideGeneralSubject) {
            select.append('<option selected>' + i18n.t('email.generalmessage') + '</option>');
        }
        if(dbkjs.options.organisation.support.subjects) {
            var subjects = dbkjs.options.organisation.support.subjects.split(_obj.options.subjectSplit);
            for(var i = 0; i < subjects.length; i++) {
                select.append('<option>' + subjects[i] + '</option>');
            }
        } else {
            $.each(layerarray, function (l_index, name) {
                select.append('<option>' + name + '</option>');
            });
        }
        laag_input.append('<label class="col-sm-2 control-label" for="subject">' + i18n.t('email.subject') + '</label>');
        laag_input.append($('<div class="col-sm-8"></div>').append(select));
        p.append(laag_input);
        var placeholder = i18n.t("email.address.placeholder") === "email.address.placeholder" ? i18n.t("email.address") : i18n.t("email.address.placeholder");
        var adres_input = $('<div class="form-group"><label class="col-sm-2 control-label" for="address">' +
                i18n.t('email.address') +
                '</label><div class="col-sm-8"><input id="address" name="address" type="text" class="form-control" placeholder="' +
                placeholder + '"></div></div>');
        p.append(adres_input);
        var user_input = $('<div class="form-group"><label class="col-sm-2 control-label" for="name">' +
                i18n.t('email.name') +
                ' *</label><div class="col-sm-8"><input id="name" name="name" type="text" class="form-control required" placeholder="' +
                i18n.t('email.name') + '"></div></div>');
        if(!_obj.options.hideUser) {
            p.append(user_input);
        }
        placeholder = i18n.t("email.email.placeholder") === "email.email.placeholder" ? i18n.t("email.email") : i18n.t("email.email.placeholder");
        var mail_input = $('<div class="form-group"><label class="col-sm-2 control-label" for="email">' +
                i18n.t('email.email') +
                ' *</label><div class="col-sm-8"><input id="email" name="email" type="email" class="form-control required" placeholder="' +
                placeholder + '"></div></div>');
        p.append(mail_input);
        var tel_input = $('<div class="form-group"><label class="col-sm-2 control-label" for="phone">' +
                i18n.t('email.phone') +
                '</label><div class="col-sm-8"><input id="phone" name="phone" type="tel" class="form-control" placeholder="' +
                i18n.t('email.phone') + '"></div></div>');
        if(!_obj.options.hideTel) {
            p.append(tel_input);
        }
        var remarks_input = $('<div class="form-group"><label class="col-sm-2 control-label" for="remarks">' +
                i18n.t('email.remarks') +
                ' *</label><div class="col-sm-8"><textarea id="remarks" name="remarks" class="form-control required" placeholder="' +
                i18n.t('email.remarks') + '"></textarea></div></div>');
        p.append(remarks_input);
        p.append('<button type="submit" class="btn btn-primary btn-block">' + i18n.t('email.send') + '</button>');
        $('#supportpanel_b').append(p);
        $('#supportpanel').show();
        $('#btn_support').hide();
        $("#support-form").bind('submit', function (e) {
            var isValid = true;
            var data = {};
            $('#support-form').find('input, textarea, select').each(function (i, field) {

                if ($(field).hasClass("required") && field.value === "") {
                    isValid = false;
                    $(field).addClass("has-error");
                }
                data[field.name] = field.value;
            });
            if (!isValid) {
                e.preventDefault();
                return false;
            }
            else {
                //add the permalink
                data.permalink = $('#permalink').attr('href');
                var i = data.permalink.indexOf("#");
                var markParam = (data.permalink.indexOf("?") === -1 ? "?" : "&") + "mark=" + _obj.feature.geometry.x + "," + _obj.feature.geometry.y;
                if (i === -1) {
                    data.permalink += markParam;
                } else {
                    var hash = data.permalink.substring(i);
                    data.permalink = data.permalink.substring(0, i) + markParam + hash;
                }
                var geoJSON = new OpenLayers.Format.GeoJSON();
                data.geometry = JSON.parse(geoJSON.write(_obj.feature.geometry));
                data.srid = dbkjs.options.projection.srid;
                if(_obj.options.hideUser) {
                    data.name = 'Voertuigviewer';
                }
                var url = (dbkjs.options.urls && dbkjs.options.urls.annotation ? dbkjs.options.urls.annotation
                        : dbkjs.basePath + 'api/annotation/');
                jQuery.ajax({
                    type: "POST",
                    url: url,
                    dataType: "json",
                    data: data
                }).always(function(data, textStatus, errorThrown) {
                    var message;
                    if(textStatus === "success") {
                        if(data.result || data.status === "ok" || data.success) {
                            message = i18n.t('email.sent');
                        } else {
                            message = i18n.t('email.error') + " ";
                            if(data.error) {
                                message += data.error;
                            }
                            if(data.message) {
                                message += data.message;
                            }
                        }
                    } else {
                        message = i18n.t('email.error') + " " + errorThrown;
                    }
                    $('#supportpanel_b').html('<p class="bg-info">' + message + '</p>');

                    _obj.layer.destroyFeatures();
                    _obj.drag.deactivate();
                    dbkjs.map.removeControl(_obj.drag);
                    dbkjs.hoverControl.activate();
                    dbkjs.selectControl.activate();

                    setTimeout(function () {
                        _obj.supportpanel.find(".close").click();
                    }, 5000);
                });
                _obj.layer.destroyFeatures();
                _obj.drag.deactivate();
                dbkjs.map.removeControl(_obj.drag);
                dbkjs.hoverControl.activate();
                dbkjs.selectControl.activate();
                e.preventDefault();
                return false;
            }
        });
    }
};
