#!env/bin/python
from app import app
#from gevent.pywsgi import WSGIServer
#from geventwebsocket.handler import WebSocketHandler

if __name__ == "__main__":
    app.debug = True
    app.run()#port=3400)
    '''http_server = WSGIServer(('127.0.0.1', 3400), app, 
                              handler_class=WebSocketHandler)
    http_server.serve_forever()'''
