/*
 *  Copyright (c) 2017 B3Partners (info@b3partners.nl)
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

/* global dbkjs, OpenLayers, Mustache */

/**
 * Select feature matching an incident and shared interface stuff
 *
 * @param {Object} incident The incident to find a feature for
 * @param {Object} matchInfo Object with the following properties to find features for:
 *  x, y, straat, huisnummer, postcode, woonplaats, huisletter, huistoevoeging
 * @param {boolean} matchHuisletter Find matches with exact BAG huisletter only
 * @param {boolean} matchToevoeging Find matches with exact BAG toevoeging only
 * @returns {FeatureSelector}
 */
function IncidentFeatureSelector(incident, matchInfo, matchHuisletter, matchToevoeging) {
    var me = this;

    me.incident = incident;
    me.matchInfo = matchInfo;
    me.matchHuisletter = matchHuisletter;
    me.matchToevoeging = matchToevoeging;
    me.matches = [];
}

IncidentFeatureSelector.prototype.findAndSelectMatches = function(incidentDetailsWindow) {
    var me = this;
    if(!me.findMatches()) {
        console.log("Waiting for features to be loaded before selecting incident DBK");
        window.setTimeout(function() {
            me.findAndSelectMatches(incidentDetailsWindow);
        }, 1000);
        return;
    }

    var matches = me.matches;
    if(matches.length === 1) {
        console.log("Selecting match", matches[0]);
        dbkjs.protocol.jsonDBK.process(matches[0], null, true);
    } else if(me.matches.length > 1) {
        incidentDetailsWindow.setMultipleFeatureMatches(matches, new OpenLayers.LonLat(me.matchInfo.x, me.matchInfo.y));
    }
};

IncidentFeatureSelector.prototype.findMatches = function() {
    var me = this;

    var postcode = me.matchInfo.postcode;
    var huisnummer = me.matchInfo.huisnummer;
    var huisletter = me.matchInfo.huisletter;
    var toevoeging = me.matchInfo.toevoeging;
    var woonplaats = me.matchInfo.woonplaats;
    var straat = me.matchInfo.straat;

    var addressMatches = [];
    var addressesMatches = [];
    var selectiekaderMatches = [];

    me.matches = [];

    // Find main and additional addresses matches, only if features are loaded

    if(!dbkjs.modules.feature.features || dbkjs.modules.feature.features.length === 0) {
        console.log("Features not loaded, can't search for feature matching incident");
        return false;
    } else if(dbkjs.modules.waterongevallen.enabled && !dbkjs.modules.waterongevallen.loaded) {
        console.log("VRH Waterongevallen not loaded, waiting");
        return false;
    } else {
        console.log("Searching feature for incident address " + straat + " " + huisnummer + huisletter + " " + toevoeging + ", " + postcode + " " + woonplaats, me.matchInfo);

        var dbk = null;
        $.each(dbkjs.modules.feature.features, function(index, f) {
            if($.isArray(f.attributes.adres)) {
                $.each(f.attributes.adres, function(index, fa) {
                    if(fa) {
                        var matchPostcode = fa.postcode && postcode === fa.postcode;
                        var matchHuisnummer = fa.huisnummer && huisnummer === fa.huisnummer;
                        var matchHuisletter = !me.matchHuisletter || (fa.huisletter === huisletter);
                        var matchToevoeging = !me.matchToevoeging || (fa.toevoeging === toevoeging);
                        var matchWoonplaats = woonplaats && fa.woonplaatsNaam && fa.woonplaatsNaam.toLowerCase().indexOf(woonplaats.toLowerCase()) !== -1;
                        var matchStraat = straat && fa.openbareRuimteNaam && fa.openbareRuimteNaam.toLowerCase().indexOf(straat.toLowerCase()) !== -1;

                        if((matchPostcode || (matchWoonplaats && matchStraat)) && matchHuisnummer && matchHuisletter && matchToevoeging) {
                            console.log("Main address matches feature", f);
                            addressMatches.push(f);
                            // No need to check additional addresses for this feature
                            return false;
                        }
                    }
                });
            }

            if($.isArray(f.attributes.adressen)) {
                $.each(f.attributes.adressen, function(i, a) {
                    var matchPostcode = a.postcode && a.postcode === postcode;
                    // Exacte matches vanwege BAG, geen toLowerCase() / indexOf() nodig
                    var matchWoonplaats = a.woonplaats && a.woonplaats === woonplaats;
                    var matchStraat = a.straat && a.straat === straat;
                    if(matchPostcode || (matchWoonplaats && matchStraat) && a.nummers) {
                        console.log("Checking nummers for match DBK " + f.attributes.formeleNaam + ", " + a.postcode + " " + a.woonplaats);
                        $.each(a.nummers, function(j, n) {
                            var parts = n.split("|");
                            var matchHuisnummer = Number(parts[0]) === huisnummer;
                            var fHuisletter = parts.length > 1 ? parts[1] : null;
                            var fToevoeging = parts.length > 2 ? parts[2] : null;
                            var matchHuisletter = !me.matchHuisletter || (fHuisletter === huisletter);
                            var matchToevoeging = !me.matchToevoeging || (fToevoeging === toevoeging);

                            if(matchHuisnummer && matchHuisletter && matchToevoeging) {
                                console.log("Matched DBK with BAG adres/nevenadres at nummer " + n, f);
                                addressesMatches.push(f);
                                // No need to check additional addresses for this feature
                                return false;
                            }
                        });
                    }
                });
            }
        });

        // Zoek naar WO DBK's op basis van selectiepolygoon
        if(me.matchInfo.x && me.matchInfo.y) {
            var point = new OpenLayers.Geometry.Point(me.matchInfo.x, me.matchInfo.y);

            $.each(dbkjs.modules.feature.features, function(index, f) {
                if(f.attributes.selectiekader) {
                    $.each(f.attributes.selectiekader.components, function(j, c) {
                        if(c.containsPoint(point)) {
                            console.log("Incident XY inside feature selectiekader", f);
                            selectiekaderMatches.push(f);
                        }
                    });
                }
            });
        } else {
            console.log("No XY coordinates in incident, cannot match selectiekader");
        }

        me.matches = addressMatches.slice();
        $.each(addressesMatches.concat(selectiekaderMatches), function(i, m) {
            if(me.matches.indexOf(m) === -1) {
                me.matches.push(m);
            }
        });
        console.log("Main adress matches: " + addressMatches.length + ", BAG adres/nevenadres matches: " + addressesMatches.length + ", selectiekader matches: " + selectiekaderMatches.length + ", total unique incident matches: " + me.matches.length, me.matches);
    }
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
    $('.dbk-title')
        .html(me.title)
        .css('visibility', 'visible');
};

IncidentFeatureSelector.prototype.hideBalkRechtsonder = function() {
    $('.dbk-title')
        .text("")
        .css('visibility', 'hidden');
};
