/*
 *  Copyright (c) 2015-2018 B3Partners (info@b3partners.nl)
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
/* global SplitScreenWindow, ModalWindow, AGSIncidentService */

/**
 * Window which shows incident details. Subclass of SplitScreenWindow. Create
 * only one instance as it always uses modal popup name "incidentDetails".
 * @returns {IncidentDetailsWindow}
 */
function IncidentDetailsWindow(editKladblokChat, showKladblokChat) {
    if (typeof editKladblokChat === "undefined") {
        editKladblokChat = false;
    }
    if (typeof showKladblokChat === "undefined") {
        showKladblokChat = false;
    }

    this.window = safetymaps.infoWindow.addWindow("incident", "Incident", false);
    this.div = $("<div></div>");
    this.kcDiv = "<div style='display:block; margin-bottom:15px; height:27px; border:1px solid #ff0000; color:#ff0000;'><input id='kladblokChatRow' style='border: 0; width:calc(100% - 30px); margin-right:15px; color: #ff0000;' /><i id='addKladblokChatRow' class='fa fa-plus' style='cursor:pointer' /></div>";
    this.linkifyWords = null;
    this.crsLinkEnabled = false;
    this.addGoogleMapsNavigationLink = false;
    this.showKladblokChat = showKladblokChat;
    this.editKladblokChat = editKladblokChat;
    safetymaps.infoWindow.addTab("incident", "incident", "Incident", "incident", this.div, "first");
};

IncidentDetailsWindow.prototype.constructor = IncidentDetailsWindow;

IncidentDetailsWindow.prototype.show = function() {
    safetymaps.infoWindow.showTab("incident", "incident", true);
    $(this).triggerHandler("show");
};

IncidentDetailsWindow.prototype.hide = function() {
    this.window.hide();
    $(this).triggerHandler("hide");
};

IncidentDetailsWindow.prototype.setTitle = function(title) {
    this.window.getTitleElement().text(title);
};

IncidentDetailsWindow.prototype.isVisible = function() {
    return this.window.isVisible();
};

IncidentDetailsWindow.prototype.setSplitScreen = function(splitScreen) {
    this.window.setSplitScreen(splitScreen);
};

IncidentDetailsWindow.prototype.showError = function(e) {
    console.log("incidentDetails error: " + e);
    this.data(e);
};

IncidentDetailsWindow.prototype.setLinkifyWords = function(words) {
    this.linkifyWords = words;
};

IncidentDetailsWindow.prototype.linkify = function(text) {
    var me = this;
    if(this.linkifyWords !== null) {
        var t = text.split(/([^a-z]+)/i);

        t = t.map(function(token) {
            var searchToken = token.trim().toLowerCase();
            if(searchToken.length > 0 && me.linkifyWords[searchToken]) {
                return "<a class='linkify'>" + token + "</a>";
            }
            return token;
        });
        return t.join("");
    }
    return text;
};

IncidentDetailsWindow.prototype.crsLink = function(text) {
    var me = this;
    var t = text.split(/[ ,]+/);

    if(me.crsLinkEnabled) {
        t = t.map(function(token) {
            var searchToken = token.split("-").join("").trim();
            if(searchToken.length > 0) {
                return "<a class='crsLink'>" + searchToken.toUpperCase() + "</a>, ";
            }
            return token;
        });
        return t.join(" ");
    }
    return text;
};

IncidentDetailsWindow.prototype.renderDetailsScreen = function() {
    var me = this;
    if(this.rendered) {
        return;
    }
    this.rendered = true;

    var renderKladblok = !dbkjs.modules.incidents.options.hideKladblok;
    var renderTwitter = !!dbkjs.modules.incidents.options.showTwitter;
    var showFoto = dbkjs.modules.incidents.options.showFoto && !!dbkjs.modules.fotoFunction.options;
    var html = '<div style="width: 100%" class="table-responsive incidentDetails"></div>';
    html += this.renderKladblokTwitter(renderKladblok, renderTwitter, showFoto);
    this.div.html(html);
    this.addTabClickListener();
};

IncidentDetailsWindow.prototype.renderKladblokTwitter = function(showKladblok, showTwitter, showFoto) {
    if(!showKladblok && !showTwitter && !showFoto) {
        return "";
    }
    if(showKladblok && !showTwitter && !showFoto) {
        return '<div id="tab_kladblok" class="incident_tab" style="display: block;"></div>';
    }
    var tabsHTML = '<div class="incident_tabs">';
    tabsHTML += '<ul id="incident_details_tabs" class="nav nav-pills" style="margin-bottom: 10px">';
    if(showKladblok) tabsHTML += '<li class="active"><a data-toggle="tab" href="#" id="t_kladblok" class="tab-button"><i class="fa fa-comment"></i> Kladblok</a></li>';
    if(showTwitter) tabsHTML += '<li' + (!showKladblok ? ' class="active"' : '') + '><a data-toggle="tab" href="#" id="t_twitter" class="tab-button"><i class="fa fa-twitter"></i> <span id="t_twitter_title">Twitter</span></a></li>';
    if(showFoto) tabsHTML += '<li' + (!showKladblok ? ' class="active"' : '') + '><a data-toggle="tab" href="#" id="t_foto" class="tab-button"><i class="fa fa-camera"></i> <span id="t_foto_title">Foto</span></a></li>';
    tabsHTML += '</ul>';
    if(showKladblok) tabsHTML += '<div id="tab_kladblok" class="incident_tab" style="display: block;"></div>';
    if(showTwitter) tabsHTML += '<div id="tab_twitter" class="incident_tab" style=" display: ' + (!showTwitter ? 'block' : 'none') + ';"></div>';
    if(showFoto) tabsHTML += '<div id="tab_foto" class="incident_tab" style=" display: ' + (!showFoto ? 'block' : 'none') + ';"></div>';
    tabsHTML += "</div>";

    return tabsHTML;
};

