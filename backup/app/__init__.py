from flask import Flask, url_for
from flask.ext.sqlalchemy import SQLAlchemy
from imp import load_source
import os

app = Flask(__name__)
env_var = load_source('qtube', '/home/loren/var/qtube.py')

db_uri = "postgresql://%s:%s@localhost/%s" % (env_var.DATABASE_OWNER,
    env_var.DATABASE_PASSWORD,
    env_var.DATABASE_NAME
)

app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
db = SQLAlchemy(app)
secret = env_var.SECRET
app.secret_key = env_var.SECRET_KEY

# Function to easily find your assets
# In your template use <link rel=stylesheet href="{{ static('filename') }}">
app.jinja_env.globals['static'] = (
    lambda filename: url_for('static', filename = filename)
)

from app import views
