#!env/bin/python
from app import app
from gevent.pywsgi import WSGIServer
from geventwebsocket.handler import WebSocketHandler

if __name__ == "__main__":
    app.debug = True
    http_server = WSGIServer(('127.0.0.1', 5000), app, handler_class=WebSocketHandler)
    http_server.serve_forever()
