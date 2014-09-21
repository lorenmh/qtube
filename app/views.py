from flask import render_template, session, request
from models import Data, data_token
from app import app, db
import os, binascii
import json

rsock = {}
vsock = {}

@app.route('/')
def appView(path=None):
    return render_template('app.html')

@app.route('/api/q/', methods=['POST'])
def queue_post():
    token = data_token()

    # To ensure that each token is unique; if there a Data which has this token,
    # then regen the token
    while Data.with_token(token):
        token = data_token()

    add_to_db(Data(token=token, value=request.get_data()))
    return token, 200

# set up later for a subdomain (ie, api.qtube.com).  Will require a second flask instance
@app.route('/api/q/<token>/', methods=['GET'])
def queue_item(token):
    print 'get /api/q/<token>'
    data = Data.with_token(token)
    if data:
        return data.value, 200
    return '', 404

def add_to_db(mdl):
    db.session.add(mdl)
    db.session.commit()

def broadcast(msg):
    for ws in websockets:
        ws.send(msg)

def decode_vmsg(ws, msg):
    try:
        msg = json.loads(msg)
        if 'register' in msg:
            vsock[msg['register']] = ws
            vsock[ws] = msg['register']
            ws.send('registered')
        if 'emit' in msg:
            rsock[vsock[ws]].send(json.dumps({"emit":msg['emit']}))
            ws.send('emitted')
    except:
        ws.send('decode error')

def decode_rmsg(ws, msg):
    #try:
    msg = json.loads(msg)
    if 'register' in msg:
        rsock[msg['register']] = ws
        rsock[ws] = msg['register']
        ws.send('registered')
    if 'emit' in msg:
        vsock[rsock[ws]].send(json.dumps({"emit":msg['emit']}))
        ws.send('emitted')
    #except:
    #    ws.send('decode error')


@app.route('/rsock')
def remote_socket():
    if request.environ.get('wsgi.websocket'):
        ws = request.environ['wsgi.websocket']
        while True:
            decode_rmsg(ws, ws.receive())
    return

@app.route('/vsock')
def video_socket():
    if request.environ.get('wsgi.websocket'):
        ws = request.environ['wsgi.websocket']
        while True:
            decode_vmsg(ws, ws.receive())
    return


""" Use the Flask static routes while in debug / development, switch over to
    using the Front-end web-server (nginx / apache) when in production
"""
@app.route('/js/<path:path>')
def static_js(path):
    return app.send_static_file(os.path.join('js', path))

@app.route('/css/<path:path>')
def static_css(path):
    return app.send_static_file(os.path.join('css', path))

@app.route('/img/<path:path>')
def static_img(path):
    return app.send_static_file(os.path.join('img', path))