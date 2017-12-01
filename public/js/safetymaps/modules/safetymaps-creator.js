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
 
 /* global safetymaps */
 
 dbkjs.modules.safetymaps_creator = {
    id: "dbk.module.safetymaps_creator",

    register: function() {
        var me = this;
        
        this.options = $.extend({
            // default options here
        }, this.options);
        
        safetymaps.creator.api.getViewerObjectMapOverview()
        .done(function(data) {
            var features = safetymaps.creator.api.createViewerObjectFeatures(data);

            me.clusteringLayer = new safetymaps.clusteringLayer();
            me.clusteringLayer.createLayer(dbkjs.map);
            
            var layer = me.clusteringLayer.layer;            
            dbkjs.selectControl.deactivate();
            dbkjs.selectControl.layers.push(layer);
            if(!dbkjs.selectControl.multiselectlayers){
                dbkjs.selectControl.multiselectlayers = [];
            }
            dbkjs.selectControl.multiselectlayers.push(layer);
            dbkjs.selectControl.activate();            
            
            me.clusteringLayer.addFeaturesToCluster(features);
        });
    }
};