IncidentDetailsWindow.prototype.addTabClickListener = function() {
    // Init tabs
    this.div.on("click", ".tab-button", function() {
        var tabbutton = $(this);
        var tab = tabbutton.attr("id");
        if(tab) {
            tab = tab.replace("t_", "");
        }
        var tabsContainer = $(this).closest(".incident_tabs");
        tabsContainer.find("#incident_details_tabs .active").removeClass("active");
        tabsContainer.find(".incident_tab").hide();
        tabsContainer.find("#tab_" + tab).show();
        tabbutton.parent().addClass("active");
    });
};

/**
 * Render an incident in the window view.
 * @param {object} incident Complete incident from AGSIncidentService.getAllIncidentInfo()
 * @param {boolean} restoreScrollTop
 * @returns {undefined}
 */
IncidentDetailsWindow.prototype.data = function(incident, showInzet, restoreScrollTop, isXmlOrFormatName, fromIncidentList) {
    var me = this;
    this.renderDetailsScreen();

    var scrollTop = this.div.scrollTop();

    this.div.css("-webkit-overflow-scrolling", "touch");

    var format = "";
    if(typeof incident === "string") {
        format = "string";
    } else if(isXmlOrFormatName === true) {
        format = "xml";
    } else if(typeof incident.IncidentNummer !== 'undefined') {
        format = "falck";
    } else if(typeof incident.Nummer !== 'undefined' || isXmlOrFormatName === "pharos") {
        format = "pharos";
    } else {
        format = "vrh";
    }
    // v.html(isXml ? this.getXmlIncidentHtml(incident, showInzet, false) : this.getIncidentHtml(incident, showInzet, false));

    var table = "";
    var kladblok = "";
    switch(format) {
        case "string":
            table = "<table><tr><td>" + incident + "</td></tr></table>";
            break;
        case "xml":
            table = this.getXmlIncidentHtml(incident, showInzet, false);
            kladblok = this.getIncidentKladblokHtml(format, incident);
            break;
        case "falck":
            table = this.getIncidentHtmlFalck(incident, showInzet, false);
            kladblok = this.getIncidentKladblokHtml(format, incident);
            break;
        case "pharos":
            table = this.getIncidentHtmlPharos(incident, showInzet, false);
            kladblok = this.getIncidentKladblokHtml(format, incident);
            break;
        default:
            table = this.getIncidentHtml(incident, showInzet, false);
            kladblok = this.getIncidentKladblokHtml(format, incident);
    }

    $(".incident_tabs").toggle(format !== "string");

    if(fromIncidentList && !dbkjs.modules.incidents.options.incidentMonitorKladblokAuthorized) {
        kladblok = "<i>Niet beschikbaar: alleen geautoriseerd voor kladblok van incident waarvoor ingezet</i>";
    }

    this.div.find(".incidentDetails").html(table);
    this.div.find("#tab_kladblok").html(kladblok);
    if(this.linkifyWords) {
        $("a.linkify").on("click", function(e) {
            $(me).triggerHandler("linkifyWordClicked", [$(e.target).text(), e]);
            return false;
        });
    }
    if(this.crsLinkEnabled) {
        $("a.crsLink").on("click", function(e) {
            $(me).triggerHandler("crsLinkClicked", [$(e.target).text(), e]);
            return false;
        });
    }

    if(this.addGoogleMapsNavigationLink) {
        $("#incidentDetail_nav").on("click", function (e) {
            me.openGoogleMapsNavigation(incident);
        })
    }

    if(this.showFeatureMatches) {
        this.showMultipleFeatureMatches();
    }

    if(restoreScrollTop) {
        this.div.scrollTop(scrollTop);
    }

    var me = this;
    if (me.editKladblokChat) {
        var incidentNr = (format === "vrh" ? incident.NR_INCIDENT : incident.IncidentNummer)
        $("#addKladblokChatRow").on("click", function(e) {
            $(me).triggerHandler("saveKladblokChatRow", [$("#kladblokChatRow").val(), incidentNr]);
            $("#kladblokChatRow").val("");
            me.kladblokChatRow = "";
        });

        $("#kladblokChatRow").keyup(function(e) {
            if(e.keyCode == 13) {
                $(me).triggerHandler("saveKladblokChatRow", [$("#kladblokChatRow").val(), incidentNr]);
                $("#kladblokChatRow").val("");
                me.kladblokChatRow = "";
            }
            me.kladblokChatRow = $("#kladblokChatRow").val();
        })

        $("#kladblokChatRow").val(me.kladblokChatRow);
        if (me.kladblokChatRow && me.kladblokChatRow !== "" ) {
            $("#kladblokChatRow").focus();
        }
    }
};

IncidentDetailsWindow.prototype.setMultipleFeatureMatches = function(matches, incidentLonLat) {
    var me = this;

    me.multipleFeatureMatches = matches;
    me.incidentLonLat = incidentLonLat;

    me.showMultipleFeatureMatches();
};

