
var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;

OpenLayers.IMAGE_RELOAD_ATTEMPTS = 3;

dbkjs.options = {
    VERSION: "_VERSION_",
    CONFIG: "_CONFIG_",
    APPLICATION: "SafetyMaps Viewer 4.1 (test S2 2018)",

    zoom: 13,

    // Set to true to enable style scaling according to map scale
    styleScaleAdjust: true,
    // Scale at which scaled values are returned as original
    originalScale: 595.2744,
    // User style value adjustment (before scaling)
    styleSizeAdjust: 0,

    alwaysShowDbkFeature: true,

    noLineScaling: true,

    featureLabelResolution: 6.72,

    dbkLayersMinResolution: 0,

    forcePDFJS: true
};

dbkjs.options.searchTabs = true;

// Scale the extent of the object by 140% to set map extent when zooming to object
//dbkjs.options.objectZoomExtentScale = 1.4;

// Comment the line above and uncomment this line to zoom to the extent of the
// object buffered with a fixed number of meters(/projection units)
dbkjs.options.objectZoomExtentBuffer = 50;

dbkjs.options.showZoomButtons = true;

dbkjs.options.enableSplitScreen = true;
dbkjs.options.splitScreenChecked = true;
dbkjs.options.splitScreenSwitch = true;

dbkjs.options.autoFeatureUpdateInterval = 3600000;

dbkjs.options.featureInfoMaxScale = 2381.0976;

dbkjs.options.minTouchMoveEndDistance = 5;


