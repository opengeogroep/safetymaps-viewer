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
 * Get incident information from an ArcGIS REST service configured on an Oracle
 * GMS replica database. Call initialize() after constructing the new object.
 *
 * Events:
 * initialized: when initialize() resolves
 *
 * @param {type} url The URL to the ArcGIS REST MapService
 * @returns {AGSIncidentService}
 */
function AGSIncidentService(url) {
    var me = this;
    me.url = url;
    if(!me.url) {
        throw "Null AGS incident service URL";
    }
}

/**
 * Get authentication token (if tokenUrl, user and pass supplied) and load service
 * info.
 * @param {String} tokenUrl optional
 * @param {String} user optional
 * @param {String} pass optional
 * @returns {Promise} A promise which will be resolved when the service info
 *  is succesfully loaded, or rejected on error.
 */
AGSIncidentService.prototype.initialize = function(tokenUrl, user, pass) {
    var me = this;
    var dInitialize = $.Deferred();

    var dToken;
    if(tokenUrl && user && pass) {
        dToken = me.getToken(tokenUrl, user, pass);
    } else {
        dToken = $.Deferred().resolve(null);
    }

    dToken
    .fail(function(e) {
        dInitialize.reject("Failure getting AGS auth token: " + e);
    })
    .done(function() {
        me.loadServiceInfo()
        .fail(function(e) {
            dInitialize.reject("Failure loading AGS incident service info: " + e);
        })
        .done(function() {
            dInitialize.resolve();
            $(me).triggerHandler('initialized');
        });
    });
    return dInitialize.promise();
};

/**
 * Static utility function: return a string with the information from an AGS
 * response with error property.
 * @param {Object} data Response from AGS service with error property
 * @returns {String} Description of the error
 */
AGSIncidentService.prototype.getAGSError = function(data) {
    return "Error code " + data.error.code + ": " + data.error.message;
};

/**
 * Static utility function: return a moment from epoch value returned by AGS.
 * @param {type} epoch as returned by AGS. Requires: moment.js
 * @returns {moment} the moment at the time defined by the epoch
 */
AGSIncidentService.prototype.getAGSMoment = function(epoch) {
    // Contrary to docs, AGS returns milliseconds since epoch in local time
    // instead of UTC
    return new moment(epoch).add(new Date().getTimezoneOffset(), 'minutes');
};

/**
 * Get the AGS authentication token, and set timeout to automatically refresh it
 * once it will expire.
 * @param {String} tokenUrl
 * @param {String} user
 * @param {String} pass
 * @returns {Promise} A promise which will be rejected on error or resolved
 *   when the token is succesfully retrieved (this.token updated with the token).
 */
AGSIncidentService.prototype.getToken = function(tokenUrl, user, pass) {
    var me = this;
    var d = $.Deferred();

    $.ajax(tokenUrl, {
        dataType: "json",
        data: {
            f: "pjson",
            username: user,
            password: pass
        }
    })
    .always(function(data, textStatus, jqXHR) {
        if(data.token) {
            me.token = data.token;

            window.setTimeout(function() {
                // failure is ignored when updating token, maybe trigger event?
                me.getToken(tokenUrl, user, pass);
            }, data.expires - new moment().valueOf() - (5*60*1000));

            d.resolve();
        } else if(data.error) {
            d.reject(me.getAGSError(data));
        } else {
            d.reject(jqXHR.statusText);
        }
    });
    return d.promise();
};

/**
 * Get AGS MapService info to map table names to URLs.
 * @returns {Promise} A promise which will be resolved when this.tableUrls is
 *   initialized or be rejected on error.
 */
AGSIncidentService.prototype.loadServiceInfo = function() {
    var me = this;
    var d = $.Deferred();
    $.ajax(me.url, {
        dataType: "json",
        data: {
            f: "pjson",
            token: me.token
        }
    })
    .always(function(data, textStatus, jqXHR) {
        if(data.error) {
            d.reject(me.getAGSError(data));
        } else if(!data.tables) {
            d.reject(jqXHR.statusText);
        } else {
            me.tableUrls = {};
            $.each(data.tables, function(i,table) {
                var name = table.name.substring(table.name.indexOf(".")+1).replace("%", "");
                me.tableUrls[name] = me.url + "/" + table.id;
            });
            d.resolve();
        }
    });
    return d.promise();
};

/**
 * Static utility function: get display string for incident object
 * @param {Object} incident as received from AGS
 * @returns {String}
 */
