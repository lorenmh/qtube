from flask import Flask, url_for
from flask.ext.sqlalchemy import SQLAlchemy
import os, sys

sys.path.append('../vars')
import qtube

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = qtube.vars['DB_URI']
db = SQLAlchemy(app)

# development secret and key ;)
secret = qtube.vars["secret"] 
app.secret_key = qtube.vars["secret_key"]

# Function to easily find your assets
# In your template use <link rel=stylesheet href="{{ static('filename') }}">
app.jinja_env.globals['static'] = (
    lambda filename: url_for('static', filename = filename)
)

from app import views
