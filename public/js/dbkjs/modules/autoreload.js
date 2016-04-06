/*
 *  Copyright (c) 2016 B3Partners (info@b3partners.nl)
 *
 *  This file is part of safetymapDBK
 *
 *  safetymapDBK is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  safetymapDBK is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with safetymapDBK. If not, see <http://www.gnu.org/licenses/>.
 *
 */

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};
dbkjs.modules.autoreload = {
    id: "dbk.module.autoreload",
    options: null,
    timeout: null,
    register: function() {
        this.options = $.extend({
            checkInterval: 60
        }, this.options);

        this.setTimer();
    },
    setTimer: function() {
        var me = this;
        me.timeout = window.setTimeout(function() {
            me.checkReload();
        }, me.options.checkInterval * 1000);
    },
    checkReload: function() {
        var me = this;
        $.ajax({
            dataType: "json",
            url: dbkjs.dataPath + 'organisation.json',
            data: {srid: dbkjs.options.projection.srid},
            cache: false
        })
        .always(function(data, textStatus, jqXHR) {
            if(textStatus === "success") {
              var newSequence = null;
              $.each(data.organisation.modules, function(i, m) {
                  if(m.name === "autoreload") {
                      newSequence = m.options.sequence;
                      return false;
                  };
              });
              if(newSequence === null) {
                  console.log("autoreload: no new sequence in organisation autoreload module options", data);
              } else if(newSequence !== me.options.sequence) {
                  console.log("autoreload: new sequence different, reloading!", newSequence);
                  window.location.reload(true); // forceReload=true
              } else {
                  console.log("autoreload: same sequence, no reload");
              }
            } else {
                console.log("error getting organisation.json autoreload info: " + textStatus, jqXHR);
            }
            me.setTimer();
        });
    }
};

