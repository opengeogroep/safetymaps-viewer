
dbkjs.options.baselayers = [
    new OpenLayers.Layer.TMS(
            "Openbasiskaart",
            "https://openbasiskaart.nl/mapcache/tms/",
            {
                layername: 'osm@rd', type: "png", serviceVersion: '1.0.0',
                metadata:{pl:"00"},
                gutter: 0, buffer: 0,
                isBaseLayer: true, transitionEffect: 'resize',
                tileOrigin: tileScheme.geonovum.origin,
                maxExtent: tileScheme.geonovum.maxExtent,
                serverResolutions: [3440.64, 1720.32, 860.16, 430.08, 215.04, 107.52, 53.76, 26.88, 13.44, 6.72, 3.36, 1.68, 0.84, 0.42, 0.21, 0.105, 0.0525, 0.02625, 0.013125, 0.0065625, 0.00328125, 0.001640625],
                zoomOffset: 0
            }
    ),
    new OpenLayers.Layer.TMS(
            'Luchtfoto 2017 (PDOK)',
            'https://geodata.nationaalgeoregister.nl/luchtfoto/rgb/tms/',
            {
                layername: '2017_ortho25/EPSG:28992',
                metadata:{pl: "01"},
                isBaseLayer: true,
                displayInLayerSwitcher: true,
                type: 'png',
                tileOrigin: tileScheme.geonovum.origin,
                tileFullExtent: tileScheme.geonovum.maxExtent,
                serverResolutions: tileScheme.geonovum.standardResolutions
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
                serverResolutions: tileScheme.geonovum.standardResolutions
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
                serverResolutions: tileScheme.geonovum.standardResolutions
            }
    )
];


