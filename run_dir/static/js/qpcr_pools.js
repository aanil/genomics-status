/*
File: qpcr_pools.js
URL: /static/js/qpcr_pools.js
Powers /qpcr_pools - template is run_dir/design/qpcr_pools.html
*/

$(document).ready(function() {
    // Load the data
    load_table();
});
// Initialize sorting and searching javascript plugin

function load_table() {
  var colspan = $('#pools_table > thead > tr:first > th').length + 1; // adding the first column
  $("#pools_table_body").html('<tr><td colspan="'+colspan+'" class="text-muted"><span class="glyphicon glyphicon-refresh glyphicon-spin"></span> <em>Loading..</em></td></tr>');
  return $.getJSON('/api/v1/qpcr_pools', function(data) {
    $("#pools_table_body").empty();
    $.each(data, function(flow, containers) {
      if(!($.isEmptyObject(containers))){
        $.each(containers, function(container, pools){
          var avg_wait_calc = 0;
          var tbl_row = $('<tr>');
          tbl_row.append($('<td>').html(flow));
          tbl_row.append($('<td class="expand-proj">').html(function() {
              var to_return = '<span class="glyphicon glyphicon-plus-sign" aria-hidden="true"></span>';
              to_return = to_return + container + ' <span class="badge">'+pools['samples'].length+'</span>';
              to_return = to_return + '<BR><span> \
              <table cellpadding="5" border="0" style="visibility:collapse;margin-bottom:0px;margin-top:5px;" align="right">';
              to_return = to_return + '<thead><tr><th style="width:45%">Sample</th><th style="width:20%">Well</th><th>Waiting (in days)</th></tr></thead>';
              $.each(pools['samples'], function(pool, sample){
                var wait = Math.floor(Math.abs(new Date() - new Date(sample['queue_time']))/(1000*86400));
                to_return = to_return +
                '<tr>'+
                  '<td>'+sample['name']+'</td>'+
                  '<td>'+sample['well']+'</td>'+
                  '<td>'+wait+'</td>'+
                '</tr>';
                avg_wait_calc = avg_wait_calc + wait;
                });
                to_return = to_return +'</table></span>';
              return to_return;
          }));
          tbl_row.append($('<td>').html(function(){
            var to_return = '';
            $.each( pools['library_types'], function(i, library_type){
              to_return = to_return + '<div class="mult-pools-margin">'+ library_type +'</div>'
            });
            return to_return;
          }));
          tbl_row.append($('<td>').html(function(){
            var to_return = '';
            $.each( pools['runmodes'], function(i, runmode){
              to_return = to_return + '<div class="mult-pools-margin">'+ runmode +'</div>'
            });
            return to_return;
          }));
          var lblinf='';
          switch(Math.floor((avg_wait_calc/pools['samples'].length)/7)){
            case 0: lblinf = 'success'; break;
            case 1: lblinf = 'warning'; break;
            default: lblinf = 'danger';
          }
          tbl_row.append($('<td>').html('<span class="label label-'+lblinf+'">'+(avg_wait_calc/pools['samples'].length).toFixed(1)+'</span>'));
          $("#pools_table_body").append(tbl_row);
        })
      }
    })
    init_listjs();
  })
}

function init_listjs() {
    // Setup - add a text input to each footer cell
    $('#pools_table tfoot th').each( function () {
      var title = $('#pools_table thead th').eq( $(this).index() ).text();
      $(this).html( '<input size=10 type="text" placeholder="Search '+title+'" />' );
    } );

    var table = $('#pools_table').DataTable({
      "columnDefs": [
          { "visible": false, "targets": 0 }
      ],
      "paging":false,
      "info":false,
      "order": [],
      "drawCallback": function ( settings ) {
        var api = this.api();
        var rows = api.rows( {page:'current'} ).nodes();
        var last=null;
        api.column(0, {page:'current'} ).data().each( function ( group, i ) {
          if ( last !== group ) {
            $(rows).eq( i ).before(
                '<tr class="group"><td colspan="'+$('#pools_table > thead > tr:first > th').length + 1+'">'+group+'</td></tr>'
            );
            last = group;
          }
        });
      }
    });

    //Add the bootstrap classes to the search thingy
    $('div.dataTables_filter input').addClass('form-control search search-query');
    $('#pools_table_filter').addClass('form-inline pull-right');
    $("#pools_table_filter").appendTo("h1");
    $('#pools_table_filter label input').appendTo($('#pools_table_filter'));
    $('#pools_table_filter label').remove();
    $("#pools_table_filter input").attr("placeholder", "Search..");
    // Apply the search
    table.columns().every( function () {
        var that = this;
        $( 'input', this.footer() ).on( 'keyup change', function () {
            that
            .search( this.value )
            .draw();
        } );
    } );
    $('.expand-proj').on('click', function () {
      if($(this).parent().find('table').css('visibility')=='collapse'){
        $(this).find('.glyphicon').toggleClass('glyphicon-plus-sign glyphicon-minus-sign');
        $(this).parent().find('table').css('visibility', 'visible');
      }
      else {
        $(this).find('.glyphicon').toggleClass('glyphicon-minus-sign glyphicon-plus-sign');
        $(this).parent().find('table').css('visibility', 'collapse');
      }
    });
    $('.expand-all').on('click', function () {
      var reqText = {'Expand All': ['Collapse All', 'visible', 'glyphicon-plus-sign', 'glyphicon-minus-sign'],
                      'Collapse All': ['Expand All', 'collapse', 'glyphicon-minus-sign', 'glyphicon-plus-sign']};
      $('.expand-all').find('.glyphicon').removeClass(reqText[$('.expand-all').text()][2]);
      $('#pools_table').find('tr').find('.glyphicon').removeClass(reqText[$('.expand-all').text()][2]);
      $('.expand-all').find('.glyphicon').addClass(reqText[$('.expand-all').text()][3]);
      $('#pools_table').find('tr').find('.glyphicon').addClass(reqText[$('.expand-all').text()][3]);
      $('#pools_table').find('tr').find('table').css('visibility', reqText[$('.expand-all').text()][1]);
      $('.expand-all').contents().filter(function(){ return this.nodeType == 3; }).first().replaceWith(reqText[$('.expand-all').text()][0]);
    });
}

$('body').on('click', '.group', function(event) {
  $($("#samples_table").DataTable().column(0).header()).trigger("click")
});