AGSIncidentService.prototype.getIncidentTitle = function(incident) {
    return this.getAGSMoment(incident.DTG_START_INCIDENT).format("D-M-YYYY HH:mm:ss") + " "
            + this.encode((incident.PRIORITEIT_INCIDENT_BRANDWEER ? " PRIO "
            + incident.PRIORITEIT_INCIDENT_BRANDWEER : "") + " "
            + incident.T_GUI_LOCATIE + ", "
            + this.encode(incident.PLAATS_NAAM));
};

/**
 * Get all voertuignummers from inzet archive as typeahead datums, value is
 * ROEPNAAM_EENHEID, tokens also include CODE_VOERTUIGSOORT and KAZ_NAAM.
 * @returns {Promise} A promise which on success will resolve with the datums
 *   array as argument.
 */
AGSIncidentService.prototype.getVoertuignummerTypeahead = function() {
    var me = this;
    var d = $.Deferred();
    $.ajax(me.tableUrls.GMSARC_INZET_EENHEID + "/query", {
        dataType: "json",
        data: {
            f: "pjson",
            token: me.token,
            where: "T_IND_DISC_EENHEID = 'B'",
            orderByFields: "CODE_VOERTUIGSOORT,ROEPNAAM_EENHEID,KAZ_NAAM",
            outFields: "CODE_VOERTUIGSOORT,ROEPNAAM_EENHEID,KAZ_NAAM",
            returnDistinctValues: true
        }
    })
    .always(function(data, textStatus, jqXHR) {
        if(data.error) {
            d.reject(me.getAGSError(data));
        } else if(!data.features) {
            d.reject(jqXHR.statusText);
        } else {
            var datums = [];
            $.each(data.features, function(i, feature) {
                var a = feature.attributes;
                datums.push( { value: a.ROEPNAAM_EENHEID, tokens: [a.CODE_VOERTUIGSOORT, a.ROEPNAAM_EENHEID, a.KAZ_NAAM] });
            });
            d.resolve(datums);
        }
    });
    return d.promise();
};

/**
 * Get incident ID where the voertuignummer is currently ingezet.
 * @param {String} voertuignummer for which incident inzet is to be checked
 * @returns {Promise} A promise which will resolve with null when the voertuig
 *   is not ingezet or the incident ID for the incident when it is. The promise
 *   will be rejected on error.
 */
AGSIncidentService.prototype.getVoertuigInzet = function(voertuignummer) {
    var me = this;
    var d = $.Deferred();

    if(!voertuignummer) {
        d.reject("Null voertuignummer");
    } else {
        $.ajax(me.tableUrls.GMS_INZET_EENHEID + "/query", {
            dataType: "json",
            data: {
                f: "pjson",
                token: me.token,
                where: "T_IND_DISC_EENHEID = 'B' AND ROEPNAAM_EENHEID = '" + voertuignummer + "' AND DTG_EIND_ACTIE IS NULL",
                outFields: "INCIDENT_ID"
            }
        })
        .always(function(data, textStatus, jqXHR) {
            if(data.error) {
                d.reject(me.getAGSError(data));
            } else if(!data.features) {
                d.reject(jqXHR.statusText);
            } else {
                if(data.features.length === 0) {
                    d.resolve(null);
                } else {
                    d.resolve(data.features[0].attributes.INCIDENT_ID);
                }
            }
        });
    }
    return d.promise();
};

/**
 * Get all info for incident: incident properties, classificatie, karakteristiek,
 * kladblok.
 * @param {Integer} incidentId
 * @param {boolean} archief Use archive tables instead of current incident tables
 * @returns {Promise} A promise which will be resolved with an object with the
 *  incident attributes as returned by AGS, with additional properties for
 *  classificatie, karakteristiek and kladlok all in one when succesfull. Rejected
 *  on failure (of any subrequest) or if incident was not found.
 */
AGSIncidentService.prototype.getAllIncidentInfo = function(incidentId, archief) {
    var me = this;
    var d = $.Deferred();

    if(!incidentId) {
        d.reject("Null incidentId");
    } else {
        // First get incident, if not found don't do requests for additional
        // properties
        me.getIncident(incidentId, archief)
        .fail(function(e) {
            d.reject(e);
        })
        .done(function(incident) {

            if(!incident) {
                d.resolve(null);
            } else {
                // Get additional properties
                var dClassificatie;

                if(archief) {
                    // Classificaties directly in incident attributes
                    var a = [];
                    if(incident.BRW_MELDING_CL) {
                        a.push(incident.BRW_MELDING_CL);
                    }
                    if(incident.BRW_MELDING_CL1) {
                        a.push(incident.BRW_MELDING_CL1);
                    }
                    if(incident.BRW_MELDING_CL2) {
                        a.push(incident.BRW_MELDING_CL2);
                    }
                    dClassificatie = a.length === 0 ? "" : a.join(", ");
                } else {
                    dClassificatie = me.getClassificaties(incident);
                }

                //var dKarakteristiek = me.getKarakteristiek(incidentId, archief);
                //var dKladblok = me.getKladblok(incidentId, archief);

                $.when(dClassificatie/*, dKarakteristiek, dKladblok*/)
                .fail(function(classificatie, karakteristiek, kladblok) {
                    d.reject("Kan geen extra incident info ophalen, classificaties: " +
                        classificatie + ", karakteristiek: " + karakteristiek +
                        ", kladblok: " + kladblok);
                })
                .done(function(classificatie, karakteristiek, kladblok) {

                    // Set additional properties in incident

                    incident.classificatie = classificatie;

                    d.resolve(incident);
                });
            }
        });
    }
    return d.promise();
};