IncidentDetailsWindow.prototype.hideMultipleFeatureMatches = function() {
    var me = this;

    me.showFeatureMatches = false;

    $(".incidentDetails .detailed").show();
    //$(".incident_tab").show();
    $("#multiple_matches").hide();
};

IncidentDetailsWindow.prototype.showMultipleFeatureMatches = function() {
    var me = this;

    if(!me.multipleFeatureMatches || me.multipleFeatureMatches.length <= 1) {
        me.hideMultipleFeatureMatches();
        return;
    }

    me.showFeatureMatches = true;

    $(".incidentDetails .detailed").hide();
    $(".incident_tab").hide();
    
    if(!me.multipleDiv){
        me.multipleDiv = $("<div id='multiple_matches'/>");
        me.multipleDiv.append("<h3>Meerdere informatiekaarten gevonden op de locatie van het incident:</h3>");
        me.multipleItemUl = $('<ul class="nav nav-pills nav-stacked"></ul>');
    }
    me.multipleItemUl.empty();
    //var item_ul = $('<ul class="nav nav-pills nav-stacked"></ul>');
    $.each(me.multipleFeatureMatches, function(i, m) {
        //var info = dbkjs.config.styles.getFeatureStylingInfo(m);
        var info = {
            "icon" : m.attributes.symbol,
            "iconWidth" : m.attributes.width,
            "iconHeight" : m.attributes.height
        };
        me.multipleItemUl.append(
                $('<li><a href="#"><img src="' + info.icon + '">' + (m.attributes.label || m.attributes.apiObject.locatie || m.attributes.apiObject.formele_naam) + (m.attributes.apiObject.informele_naam ? ' (' + m.attributes.apiObject.informele_naam + ')' : '') + '</a></li>')
                .on('click', function(e) {
                    e.preventDefault();
                    me.hideMultipleFeatureMatches();

                    if(me.incidentLonLat) {
                        dbkjs.map.setCenter(me.incidentLonLat, dbkjs.options.zoom);
                        safetymaps.selectObject(m, false);
                    } else {
                        safetymaps.selectObject(m, true);
                    }

                    $(".incidentDetails .detailed").show();
                    $("#tab_kladblok").show();
                })
        );
    });
    me.multipleDiv.append(me.multipleItemUl);
    $(".incidentDetails").append(me.multipleDiv);
    me.multipleDiv.show();
    
};

IncidentDetailsWindow.prototype.getIncidentAdres = function(incident, isXml) {
    if(isXml) {
        // MDT XML
        var adres = $(incident).find("IncidentLocatie Adres");
        return Mustache.render("{{{#x}}}HnAanduiding{{{/x}}} {{{#x}}}Straat{{{/x}}} {{{#x}}}Huisnummer{{{/x}}}{{{#x}}}HnToevoeging{{{/x}}}", {
            x: function() {
                return function(text, render) {
                    return render($(adres).find(text).text());
                };
            }
        }).trim();
    } else if (incident.IncidentNummer) {
        // Falck JSON
        var a = incident.IncidentLocatie;
        return Mustache.render("{{{NaamLocatie2}}} {{{HnAanduiding}}} {{{NaamLocatie1}}} {{{Huisnummer}}}{{{Letter}}} {{{HnToevoeging}}} {{{Paalnummer}}}", a).trim();
    } else if(incident.nummer && incident.xml) {
        // Pharos
        return Mustache.render("{{locatie}} {{aanduiding}} {{straat}} {{huisnummer}}{{huisletter}} {{toevoeging}} {{paalnummer}}", incident).trim();
    } else {
        // Oracle GMS replica AGS JSON
        return incident.T_GUI_LOCATIE;
    }
};

IncidentDetailsWindow.prototype.openGoogleMapsNavigation = function (incident) {
    Proj4js.defs["EPSG:4236"] = "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs ";
    
    var xy = AGSIncidentService.prototype.getIncidentXY(incident);
    var p = new Proj4js.Point(xy.x, xy.y);
    var t = Proj4js.transform(new Proj4js.Proj(dbkjs.map.getProjection()), new Proj4js.Proj("EPSG:4236"), p);
    var lonLat = new OpenLayers.LonLat(t.x, t.y);
    var url = "https://www.google.com/maps/dir/?api=1&destination=[y],[x]";

    url = url.replace(/\[x\]/g, lonLat.lon);
    url = url.replace(/\[y\]/g, lonLat.lat);

    window.open(url);
};

IncidentDetailsWindow.prototype.displayGoogleMapsNavigationLink = function () {
    var me = this;
    var link = me.addGoogleMapsNavigationLink ? '<img id="incidentDetail_nav" style="height:20px; cursor:pointer; position: relative;" src="images/location-arrow.svg" />' : '';
    return link;
}

/**
 * Get HTML to display incident. Boolean specificies whether to leave out time
 * dependent information ('1 minute ago') to compare changes.
 * @param {object} incident
 * @param {boolean} showInzet show voertuig inzet
 * @param {boolean} compareMode the result should only depend on the incident
 *   parameter, not other factors such as current time
 * @returns {undefined}
 */
