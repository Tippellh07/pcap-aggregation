function upload_pcap()
{
    const form_data = new FormData();
    form_data.append('pcap', $('input[type=file]')[0].files[0]);

    start_loading();

    // send post request
    $.ajax({
        url: '/api/aggregate',
        data: form_data,
        type: 'POST',
        contentType: false,
        processData: false,
        success: function (data) {
            if ('protocols' in data)
            {
                make_bar_chart('protocol_chart', data.protocols);
            }
            stop_loading();
        },
        error: function (data) {
            console.log(data);
        }
    });
}


function start_loading()
{
    $('#loader').css('display', 'block');
    $('#upload_btn').attr('disabled', true);
}


function stop_loading()
{
    $('#loader').css('display', 'none');
    $('#upload_btn').attr('disabled', false);
}


function make_bar_chart(div, data)
{
    Plotly.newPlot(
        div,
        [{
            'x': Object.keys(data),
            'y': Object.values(data),
            'type': 'bar'
        }]);
}
