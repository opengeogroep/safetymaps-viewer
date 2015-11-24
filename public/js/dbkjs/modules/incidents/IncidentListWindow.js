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
 * Window which shows list of current and historic events. Subclass of
 * SplitScreenWindow. Create only one instance as it always uses modal popup
 * name "incidentList".
 * @returns {IncidentListWindow}
 */
function IncidentListWindow() {
    SplitScreenWindow.call(this, "incidentList");

    var me = this;
    $(this).on('elements_created', function() {
        me.getView().html("Verbinden met incidentenservice...");

        // Replace "<- Kaart" with button
        me.getView().parent().find(".modal-popup-close").remove()

        $("<button class='btn btn-primary' style='float: left; margin: 5px'><i class='fa fa-arrow-left'></i></button>")
        .prependTo(me.getView().parent())
        .click(function() {
            me.hide();
        });

        me.getView().parent()
    });
}

IncidentListWindow.prototype = Object.create(SplitScreenWindow.prototype);
IncidentListWindow.prototype.constructor = IncidentListWindow;

IncidentListWindow.prototype.showError = function(e) {
    this.getView().html("");
    this.getView().text(e);
};

/**
 * Render incidents in the window view.
 * @param {object} currentIncidents Array of current incidents
 * @param {object} historicIncidents Array of historic incidents
 * @param {boolean} restoreScrollTop
 * @returns {undefined}
 */
IncidentListWindow.prototype.data = function(currentIncidents, historicIncidents, restoreScrollTop) {
    var v = this.getView();

    v.html("");

    var scrollTop = v.scrollTop();

    //v.html(this.getIncidentHtml(incident, showInzet, false));

    if(restoreScrollTop) {
        v.scrollTop(scrollTop);
    }
};