IncidentDetailsWindow.prototype.getIncidentHtml = function(incident, showInzet, compareMode) {
    var me = this;
    html = '<table class="table table-hover">';

    var prio = incident.PRIORITEIT_INCIDENT_BRANDWEER;
    html += '<tr><td colspan="2" style="font-weight: bold; text-align: center; color: ' + me.getPrioriteitColor(prio) + '">PRIO ' + prio
            + '<sub style="font-size:10px; text-align: center; color:black;"> (' + incident.NR_INCIDENT + ')</sub>'
            + '</td></tr>';

    html += '<tr><td class="leftlabel">Start incident: </td><td>' + incident.start.format("dddd, D-M-YYYY HH:mm:ss") + '</td></tr>';
    html += '<tr><td class="leftlabel">Adres: ' + me.displayGoogleMapsNavigationLink() + '</td><td>' + incident.locatie + '</td></tr>';
    html += '<tr><td class="leftlabel">Postcode &amp; Woonplaats:</td><td>' + (incident.POSTCODE ? incident.POSTCODE + ', ' : "") + (incident.PLAATS_NAAM ? incident.PLAATS_NAAM : incident.PLAATS_NAAM_NEN) + '</td></tr>';
    html += '<tr><td class="leftlabel">Melding classificatie:</td><td>' + me.linkify(dbkjs.util.htmlEncode(incident.classificaties)) + '</td></tr>';

    if(incident.gespreksgroep) {
        html += '<tr><td class="leftlabel">INCI-NET:</td><td>' + incident.gespreksgroep + '</td></tr>';
    }

    if(!incident.karakteristiek || incident.karakteristiek.length === 0) {
        html += '<tr class="detailed"><td>Karakteristieken:</td><td>';
        html += "<h4>-</h4>";
    } else {
        html += '<tr class="detailed"><td colspan="2">Karakteristieken:<br/>';
        html += '<div class="table-responsive" style="margin: 0px 10px 0px 10px">';
        html += '<table class="table table-hover" style="width: auto">';
        var karakteristieken = [];
        $.each(incident.karakteristiek, function(i, k) {
            if(k.ACTUELE_KAR_WAARDE) {
                var found = false;
                $.each(karakteristieken, function(j, kk) {
                    if(kk.naam === k.NAAM_KARAKTERISTIEK) {
                        kk.waardes.push(k.ACTUELE_KAR_WAARDE);
                        found = true;
                        return false;
                    }
                });
                if(!found) {
                    karakteristieken.push({
                        naam: k.NAAM_KARAKTERISTIEK,
                        waardes: [k.ACTUELE_KAR_WAARDE]
                    });
                }
            }
        });
        karakteristieken.sort(function(l, r) {
            return l.naam.localeCompare(r.naam);
        });
        $.each(karakteristieken, function(i, k) {
            if(k.naam.toLowerCase() !== "kenteken" || !me.crsLinkEnabled){
                html += "<tr><td>" + me.linkify(dbkjs.util.htmlEncode(k.naam)) + "</td><td>" + me.linkify(dbkjs.util.htmlEncode(k.waardes.sort().join(", "))) + "</td></tr>";
            }
            else {
                html += "<tr><td>" + k.naam + "</td><td>" + me.crsLink(dbkjs.util.htmlEncode(k.waardes.sort().join(", "))) + "</td></tr>";
            }
        });
        html += '</table><div/>';
    }
    html += '</td></tr>';

    if(showInzet) {
        var showEenheden = "";
        var showAllEenheden = "";
        if($("#allEenheden").is(":visible")){
            showAllEenheden = "visible";
            showEenheden = "none";
        } else {
            showAllEenheden = "none";
            showEenheden = "visible";
        }
        html += "<tr class='detailed'><td colspan='2' id='eenheden' style='display:" + showEenheden + "'>";
        html += 'Eenheden: ';
        var s = [];
        $.each(incident.inzetEenheden, function(i, inzet) {
            var tooltip = inzet.KAZ_NAAM ? inzet.KAZ_NAAM : "";
            var span = (inzet.DTG_EIND_ACTIE || incident.archief ? "<span class='beeindigd' " : "<span ") + " title='" + tooltip + "'>" + dbkjs.util.htmlEncode(inzet.ROEPNAAM_EENHEID) + "</span>";
            s.push(span);
        });
        html += s.join(", ");
        html += " <span class='beeindigd'>(Klik voor meer info)</span></td></tr>";
        $(document).on('click', '#eenheden', function(){
                $('#allEenheden').show();
                $('#eenheden').hide();
        });

        html += "<tr class='detailed'><td colspan='2' id='allEenheden' style='display:" + showAllEenheden + "'>";
        html += "Eenheden: <span class='beeindigd'>(Klik voor minder info)</span><br/><table>";
        $.each(incident.inzetEenheden, function(i, inzet) {
            if(inzet.T_IND_DISC_EENHEID !== "B" || inzet.ROEPNAAM_EENHEID === null) {
                return;
            }
            var tooltip;
            if(!inzet.DTG_EIND_ACTIE) {
                var start = AGSIncidentService.prototype.getAGSMoment(inzet.DTG_OPDRACHT_INZET);
                tooltip = "sinds " + start.format("HH:mm") + ", " + start.fromNow();
            } else {
                var einde = AGSIncidentService.prototype.getAGSMoment(inzet.DTG_EIND_ACTIE);
                tooltip = "actie be&euml;indigd om " + einde.format("HH:mm") + ", " + einde.fromNow();
            }
            var beeindigd = inzet.DTG_EIND_ACTIE || incident.archief;
            html += "<tr title='" + tooltip + "' class='" + (beeindigd ? "beeindigd" : "") + "'>";
            html += "<td align='right'>" + (inzet.CODE_VOERTUIGSOORT ? inzet.CODE_VOERTUIGSOORT : "") + "</td>";
            html += "<td>" + inzet.ROEPNAAM_EENHEID + "</td>";
            html += "<td>" + (inzet.KAZ_NAAM ? inzet.KAZ_NAAM : "") + "</td>";
            html += "</tr>";
        });
        html += '</table></td></tr>';
        $(document).on('click', '#allEenheden', function(){
                $('#allEenheden').hide();
                $('#eenheden').show();
        });
    }

    if(compareMode) {
        html += me.getIncidentKladblokHtml("vrh", incident);
    }

    html += '</table>';

    return html;
};

