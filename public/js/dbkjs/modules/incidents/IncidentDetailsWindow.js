/*
 *  Copyright (c) 2015 B3Partners (info@b3partners.nl)
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

/**
 * Window which shows incident details. Subclass of SplitScreenWindow. Create
 * only one instance as it always uses modal popup name "incidentDetails".
 * @returns {IncidentDetailsWindow}
 */
function IncidentDetailsWindow() {
    SplitScreenWindow.call(this, "incidentDetails", "Incident");
}

IncidentDetailsWindow.prototype = Object.create(SplitScreenWindow.prototype);
IncidentDetailsWindow.prototype.constructor = IncidentDetailsWindow;

/**
 * Render an incident in the window view.
 * @param {object} incident Complete incident from AGSIncidentService.getAllIncidentInfo()
 * @returns {undefined}
 */
IncidentDetailsWindow.prototype.data = function(incident) {
    var e = ModalWindow.prototype.getView.call(this);

    e.html("");
    if(!incident) {
        return;
    }

    e.text(incident.getTitle());
};