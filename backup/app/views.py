from flask import render_template, session
from models import Nonce
from app import app, db
import os

@app.route('/')
def index():
    if 'token' in session:
        token = session['token']
    else:
        nonce = Nonce()
        add_to_db(nonce)
        token = nonce.token
        session['token'] = token
    return render_template('index.html', token=token)

def add_to_db(mdl):
    db.session.add(mdl)
    db.session.commit()


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