dbkjs.options.baselayers = [
    new OpenLayers.Layer.TMS(
        "Openbasiskaart",
        "https://openbasiskaart.nl/mapcache/tms/",
        {
            layername: 'osm@rd', type: "png", serviceVersion: '1.0.0',
            gutter: 0, buffer: 0,
            isBaseLayer: true, transitionEffect: 'resize',
            tileOrigin: tileScheme.geonovum.origin,
            maxExtent: tileScheme.geonovum.maxExtent,
            serverResolutions: [3440.64, 1720.32, 860.16, 430.08, 215.04, 107.52, 53.76, 26.88,
                13.44, 6.72, 3.36, 1.68, 0.84, 0.42, 0.21, 0.105, 0.0525, 0.02625, 0.013125, 0.0065625, 0.00328125, 0.001640625],
            zoomOffset: 0,
            outsideOrganisationExtentSwitchToLayer: null,
            disableInToggleButton: false,
            hideInList: false,
            switchAtZoomLevel: 14,
            afterMaxZoomLevelSwitchToLayer: null
        }
    ),
    // High resolution layer with the same name will be shown when hiDPI available and enabled
    new OpenLayers.Layer.TMS(
        "Openbasiskaart",
        "https://openbasiskaart.nl/mapcache/tms/",
        {
            layername: 'osm-hq@rd-hq', type: "png", serviceVersion: '1.0.0',
            hiDPI: true,
            gutter: 0, buffer: 0,
            isBaseLayer: true, transitionEffect: 'resize',
            tileOrigin: tileScheme.geonovum.origin,
            maxExtent: tileScheme.geonovum.maxExtent,
            serverResolutions: [3440.64, 1720.32, 860.16, 430.08, 215.04, 107.52, 53.76, 26.88,
                13.44, 6.72, 3.36, 1.68, 0.84, 0.42, 0.21, 0.105],
            tileSize: new OpenLayers.Size(256, 256),
            zoomOffset: 0,
            outsideOrganisationExtentSwitchToLayer: null,
            disableInToggleButton: false,
            hideInList: false
        }
    ),
    new OpenLayers.Layer.WMTS({
        name: 'Luchtfoto (PDOK) WMTS',
        url: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_ortho25/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.jpeg',
        requestEncoding: 'REST',
        matrixSet: 'EPSG:28992',
        layer: '',
        style: 'default',
        serverResolutions: [3440.640, 1720.320, 860.160, 430.080, 215.040, 107.520, 53.760, 26.880, 13.440, 6.720, 3.360, 1.680, 0.840, 0.420, 0.210],
        maxExtent: tileScheme.geonovum.maxExtent,
        outsideOrganisationExtentSwitchToLayer: null,
        disableInToggleButton: false,
        hideInList: false
    }),
    // High resolution layer only showing normal 256x256 tiles of deeper level as 128x128,
    // aerophoto does not need high DPI scaling of fonts/line widths
    // For performance it is better to render aerophoto as 512x512 tiles if you control
    // the tile server
    new OpenLayers.Layer.WMTS({
        name: 'Luchtfoto (PDOK) WMTS',
        url: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_ortho25/{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}.jpeg',
        requestEncoding: 'REST',
        matrixSet: 'EPSG:28992',
        layer: '',
        style: '',
        serverResolutions: [3440.640 * 2, 3440.640, 1720.320, 860.160, 430.080, 215.040, 107.520, 53.760, 26.880, 13.440, 6.720, 3.360, 1.680, 0.840, 0.420],
        tileSize: new OpenLayers.Size(128, 128),
        maxExtent: tileScheme.geonovum.maxExtent,
        hiDPI: true,
        outsideOrganisationExtentSwitchToLayer: null,
        disableInToggleButton: false,
        hideInList: false
    }),
    new OpenLayers.Layer.WMTS({
        name: 'Basisregistratie Topografie (PDOK)',
        url: "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0",
        matrixSet: "EPSG:28992",
        layer: "standaard",
        format: "image/png",
        style: "default",
        serverResolutions: tileScheme.geonovum.standardResolutions,
        maxExtent: tileScheme.geonovum.maxExtent,
        outsideOrganisationExtentSwitchToLayer: null,
        disableInToggleButton: false,
        hideInList: false
    }),
];


