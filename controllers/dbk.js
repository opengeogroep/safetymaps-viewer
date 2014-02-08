exports.getObject = function(req, res) {
    //where identificatie = 1369659645
    if (req.query) {
        id = req.params.id;
        srid = req.query.srid;
        if(!srid){
            srid = 4326;
        }
        var query_str = 'select "DBKObject" from dbk.dbkobject_json($1,$2)';
        global.pool.query(query_str, [id, srid],
            function(err, result){
                if(err) {
                    res.json(err);
                } else {
                    res.json(result.rows[0]);
                }
                return;
            }
        );
    }
};

exports.getGebied = function(req, res) {
    //where identificatie = 1369659645
    if (req.query) {
        id = req.params.id;
        srid = req.query.srid;
        if(!srid){
            srid = 4326;
        }
        var query_str = 'select "DBKGebied" from dbk.dbkgebied_json($1,$2)';
        global.pool.query(query_str, [id, srid],
            function(err, result){
                if(err) {
                    res.json(err);
                } else {
                    res.json(result.rows[0]);
                }
                return;
            }
        );
    }
};
exports.getFeatures = function(req, res) {
    //where identificatie = 1369659645
    if (req.query) {
        srid = req.query.srid;
        if(!srid){
            srid = 4326;
        }
        var query_str = 'select "feature" from dbk.dbkfeatures_json($1)';
        global.pool.query(query_str, [srid],
            function(err, result){
                if(err) {
                    res.json(err);
                } else {
                    var resultset = {"type": "FeatureCollection", "features": []};
                    
                    for (index = 0; index < result.rows.length; ++index) {
                        var item = {type: 'Feature', id: 'DBKFeature.gid--' + result.rows[index].feature.gid};
                        item.geometry = result.rows[index].feature.geometry;
                        item.properties = result.rows[index].feature;
                        delete item.properties.geometry;
                        resultset.features.push(item);
                    }
                    res.json(resultset);
                }
                return;
            }
        );
    }
};