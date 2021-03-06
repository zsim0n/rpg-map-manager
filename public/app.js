$(document).ready(function() {
  window.scrollTo(0, 0);
  hashrouter = function(hash) {
    var h = hash.match('\#\/(.*)');
    var tab = 'pills-map-tab';
    if (h) {
      var tab = 'pills-' + h[1];
    }
    $('#pills-tab a[href="#'+tab+'"]').tab('show')
  }(window.location.hash)
  var md = window.markdownit().use(markdownItAttrs);
  var simplemde = new SimpleMDE({
    spellChecker: false,
    autofocus: true,
    forceSync: true,
    element: $("#markdown-edit")[0],
    previewRender: function(plainText) {
      return md.render(plainText);
    }
  });
  inlineAttachment.editors.codemirror4.attach(simplemde.codemirror, {
    uploadUrl: "/upload",
    urlText: '![image]({filename}){width=200px}'
  });
  var timeoutId;
  simplemde.codemirror.on("change", function() {
    $("div#markdown").html(md.render(simplemde.value()));
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(function () {
      $.post('/save',{md:simplemde.value()},function(data) {
        console.log(data);
      });
      $.post('/save',{md:simplemde.value()})
      .done(function(data) {
        console.log(data);
        $.notify({
          message: data
        },{
          type: 'success'
        });
      })
      .fail(function(data) {
        console.log(data)        
        $.notify({
          message: data
        },{
          type: 'danger'
        });
      });
    }, 750);
    
  });
  
  $('a[data-toggle="pill"]').on('shown.bs.tab', function(event) {
    var url = event.target.id.match(/pills\-(.*)\-tab/)
    history.pushState(null,null,'/#/'+url [1]);
    simplemde.codemirror.refresh();
    fetchData();
  });

  var mapMinZoom = 0;
  var mapMaxZoom = 6;
  var map = L.map('map', {
    maxZoom: mapMaxZoom,
    minZoom: mapMinZoom,
    crs: L.CRS.Simple
  }).setView([0, 0], mapMaxZoom);

  var mapBounds = new L.LatLngBounds(
    map.unproject([0, 7424], mapMaxZoom),
    map.unproject([10240, 0], mapMaxZoom)
  );
  var places = {}
  map.fitBounds(mapBounds);
  var tilelayer = L.tileLayer('/maptiles/{z}/{x}/{y}.png', {
    minZoom: mapMinZoom,
    maxZoom: mapMaxZoom,
    bounds: mapBounds,
    attribution: 'Rendered with <a href="https://www.maptiler.com/">MapTiler</a>',
    noWrap: true,
    tms: false
  }).addTo(map);


  fetchData();
  fetchHelp();
  function fetchHelp() {
    $.get("readme.md", function(data) {
      $("div#help").html(md.render(data));
    });
  }
  function fetchData() {
    for(var l in places) {
      l.clearLayers();
    }
    $.get("places.md", function(data) {
      var icons = {
        inn : {icon: 'wineglass', color: 'green'},
        home : {icon: 'home', color: 'red'},
        bank : {icon: 'cash', color: 'darkgreen'},
        story : {icon: 'bookmark', color: 'orange'},
        sanctuary : {icon: 'ionic', color: 'purple'},
        lock: {icon: 'locked', color: 'blue'}
      }
      simplemde.value(data);
      $("div#markdown").html(md.render(data));
      simplemde.codemirror.refresh();
      $("div#markdown h2[lat]").each(function(i,el) {
        var opts = {}
        var layer = 'places';
        if ($(el)[0].hasAttribute("icon") && $(el).attr('icon') in icons) {
          layer = $(el).attr('icon')
          var icon = L.AwesomeMarkers.icon({
            icon: icons[$(el).attr('icon')].icon,
            markerColor: icons[$(el).attr('icon')].color,
            prefix: 'icon ion'
          });
          opts = {
            icon: icon
          }
        }
        var marker = L.marker([$(el).attr('lat'), $(el).attr('lng')], opts);
        var p = $(el).nextUntil("h2").addBack();
        var h = '';
        p.each(function(){
          h = h + this.outerHTML;
        })
        marker.bindPopup(h);
        if (!(layer in places)) {
          places[layer] = L.layerGroup([]).addTo(map);
        }
        places[layer].addLayer(marker)

      }) 
      var OverlayMaps = {}
      for(var l in places) {
        OverlayMaps[l] = places[l];
      }
      L.control.layers({},OverlayMaps).addTo(map);
    
    });
  }

var myIcon = L.divIcon({
  className: '',
  html: '<i class="icon ion-navigate" style="color:#666; font-size:200%"></i>',
  iconAnchor: [20,10]
});
  var marker = L.marker([0, 0], {
    icon: myIcon,
    draggable: true
  }).addTo(map);
  marker.on("dragend", function(ev) {
    var chagedPos = ev.target.getLatLng();
    var s = 'lat=' + (chagedPos.lat).toFixed(3) + ' lng=' + (chagedPos.lng).toFixed(3);
    this.bindPopup(s).openPopup();
  });
});

