/*!
 *  Copyright (c) 2014 B3Partners (info@b3partners.nl)
 *
 *  This file is part of safetymapDBK
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

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};
dbkjs.modules.vrhinzetbalk = {
    id: "dbk.module.vrhinzetbalk",
    /**
     * Toggle layers based on type
     */
    availableToggles: {
        toggleBasis: {
            label: 'Basisgegevens',
            icon: 'fa-bus',
            layers: [ 'Toegang terrein' ],
            category: 'objectinformatie',
            active: true
        },
        'toggleGebouw': {
            label: 'Gebouwgegevens',
            icon: 'fa-building',
            layers: [ ],
            category: 'preventief',
            active: true
        },
        toggleBluswater: {
            label: 'Bluswatergegevens',
            img: 'images/nen1414/Tb4.002.png',
            style: 'height: 36px; margin-bottom: 5px',
            layers: [ ],
            category: 'preparatief',
            active: true
        },
        toggleBrandweer: {
            label: 'Brandweergegevens',
            img: 'images/brwzw.png',
            style: 'width: 32px; margin-bottom: 6px',
            layers: [ 'Brandcompartiment', 'Gevaarlijke stoffen' ],
            category: 'repressief',
            active: true
        }
    },
    disabledLayers: [],
    register: function() {
        var me = this;

        var buttonGroup = $('.layertoggle-btn-group');
        $.each(me.availableToggles, function(toggleKey, toggleOptions) {
            // Create a button for the required toggle and append the button to buttongroup

            if(!toggleOptions.active) {
                me.disabledLayers = me.disabledLayers.concat(toggleOptions.layers);
            }
            var i;
            if(toggleOptions.img) {
                i = $('<img/>')
                .attr({
                    src: toggleOptions.img,
                    style: (toggleOptions.style || '')
                });
            } else {
                i = $('<i/>')
                .attr({
                    class: "fa " + toggleOptions.icon,
                    style: "width: 27.5px"
                });
            }

            var toggle = $('<a/>')
            .attr({
                id: 'btn_' + toggleKey,
                class: 'btn btn-default navbar-btn ' + (toggleOptions.active ? "on" : ""),
                href: '#',
                title: toggleOptions.label
            })
            .append(i)
            .click(function(e) {
                e.preventDefault();
                if (toggle.hasClass('on')) {
                    toggle.removeClass('on');
                    dbkjs.setDbkCategoryVisibility(toggleOptions.category, false);
                    me.disableLayers(toggleOptions.layers);
                } else {
                    toggle.addClass('on');
                    dbkjs.setDbkCategoryVisibility(toggleOptions.category, true);
                    me.enableLayers(toggleOptions.layers);
                }
                if(toggleKey === "toggleBluswater") {
                    dbkjs.map.getLayersByName("Brandkranen eigen terrein")[0].setVisibility(toggle.hasClass('on'));
                }

                dbkjs.protocol.jsonDBK.resetLayers();
            })
            .appendTo(buttonGroup);
            // Enable layers by default (by adding them all to enabledLayers)
            //_obj.enableLayers(toggleOptions.layers);
        });
        // XXX
//        window.setTimeout(function() {
//            dbkjs.protocol.jsonDBK.resetLayers();
        //}, 5000);
    },
    enableLayers: function(layers) {
        var me = this;
        // Temp array
        var disabledLayers = [].concat(me.disabledLayers);
        // Filter layers
        me.disabledLayers = disabledLayers.filter(function(elem, pos) {
            return layers.indexOf(elem) === -1;
        });
    },
    disableLayers: function(layers) {
        var me = this;
        // Add all layers
        var disabledLayers = me.disabledLayers.concat(layers);
        // Remove duplicates
        me.disabledLayers = disabledLayers.filter(function(elem, pos) {
            return disabledLayers.indexOf(elem) === pos;
        });
    },
    isLayerEnabled: function(layerName) {
        return this.disabledLayers.indexOf(layerName) === -1;
    }
};