IncidentDetailsWindow.prototype.getIncidentKladblokHtml = function(format, incident) {
    var me = this;
    var kladblokHTML = "<table>";
    switch(format) {
        case "xml":
            var xmlFormat = MDTIncidentsController.prototype.getXmlFormat(incident);
            var notepad = new Array();
            $.each($(incident).find(xmlFormat.kladblok), function(i, k) {
                var text = $(k).find("Inhoud").text() || '';
                var dtg = $(k).find("DTG").text() || '';
                if(text !== '' && dtg !== '') {
                    notepad.push({ dtg: dtg, text: text });
                } else {
                    kladblokHTML += "<tr><td>" + me.linkify(dbkjs.util.htmlEncode($(k).text())) + "</td></tr>";
                }
            });
            if(notepad.length > 0){
                notepad
                    .sort(function(a, b) {
                        var dateA = new Date(a.dtg);
                        var dateB = new Date(b.dtg);
                        return dateA - dateB;
                    })
                    .map(function(row) {
                        kladblokHTML += "<tr><td>" + new moment(row.dtg).format("HH:mm") + "</td><td>" + me.linkify(dbkjs.util.htmlEncode(row.text)) + "</td></tr>";
                    });
            }
            break;
        case "falck":
            if (this.editKladblokChat) {
                kladblokHTML += this.kcDiv;
            }
            if (this.showKladblokChat) {
                $.each(incident.Kladblokregels.sort(function (a, b) {
                    var dateA = new moment(a.DTG);
                    var dateB = new moment(b.DTG);
                    return dateA._d - dateB._d;
                }), function(i, k) {
                    var styleClass = me.getKladblokRegelColor(k.Discipline);
                    var style = k.IsChat ? "font-weight:normal !important; font-style:italic; !important" : "";
                    kladblokHTML += "<tr class='" + styleClass + "' style='" + style + "'><td>" + new moment(k.DTG).format("HH:mm") + "</td><td>" + me.linkify(dbkjs.util.htmlEncode(k.Inhoud)) + "</td></tr>";
                });
            } else {
                $.each(incident.Kladblokregels, function(i, k) {
                    var styleClass = me.getKladblokRegelColor(k.Discipline);
                    kladblokHTML += "<tr class='" + styleClass + "'><td>" + new moment(k.DTG).format("HH:mm") + "</td><td>" + me.linkify(dbkjs.util.htmlEncode(k.Inhoud)) + "</td></tr>";
                });
            }
            break;
        case "pharos":
            $.each(incident.kladblokregels, function(i, k) {
                kladblokHTML += "<tr><td>" + k.tijd.format("HH:mm") + "</td><td>" + me.linkify(dbkjs.util.htmlEncode(k.tekst)) + "</td></tr>";
            });
            break;
        default:
            if (this.editKladblokChat) {
                kladblokHTML += this.kcDiv;
            }
            kladblokHTML += this.getIncidentKladblokDefaultHtml(incident.kladblok);
    }
    return kladblokHTML;
};

IncidentDetailsWindow.prototype.getKladblokRegelColor = function(kladblokregelDiscipline) {
    if (kladblokregelDiscipline.indexOf("B") === -1) {
        if (kladblokregelDiscipline.indexOf("P") !== -1) {
            return "pol";
        } else if (kladblokregelDiscipline.indexOf("A") !== -1) {
            return "ambu";
        }
    }
    return "brw";
}

IncidentDetailsWindow.prototype.getIncidentKladblokDefaultHtml = function(kladblok) {
    var me = this;
    if(!kladblok) {
        return "";
    }
    var kladblokHTML = "<table>";
    $.each(kladblok.sort(function (a, b) {
        return a.DTG_KLADBLOK_REGEL - b.DTG_KLADBLOK_REGEL;
    }), function(i, k) {
        var ind = k.T_IND_DISC_KLADBLOK_REGEL;
        var disclass = "brw";
        var style = "";
        if(ind.indexOf("B") === -1) {
            if(ind.indexOf("P") !== -1) {
                disclass = "pol";
            } else if(ind.indexOf("A") !== -1) {
                disclass = "ambu";
            }
            //console.log("Kladblok andere discipline: " + k.T_IND_DISC_KLADBLOK_REGEL +": " + k.INHOUD_KLADBLOK_REGEL);
        }
        if (me.showKladblokChat && k.IsChat) {
            style = "font-weight:normal !important; font-style:italic; !important";
        }        
        kladblokHTML += "<tr class='" + disclass + "' style='" + style + "'><td>" + AGSIncidentService.prototype.getAGSMoment(k.DTG_KLADBLOK_REGEL).format("HH:mm") + "</td><td>" +
            me.linkify(dbkjs.util.htmlEncode(k.INHOUD_KLADBLOK_REGEL)) + "</td></tr>";
    });
    return kladblokHTML + "</table>";
};

