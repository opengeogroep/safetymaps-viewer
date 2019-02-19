/* 
 * Copyright (c) 2019 B3Partners (info@b3partners.nl)
 * 
 * This file is part of safetymaps-viewer.
 * 
 * safetymaps-viewer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * safetymaps-viewer is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 *  along with safetymaps-viewer. If not, see <http://www.gnu.org/licenses/>.
 */

dbkjs.modules.extendedFloorButton = {
    
    register: function(){
        var me = this;
         //floor button
        var a = $("<a/>")
                .attr("id", "floor-a")
                .attr("title", "Floor button")
                .addClass("btn btn-default olButton")
                .on("click", function() {
                    if(me.floorBox.is(":visible")){
                        me.floorBox.hide();
                        me.floorTriangle.hide();
                    }else {
                        me.floorBox.show();
                        me.floorTriangle.show();
                    }
                });
        $("<i/>").addClass("fa fa-building").appendTo(a);
        a.prependTo("#bottom_left_buttons");
        
        // floor window
        var floorBottom = $(window).height() - $("#floor-a").offset().top - $("#floor-a").outerHeight();
        me.floorTriangle = $("<div/>")
                .attr("id", "floor-triangle")
                .css("bottom", floorBottom + 4)
                .addClass("triangle-left")
                .appendTo("#map");
        me.floorBox = $("<div/>")
                .attr("id", "floor-box")
                .css("bottom", floorBottom - 32)
                .addClass("floor-box")
                .appendTo("#map");
        $("#floor-a").hide();
    }
    
};

