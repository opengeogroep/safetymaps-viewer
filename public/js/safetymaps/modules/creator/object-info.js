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
 * Render HTML with info about SafetyMaps Creator objects.
 *
 */

/* global safetymaps, OpenLayers, Mustache, i18n */

var safetymaps = safetymaps || {};
safetymaps.creator = safetymaps.creator || {};

safetymaps.creator.renderInfoTabs = function(object, div) {

    var tabContent = $('<div class="tab-content"></div>');
    var tabs = $('<ul class="nav nav-pills"></ul>');
    div.append(tabContent);
    div.append(tabs);

    safetymaps.creator.renderGeneral(object, tabContent, tabs);
    safetymaps.creator.renderDetails(object, tabContent, tabs);

};

safetymaps.creator.renderGeneral = function(object, tabContent, tabs) {

    var content = safetymaps.creator.createInfoTabDiv([
        {l: i18n.t("creator.formal_name"), t: object.formele_naam},
        {l: i18n.t("creator.informal_name"), t: object.informele_naam},
        {l: i18n.t("creator.adress"), html: Mustache.render("{{straatnaam}} {{huisnummer}} {{huisletter}} {{toevoeging}}<br>{{postcode}} {{plaats}}", object)},
        {l: i18n.t("creator.check_date"), t: new moment(object.datum_controle).format("LL")},
        {l: i18n.t("creator.modified_date"), t: new moment(object.datum_actualisatie).format("LLLL")},
        {l: i18n.t("creator.emergencyResponderPresent"), html:
                '<span class="label label-' + (object.bhv_aanwezig ? 'success' : 'warning') + '">' +
                i18n.t("creator.emergencyResponderPresent" + (object.bhv_aanwezig ? 'Yes' : 'No')) + '</span>'},
        {l: i18n.t("creator.respondingProcedure"), t: object.inzetprocedure},
        {l: i18n.t("creator.buildingConstruction"), t: object.gebouwconstructie},
        {l: i18n.t("creator.fireAlarmCode"), t: object.oms_nummer},
        {l: i18n.t("creator.usage"), t: object.gebruikstype},
        {l: i18n.t("creator.riskClassification"), t: object.risicoklasse},
        {l: i18n.t("creator.level"), t: object.bouwlaag},
        {l: i18n.t("creator.lowestLevel") + " (" + i18n.t("creator.floor") + ")", t: object.bouwlaag_min !== "0" ? (-Number(object.bouwlaag_min)) + " (" + (-Number(object.bouwlaag_min)) + ")" : null},
        {l: i18n.t("creator.highestLevel") + " (" + i18n.t("creator.floor") + ")", t: object.bouwlaag_max !== "0" ? object.bouwlaag_max + " (" + (Number(object.bouwlaag_max)-1) + ")" : null}
    ]);

    safetymaps.creator.createHtmlTabDiv("general", "General", content, tabContent, tabs);
};

safetymaps.creator.renderDetails = function(object, tabContent, tabs) {

    var content = safetymaps.creator.createInfoTabDiv([
        {l: "Detail", t: "Bla 2"}
    ]);

    safetymaps.creator.createHtmlTabDiv("details", "Details", content, tabContent, tabs);
};

safetymaps.creator.renderObjectFeatureInfoTab = function(object, div) {
};

safetymaps.creator.createHtmlTabDiv = function(id, label, content, tabContent, tabs) {
    id = 'tab_pane_' + id;

    // Make tab active when no contents yet
    var active = tabContent.find("div").length === 0;

    var bv_div = $('<div class="tab-pane ' + (active ? "active" : "") + '" id="' + id + '"></div>');
    bv_div.append(content);
    tabContent.append(bv_div);
    tabs.append('<li class="' + (active ? "active" : "") + '"><a data-toggle="tab" href="#' + id + '">' + label + '</a></li>');
};

safetymaps.creator.createInfoTabDiv = function(rows) {
    var div = $('<div class="table-responsive"></div>');
    var table = $('<table class="table table-hover"></table>');

    $.each(rows, function(i, row) {
        if(row.t || row.html) {
            table.append('<tr><td>' + row.l + '</td><td>' + (row.html ? row.html : Mustache.escape(row.t)) + '</td></tr>');
        }
    });

    div.append(table);
    return div;
};

