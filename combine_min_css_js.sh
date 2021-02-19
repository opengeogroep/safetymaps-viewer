#!/bin/bash
cat public/js/libs/bootstrap-3.2.0-dist/css/bootstrap.min.css public/css/typeahead.js-bootstrap.css public/css/bootstrap-slider.min.css > public/css/libs.min.css
cd public/js/libs
cat jquery-1.11.0/jquery-1.11.0.min.js bootstrap-3.2.0-dist/js/bootstrap.min.js proj4js-compressed.js OpenLayers-2.13.1/OpenLayers.js moment-with-locales.min.js fastclick.min.js bootstrap-slider.js i18next.js jquery.typeahead.js mustache.min.js pdfobject.min.js jsts.min.js jquery.tableSorter.min.js > libs.min.js

