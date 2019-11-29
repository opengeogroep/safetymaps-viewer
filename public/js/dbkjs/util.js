/*
 *  Copyright (c) 2014-2018 2014 Milo van der Linden (milo@dogodigi.net), B3Partners (info@b3partners.nl)
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

/* MDN Polyfill */
if (!String.prototype.repeat) {
  String.prototype.repeat = function(count) {
    'use strict';
    if (this == null) {
      throw new TypeError('can\'t convert ' + this + ' to object');
    }
    var str = '' + this;
    count = +count;
    if (count != count) {
      count = 0;
    }
    if (count < 0) {
      throw new RangeError('repeat count must be non-negative');
    }
    if (count == Infinity) {
      throw new RangeError('repeat count must be less than infinity');
    }
    count = Math.floor(count);
    if (str.length == 0 || count == 0) {
      return '';
    }
    // Ensuring count is a 31-bit integer allows us to heavily optimize the
    // main part. But anyway, most current (August 2014) browsers can't handle
    // strings 1 << 28 chars or longer, so:
    if (str.length * count >= 1 << 28) {
      throw new RangeError('repeat count must not overflow maximum string size');
    }
    var rpt = '';
    for (;;) {
      if ((count & 1) == 1) {
        rpt += str;
      }
      count >>>= 1;
      if (count == 0) {
        break;
      }
      str += str;
    }
    // Could we try:
    // return Array(count + 1).join(this);
    return rpt;
  }
}

/* MDN Polyfill */
if (!String.prototype.endsWith) {
	String.prototype.endsWith = function(search, this_len) {
		if (this_len === undefined || this_len > this.length) {
			this_len = this.length;
		}
		return this.substring(this_len - search.length, this_len) === search;
	};
}

/* MDN Polyfill */
if (!String.prototype.startsWith) {
    Object.defineProperty(String.prototype, 'startsWith', {
        value: function(search, pos) {
            return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
        }
    });
}

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;

dbkjs.argParser =
    OpenLayers.Class(OpenLayers.Control.ArgParser, {
        setMap: function (map) {
            OpenLayers.Control.prototype.setMap.apply(this, arguments);

            //make sure we dont already have an arg parser attached
            for (var i = 0, len = this.map.controls.length; i < len; i++) {
                var control = this.map.controls[i];
                if ( (control !== this) &&
                     (control.CLASS_NAME === "OpenLayers.Control.ArgParser") ) {

                    // If a second argparser is added to the map, then we
                    // override the displayProjection to be the one added to the
                    // map.
                    if (control.displayProjection !== this.displayProjection) {
                        this.displayProjection = control.displayProjection;
                    }

                    break;
                }
            }
            if (i === this.map.controls.length) {

                var args = this.getParameters();
                // Be careful to set layer first, to not trigger unnecessary layer loads
                if (args.b) {
                    // when we add a new layer, set its visibility
                    this.map.events.register('addlayer', this, this.configureLayers);
                    this.configureLayers();
                }
                if (args.lat && args.lon) {
                    this.center = new OpenLayers.LonLat(parseFloat(args.lon), parseFloat(args.lat));
                    if (args.zoom) {
                        this.zoom = parseFloat(args.zoom);
                    }

                    // when we add a new baselayer to see when we can set the center
                    this.map.events.register('changebaselayer', this, this.setCenter);
                    this.setCenter();
                }
            }
        },
        loadLayers: function () {
            var args = this.getParameters();
            if (!dbkjs.disableloadlayer) {
                if (args.ly && args.b) {
                    for (var i = 0, len = this.map.layers.length; i < len; i++) {
                        if (!this.map.layers[i].isBaseLayer &&
                                $.inArray(this.map.layers[i].metadata.pl, args.ly) !== -1) {
                            this.map.layers[i].setVisibility(true);
                        } else if (!this.map.layers[i].isBaseLayer &&
                                !dbkjs.util.isJsonNull(this.map.layers[i].metadata.pl)) {
                            this.map.layers[i].setVisibility(false);
                        }
                    }
                }
                if (args[i18n.t('app.queryDBK')] && dbkjs.modules.feature) {
                    dbkjs.options.dbk = args[i18n.t('app.queryDBK')];
                    var feature = dbkjs.modules.feature.getActive();
                    if (feature) {
                        dbkjs.protocol.jsonDBK.process(feature);
                        if (!args.lat && !args.lon && !args.zoom) {
                            dbkjs.modules.feature.zoomToFeature(feature);
                        }
                    }
                }
            }
        },
        configureLayers: function () {
            var args = this.getParameters();
            if (args.ly && args.b) {
                for (var i = 0, len = this.map.layers.length; i < len; i++) {
                    if (this.map.layers[i].isBaseLayer && args.b === this.map.layers[i].metadata.pl) {
                        this.map.setBaseLayer(this.map.layers[i]);
                        this.map.raiseLayer(this.map.layers[i], -1000);
                    }
                }
              }
        },
        CLASS_NAME: "dbkjs.ArgParser"
    });
