
var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;

OpenLayers.IMAGE_RELOAD_ATTEMPTS = 3;

dbkjs.options = {
    VERSION: "_VERSION_",
    CONFIG: "_CONFIG_",
	APPLICATION: "SafetyMaps Viewer",
	
	// Organisation extent (from: https://cartomap.github.io/nl/wgs84/veiligheidsregio_2019.geojson)
    organisationExtent: '{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[5.606,51.943],[5.646,51.941],[5.678,51.929],[5.706,51.908],[5.707,51.893],[5.725,51.887],[5.832,51.872],[5.857,51.895],[5.881,51.869],[5.921,51.875],[5.955,51.857],[5.981,51.86],[5.994,51.876],[6.017,51.881],[6.063,51.865],[6.036,51.843],[5.987,51.831],[5.963,51.837],[5.945,51.824],[5.979,51.798],[5.991,51.766],[5.953,51.748],[5.915,51.753],[5.893,51.778],[5.868,51.776],[5.864,51.758],[5.78,51.752],[5.745,51.759],[5.732,51.772],[5.702,51.778],[5.692,51.789],[5.657,51.798],[5.642,51.817],[5.589,51.83],[5.558,51.827],[5.541,51.816],[5.486,51.829],[5.465,51.811],[5.439,51.81],[5.402,51.821],[5.369,51.79],[5.354,51.755],[5.296,51.737],[5.245,51.734],[5.216,51.743],[5.163,51.743],[5.128,51.738],[5.138,51.751],[5.138,51.773],[5.096,51.788],[5.067,51.781],[5.048,51.798],[5.016,51.808],[5,51.821],[5.026,51.819],[5.027,51.859],[5.059,51.858],[5.056,51.873],[5.081,51.876],[5.09,51.889],[5.113,51.888],[5.132,51.914],[5.18,51.967],[5.206,51.959],[5.247,51.977],[5.27,51.965],[5.333,51.957],[5.348,51.968],[5.383,51.969],[5.442,51.986],[5.486,51.984],[5.54,51.967],[5.561,51.955],[5.606,51.943]]]}',
    organisationExtentBounderyInMeters: 5500,

    zoom: 13,

    // Set to true to enable style scaling according to map scale
    styleScaleAdjust: false,
    // Scale at which scaled values are returned as original
    originalScale: 595.2744,
    // User style value adjustment (before scaling)
    styleSizeAdjust: 0,
    noLineScaling: true,
    // Scale the extent of the object by 140% to set map extent when zooming to object
    //objectZoomExtentScale: 1.4,
    // Comment the line above and uncomment this line to zoom to the extent of the
    // object buffered with a fixed number of meters(/projection units)
    objectZoomExtentBuffer: 50,

    // Always use pdf.js instead of browser PDF support
    forcePDFJS: true,

    // Interface
    showZoomButtons: true,
    enableSplitScreen: true,
    minSplitScreenWidth: 950,
    splitScreenChecked: true,
    splitScreenSwitch: true,
    maxMapWidthMediumButtons: 800,
    maxMapWidthSmallButtons: 600,

    // No feature info above this scale
    featureInfoMaxScale: 2381.0976,

    // No feature info when moved more than this distance in pixels
    minTouchMoveEndDistance: 5,

    separateWindowMode: OpenLayers.Util.getParameters().separateWindow === "true",

    reopenWindowAfterLayerWindowClose: true,

    // Enable hiDPI
    enableHiDPI: true,
    // Use HiDPI by default if available (checkbox state saved in local storage)
    defaultHiDPI: true,
    // Enable HiDPI for WMS layers in HiDPI by default, when false set hiDPI=true
    // per layer.options to enable. You may need to set MAXSIZE for MapServer or increase
    // GeoServer image buffer size. Only enabled when URL contains "geoserver" or "mapserv",
    // as we know the GetMap parameter for scaled rendering
    defaultOverlayHiDPI: true,
    
    extraButtonGroupDropdown: false,
    
    resetToDefaultOnIncident: false,
    
    showLayerLoadingPanel: true,

    extendedLogout: false
};
