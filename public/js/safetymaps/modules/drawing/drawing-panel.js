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

/* global SplitScreenWindow */

function DrawingPanelWindow() {
    SplitScreenWindow.call(this, "drawingPanel");
    var me = this;

    this.widthPercent = 20;

    $(this).on('elements_created', function() {
        me.getView().html("Tekenen maar");
    });
}

DrawingPanelWindow.prototype = Object.create(SplitScreenWindow.prototype);
DrawingPanelWindow.prototype.constructor = DrawingPanelWindow;