dbkjs.Permalink =
    OpenLayers.Class(OpenLayers.Control.Permalink, {
    argParserClass: dbkjs.ArgParser,
    SELECT_ARGUMENT_KEY: "select",
    initialize: function (options) {
        OpenLayers.Control.Permalink.prototype.initialize.apply(this, arguments);
    },
    updateLink: function () {
        var separator = this.anchor ? '#' : '?';
        var updateLinkhref = this.base;
        var anchor = null;
        if (updateLinkhref.indexOf("#") !== -1 && this.anchor === false) {
            anchor = updateLinkhref.substring(updateLinkhref.indexOf("#"), updateLinkhref.length);
        }
        if (updateLinkhref.indexOf(separator) !== -1) {
            updateLinkhref = updateLinkhref.substring(0, updateLinkhref.indexOf(separator));
        }
        var splits = updateLinkhref.split("#");
        updateLinkhref = splits[0] + separator + OpenLayers.Util.getParameterString(this.createParams());
        if (anchor) {
            updateLinkhref += anchor;
        }
        if (this.anchor && !this.element) {
            window.location.href = updateLinkhref;
        } else {
            this.element.href = updateLinkhref;
        }
    },
    createParams: function (center, zoom, layers) {
        center = center || this.map.getCenter();

        var params = OpenLayers.Util.getParameters(this.base);
        // If there's still no center, map is not initialized yet.
        // Break out of this function, and simply return the params from the
        // base link.
        if (dbkjs.options) {
            if (dbkjs.options.dbk && dbkjs.options.dbk !== 0) {
                params[i18n.t('app.queryDBK')] = dbkjs.options.dbk;
            }
        }
        if (center) {
            //zoom
            params.zoom = zoom || this.map.getZoom();

            //lon,lat
            var lat = center.lat;
            var lon = center.lon;

            if (this.displayProjection) {
                var mapPosition = OpenLayers.Projection.transform(
                    { x: lon, y: lat },
                    this.map.getProjectionObject(),
                    this.displayProjection
                );
                lon = mapPosition.x;
                lat = mapPosition.y;
            }
            params.lat = Math.round(lat * 100000) / 100000;
            params.lon = Math.round(lon * 100000) / 100000;


            //layers
            layers = this.map.layers;
            params.ly = [];
            for (var i = 0, len = layers.length; i < len; i++) {
                var layer = layers[i];
                if (layer.isBaseLayer) {
                    if (layer === this.map.baseLayer) {
                        params.b = layer.metadata.pl;
                    }
                } else {
                    if (layer.metadata.pl && layer.getVisibility()) {
                        params.ly.push(layer.metadata.pl);
                    }
                }
            }
        }
        return params;
    },
    CLASS_NAME: "dbkjs.Permalink"
});

/**
 * Override drawText function on openlayers SVG.js
 */
