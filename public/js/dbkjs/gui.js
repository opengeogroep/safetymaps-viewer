
var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;

dbkjs.gui = {
    infoPanelAddItems: function(html) {
        $('#infopanel_b').append(html);
    },
    showError: function(errMsg) {
        dbkjs.util.alert('Fout', ' ' + errMsg, 'alert-danger');
    },
    detailsPanelUpdateTitle: function(text) {
        $('#vectorclickpanel_h').html('<span class="h4"><i class="fa fa-info-circle"></i>&nbsp;' + text + '</span>');
    },
    detailsPanelHide: function() {
        $('#vectorclickpanel').hide();
    }
};