AGSIncidentService.prototype.getIncident = function(incidentId, archief) {
    var me = this;
    var d = $.Deferred();

    $.ajax(me.tableUrls[archief ? "GMSARC_INCIDENT" : "GMS_INCIDENT"] + "/query", {
        dataType: "json",
        data: {
            f: "pjson",
            token: me.token,
            where: "INCIDENT_ID = " + incidentId,
            outFields: "*"
        }
    })
    .always(function(data, textStatus, jqXHR) {
        if(data.error) {
            d.reject(me.getAGSError(data));
        } else if(!data.features) {
            d.reject(jqXHR.statusText);
        } else {
            if(data.features.length === 0) {
                d.resolve(null);
            } else {
                d.resolve(data.features[0].attributes);
            }
        }
    });

    return d.promise();
};

/**
 * Get classificaties for one or multiple incidenten. Pass a single object with
 * an (optional) BRW_MELDING_CL_ID property or an array of them. For a single
 * object resolves to null or a string with the classification. When an array
 * is passed as argument, resolves to an object with the INCIDENT_ID properties
 * of the objects in the array as properties and the classifications as property
 * values (if the object in the array had a BRW_MELDING_CL_ID).
 * @param {type} incidenten Array or object with BRW_MELDING_CL_ID and INCIDENT_ID properties
 * @returns {Promise} A promise to be resolved as described above or rejected on
 *   error.
 */
AGSIncidentService.prototype.getClassificaties = function(incidenten) {
    var me = this;
    var d = $.Deferred();

    var meldingClIds = [];
    if(incidenten instanceof Array) {
        $.each(incidenten, function(i, incident) {
            if(incident.BRW_MELDING_CL_ID) {
                meldingClIds.push(incident.BRW_MELDING_CL_ID);
            }
        });
    } else {
        // Get classificaties voor single incident
        if(incidenten.BRW_MELDING_CL_ID) {
            meldingClIds = [incidenten.BRW_MELDING_CL_ID];
        }
    }

    if(meldingClIds.length === 0) {
        if(incidenten instanceof Array) {
            d.resolve({});
        } else {
            d.resolve(null);
        }
    } else {
        $.ajax(me.tableUrls.GMS_MLD_CLASS_NIVO_VIEW + "/query", {
            dataType: "json",
            data: {
                f: "pjson",
                token: me.token,
                where: "MELDING_CL_ID IN (" + meldingClIds.join(",") + ")",
                outFields: "*"
            }
        })
        .always(function(data, textStatus, jqXHR) {
            if(data.error) {
                d.reject(me.getAGSError(data));
            } else if(!data.features) {
                d.reject(jqXHR.statusText);
            } else {
                if(data.features.length === 0) {
                    if(incidenten instanceof Array) {
                        d.resolve({});
                    } else {
                        d.resolve(null);
                    }
                } else {
                    var classificaties = {};
                    $.each(data.features, function(i, cl) {
                        var c = cl.attributes;
                        var vals = [];
                        if(c.NIVO1) {
                            vals.push(c.NIVO1);
                        }
                        if(c.NIVO2) {
                            vals.push(c.NIVO2);
                        }
                        if(c.NIVO3) {
                            vals.push(c.NIVO3);
                        }
                        classificaties[c.MELDING_CL_ID] = vals.join(", ");
                    });

                    if(incidenten instanceof Array) {
                        var classificatiesByIncidentId = {};
                        $.each(incidenten, function(i, incident) {
                            if(incident.BRW_MELDING_CL_ID && classificaties[incident.BRW_MELDING_CL_ID]) {
                                classificatiesByIncidentId[incident.INCIDENT_ID] = classificaties[incident.BRW_MELDING_CL_ID];
                            }
                        });
                        d.resolve(classificatiesByIncidentId);
                    } else {
                        d.resolve(classificaties[incidenten.BRW_MELDING_CL_ID]);
                    }
                }
            }
        });
    }
    return d.promise();
};