OpenLayers.Renderer.SVG.prototype.drawText = function(featureId, style, location) {

    var drawOutline = (!!style.labelOutlineWidth);
    // First draw text in halo color and size and overlay the
    // normal text afterwards
    if (drawOutline) {
        var outlineStyle = OpenLayers.Util.extend({}, style);
        outlineStyle.fontColor = outlineStyle.labelOutlineColor;
        outlineStyle.fontStrokeColor = outlineStyle.labelOutlineColor;
        outlineStyle.fontStrokeWidth = style.labelOutlineWidth;
        if (style.labelOutlineOpacity) {
            outlineStyle.fontOpacity = style.labelOutlineOpacity;
        }
        delete outlineStyle.labelOutlineWidth;
        this.drawText(featureId, outlineStyle, location);
    }

    var resolution = this.getResolution();

    var x = ((location.x - this.featureDx) / resolution + this.left);
    var y = (location.y / resolution - this.top);

    var suffix = (drawOutline) ? this.LABEL_OUTLINE_SUFFIX : this.LABEL_ID_SUFFIX;
    var label = this.nodeFactory(featureId + suffix, "text");

    label.setAttributeNS(null, "x", x);
    label.setAttributeNS(null, "y", -y);

    if (style.fontColor) {
        label.setAttributeNS(null, "fill", style.fontColor);
    }
    if (style.fontStrokeColor) {
        label.setAttributeNS(null, "stroke", style.fontStrokeColor);
    }
    if (style.fontStrokeWidth) {
        label.setAttributeNS(null, "stroke-width", style.fontStrokeWidth);
    }
    if (style.fontOpacity) {
        label.setAttributeNS(null, "opacity", style.fontOpacity);
    }
    if (style.fontFamily) {
        label.setAttributeNS(null, "font-family", style.fontFamily);
    }
    if (style.fontSize) {
        label.setAttributeNS(null, "font-size", style.fontSize);
    }
    if (style.fontWeight) {
        label.setAttributeNS(null, "font-weight", style.fontWeight);
    }
    if (style.fontStyle) {
        label.setAttributeNS(null, "font-style", style.fontStyle);
    }
    if (style.labelSelect === true) {
        label.setAttributeNS(null, "pointer-events", "visible");
        label._featureId = featureId;
    } else {
        label.setAttributeNS(null, "pointer-events", "none");
    }
    if (style.rotation) {
        label.setAttributeNS(null, "transform",
            'rotate(' + style.rotation + ',' + x + ',' + -y + ')'
        );
    }
    var align = style.labelAlign || OpenLayers.Renderer.defaultSymbolizer.labelAlign;
    label.setAttributeNS(null, "text-anchor",
            OpenLayers.Renderer.SVG.LABEL_ALIGN[align[0]] || "middle");

    if (OpenLayers.IS_GECKO === true) {
        label.setAttributeNS(null, "dominant-baseline",
                OpenLayers.Renderer.SVG.LABEL_ALIGN[align[1]] || "central");
    }

    var labelRows = style.label.split('\n');
    var numRows = labelRows.length;
    while (label.childNodes.length > numRows) {
        label.removeChild(label.lastChild);
    }
    for (var i = 0; i < numRows; i++) {
        var tspan = this.nodeFactory(featureId + suffix + "_tspan_" + i, "tspan");
        if (style.labelSelect === true) {
            tspan._featureId = featureId;
            tspan._geometry = location;
            tspan._geometryClass = location.CLASS_NAME;
        }
        if (OpenLayers.IS_GECKO === false) {
            tspan.setAttributeNS(null, "baseline-shift",
                    OpenLayers.Renderer.SVG.LABEL_VSHIFT[align[1]] || "-35%");
        }
        tspan.setAttribute("x", x);
        if (i === 0) {
            var vfactor = OpenLayers.Renderer.SVG.LABEL_VFACTOR[align[1]];
            // @todo: the if clause was: if(vfactor == null), this is deprecated
            if (!vfactor) {
                vfactor = -0.5;
            }
            tspan.setAttribute("dy", (vfactor * (numRows - 1)) + "em");
        } else {
            tspan.setAttribute("dy", "1em");
        }
        tspan.textContent = (labelRows[i] === '') ? ' ' : labelRows[i];
        if (!tspan.parentNode) {
            label.appendChild(tspan);
        }
    }

    if (!label.parentNode) {
        this.textRoot.appendChild(label);
    }
};
/**
 * Override to allow the selectfeature to differentiate the multiple select functionality between layers.
 * There is an array in the selectcontrol: multiselectlayers, which contain layer which should allow multiselection.
 * @returns {Boolean}
 */
