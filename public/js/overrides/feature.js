

dbkjs.modules.feature.handleDbkOmsSearch = function(object) {
    var _obj = dbkjs.modules.feature;
    dbkjs.protocol.jsonDBK.process(object, function() {
        _obj.zoomToFeature(object);
    });
};


dbkjs.modules.feature.zoomToFeature = function(feature) {
    dbkjs.options.dbk = feature === null ? null : feature.attributes.identificatie;
    dbkjs.modules.updateFilter(dbkjs.options.dbk);
    if(dbkjs.options.dbk) {

        if(feature.attributes.typeFeature === "WO") {
            dbkjs.map.zoomToExtent(dbkjs.util.extendBounds(OpenLayers.Bounds.fromString(feature.attributes.bounds)));
        } else if(!dbkjs.options.zoomToPandgeometrie) {
            if (dbkjs.map.zoom < dbkjs.options.zoom) {
                dbkjs.map.setCenter(feature.geometry.getBounds().getCenterLonLat(), dbkjs.options.zoom);
            } else {
                dbkjs.map.setCenter(feature.geometry.getBounds().getCenterLonLat());
            }
        } else {
            this.zoomToPandgeometrie();
        }
    };
    // getActive() changed, hide it
    this.layer.redraw();
};