IncidentDetailsWindow.prototype.getPrioriteitColor = function(prio) {
    prio = Number(prio);
    switch(prio) {
        case 1: return 'red';
        case 2: return 'orange';
        default: return 'green';
    }
};

IncidentDetailsWindow.prototype.getIncidentClassificatiesFalck = function(incident) {
    var c = [];
    var m = incident.BrwDisciplineGegevens;
    if(m.Meldingsclassificatie1) {
        c.push(m.Meldingsclassificatie1);
    }
    if(m.Meldingsclassificatie2) {
        c.push(m.Meldingsclassificatie2);
    }
    if(m.Meldingsclassificatie3) {
        c.push(m.Meldingsclassificatie3);
    }
    return c.join(", ");
};

IncidentDetailsWindow.prototype.getIncidentHtmlFalck = function(incident, showInzet, compareMode) {
    var me = this;

    html = '<table class="table table-hover">';

    var m = incident.BrwDisciplineGegevens;
    var d = new moment(incident.BrwDisciplineGegevens.StartDTG);

    html += '<tr><td colspan="2" style="font-weight: bold; text-align: center; color: ' + me.getPrioriteitColor(m.Prioriteit) + '">PRIO ' + m.Prioriteit + '<sub style="font-size:10px; text-align: center; color:black;"> ('+incident.IncidentNummer+')</sub></td></tr>';
    //html += '<tr><td class="leftlabel">Start incident: </td><td>' + d.format("dddd, D-M-YYYY HH:mm:ss")  + (compareMode ? "" : " (" + d.fromNow() + ")") + '</td></tr>';
    html += '<tr><td class="leftlabel">Start incident: </td><td>' + d.format("dddd, D-M-YYYY HH:mm:ss")+'</td></tr>';
    var a = incident.IncidentLocatie;
    html += '<tr><td class="leftlabel">Adres: ' + me.displayGoogleMapsNavigationLink() + '</td><td>' + me.getIncidentAdres(incident, false) + '</td></tr>';
    html += '<tr><td class="leftlabel">Postcode &amp; Woonplaats: </td><td>' + (a.Postcode && a.Postcode.trim().length > 0 ? a.Postcode +  ', ' : "") +(a.Plaatsnaam ? a.Plaatsnaam : "-") + '</td></tr>';
    //html += '<tr><td>Woonplaats: </td><td>' + (a.Plaatsnaam ? a.Plaatsnaam : "-") + '</td></tr>';

    //html += '<tr><td>&nbsp;</td><td></td></tr>';
    html += '<tr><td class="leftlabel">Melding classificatie:</td><td>' + me.linkify(me.getIncidentClassificatiesFalck(incident)) + '</td></tr>';

    if(incident.Gespreksgroep) {
        html += '<tr><td class="leftlabel">INCI-NET:</td><td>' + incident.Gespreksgroep + '</td></tr>';
    }

    if(!incident.Karakteristieken || incident.Karakteristieken.length === 0) {
        html += '<tr class="detailed"><td>Karakteristieken:</td><td>';
        html += "<h4>-</h4>";
    } else {
        html += '<tr class="detailed"><td colspan="2">Karakteristieken:<br/>';
        html += '<div class="table-responsive" style="margin: 0px 10px 0px 10px">';
        html += '<table class="table table-hover" style="width: auto">';
        incident.Karakteristieken.sort(function(l, r) {
            return l.Naam.localeCompare(r.Naam);
        });
        $.each(incident.Karakteristieken, function(i, k) {
            //html += "<tr><td>" + me.linkify(dbkjs.util.htmlEncode(k.Naam)) + "</td><td>" + me.linkify(dbkjs.util.htmlEncode(k.Waarden.sort().join(", "))) + "</td></tr>";
            if(k.Naam.toLowerCase() !== "kenteken" || !me.crsLinkEnabled){
                html += "<tr><td>" + me.linkify(dbkjs.util.htmlEncode(k.Naam)) + "</td><td>" + me.linkify(dbkjs.util.htmlEncode(k.Waarden.sort().join(", "))) + "</td></tr>";
            }
            else {
                html += "<tr><td>" + k.Naam + "</td><td>" + me.crsLink(dbkjs.util.htmlEncode(k.Waarden.sort().join(", "))) + "</td></tr>";
            } 
        });
        html += '</table><div/>';
    }
    html += '</td></tr>';

    if(showInzet) {
        var showEenheden = "";
        var showAllEenheden = "";
        if($("#allEenheden").is(":visible")){
            showAllEenheden = "visible";
            showEenheden = "none";
        } else {
            showAllEenheden = "none";
            showEenheden = "visible";
        }
        html += '<tr class="detailed"><td colspan="2" id="eenheden" style = "display:'+showEenheden+';">';
        html += "Eenheden: ";
        
        $.each(incident.BetrokkenEenheden, function(i, inzet) {
            if(i!==0){
                html += ", ";
            }
            var eta ="";
            if(!compareMode && inzet.ETA && inzet.ETA.length > 0){
                eta = me.calculateETA(inzet.ETA[0],false);
            }

            html += (inzet.IsActief ? '<span>' : '<span class="beeindigd">' ) + dbkjs.util.htmlEncode(inzet.Roepnaam+""+eta)+'</span>';
        });
        html += "<span class='beeindigd'> (Klik voor meer info)</span>";
        
        $(document).on('click', '#eenheden', function(){
                $('#allEenheden').show();
                $('#eenheden').hide();
        });

        html += '</td></tr>';
        html += '<tr class="detailed"><td style="display:'+showAllEenheden+';" colspan="2" id="allEenheden">';
        html += 'Eenheden: <span style="color: #A9A9A9">(Klik voor minder info)</span><br/><table>';
        $.each(incident.BetrokkenEenheden, function(i, inzet) {
            var tooltip = "";
            if(inzet.EindeActieDTG) {
                var einde = new moment(inzet.EindeActieDTG);
                tooltip = "actie be&euml;indigd om " + einde.format("HH:mm") + ", " + einde.fromNow();
            }
            var beeindigd = !inzet.IsActief;
            html += "<tr title='" + tooltip + "' class='" + (beeindigd ? "beeindigd" : "") + "'>";
            html += "<td align='right'>" + (inzet.InzetRol ? inzet.InzetRol : "") + "</td>";
            html += "<td>" + inzet.Roepnaam + "</td>";
            html += "<td>" + (inzet.BrwKazerne ? inzet.BrwKazerne : "") + "</td>";
            html += "<td>" + (!compareMode && inzet.ETA && inzet.ETA.length > 0 ? me.calculateETA(inzet.ETA[0], true) : "") + "</td>";
            html += "</tr>";
        });
        html += '</table></td></tr>';
        $(document).on('click', '#allEenheden', function(){
                $('#allEenheden').hide();
                $('#eenheden').show();
        });
    }

    if(compareMode) {
        html += me.getIncidentKladblokHtml("falck", incident);
    }

    html += '</table>';

    return html;
};