OpenLayers.Control.SelectFeature.prototype.multipleSelect = function() {
    // check from upstream
    if( this.multiple || (this.handlers.feature.evt && this.handlers.feature.evt[this.multipleKey])){
        return true;
    }else{
        // create an quick opt out.
        if(!this.multiselectlayers || this.multiselectlayers.length === 0){
            return false;
        }else{
            // Retrieve feature from current event, and take the layer from that. Check the configured multiselectlayers against that.
            var currentLayer = this.handlers.feature.feature.layer;
            for(var i = 0 ; i < this.multiselectlayers.length; i++){
                if(currentLayer.id === this.multiselectlayers[i].id){
                    return true;
                }
            }
            return false;
        }
    }
};

/**
* Method: unselectAll
* Unselect all selected features.  To unselect all except for a single
*     feature, set the options.except property to the feature.
*
* Parameters:
* options - {Object} Optional configuration object.
*/
OpenLayers.Control.SelectFeature.prototype.unselectAll = function(options) {
   // we'll want an option to supress notification here
   var layers = this.layers || [this.layer],
       layer, feature, l, numExcept;
   for(l=0; l<layers.length; ++l) {
       layer = layers[l];
       if(this.multiselectlayers && this.multiselectlayers.indexOf(layer) !== -1){
           continue;
       }
       numExcept = 0;
       //layer.selectedFeatures is null when layer is destroyed and
       //one of it's preremovelayer listener calls setLayer
       //with another layer on this control
       if(layer.selectedFeatures != null) {
           while(layer.selectedFeatures.length > numExcept) {
               feature = layer.selectedFeatures[numExcept];
               if(!options || options.except != feature) {
                   this.unselect(feature);
               } else {
                   ++numExcept;
               }
           }
       }
   }
};

