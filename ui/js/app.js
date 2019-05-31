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

            if ('hosts' in data && 'connections' in data)
            {
                draw_overview(data.hosts, data.connections);
            }

            stop_loading();
        },
        error: function (data) {
            stop_loading();
            console.log(data);
        }
    });
}


function start_loading()
{
    $('.loader').css('display', 'block');
    $('#upload_btn').attr('disabled', true);

    // remove any charts
    Plotly.purge('protocol_chart');
    clear_overview();
}


function stop_loading()
{
    $('.loader').css('display', 'none');
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


function clear_overview() {
    const myNode = document.getElementById('connections_graph');
    while (myNode.firstChild) {
        myNode.removeChild(myNode.firstChild);
    }
}

function draw_overview(hosts, connections) {
    // Remove any old overviews
    clear_overview();

    // Setup svg
    const width = document.getElementsByClassName(
        'ui bottom attached active tab segment')[0].offsetWidth;
    const height = Math.max(
        document.getElementsByClassName(
            'ui bottom attached active tab segment')[0].offsetHeight,
        500);
    const icon_url = 'https://banner2.kisspng.com/20180410/zew/' +
        'kisspng-computer-servers-reverse-proxy-bastion-host-proxy-server-' +
        '5accac7660e9f4.454703951523362934397.jpg';

    const svg = d3.select('.overview').append('svg')
        .attr('width', width)
        .attr('height', height);

    const force = d3.layout.force()
        .gravity(0.05)
        .distance(100)
        .charge(-100)
        .size([width, height]);

    let all_nodes = [];
    let all_links = [];
    let node_ids = {};

    // Add nodes for hosts
    hosts.forEach(function (host, index) {
        all_nodes.push({
            'name': host,
            'x': (width / hosts.length),
            'y': height / 2,
            'id': index
        });
        node_ids[host] = index;
    });

    // add links for connections
    for (let src of Object.keys(connections))
    {
        connections[src].forEach(function (dest) {
            all_links.push({
                'source': node_ids[src],
                'target': node_ids[dest],
                'value': 1
            });
        })
    }

    force.nodes(all_nodes)
        .links(all_links)
        .start();

    const link = svg.selectAll('.link')
        .data(all_links)
        .enter().append('line')
        .attr('class', 'link');

    const node = svg.selectAll('.node')
        .data(all_nodes)
        .enter().append('g')
        .attr('class', 'node')
        .call(force.drag);

    node.append('image')
        .attr('xlink:href', icon_url)
        .attr('x', -8)
        .attr('y', -8)
        .attr('width', 16)
        .attr('height', 16);

    node.append('text')
        .attr('dx', 12)
        .attr('dy', '.35em')
        .text(d => d.name );

    force.on('tick', function() {
        link.attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });
}


function resize_chart()
{
    const protocol_chart_div = document.getElementById('protocol_chart');
    if (protocol_chart_div.data)
    {
        Plotly.relayout(
            'protocol_chart',
            {
                'width': protocol_chart_div.offsetWidth,
                'height': protocol_chart_div.offsetHeight});
    }
}


$(document).ready(function () {
    // Active tabs
    $('.menu .item').tab({'onVisible': resize_chart});

    // event handler to resize bar chart on tab change

});
