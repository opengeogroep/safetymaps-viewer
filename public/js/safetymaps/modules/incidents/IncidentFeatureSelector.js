/*
 *  Copyright (c) 2017-2018 B3Partners (info@b3partners.nl)
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

/**
 * Select feature matching an incident and shared interface stuff
 *
 * @param {boolean} matchHuisletter Find matches with exact BAG huisletter only
 * @param {boolean} matchToevoeging Find matches with exact BAG toevoeging only
 * @returns {FeatureSelector}
 */
function IncidentFeatureSelector(matchHuisletter, matchToevoeging) {
    var me = this;

    me.matchHuisletter = matchHuisletter;
    me.matchToevoeging = matchToevoeging;
    me.matches = [];

    me.providers = [];
};

IncidentFeatureSelector.prototype.addFeatureProvider = function(provider) {
    if(typeof provider.isLoading !== "function" || typeof provider.findIncidentMatches !== "function") {
        console.error("IncidentFeatureSelector: cannot add invalid feature provider", provider);
    } else {
        this.providers.push(provider);
    }
};

/**
 * Wait for feature providers to be loaded, then find matches, and select a single
 * match or display multiple matches in window.
 *
 * @param {Object} matchInfo Object with the following properties to find features for:
 *  x, y, straat, huisnummer, postcode, woonplaats, huisletter, huistoevoeging
 *  @param {Object} incidentDetailsWindow window to display matches in
 */
IncidentFeatureSelector.prototype.findAndSelectMatches = function(matchInfo, incidentDetailsWindow) {
    var me = this;
    if(!me.findMatches(matchInfo)) {
        // TODO: use events instead of timeout
        window.setTimeout(function() {
            me.findAndSelectMatches(matchInfo, incidentDetailsWindow);
        }, 1000);
        return;
    }

    incidentDetailsWindow.hideMultipleFeatureMatches();

    var matches = me.matches;
    if(matches.length === 1) {
        console.log("IncidentFeatureSelector: Selecting single match", matches[0]);
        safetymaps.selectObject(matches[0], false);
    } else if(me.matches.length > 1) {
        incidentDetailsWindow.setMultipleFeatureMatches(matches, new OpenLayers.LonLat(me.matchInfo.x, me.matchInfo.y));
    } else if (dbkjs.modules.kro.shouldShowKro()) {
        dbkjs.modules.kro.getObjectInfoForAddress(
            matchInfo.straat,
            matchInfo.huisnummer,
            matchInfo.huisletter || '',
            matchInfo.toevoeging || '',
            matchInfo.woonplaats
        )
        .fail(function(msg) {
            console.log("Error fetching KRO data in Incident Feature Selector: " + msg);
        })
        .done(function(kro) {
            console.log(kro)
            if(kro.length > 0) {
            }
        });
    }
};

/**
 * Returns false if feature providers are not loaded or true if they are (or failed to
 * load) and this.matches contains feature matches for the matchInfo.
 *
 * @param {Object} matchInfo Object with the following properties to find features for:
 *  x, y, straat, huisnummer, postcode, woonplaats, huisletter, huistoevoeging
 *  @return {boolean} If all providers are loaded and this.matches contains matches, or
 *    false if not all providers are loaded
 */
IncidentFeatureSelector.prototype.findMatches = function(matchInfo) {
    var me = this;

    me.matchInfo = matchInfo;

    var x = me.matchInfo.x;
    var y = me.matchInfo.y;
    var postcode = matchInfo.postcode;
    var huisnummer = matchInfo.huisnummer;
    var huisletter = matchInfo.huisletter && matchInfo.huisletter.trim().length > 0 ? matchInfo.huisletter : "";
    var toevoeging = matchInfo.toevoeging && matchInfo.toevoeging.trim().length > 0 ? matchInfo.toevoeging : "";
    var woonplaats = matchInfo.woonplaats;
    var straat = matchInfo.straat;

    me.matches = [];

    if(me.providers.length === 0) {
        console.log("IncidentFeatureSelector: no providers");
        return true;
    }

    var loading = false;
    $.each(me.providers, function(i, p) {
        if(p.isLoading()) {
            loading = true;
            console.log("IncidentFeatureSelector: provider " + p.getName() + " still loading, waiting to select features for incident");
            return false;
        }
    });
    if(loading) {
        return false;
    }

    console.log("IncidentFeatureSelector: searching for incident at (" + x + ", " + y + "), address " + straat + " " + huisnummer + huisletter + " " + toevoeging + ", " + postcode + " " + woonplaats);
    $.each(me.providers, function(i, p) {
        try {
            var providerMatches = p.findIncidentMatches(me.matchHuisletter, me.matchToevoeging, x, y, postcode, huisnummer, huisletter, toevoeging, woonplaats, straat);
            console.log("IncidentFeatureSelector: provider " + p.getName() + " returned " + providerMatches.length + " matches");
            me.matches = me.matches.concat(providerMatches);
        } catch(e) {
            console.log("IncidentFeatureSelector: provider " + p.getName() + " threw error", e);
        }
    });

    return true;
};

IncidentFeatureSelector.prototype.updateBalkRechtsonder = function(titleOverride) {
    var me = this;
    if(titleOverride) {
        me.title = titleOverride;
    } else {
        me.title = Mustache.render("{{straat}} {{huisnummer}}{{huisletter}}{{#toevoeging}} {{toevoeging}}{{/toevoeging}}, {{woonplaats}}",
            me.matchInfo
        );
    }
    $('#incident_bottom_right')
        .html(me.title)
        .css('visibility', 'visible');
};

IncidentFeatureSelector.prototype.hideBalkRechtsonder = function() {
    $('#incident_bottom_right')
        .text("")
        .css('visibility', 'hidden');
};
