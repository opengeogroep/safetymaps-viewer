
var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.layers = {
    createBaseLayers: function() {
        var baselayer_ul = $('<ul id="baselayerpanel_ul" class="nav nav-pills nav-stacked">');
        $.each(dbkjs.options.baselayers, function(bl_index, bl) {
            var _li = $('<li class="bl" id="bl' + bl_index + '"><a href="#">' + bl.name + '</a></li>');
            baselayer_ul.append(_li);
            bl.events.register("loadstart", bl, function() {
                dbkjs.util.loadingStart(bl);
            });
            bl.events.register("loadend", bl, function() {
                dbkjs.util.loadingEnd(bl);
            });
            dbkjs.map.addLayer(bl);
            _li.on('click',function() {
                dbkjs.toggleBaseLayer(bl_index);
                dbkjs.util.getModalPopup('baselayerpanel').hide();
            });
        });
        $('#baselayerpanel_b').append(baselayer_ul);
        return baselayer_ul;
    },

    loadFromWMSGetCapabilities: function () {
        if(!dbkjs.options.organisation.wms) {
            return;
        }

        $.each(dbkjs.options.organisation.wms, function (wms_k, wms_v) {
          var options;
          var params;
          var parent;
          var layertype;
          var metadata;
          var myLayer;
          var index = wms_v.index || 0;
          if (wms_v.getcapabilities === true) {
              options = {
                  url: wms_v.url,
                  title: wms_v.name,
                  proxy: wms_v.proxy,
                  index: index,
                  parent: wms_v.parent
              };
              /**
               * Should extend options and params if they are
               * passed from the organisation JSON (issue #413)
               */
              options.options = wms_v.options || {};
              options.params = wms_v.params || {};
              if (!dbkjs.util.isJsonNull(wms_v.pl)) {
                  options.pl = wms_v.pl;
              }
          } else if (!wms_v.baselayer) {
              params = wms_v.params || {};
              options = wms_v.options || {};
              parent = wms_v.parent || null;
              metadata = {};
              if (!dbkjs.util.isJsonNull(wms_v.abstract)) {
                  metadata.abstract = wms_v.abstract;
              }
              if (!dbkjs.util.isJsonNull(wms_v.pl)) {
                  metadata.pl = wms_v.pl;
              }
              if (!dbkjs.util.isJsonNull(wms_v.legend)) {
                  metadata.legend = wms_v.legend;
              }
              layertype = wms_v.layertype || null;
              myLayer = new dbkjs.Layer(
                  wms_v.name,
                  wms_v.url,
                  params,
                  options,
                  parent,
                  index,
                  metadata,
                  layertype,
                  wms_v.gid
              );
          } else {
              params = wms_v.params || {};
              options = wms_v.options || {};
              options = OpenLayers.Util.extend({isBaseLayer: true}, options);
              parent = wms_v.parent || null;
              metadata = {};
              if (!dbkjs.util.isJsonNull(wms_v.abstract)) {
                  metadata.abstract = wms_v.abstract;
              }
              if (!dbkjs.util.isJsonNull(wms_v.pl)) {
                  metadata.pl = wms_v.pl;
              }
              if (!dbkjs.util.isJsonNull(wms_v.legend)) {
                  metadata.legend = wms_v.legend;
              }
              layertype = wms_v.layertype || null;
              myLayer = new dbkjs.Layer(
                  wms_v.name,
                  wms_v.url,
                  params,
                  options,
                  parent,
                  index,
                  metadata,
                  layertype
              );
          }
        });
    }
};
