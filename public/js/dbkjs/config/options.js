
var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;

OpenLayers.IMAGE_RELOAD_ATTEMPTS = 3;

dbkjs.options = {
    VERSION: "_VERSION_",
    RELEASEDATE: "_DATE_",
    APPLICATION: "Falck voertuigviewer 3.5",
    REMARKS: "",
    INFO: "",
    zoom: 13,

    // If false labels are shown on select and temporary render intents
    alwaysShowInformationLabels: false,

    // Set to true to enable style scaling according to map scale
    styleScaleAdjust: false,
    // Scale at which scaled values are returned as original
    originalScale: 595.2744,
    // User style value adjustment (before scaling)
    styleSizeAdjust: 0,

    alwaysShowDbkFeature: true,

    noLineScaling: true,

    featureLabelResolution: 6.72,

    dbkLayersMinResolution: 0

};

dbkjs.options.searchTabs = true;

dbkjs.options.zoomToPandgeometrie = true;
dbkjs.options.zoomToPandgeometrieMargin = 50;

dbkjs.options.showZoomButtons = true;

dbkjs.options.enableSplitScreen = true;
dbkjs.options.splitScreenChecked = true;
dbkjs.options.splitScreenSwitch = true;

dbkjs.options.autoFeatureUpdateInterval = 3600000;

dbkjs.options.featureInfoMaxScale = 2381.0976;

dbkjs.options.minTouchMoveEndDistance = 5;

$("#zoom_extent").hide();

