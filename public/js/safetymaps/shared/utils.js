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
 
 /*
  * For common use by safetymaps-viewer and safetymaps-flamingo
  */
 
var safetymaps = safetymaps || {};
safetymaps.utils = {};

safetymaps.utils.getAjaxError = function(jqXHR, textStatus, errorThrown) {
    var msg = textStatus;
    if(jqXHR.status) {
        msg += ", status: " + jqXHR.status + (jqXHR.statusText ? " " + jqXHR.statusText : "");
    }
    if(errorThrown && errorThrown !== jqXHR.statusText) {
        msg += ", " + errorThrown;
    }
    return msg;
}
