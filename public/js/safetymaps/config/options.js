
var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;

OpenLayers.IMAGE_RELOAD_ATTEMPTS = 3;

dbkjs.options = {
    VERSION: "_VERSION_",
    CONFIG: "_CONFIG_",
    APPLICATION: "SafetyMaps Viewer",

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
    
    showLayerLoadingPanel: true
};
