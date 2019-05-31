#!/usr/bin/evn python
# -*- coding: utf-8 -*-
"""Flask server for use in pcap aggregation."""

# standard library imports
import argparse
import os

# third party imports
import flask
import pyshark
import werkzeug


# =============================================================================#
# setup flask app


app = flask.Flask(__name__)


# =============================================================================#
# flask routes


@app.route('/')
@app.route('/index.html')
def serve_root():
    return flask.send_from_directory('ui', 'index.html')


@app.route('/js/<path:path>')
def serve_js(path):
    return flask.send_from_directory(
        os.path.join('ui', 'js'),
        path)


@app.route('/css/<path:path>')
def serve_css(path):
    return flask.send_from_directory(
        os.path.join('ui', 'css'),
        path)


@app.route('/api/aggregate', methods=['POST'])
def serve_api():
    uploaded = flask.request.files['pcap']
    capture_name = werkzeug.secure_filename(uploaded.filename)
    uploaded.save(capture_name)
    result = analyse_pcap(capture_name)
    os.remove(capture_name)
    if result:
        return flask.jsonify(result)
    return flask.jsonify({'error': 'an unexpected error occurred'})


# =============================================================================#
# public functions


def analyse_pcap(filename):
    """
    @brief  Analyses a pcap file, producing a dict of aggregate data.

    @param  filename    The filename of the pcap.

    @return A dict of aggregated pcap data.
    """
    results = {
        'protocols': {},
        'hosts': set(),
        'connections': {}}
    try:
        capture = pyshark.FileCapture(filename)
        for packet in capture:
            protocol = packet.highest_layer
            if protocol in results['protocols']:
                results['protocols'][protocol] += 1
            else:
                results['protocols'][protocol] = 1

            # add connections and hosts
            if hasattr(packet, 'ip'):
                results['hosts'].add(packet.ip.src_host)
                results['hosts'].add(packet.ip.dst_host)
                if packet.ip.src_host not in results['connections']:
                     results['connections'][packet.ip.src_host] = set()
                results['connections'][packet.ip.src_host].add(
                    packet.ip.dst_host)

        capture.close()

        # cast connection and host sets to lists to allow json serialisation
        for key in results['connections'].keys():
            results['connections'][key] = list(results['connections'][key])
        results['hosts'] = list(results['hosts'])
    except Exception as e:
        capture.close()
        results =  {'error': 'unable to parse file as pcap'}
    finally:
        return results


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '-a',
        '--address',
        help='The address to listen on',
        type=str,
        default='127.0.0.1')
    parser.add_argument(
        '-p',
        '--port',
        help='The tcp port to listen on',
        type=int,
        default=5000)

    return parser.parse_args()


# =============================================================================#
# entrypoint


if __name__ == '__main__':
    args = parse_args()
    # use threaded=False to avoid issues with pyshark using asyncio outside of
    # main thread, can run single threaded but with multiple processes using
    # something like gunicorn
    app.run(host=args.address, port=args.port, threaded=False)