IncidentDetailsWindow.prototype.getIncidentHtmlPharos = function(incident, showInzet, compareMode) {
    var me = this;

    html = '<table class="table table-hover">';

    html += '<tr><td colspan="2" style="font-weight: bold; text-align: center; color: ' + me.getPrioriteitColor(incident.prioriteit) + '">PRIO ' + incident.prioriteit + '<sub style="font-size:10px; text-align: center; color:black;"> ('+incident.nummer+')</sub></td></tr>';
    html += '<tr><td class="leftlabel">Start incident: </td><td>' + incident.startTijd.format("dddd, D-M-YYYY HH:mm:ss")+'</td></tr>';
    html += '<tr><td class="leftlabel">Adres: ' + me.displayGoogleMapsNavigationLink() + '</td><td>' + me.getIncidentAdres(incident, false) + '</td></tr>';
    html += '<tr><td class="leftlabel">Woonplaats: </td><td>' + (incident.woonplaats || "-") + '</td></tr>';
    html += '<tr><td class="leftlabel">Melding classificatie:</td><td>' + me.linkify(incident.classificaties.join(", ")) + '</td></tr>';

    if(incident.karakteristieken.length === 0) {
        html += '<tr class="detailed"><td>Karakteristieken:</td><td>';
        html += "<h4>-</h4>";
    } else {
        html += '<tr class="detailed"><td colspan="2">Karakteristieken:<br/>';
        html += '<div class="table-responsive" style="margin: 0px 10px 0px 10px">';
        html += '<table class="table table-hover" style="width: auto">';
        incident.karakteristieken.sort(function(l, r) {
            return l.naam.localeCompare(r.naam);
        });
        $.each(incident.karakteristieken, function(i, k) {
            //html += "<tr><td>" + me.linkify(dbkjs.util.htmlEncode(k.naam)) + "</td><td>" + me.linkify(dbkjs.util.htmlEncode(k.waarde)) + "</td></tr>";
            if(k.naam.toLowerCase() !== "kenteken" || !me.crsLinkEnabled){
                html += "<tr><td>" + me.linkify(dbkjs.util.htmlEncode(k.naam)) + "</td><td>" + me.linkify(dbkjs.util.htmlEncode(k.waardes.sort().join(", "))) + "</td></tr>";
            }
            else {
                html += "<tr><td>" + k.naam + "</td><td>" + me.crsLink(dbkjs.util.htmlEncode(k.waardes.sort().join(", "))) + "</td></tr>";
            } 
        });
        html += '</table><div/>';
    }
    html += '</td></tr>';

    if(showInzet) {
        html += '<tr class="detailed"><td colspan="2" id="eenheden">';
        html += "Eenheden: ";

        $.each(incident.eenheden, function(i, eenheid) {
            if(i!==0){
                html += ", ";
            }
            html += (eenheid.eindeActieTijd ? '<span class="beeindigd">' : '<span>') + eenheid.naam +'</span>';
        });

        html += '</td></tr>';
    }

    if(compareMode) {
        html += me.getIncidentKladblokHtml("pharos", incident);
    }

    html += '</table>';

    return html;
};

/**
 * Get HTML to display XML incident. Boolean specificies whether to leave out
 * time dependent information ('1 minute ago') to compare changes.
 * @param {xml object} incident
 * @param {boolean} showInzet show voertuig inzet
 * @param {boolean} compareMode the result should only depend on the incident
 *   parameter, not other factors such as current time
 * @returns {undefined}
 */
