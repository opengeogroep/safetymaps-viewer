/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


 dbkjs.modules.bagAddressSearch = {
    id: "dbk.module.bagAddressSearch",

    register: function() {
        var me = this;
        
        this.options = $.extend({
            // default options here
            maxSearchResults: 30
        }, this.options);
        
        if(!dbkjs.modules.search) {
            console.log("bag address module requires search module, disabled");
            return;
        }
        
        dbkjs.modules.search.addSearchConfig({
            tabContents: "<i class='fa fa-home'></i> " + i18n.t("creator.queryAddress"),
            placeholder: i18n.t("creator.search_placeholder"),
            search: function(value) {
                $.ajax("/api/autocomplete/"+value, {
                    term: value
                })
                .done(function(data) {
                    dbkjs.modules.search.showResults(data, function(a) {
                        return Mustache.render("{{display_name}}", a);
                    }, true);
                });
            },
            resultSelected: function(result) {
                console.log("bag adddress search result selected " + result.lon + ", " + result.lat, result);
                dbkjs.map.setCenter([result.lon,result.lat], dbkjs.options.zoom);
            }
        },false);
    }
};