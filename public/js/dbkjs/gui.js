
var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.gui = {
    // dbkjs.js: successAuth
    setLogo: function() {
        if (dbkjs.options.organisation.logo) {
            $('#logo').css('background-image', 'url(' + dbkjs.options.organisation.logo + ')');
        }
    },
    // jsonDBK.js
    infoPanelUpdateTitle: function(text) {
        //dbkjs.util.changeDialogTitle(text);
    },
    // feature.js
    infoPanelUpdateHtml: function(html) {
        $('#infopanel_b').html(html);
    },
    // jsonDBK.js
    infoPanelUpdateFooterHtml: function(html) {
        $('#infopanel_f').html(html);
    },
    // feature.js
    infoPanelAddPagination: function() {
        $('#infopanel_f').append('<ul id="Pagination" class="pagination"></ul>');
    },
    // feature.js
    infoPanelShow: function() {
        $('#infopanel').show();
    },
    // feature.js
    infoPanelShowFooter: function() {
        $('#infopanel_f').show();
    },
    // feature.js
    infoPanelAddItems: function(html) {
        $('#infopanel_b').append(html);
    },
    // feature.js
    infoPanelAddItemClickEvent: function(_obj) {
    },
    // feature.js
    infoPanelHide: function() {
        $('#infopanel').hide();
    },
    showError: function(errMsg) {
        dbkjs.util.alert('Fout', ' ' + errMsg, 'alert-danger');
    },
    // jsonDBK.js
    detailsPanelUpdateTitle: function(text) {
        $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle"></i>&nbsp;' + text + '</span>');
        //$('#vectorclickpanel_h').html(text);
    },
    // jsonDBK.js
    detailsPanelUpdateHtml: function(html) {
        $('#vectorclickpanel_b').html(html);
    },
    // jsonDBK.js
    detailsPanelShow: function() {
        $('#vectorclickpanel').show();
    },
    // jsonDBK.js
    detailsPanelHide: function() {
        $('#vectorclickpanel').hide();
    }
};
