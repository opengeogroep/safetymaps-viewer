/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


function FalckIncidentVehicleController(controller) {
    var me = this;
    me.controller = controller;
    me.options = controller.options;
    var selectLayers = [];
    me.vehiclePositionLayer = new VehiclePositionLayer(me.options);

    selectLayers.push(me.vehiclePositionLayer.layer);
    //me.addSelectLayers(selectLayers);
    me.getEenheidLocatie();

    /* window.setInterval(function () {
        if ((window.localStorage.getItem("VehiclePositionLayer.hidden") === "true")) {
            //me.getEenheidLocatieIncident();
        } else {
            me.getEenheidLocatie();
        }
    }, 30000);
    */
    $(dbkjs).one("dbkjs_init_complete", function () {
        if (dbkjs.modules.incidents && dbkjs.modules.incidents.controller) {
            $(dbkjs.modules.incidents.controller).on("new_incident", function (event, commonIncident,incident) {
                me.incidentFound(incident);
            });
            $(dbkjs.modules.incidents.controller).on("incidents.vehicle.update", function(event, incident){
               me.incidentFound(incident); 
            });
            $(dbkjs.modules.incidents.controller).on("voertuigNummerUpdated", function(event, incident){
               me.vehiclePositionLayer.layer.destroyFeatures();
               me.vehiclePositionLayer.layer2.destroyFeatures(); 
            });
        }
    });
};

FalckIncidentVehicleController.prototype.getEenheidLocatie = function () {

    var me = this;
    $.ajax(me.options.incidentsUrl + "/eenheidlocatie?extended=false", {
        dataType: "json"
    })
            .fail(function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR, textStatus, errorThrown);
            })
            .done(function (data, textStatus, jqXHR) {
                console.log("eenheden", data);
                me.updateVehicles(data.features);
            });
};

FalckIncidentVehicleController.prototype.getEenheidLocatieIncident = function (betrokkenEenheden) {
    console.log("Betrokken eenheden", betrokkenEenheden);
    var me = this;
    var features = [];
    var calls = [];
    for (var i = 0; i < betrokkenEenheden.length; i++) {
        var call = $.ajax(me.options.incidentsUrl + "/eenheidlocatie?id=" + betrokkenEenheden[i], {
            dataType: "json",
            voertuigNummer: betrokkenEenheden[i]
        })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    console.log(jqXHR, textStatus, errorThrown);
                })
                .done(function (data, textStatus, jqXHR) {
                    if(data.features.length > 0){
                        features.push(data.features[0]);
                    }else {
                        console.log("Er is geen eenheidlocatie beschikbaar voor voertuig nummer:"+this.voertuigNummer);
                    }
                });
        calls.push(call);
    }
    $.when.apply($, calls).then(function () {
        me.updateVehicles(features);
    });
};

FalckIncidentVehicleController.prototype.updateVehicles = function (features) {
    var me = this;
    var transformedFeatures = me.transformFeaturesForVehiclePositionLayer(features);
    console.log("transformedEenheden: ", transformedFeatures);
    me.vehiclePositionLayer.features(transformedFeatures);
};

FalckIncidentVehicleController.prototype.transformFeaturesForVehiclePositionLayer = function (features) {
    var transformedFeatures = [];
    for (var i = 0; i < features.length; i++) {
            var feat = features[i];
            feat.attributes = feat.properties;
            delete feat.properties;
            feat.attributes.IncidentID = (feat.attributes.incidentNummer === null) ? "" : feat.attributes.incidentNummer;
            //feat.attributes.IncidentID=null;
            delete feat.attributes.incidentNummer;
            feat.attributes.Voertuigsoort = "";
            feat.attributes.Roepnummer = feat.attributes.id;
            feat.attributes.Speed = feat.attributes.speed;
            //feat.attributes.Speed = 35;
            feat.attributes.Direction = feat.attributes.heading;
            feat.geometry = new OpenLayers.Geometry.Point(feat.geometry.coordinates[0], feat.geometry.coordinates[1]);
            var feature = new OpenLayers.Feature.Vector(feat.geometry, feat.attributes);
            transformedFeatures[i] = feature;     
    }
    return transformedFeatures;
};

FalckIncidentVehicleController.prototype.addSelectLayers = function (layers) {
    dbkjs.selectControl.deactivate();
    dbkjs.selectControl.setLayer((dbkjs.selectControl.layers || dbkjs.selectControl.layer).concat(layers));
    dbkjs.selectControl.activate();
};

FalckIncidentVehicleController.prototype.incidentFound = function (incidenten) {
    console.log("incidenten: ", incidenten);
    var betrokkenEenheden = [];
    var me = this;
        if (me.controller.incidentId) {
            me.vehiclePositionLayer.visibility = true;
            me.vehiclePositionLayer.layer.setVisibility(true);
            me.vehiclePositionLayer.layer2.setVisibility(true);
            for (var i = 0; i < incidenten.BetrokkenEenheden.length; i++) {
                var eenheid = incidenten.BetrokkenEenheden[i];
                betrokkenEenheden.push(eenheid.Roepnaam);
            }
            me.getEenheidLocatieIncident(betrokkenEenheden);
        } else {
            me.vehiclePositionLayer.visibility = false;
            me.vehiclePositionLayer.layer.setVisibility(false);
            me.vehiclePositionLayer.layer2.setVisibility(false);
        }
};
