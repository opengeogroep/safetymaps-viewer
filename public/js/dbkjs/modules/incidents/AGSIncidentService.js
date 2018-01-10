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
 * token: when token received/changed
 *
 * @param {string} url The URL to the ArcGIS REST MapService
 * @param {string} vehiclePositionsUrl Optional URL to ArcGIS REST MapService for vehicle positions
 * @returns {AGSIncidentService}
 */
function AGSIncidentService(url, vehiclePositionsUrl) {
    var me = this;
    me.ghor = dbkjs.modules.incidents.options.ghor;
    me.url = url;
    me.vehiclePosUrl = vehiclePositionsUrl;
    if(!me.url) {
        throw "Null AGS incident service URL";
    }
}

/**
 * Get authentication token (if tokenUrl, user and pass supplied) and load service
 * info.
 * @param {string} tokenUrl optional
 * @param {string} user optional
 * @param {string} pass optional
 * @returns {Promise} A promise which will be resolved when the service info
 *  is succesfully loaded, or rejected on error.
 */
AGSIncidentService.prototype.initialize = function(tokenUrl, user, pass) {
    var me = this;
    var dInitialize = $.Deferred();

    var dToken;
    if(tokenUrl && user && pass) {
        me.getTokenWithParams = function() {
            return me.getToken(tokenUrl, user, pass);
        };
        dToken = me.getTokenWithParams();
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
 * Perform Ajax request, in case of invalid token (error code 498) repeat request
 * after getting token. When device is suspended/sleeping, the timeout to update
 * to token may not have fired.
 * @param {type} settings parameter for $.ajax()
 * @returns {Deferred}
 */
AGSIncidentService.prototype.doAGSAjax = function(settings) {
    var me = this;
    var d = $.Deferred();

    $.ajax(settings)
    .fail(function(jqXHR, textStatus, errorThrown) {
        d.reject(me.getAjaxError(jqXHR, textStatus, errorThrown));
    })
    .done(function(data, textStatus, jqXHR) {
        if(data.error && data.error.code === 498) {
            console.log("Invalid token " + me.token + ", trying to update and retry ajax call: ", settings);
            me.getTokenWithParams()
            .fail(function(e) {
                d.reject("Invalid token, could not get new token: " + e);
            })
            .done(function() {
                console.log("Retrying ajax request with new token " + me.token);
                $.ajax(settings)
                .fail(function(jqXHR, textStatus, errorThrown) {
                    console.log("New Ajax request failed", arguments);
                    d.reject(me.getAjaxError(jqXHR, textStatus, errorThrown));
                })
                .done(function() {
                    console.log("New Ajax request succeeded");
                    d.resolve(data, textStatus, jqXHR);
                });
            });
        } else {
            d.resolve(data, textStatus, jqXHR);
        }
    });
    return d.promise();
};

/**
 * Static utility function: return a string with the information from an AGS
 * response with error property.
 * @param {Object} data Response from AGS service with error property
 * @returns {string} Description of the error
 */
AGSIncidentService.prototype.getAGSError = function(data) {
    return "Error code " + data.error.code + ": " + data.error.message + (!dbkjs.util.isJsonNull(data.error.details) ? " (" + data.error.details + ")" : "");
};

/**
 * Static utility function: return a moment from epoch value returned by AGS.
 * @param {number} epoch as returned by AGS. Requires: moment.js
 * @returns {moment} the moment at the time defined by the epoch
 */
AGSIncidentService.prototype.getAGSMoment = function(epoch) {
    // Contrary to docs, AGS returns milliseconds since epoch in local time
    // instead of UTC
    return new moment(epoch).add(new Date().getTimezoneOffset(), 'minutes');
};

/**
 * Static utility function: resolve a deffered with the results from a AGS table
 * query returning the feature attributes as objects in an array or reject the
 * deferred on error.
 * @param {jQuery.Deferred} d The deferred to resolve or reject
 * @param {object} data from ajax response
 * @param {object} jqXHR from ajax response
 * @param {function} processFunction optional: function to process result with.
 *   If specified will be called for each feature with attributes as argument.
 *   The last returned value from this function will be used to resolve the
 *   promise with.
 * @param {function} noResultFunction optional function to provide the argument
 *   to resolve with if no features found, if not specified resolves to an
 *   empty array.
 * @param {function} postProcessFunction optional function to call to provide
 *   the resolve argument after processing all features. Use if post processing
 *   is needed with data from all features and the last result of the
 *   processFunction cannot be used to resolve the promise with.
 * @returns {undefined}
 */
AGSIncidentService.prototype.resolveAGSFeatures = function(d, data, jqXHR, processFunction, noResultFunction, postProcessFunction) {
    var me = this;
    if(data.error) {
        d.reject(me.getAGSError(data));
    } else if(!data.features) {
        d.reject('No features in response "' + jqXHR.responseText + '"');
    } else {
        var result = noResultFunction ? noResultFunction() : [];
        $.each(data.features, function(i, feature) {
            if(processFunction) {
                result = processFunction(feature.attributes);
            } else {
                result.push(feature.attributes);
            }
        });
        if(postProcessFunction) {
            d.resolve(postProcessFunction());
        } else {
            d.resolve(result);
        }
    }
};

AGSIncidentService.prototype.getAjaxError = function(jqXHR, textStatus, errorThrown) {
    var msg = textStatus;
    if(jqXHR.status) {
        msg += ", status: " + jqXHR.status + (jqXHR.statusText ? " " + jqXHR.statusText : "");
    }
    if(errorThrown && errorThrown !== jqXHR.statusText) {
        msg += ", " + errorThrown;
    }
    return msg;
};

/**
 * Get the AGS authentication token, and set timeout to automatically refresh it
 * once it will expire.
 * @param {string} tokenUrl
 * @param {string} user
 * @param {string} pass
 * @returns {Promise} A promise which will be rejected on error or resolved
 *   when the token is succesfully retrieved (this.token updated with the token).
 */
AGSIncidentService.prototype.getToken = function(tokenUrl, user, pass) {
    var me = this;
    var d = $.Deferred();

    $.ajax(tokenUrl, {
        dataType: "json",
        method: "POST",
        data: {
            f: "json",
            username: user,
            password: pass
        }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        d.reject(me.getAjaxError(jqXHR, textStatus, errorThrown));
    })
    .done(function(data, textStatus, jqXHR) {
        if(data.token) {
            me.token = data.token;
            $(me).triggerHandler('token', me.token);

            window.setTimeout(function() {
                // failure is ignored when updating token, maybe trigger event?
                me.getToken(tokenUrl, user, pass);
            }, data.expires - new moment().valueOf() - (5*60*1000));

            d.resolve();
        } else if(data.error) {
            d.reject(me.getAGSError(data));
        } else {
            d.reject('No token in response "' + jqXHR.responseText + '"');
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
            f: "json",
            token: me.token
        }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        d.reject(me.getAjaxError(jqXHR, textStatus, errorThrown));
    })
    .done(function(data, textStatus, jqXHR) {
        if(data.error) {
            d.reject(me.getAGSError(data));
        } else if(!data.tables) {
            d.reject('No tables in service info ' + jqXHR.responseText + '"');
        } else {
            me.tableUrls = {};
            $.each(data.tables, function(i,table) {
                var name = table.name.substring(table.name.indexOf(".")+1).replace("%", "");
                me.tableUrls[name] = me.url + "/" + table.id;
            });
            d.resolve();
        }
    });

    me.dVehiclePosInit = null;
    if(me.vehiclePosUrl) {
        me.dVehiclePosInit = $.Deferred();

        $.ajax(me.vehiclePosUrl, {
            dataType: "json",
            data: {
                f: "json",
                token: me.token
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            me.dVehiclePosInit.reject(me.getAjaxError(jqXHR, textStatus, errorThrown));
        })
        .done(function(data, textStatus, jqXHR) {
            if(data.error) {
                me.dVehiclePosInit.reject(me.getAGSError(data));
            } else if(!data.tables) {
                me.dVehiclePosInit.reject('No tables in vehicle pos service info ' + jqXHR.responseText + '"');
            } else {
                me.vehiclePosLayerUrls = {};
                $.each(data.layers, function(i,layer) {
                    var name = layer.name.substring(layer.name.lastIndexOf(".")+1).replace("%", "");
                    me.vehiclePosLayerUrls[name] = me.vehiclePosUrl + "/" + layer.id;
                });
                me.dVehiclePosInit.resolve();
            }
        });
    }
    return d.promise();
};

AGSIncidentService.prototype.getIncidentLocatie = function(incident) {
    var locatie;
    // Bij V_B_ARC_INCIDENT aanwezig
    if(incident.T_GUI_LOCATIE) {
        locatie = incident.T_GUI_LOCATIE;
    } else {
        // Bij V_B_ACT_INCIDENT niet is T_GUI_LOCATIE niet aanwezig, stel deze
        // ongeveer hetzelfde samen uit overige kolommen
        locatie = incident.NAAM_LOCATIE1;
        if(incident.HUIS_PAAL_NR) {
            locatie += " " + incident.HUIS_PAAL_NR;
        }
        if(incident.HUISLETTER) {
            locatie += incident.HUISLETTER;
        }
        if(incident.HUIS_NR_TOEV) {
            locatie += " " + incident.HUIS_NR_TOEV;
        }

        if(incident.TYPE_LOCATIE2 === "S") {
            // Twee straten, voeg tweede straat na eerste toe
            locatie = locatie + "/" + incident.NAAM_LOCATIE2;
        }
        if(incident.TYPE_LOCATIE2 === "O") {
            // Omschrijving locatie voor adres
            locatie = incident.NAAM_LOCATIE2 + " " + locatie;
        }
    }
    return locatie;
};

/* XXX move, niet specifiek voor AGS incidenten */
AGSIncidentService.prototype.getIncidentXY = function(incident) {
    var x, y;
    if(incident.lon && incident.lat) {
        return {x: incident.lon, y: incident.lat};
    }
    if(incident.T_X_COORD_LOC && incident.T_Y_COORD_LOC) {
        x = incident.T_X_COORD_LOC;
        y = incident.T_Y_COORD_LOC;
    } else if(incident.IncidentLocatie) {
        x = incident.IncidentLocatie.XCoordinaat;
        y = incident.IncidentLocatie.YCoordinaat;
    } else {
        x = $(incident).find("IncidentLocatie XYCoordinaten XCoordinaat").text();
        y = $(incident).find("IncidentLocatie XYCoordinaten YCoordinaat").text();
    }
    return {x: x, y: y};
};

/**
 * Static utility function: get display string for incident object
 * @param {Object} incident as received from AGS
 * @returns {string}
 */
AGSIncidentService.prototype.getIncidentTitle = function(incident) {
    return this.getAGSMoment(incident.DTG_START_INCIDENT).format("D-M-YYYY HH:mm:ss") + " "
            + dbkjs.util.htmlEncode((incident.PRIORITEIT_INCIDENT_BRANDWEER ? " PRIO "
            + incident.PRIORITEIT_INCIDENT_BRANDWEER : "") + " "
            + incident.locatie + ", "
            + dbkjs.util.htmlEncode(incident.PLAATS_NAAM));
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
    $.ajax(me.tableUrls.V_B_ARC_INZET_EENHEID + "/query", {
        dataType: "json",
        data: {
            f: "json",
            token: me.token,
            where: "T_IND_DISC_EENHEID = 'B'",
            orderByFields: "CODE_VOERTUIGSOORT,ROEPNAAM_EENHEID,KAZ_NAAM",
            outFields: "CODE_VOERTUIGSOORT,ROEPNAAM_EENHEID,KAZ_NAAM",
            returnDistinctValues: true
        }
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        d.reject(me.getAjaxError(jqXHR, textStatus, errorThrown));
    })
    .done(function(data, textStatus, jqXHR) {
        var datums = [];
        me.resolveAGSFeatures(d, data, jqXHR, function(f) {
            datums.push( { value: f.ROEPNAAM_EENHEID, tokens: [f.CODE_VOERTUIGSOORT, f.ROEPNAAM_EENHEID, f.KAZ_NAAM] });
            return datums;
        });
    });
    return d.promise();
};

/**
 * Get incident ID where the voertuignummer is currently ingezet.
 * @param {string} voertuignummer for which incident inzet is to be checked
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
        var table = "V_B_ACT_INZET_EENHEID";
        me.doAGSAjax({
            url: me.tableUrls[table] + "/query",
            dataType: "json",
            data: {
                f: "json",
                token: me.token,
                where: "T_IND_DISC_EENHEID = 'B' AND ROEPNAAM_EENHEID = '" + voertuignummer + "' AND DTG_EIND_ACTIE IS NULL",
                outFields: "INCIDENT_ID"
            }
        })
        .fail(function(e) {
            d.reject(table + ": " + e);
        })
        .done(function(data, textStatus, jqXHR) {
            me.resolveAGSFeatures(d, data, jqXHR, function(f) {
                return f.INCIDENT_ID;
            },
            function() {
                return null;
            });
        });
    }
    return d.promise();
};

/**
 * Get all info for incident: incident properties, classificatie, karakteristiek,
 * kladblok.
 * @param {number} incidentId
 * @param {boolean} archief Use archive tables instead of current incident tables
 * @param {boolean} noInzetEenheden Do not get inzet eenheden
 * @returns {Promise} A promise which will be resolved with an object with the
 *  incident attributes as returned by AGS, with additional properties for
 *  classificatie, karakteristiek and kladlok all in one when succesful. Rejected
 *  on failure (of any subrequest) or if incident was not found.
 */
AGSIncidentService.prototype.getAllIncidentInfo = function(incidentId, archief, noInzetEenheden, noKladblok) {
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

                var dKarakteristiek = me.getKarakteristiek(incidentId, archief);
                var dKladblok = noKladblok ? null : me.getKladblok(incidentId, archief);
                var dInzetEenheden = noInzetEenheden ? null : me.getInzetEenheden(incidentId, archief, false);

                $.when(dClassificatie, dKarakteristiek, dKladblok, dInzetEenheden)
                .fail(function(classificatie, karakteristiek, kladblok, inzetEenheden) {
                    d.reject("Kan geen extra incident info ophalen, classificaties: " +
                        classificatie + ", karakteristiek: " + karakteristiek +
                        ", kladblok: " + kladblok + ", inzet eenheden: " + inzetEenheden);
                })
                .done(function(classificatie, karakteristiek, kladblok, inzetEenheden) {

                    // Set additional properties in incident
                    incident.classificatie = classificatie;
                    incident.karakteristiek = karakteristiek;
                    incident.kladblok = kladblok;
                    incident.inzetEenheden = inzetEenheden;

                    me.normalizeIncidentFields(incident);

                    incident.getTitle = function() {
                        return me.getIncidentTitle(incident);
                    };

                    d.resolve(incident);
                });
            }
        });
    }
    return d.promise();
};

