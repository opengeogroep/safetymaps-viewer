
OpenLayers.Lang["nl"] = OpenLayers.Util.applyDefaults({'Scale = 1 : ${scaleDenom}': "Schaal 1 : ${scaleDenom}"});
OpenLayers.Lang.setCode("nl");
Proj4js.defs["EPSG:28992"] = "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.999908 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs <>";

var dbkjsLang = 'nl';

dbkjs.options.projection = {
    code: "EPSG:28992",
    srid: 28992,
    coordinates: {
        numDigits: 0
    }
};

dbkjs.options.map = {
    options: {
        theme: null,
        controls: [new OpenLayers.Control.Navigation()],
        div: 'mapc1map1',
        projection: new OpenLayers.Projection("EPSG:28992"),
        resolutions: [3440.64, 1720.32, 860.16, 430.08, 215.04, 107.52, 53.76, 26.88, 13.44, 6.72, 3.36, 1.68, 0.84, 0.42, 0.210, 0.105, 0.0525, 0.02625, 0.013125, 0.0065625],
        xy_precision: 3,
        maxExtent: new OpenLayers.Bounds(-65200.96, 242799.04, 375200.96, 68320096),
        units: "m",
        zoomMethod: null,
        fractionalZoom: true
    }
};

var tileScheme = {
    geonovum: {
        origin: new OpenLayers.LonLat(-285401.92, 22598.08),
        maxExtent: new OpenLayers.Bounds(-285401.920, 22598.080, 595401.920, 903401.920),
        standardResolutions: [3440.640, 1720.320, 860.160, 430.080, 215.040, 107.520, 53.760, 26.880, 13.440, 6.720, 3.360, 1.680, 0.840, 0.420, 0.210, 0.105, 0.0525]
    }
};

dbkjs.options.baselayers = [
    new OpenLayers.Layer.TMS(
            "Openbasiskaart",
            "https://openbasiskaart.nl/mapcache/tms/",
            {
                layername: 'osm-nb@rd', type: "png", serviceVersion: '1.0.0',
                metadata:{pl:"00"},
                gutter: 0, buffer: 0,
                isBaseLayer: true, transitionEffect: 'resize',
                tileOrigin: tileScheme.geonovum.origin,
                maxExtent: tileScheme.geonovum.maxExtent,
                serverResolutions: [3440.64, 1720.32, 860.16, 430.08, 215.04, 107.52, 53.76, 26.88, 13.44, 6.72, 3.36, 1.68, 0.84, 0.42, 0.21, 0.105, 0.0525, 0.02625, 0.013125, 0.0065625, 0.00328125, 0.001640625],
                zoomOffset: 0,
                attribution: "OpenStreetMap"
            }
    ),
    new OpenLayers.Layer.TMS(
            'Basisregistratie Topografie (PDOK)',
            'http://geodata.nationaalgeoregister.nl/tms/',
            {
                layername: 'brtachtergrondkaart',
                metadata:{pl: "01"},
                isBaseLayer: true,
                displayInLayerSwitcher: true,
                type: 'png',
                tileOrigin: tileScheme.geonovum.origin,
                tileFullExtent: tileScheme.geonovum.maxExtent,
                serverResolutions: tileScheme.geonovum.standardResolutions,
                attribution: "PDOK"
            }
    ),
    new OpenLayers.Layer.TMS(
            'Topografische kaart 1:10.000 - top10nl (PDOK)',
            'https://geodata.nationaalgeoregister.nl/tiles/service/tms/',
            {
                layername: 'top10nlv2/EPSG:28992',
                metadata:{pl: "02"},
                isBaseLayer: true,
                displayInLayerSwitcher: true,
                type: 'png',
                tileOrigin: tileScheme.geonovum.origin,
                tileFullExtent: tileScheme.geonovum.maxExtent,
                serverResolutions: tileScheme.geonovum.standardResolutions,
                attribution: "PDOK"
            }
    )
];