dbkjs.util = {
    layersLoading: [],
    modalPopupStore: {},
    onClick: function (e) {
        $('#wmsclickpanel').hide();
        console.log("onclick ", e.type, e.xy);
        //Check to see if a layer is required by a module and has getfeatureinfo set
        $.each(dbkjs.map.layers, function (lay_index, lay) {
            if (lay.visibility && lay.dbkjsParent && lay.dbkjsParent.getfeatureinfo) {
                lay.dbkjsParent.getfeatureinfo(e);
            }
        });
        $(dbkjs).trigger("mapClicked");
    },
    isJsonNull: function (val) {
        if (val === "null" || val === null || val === "" || typeof (val) === "undefined" || val === "undefined") {
            return true;
        } else {
            return false;
        }
    },
    /**
     *
     * @param {String} variable
     * @param {String} defaultvalue
     * @returns {String} the value for the given queryparameter
     */
    getQueryVariable: function (variable, defaultvalue) {
        var query = window.location.search.substring(1);
        var vars = query.split('&');
        var returnval = defaultvalue;
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=');
            if (decodeURIComponent(pair[0]) === variable) {
                returnval = decodeURIComponent(pair[1]);
            }
        }
        return returnval;
    },
    loadingStart: function (layer) {
        if(!dbkjs.options.showLayerLoadingPanel){
            return;
        }
        var arr_index = $.inArray(layer.name, this.layersLoading);
        if (arr_index === -1) {
            this.layersLoading.push(layer.name);
        }

        var alert = $('#systeem_meldingen');
        if (!alert[0]) {
            alert = $('<div id="systeem_meldingen" class="alert alert-dismissable alert-info"></div>');
            alert.append('<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>');
            alert.append('<i class="fa fa-spinner fa-spin"></i> ' + i18n.t('dialogs.busyloading') + ' ' + this.layersLoading.join(', ') + '...');
            $('body').append(alert);
            alert.show();
        } else {
            alert.removeClass('alert-success alert-info alert-warning alert-danger').addClass('alert-info');
            alert.html('');
            alert.append('<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>');
            alert.append('<i class="fa fa-spinner fa-spin"></i> ' + i18n.t('dialogs.busyloading') + ' ' + this.layersLoading.join(', ') + '...');
            alert.show();
        }

    },
    loadingEnd: function (layer) {
        if(!dbkjs.options.showLayerLoadingPanel){
            return;
        }
        var alert = $('#systeem_meldingen');
        if (this.layersLoading.length !== 0) {
            var arr_index = $.inArray(layer.name, this.layersLoading);
            if (arr_index !== -1) {
                this.layersLoading.splice(arr_index, 1);
            }

            if (!alert[0]) {
                if (this.layersLoading.length === 0) {
                    if (dbkjs.argparser) {
                        dbkjs.argparser.loadLayers();
                    }
                    alert.hide();
                } else {
                    alert = $('<div id="systeem_meldingen" class="alert alert-dismissable alert-info"></div>');
                    alert.append('<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>');
                    alert.append('<i class="fa fa-spinner fa-spin"></i> ' + i18n.t('dialogs.busyloading') + ' ' + this.layersLoading.join(', ') + '...');
                    $('body').append(alert);
                    alert.show();
                }
            } else {
                if (this.layersLoading.length === 0) {
                    if (dbkjs.argparser) {
                        dbkjs.argparser.loadLayers();
                    }
                    $('#cover').hide();
                    alert.hide();
                } else {
                    alert.removeClass('alert-success alert-info alert-warning alert-danger').addClass('alert-info');
                    alert.html('');
                    alert.append('<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>');
                    alert.append('<i class="fa fa-spinner fa-spin"></i> ' + i18n.t('dialogs.busyloading') + ' ' + this.layersLoading.join(', ') + '...');
                    alert.show();
                }
            }
        } else {
            //check the visible layers!
            if (dbkjs.argparser) {
                dbkjs.argparser.loadLayers();
            }
            alert.hide();
        }
    },
    showError: function(errMsg) {
        dbkjs.util.alert(i18n.t("error"), ' ' + errMsg, 'alert-danger');
    },
    alert: function (title, tekst, type) {
        if (!type) {
            type = 'alert-info';
        }
        var content = '<strong>' + title + '</strong> ' + tekst;
        var alert = $('#systeem_meldingen');
        if (!alert[0]) {
            alert = $('<div id="systeem_meldingen" class="alert alert-dismissable ' + type + '"></div>');
            alert.append('<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>');
            alert.append(' ' + content);
            $('body').append(alert);
            alert.show();
        } else {
            alert.removeClass('alert-success alert-info alert-warning alert-danger').addClass(type);
            alert.html('');
            alert.append('<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>');
            alert.append(' ' + content);
            alert.show();
        }
    },
    htmlEncode: function (value) {
        if (value) {
            return $('<div/>').text(value).html();
        } else {
            return '';
        }
    },
    createDialog: function (id, title, styleoptions) {
        if (!styleoptions) {
            styleoptions = '';
        }
        var dialog = $('<div class="panel dialog" id="' + id + '" style="display:none;' + styleoptions + '"></div>');
        var heading = $('<div id="' + id + '_h" class="panel-heading"></div>');
        var close_button = $('<button type="button" class="close" aria-hidden="true">&times;</button>');
        heading.append(close_button);
        heading.append('<span class="h4">' + title + '</span>');
        var dg_body = $('<div id="' + id + '_b" class="panel-body"></div>');
        var dg_footer = $('<div id="' + id + '_f" class="panel-footer"></div>');
        dialog.append(heading);
        dialog.append(dg_body);
        dialog.append(dg_footer);
        close_button.click(function () {
            dialog.hide();
        });
        return dialog;
    },
    strip: function (html) {
        var tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        return $(tmp).text().replace(urlRegex, function (url) {
            return '\n' + url;
        });
    },
    nl2br: function (s) {
        return s === null ? null : s.replace(/\n/g, "<br>");
    },
    renderHTML: function (text) {
        var rawText = this.strip(text);
        var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
        return rawText.replace(urlRegex, function (url) {
            if ((url.indexOf(".jpg") > 0) || (url.indexOf(".png") > 0) || (url.indexOf(".gif") > 0)) {
                return '<img src="' + url + '">' + '<br/>';
            } else {
                return '<a href="' + url + '" target="_blank">' + url + '</a>' + '<br/>';
            }
        });
    },
    createModalPopup: function (options) {
        // Init default options
        if (options === undefined) {
            options = {};
        }
        if (!options.name) {
            options.name = 'modal' + (this.modalPopupStore.length + 1);
        }
        // Create the popup
        var popup = $('<div></div>')
                .attr({
                    'class': 'modal-popup'
                })
                .appendTo('body');
        $('<a></a>')
            .attr({
                'class': 'modal-popup-close',
                'href': '#'
            })
            .html('<i class="fa fa-close"></i> ' + i18n.t("dialogs.close"))
            .on('click', function (e) {
                e.preventDefault();
                hidingFunction();
            })
            .appendTo(popup);
        $('<div></div>')
                .addClass('modal-popup-title')
                .html(options.title || '')
                .appendTo(popup);
        var view = $('<div></div>')
                .addClass('modal-popup-view')
                .appendTo(popup);

        var hideCallback = function () {};
        if (options.hideCallback) {
            hideCallback = options.hideCallback;
        }

        var hidingFunction = function () {
            popup.removeClass('modal-popup-active');
            if (hideCallback) {
                hideCallback();
            }
        };

        // Return object to handle popup related functions
        this.modalPopupStore[options.name] = {
            getView: function () {
                return view;
            },
            show: function () {
                // request css property to force layout computation, making animation possible
                // see http://stackoverflow.com/questions/7069167/css-transition-not-firing
                popup.css('width');
                popup.addClass('modal-popup-active');

                $(dbkjs).trigger('modal_popup_show', {popupName: options.name, window: this});
            },
            hide: function () {
                hidingFunction();
            },
            setHideCallback: function (fn) {
                hideCallback = fn;
            }
        };

        return this.modalPopupStore[options.name];
    },
    getModalPopup: function (name) {
        if (!this.modalPopupStore.hasOwnProperty(name)) {
            // Return 'fake' popup object so no errors arise
            return {
                getView: function () {
                    return $([]);
                },
                show: function () {},
                hide: function () {},
                setHideCallback: function () {}
            };
        }
        return this.modalPopupStore[name];
    },
    configureLayers: function () {
        for (var i = 0, len = dbkjs.map.layers.length; i < len; i++) {
            if (dbkjs.map.layers[i].isBaseLayer && dbkjs.map.layers[i].visibility) {
                dbkjs.map.setBaseLayer(dbkjs.map.layers[i]);
                dbkjs.map.raiseLayer(dbkjs.map.layers[i], -1000);
            }
        }
    },
    getTransitionEvent: function() {
        var el = document.createElement('fakeelement');
        var transitions = {
            'transition': 'transitionend',
            'OTransition': 'oTransitionEnd',
            'MozTransition': 'transitionend',
            'WebkitTransition': 'webkitTransitionEnd'
        };
        for (var t in transitions) {
             if (el.style[t] !== undefined) {
                 return transitions[t];
             }
         }
         return null;
    },
    /* XXX unused */
    mustachei18n: function(obj) {
        if(!obj) {
            obj = {};
        }
        obj.t = function() {
            return function(text, render) {
                return render(i18n.t(text));
            };
        };
        return obj;
    }
};