/**
 * Get incident properties for incident id
 * @param {number} incidentId
 * @param {boolean} archief set to true to get archived incident
 * @returns {Promise} Resolved with incident attributes on success, null if
 *   incident not found or rejected on error.
 */
AGSIncidentService.prototype.getIncident = function(incidentId, archief) {
    var me = this;
    var d = $.Deferred();

    if(!incidentId) {
        return d.resolve(null);
    }

    var table = archief ? "V_B_ARC_INCIDENT" : "V_B_ACT_INCIDENT";
    me.doAGSAjax({
        url: me.tableUrls[table] + "/query",
        dataType: "json",
        data: {
            f: "json",
            token: me.token,
            where: "INCIDENT_ID = " + incidentId,
            outFields: "*"
        }
    })
    .fail(function(e) {
        d.reject(table + ": " + e);
    })
    .done(function(data, textStatus, jqXHR) {
        me.resolveAGSFeatures(d, data, jqXHR, function(f) {
            return f;
        },
        function() {
            return null;
        });
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
        return d;
    }

    var table = "V_B_BEH_MC";
    me.doAGSAjax({
        url: me.tableUrls[table] + "/query",
        dataType: "json",
        method: "POST",
        data: {
            f: "json",
            token: me.token,
            where: "MELDING_CL_ID IN (" + meldingClIds.join(",") + ")",
            outFields: "MELDING_CL_ID,MC"
        }
    })
    .fail(function(e) {
        d.reject(table + ": " + e);
    })
    .done(function(data, textStatus, jqXHR) {
        var classificaties = {};
        me.resolveAGSFeatures(d, data, jqXHR, function(c) {
            // processFunction
            if(c.MC) {
                classificaties[c.MELDING_CL_ID] = c.MC.split("\\").join(", ");
            }
        },
        function() {
            // noResultFunction
            if(incidenten instanceof Array) {
                return {};
            } else {
                return null;
            }
        },
        function() {
            // postProcessFunction
            if(incidenten instanceof Array) {
                var classificatiesByIncidentId = {};
                $.each(incidenten, function(i, incident) {
                    if(incident.BRW_MELDING_CL_ID && classificaties[incident.BRW_MELDING_CL_ID]) {
                        classificatiesByIncidentId[incident.INCIDENT_ID] = classificaties[incident.BRW_MELDING_CL_ID];
                    }
                });
                return classificatiesByIncidentId;
            } else {
                return classificaties[incidenten.BRW_MELDING_CL_ID];
            }
        });
    });
    return d.promise();
};

/**
 * Gets karakteristieken for incident id
 * @param {number} incidentId
 * @returns {Promise} Resolved with array with karakteristieken when succesful
 *   or rejected on error
 */
AGSIncidentService.prototype.getKarakteristiek = function(incidentId, archief) {
    var me = this;
    var d = $.Deferred();

    if(!incidentId) {
        return d.resolve([]);
    }

    var table = archief ? "V_B_ARC_INZET_KAR" : "V_B_ACT_KAR_WAARDEN";
    me.doAGSAjax({
        url: me.tableUrls[table] + "/query",
        dataType: "json",
        data: {
            f: "json",
            token: me.token,
            where: "INCIDENT_ID = " + incidentId,
            outFields: "NAAM_KARAKTERISTIEK,ACTUELE_KAR_WAARDE"
        }
    })
    .fail(function(e) {
        d.reject(table + ": " + e);
    })
    .done(function(data, textStatus, jqXHR) {
        me.resolveAGSFeatures(d, data, jqXHR);
    });
    return d.promise();
};

AGSIncidentService.prototype.getKarakteristieken = function(incidentIds, archief){
    var me = this;
    var d = $.Deferred();

    if(!incidentIds || incidentIds.length === 0) {
        return d.resolve(incidentIds instanceof Array ? [] : null);
    }
    incidentIds = incidentIds instanceof Array ? incidentIds : [incidentIds];

    var table = archief ? "V_B_ARC_INZET_KAR" : "V_B_ACT_KAR_WAARDEN";
    me.doAGSAjax({
        url: me.tableUrls[table] + "/query",
        dataType: "json",
        method: "POST",
        data: {
            f: "json",
            token: me.token,
            where: "INCIDENT_ID IN (" + incidentIds.join(",") + ") ",
            outFields: "NAAM_KARAKTERISTIEK,ACTUELE_KAR_WAARDE,INCIDENT_ID"
        }
    })
    .fail(function(e) {
        d.reject(table + ": " + e);
    })
    .done(function(data, textStatus, jqXHR) {
        me.resolveAGSFeatures(d, data, jqXHR);
    });
    return d.promise();
};

AGSIncidentService.prototype.getKladblok = function(incidentId, archief) {
    var me = this;
    var d = $.Deferred();

    if(!incidentId) {
        return d.resolve([]);
    }

    var table = archief ? "V_B_ARC_KLADBLOK_LOG" : "V_B_ACT_KLADBLOK_LOG";
    me.doAGSAjax({
        url: me.tableUrls[table] + "/query",
        dataType: "json",
        data: {
            f: "json",
            token: me.token,
            where: "INCIDENT_ID = " + incidentId + " AND TYPE_KLADBLOK_REGEL = 'KB' AND T_IND_DISC_KLADBLOK_REGEL LIKE '_B_'", // AND WIJZIGING_ID IS NULL",
            orderByFields: "DTG_KLADBLOK_REGEL,KLADBLOK_REGEL_ID,VOLG_NR_KLADBLOK_REGEL",
            outFields: "*"
        }
    })
    .fail(function(e) {
        d.reject(table + ": " + e);
    })
    .done(function(data, textStatus, jqXHR) {
        me.resolveAGSFeatures(d, data, jqXHR);
    });
    return d.promise();
};

AGSIncidentService.prototype.getInzetEenheden = function(incidentIds, archief) {
    var me = this;
    var d = $.Deferred();

    if(!incidentIds || incidentIds.length === 0) {
        return d.resolve(incidentIds instanceof Array ? [] : null);
    }
    incidentIds = incidentIds instanceof Array ? incidentIds : [incidentIds];

    var table = archief ? "V_B_ARC_INZET_EENHEID" : "V_B_ACT_INZET_EENHEID";
    me.doAGSAjax({
        url: me.tableUrls[table] + "/query",
        dataType: "json",
        method: "POST",
        data: {
            f: "json",
            token: me.token,
            where: "INCIDENT_ID IN (" + incidentIds.join(",") + ") ",
            orderByFields: "DTG_OPDRACHT_INZET",
            outFields: "INCIDENT_ID,DTG_OPDRACHT_INZET," + (archief ? "" : "DTG_EIND_ACTIE,") + "CODE_VOERTUIGSOORT,ROEPNAAM_EENHEID,KAZ_NAAM,T_IND_DISC_EENHEID"
        }
    })
    .fail(function(e) {
        d.reject(table + ": " + e);
    })
    .done(function(data, textStatus, jqXHR) {
        me.resolveAGSFeatures(d, data, jqXHR);
    });
    return d.promise();
};

AGSIncidentService.prototype.normalizeIncidentFields = function(incident) {
    incident.id = incident.INCIDENT_ID;

    // eenheden stats al in AGSIncidentService

    incident.locatie = this.getIncidentLocatie(incident);
    incident.start = this.getAGSMoment(incident.DTG_START_INCIDENT);
    incident.prio = incident.PRIORITEIT_INCIDENT_BRANDWEER;
    incident.plaats = incident.PLAATS_NAAM_NEN ? incident.PLAATS_NAAM_NEN : incident.PLAATS_NAAM;
    // classificaties al in AGSIncidentService

    // TODO karakteristieken

    // TODO xy
};

/**
 * Get list of current events with inzet
 * @returns {undefined}
 */
AGSIncidentService.prototype.getCurrentIncidents = function() {
    var me = this;
    var d = $.Deferred();

    var dIncidents = $.Deferred();
    var table = "V_B_ACT_INCIDENT";
    me.doAGSAjax({
        url: me.tableUrls[table] + "/query",
        dataType: "json",
        data: {
            f: "json",
            token: me.token,
            where: me.ghor ? "(IND_DISC_INCIDENT LIKE '_B_' AND PRIORITEIT_INCIDENT_BRANDWEER <= 3) OR IND_DISC_INCIDENT LIKE '__A'" : "IND_DISC_INCIDENT LIKE '_B_' AND PRIORITEIT_INCIDENT_BRANDWEER <= 3",
            orderByFields: "DTG_START_INCIDENT DESC",
            outFields: "INCIDENT_ID,T_X_COORD_LOC,T_Y_COORD_LOC,DTG_START_INCIDENT,PRIORITEIT_INCIDENT_BRANDWEER,NAAM_LOCATIE1,HUIS_PAAL_NR,HUIS_NR_TOEV,HUISLETTER,NAAM_LOCATIE2,PLAATS_NAAM_NEN,BRW_MELDING_CL_ID"
        },
        cache: false
    })
    .fail(function(e) {
        d.reject(table + ": " + e);
    })
    .done(function(data, textStatus, jqXHR) {
        me.resolveAGSFeatures(dIncidents, data, jqXHR);
    });

    dIncidents
    .fail(function(e) {
        d.reject(e);
    })
    .done(function(incidents) {
        var incidentIds = $.map(incidents, function(incident) { return incident.INCIDENT_ID; });
        var dInzetEenheden = me.getInzetEenheden(incidentIds, false);
        var dClassificaties = me.getClassificaties(incidents);
        var dKarakteristieken = me.getKarakteristieken(incidentIds,false);

        $.when(dInzetEenheden, dClassificaties, dKarakteristieken)
        .fail(function(e) {
            d.reject(e);
        })
        .done(function(inzet, classificaties, karakteristieken) {
            $.each(incidents, function(i, incident) {
                incident.inzetEenheden = [];
                incident.karakteristieken = [];
                incident.actueleInzet = false;
                incident.beeindigdeInzet = false;
            });

            $.each(inzet, function(i, inzetEenheid) {
                // Add inzet to incident
                $.each(incidents, function(j, incident) {
                    if(inzetEenheid.INCIDENT_ID === incident.INCIDENT_ID) {
                        incident.inzetEenheden.push(inzetEenheid);

                        if(inzetEenheid.T_IND_DISC_EENHEID === 'B' || (me.ghor && inzetEenheid.T_IND_DISC_EENHEID === 'A')) {
                            if(!inzetEenheid.DTG_EIND_ACTIE) {
                                incident.actueleInzet = true;
                            } else {
                                incident.beeindigdeInzet = true;
                            }
                        }
                        return false;
                    }
                });
            });

            $.each(karakteristieken, function(i, karak){
                $.each(incidents, function(j, incident) {
                    if(karak.INCIDENT_ID === incident.INCIDENT_ID){
                        incident.karakteristieken.push(karak);
                    }
                });
            });

            $.each(incidents, function(i, incident) {
                me.normalizeIncidentFields(incident);

                // To later determine between current and archived incidents
                incident.archief = false;

                incident.classificaties = classificaties[incident.INCIDENT_ID];
                incident.inzetEenhedenStats = me.getInzetEenhedenStats(incident);
            });
            d.resolve(incidents);
        });
    });

    return d.promise();
};

AGSIncidentService.prototype.getArchivedIncidents = function(incidentsToFilter) {
    var me = this;
    var d = $.Deferred();

    var filterQueryPart = "";
    if(incidentsToFilter && incidentsToFilter.length > 0) {
        var ids = $.map(incidentsToFilter, function(incident) {
            return incident.INCIDENT_ID;
        });
        filterQueryPart = "AND INCIDENT_ID NOT IN (" + ids.join(",") + ")";
    }

    var dIncidents = $.Deferred();
    var table = "V_B_ARC_INCIDENT";
    var startIncidentCutoff = new moment().subtract(24, 'hours');
    var filterPart1 = me.ghor ? "IND_DISC_INCIDENT LIKE '__A' " : "IND_DISC_INCIDENT LIKE '_B_' AND PRIORITEIT_INCIDENT_BRANDWEER <= 3 ";
    me.doAGSAjax({
        url: me.tableUrls[table] + "/query",
        dataType: "json",
        method: "POST",
        data: {
            f: "json",
            token: me.token,
            where: filterPart1 +
                "AND DTG_START_INCIDENT > timestamp '" + startIncidentCutoff.format("YYYY-MM-DD HH:mm:ss") + "' " +
                filterQueryPart,
            orderByFields: "DTG_START_INCIDENT DESC",
            outFields: "INCIDENT_ID,T_X_COORD_LOC,T_Y_COORD_LOC,DTG_START_INCIDENT,DTG_EINDE_INCIDENT,PRIORITEIT_INCIDENT_BRANDWEER,T_GUI_LOCATIE,PLAATS_NAAM,NAAM_LOCATIE1,NAAM_LOCATIE2,BRW_MELDING_CL,BRW_MELDING_CL1,BRW_MELDING_CL2"
        },
        cache: false
    })
    .fail(function(e) {
        d.reject(table + ": " + e);
    })
    .done(function(data, textStatus, jqXHR) {
        me.resolveAGSFeatures(dIncidents, data, jqXHR);
    });

    dIncidents
    .fail(function(e) {
        d.reject(e);
    })
    .done(function(incidents) {
        // Apply DTG_START_INCIDENT > [24 hours ago] client side, sometimes
        // not filtered correctly by server
        incidents = $.grep(incidents, function(incident) {
            return me.getAGSMoment(incident.DTG_START_INCIDENT).isAfter(startIncidentCutoff);
        });

        // Filter on active inzet
        var incidentIds = $.map(incidents, function(incident) { return incident.INCIDENT_ID; });
        var dInzetEenheden = me.getInzetEenheden(incidentIds, true);
        var dkarakteristieken = me.getKarakteristieken(incidentIds,true);
        $.when(dInzetEenheden, dkarakteristieken)
        .fail(function(e) {
            d.reject(e);
        })
        .done(function(inzet, karakteristieken) {
            $.each(inzet, function(i, inzetEenheid) {
                // Add inzet to incident
                $.each(incidents, function(j, incident) {
                    if(inzetEenheid.INCIDENT_ID === incident.INCIDENT_ID) {
                        if(incident.inzetEenheden) {
                            incident.inzetEenheden.push(inzetEenheid);
                        } else {
                            incident.inzetEenheden = [inzetEenheid];
                        }
                    }
                });
            });

            $.each(karakteristieken, function(i, karak){
                $.each(incidents, function(j, incident) {
                    if(karak.INCIDENT_ID === incident.INCIDENT_ID){
                        if(incident.karakteristieken){
                            incident.karakteristieken.push(karak);
                        } else {
                            incident.karakteristieken = [karak];
                        }

                    }
                });
            });

            $.each(incidents, function(i, incident) {
                me.normalizeIncidentFields(incident);

                // To later determine between current and archived incidents
                incident.archief = true;

                incident.classificaties = me.getArchiefIncidentClassificaties(incident);

                if(!incident.inzetEenheden) {
                    incident.inzetEenheden = [];
                }
                incident.inzetEenhedenStats = me.getInzetEenhedenStats(incident);
            });

            d.resolve(incidents);
        });
    });

    return d.promise();
};

/**
 * Tel aantal actuele inzet eenheden per discipline en soort voertuig
 */
AGSIncidentService.prototype.getInzetEenhedenStats = function(incident, ookBeeindigd) {
    var eenheidStats = {
        "B": {
            "total": 0
        },
        "P": {
            "total": 0
        },
        "A": {
            "total": 0
        }
    };
    if(incident.inzetEenheden) {
        $.each(incident.inzetEenheden, function(j, eenheid) {
            if(ookBeeindigd || !eenheid.DTG_EIND_ACTIE) {
                eenheidStats[eenheid.T_IND_DISC_EENHEID].total++;
                var soort = eenheid.CODE_VOERTUIGSOORT;
                if(soort !== null) {
                    var soortCount = eenheidStats[eenheid.T_IND_DISC_EENHEID][soort];
                    if(typeof soortCount === "undefined") {
                        soortCount = 0;
                    }
                    eenheidStats[eenheid.T_IND_DISC_EENHEID][soort] = soortCount + 1;
                }
            }
        });
    }
    eenheidStats.standard = eenheidStats.A.total === 1 &&  eenheidStats.B.total === 0 && eenheidStats.P.total === 0;


    return eenheidStats;
};

AGSIncidentService.prototype.getArchiefIncidentClassificaties = function(incident) {
    var classificaties = [];
    if(incident.BRW_MELDING_CL) {
        classificaties.push(incident.BRW_MELDING_CL);
    }
    if(incident.BRW_MELDING_CL1) {
        classificaties.push(incident.BRW_MELDING_CL1);
    }
    if(incident.BRW_MELDING_CL2) {
        classificaties.push(incident.BRW_MELDING_CL2);
    }
    return classificaties.length === 0 ? "" : classificaties.join(", ");
};

AGSIncidentService.prototype.getVehiclePositions = function(incidentIds) {

    var me = this;

    if(me.vehiclePosLayerUrls === null) {
        return $.Deferred().resolveWith([]);
    }

    var d = $.Deferred();

    var where = "(IncidentID <> '' or Speed > 5)"; // Any vehicle on incident or no incident but moving
    if(incidentIds) {
        if(incidentIds.length === 0) {
            where = "(IncidentID = '' and Speed > 5)"; // Only moving vehicles not on incident
        } else {
            // Use strings for IncidentIDs, because they are too big for 
            // integers and server table column type is string
            var incidentStringIds = "";
            for(var i = 0; i < incidentIds.length; i++) {
                if(i > 0) {
                    incidentStringIds += ",";
                }
                incidentStringIds += "'" + incidentIds[i] + "'";
            }
            where = "(IncidentID in (" + incidentStringIds + ") or (IncidentID = '' and Speed > 5))"; // Only vehicles on given incident id or not on incident and moving
        }
    }

    me.doAGSAjax({
        url: me.vehiclePosLayerUrls["Brandweer_Eenheden"] + "/query",
        dataType: "json",
        data: {
            f: "json",
            token: me.token,
            where: "Discipline='B' and " + where,
            outFields: "*"
        },
        cache: false
    })
    .fail(function(e) {
        d.reject("Fout voertuigposities: " + e);
    })
    .done(function(data, textStatus, jqXHR) {
        if(!data.features) {
            d.reject("Geen features in voertuigposities");
        } else {
            var features = [];

            var cutoff = new moment().subtract(2, 'hours');
            $.each(data.features, function(i, f) {
                var dateTime = moment(f.attributes.PosDate + " " + f.attributes.PosTime, "DD-MM-YYYY HH:mm:ss");
                if(dateTime.isAfter(cutoff)) {
                    var p = new Proj4js.Point(f.geometry.x, f.geometry. y);
                    var t = Proj4js.transform(new Proj4js.Proj("EPSG:4326"), new Proj4js.Proj(dbkjs.options.projection.code), p);
                    var p = new OpenLayers.Geometry.Point(t.x, t.y);
                    var feature = new OpenLayers.Feature.Vector(p, f.attributes);
                    features.push(feature);
                }
            });
            d.resolve(features);
        }
    });
    return d.promise();
};
