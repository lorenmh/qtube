from flask import Flask, url_for
from flask.ext.sqlalchemy import SQLAlchemy
import os, sys

sys.path.append('../env')
import qtube

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = qtube.vars['DB_URI']
db = SQLAlchemy(app)

# development secret and key ;)
secret = "9dff58619fbd317cb245ff2639b60aeacfb6d9fa"
app.secret_key = "3fe340e4f46f82218eb6918fb9cfec30d3235f26"

# Function to easily find your assets
# In your template use <link rel=stylesheet href="{{ static('filename') }}">
app.jinja_env.globals['static'] = (
    lambda filename: url_for('static', filename = filename)
)

from app import views