IncidentDetailsWindow.prototype.getXmlIncidentHtml = function(incident, showInzet, compareMode) {
    var me = this;

    var xmlFormat = MDTIncidentsController.prototype.getXmlFormat(incident);

    html = '<table class="table table-hover">';
    var prio = $(incident).find(xmlFormat.prio).text();
    html += '<tr><td colspan="2" style="font-weight: bold; text-align: center; color: ' + me.getPrioriteitColor(prio) + '">PRIO ' + prio + '</td></tr>';

    var template = "{{#separator}}<tr><td>&nbsp;</td><td></td></tr>{{/separator}}<tr><td class='leftlabel'><span>{{label}}</span>: </td><td>{{value}}{{{valueHTML}}}</td></tr>";

    //html += Mustache.render(template, { label: "Nummer", value: $(incident).find("IncidentNr").text()});

    var startS = $(incident).find(xmlFormat.startdatumtijd).text();
    var d = null;
    if(startS !== "") {
        d = moment(startS);
    } else {
        var date = $(incident).find(xmlFormat.msgDate).text();
        var time = $(incident).find(xmlFormat.msgTime).text();
        if(date !== "" && time !== "") {
            d = moment(date + " " + time, "DD-MM-YYYY HH:mm:ss");
        }
    }
    var v = d === null ? "" : d.format("dddd, D-M-YYYY HH:mm:ss") + (compareMode ? "" : " (" + d.fromNow() + ")");
    html += Mustache.render(template, { label: "Start incident", value: v});

    var adres = $(incident).find(xmlFormat.incidentLocatie);
    v = Mustache.render("{{#x}}" + xmlFormat.straat +"{{/x}} {{#x}}"+ xmlFormat.huisnummer +"{{/x}}{{#x}}"+ xmlFormat.huisnummertoevoeging +"{{/x}} {{#x}}"+ xmlFormat.huisnummeraanduiding +"{{/x}}", {
        x: function() {
            return function(text, render) {
                return render($(adres).find(text).text());
            };
        }
    });
    html += Mustache.render(template, { label: "Adres", value: v });

    html += Mustache.render(template, { label: "Postcode", value: $(adres).find(xmlFormat.postcode).text() });
    html += Mustache.render(template, { label: "Woonplaats", value: $(adres).find(xmlFormat.woonplaats).text() });

    html += '<tr><td>&nbsp;</td><td></td></tr>';
    html += Mustache.render(template, { label: "Melding classificatie", valueHTML: me.linkify(dbkjs.util.htmlEncode(xmlFormat.classificatie)) });

    var karakteristiek = $(incident).find(xmlFormat.karakteristiek);

    if(karakteristiek.length === 0) {
        html += '<tr class="detailed"><td>Karakteristieken:</td><td>';
        html += "<h4>-</h4>";
    } else {
        html += '<tr class="detailed"><td colspan="2">Karakteristieken:<br/>';
        html += '<div class="table-responsive" style="margin: 0px 10px 0px 10px">';
        html += '<table class="table table-hover" style="width: auto">';
        $.each(karakteristiek, function(i, k) {
            v = {};
            v.naam = $(k).find(xmlFormat.karakteristiekNaam).text();
            v.waarde = me.linkify(dbkjs.util.htmlEncode($(k).find(xmlFormat.karakteristiekWaarde).text()));

            html += Mustache.render("<tr><td>{{naam}}</td><td>{{{waarde}}}</td></tr>", v);

            if(v.naam.toLowerCase() !== "kenteken" || !me.crsLinkEnabled){
                v.waarde = me.linkify(dbkjs.util.htmlEncode($(k).find(xmlFormat.karakteristiekWaarde).text()));
            }
            else {
                v.waarde = me.crsLink(dbkjs.util.htmlEncode($(k).find(xmlFormat.karakteristiekWaarde).text()));
            } 
        });
        html += '</table><div/>';
    }
    html += '</td></tr>';

    if(showInzet) {
        html += '<tr class="detailed"><td colspan="2" id="eenheden">';
        var eenhBrw = "", eenhPol = "", eenhAmbu = "";
        $.each($(incident).find(xmlFormat.eenheid), function(i, eenheid) {
            var naam = $(eenheid).find(xmlFormat.roepnaam).text();
            var disc = $(eenheid).find(xmlFormat.disc).text();

            var span = "<span>" + dbkjs.util.htmlEncode(naam) + "</span><br/>";
            if(xmlFormat.discBrandweer === disc) {
                eenhBrw += span;
            } else if("--P" === disc) {
                eenhPol += span;
            } else if("-A-" === disc) {
                eenhAmbu += span;
            }
        });
        html += '<div id="brw"><b>Brandweer</b><br/>' + eenhBrw + '</div>';
        html += '<div id="pol"><b>Politie</b><br/>' + eenhPol + '</div>';
        html += '<div id="ambu"><b>Ambu</b><br/>' + eenhAmbu + '</div>';
        html += '</td></tr>';
    }

    var afspraak = $(incident).find(xmlFormat.afspraakOpLocatie).text();
    if(afspraak) {
        html += Mustache.render("<tr><td>Afspraak op locatie:</td><td>{{v}}</td></tr>", {v: afspraak});
    }

    if(compareMode) {
        html += this.getIncidentKladblokHtml("xml", incident);
    }

    html += '</table>';

    return html;
};

IncidentDetailsWindow.prototype.calculateETA = function (ETA, fullName) {
    if (ETA) {
        var eta = ETA.match(/\d+/g).map(Number)[0];
        var minutesToRide = (eta - new Date().getTime()) / 60000;
        minutesToRide = Math.round(minutesToRide);
        //minutesToRide = 10;
        if (minutesToRide > 1 && minutesToRide <= 99) {
            if (fullName) {
                return " " + minutesToRide.toString() + " minuten";
            } else {
                return " (" + minutesToRide.toString() + "m)";
            }
        } else {
            return "";
        }
    } else {
        return "";
    }
    ;
};