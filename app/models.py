from app import db, secret
import os, binascii, hashlib

Model, Column, Integer, String, Text = db.Model, db.Column, db.Integer, db.String, db.Text

""" Length needs to be an even number
"""
def create_token(length):
    return binascii.b2a_hex(os.urandom(int(length / 2)))

class Nonce(Model):
    __tablename__ = "nonce"
    id = Column(Integer, primary_key=True)

    token = Column(String(6), unique=True)

    def __init__(self):
        self.token = create_token(6)

    def use(self):
        db.session.delete(self)
        db.session.commit()

    @staticmethod
    def with_token(tkn):
        return Nonce.query.filter_by(token=tkn).first()

class Data(Model):
    __tablename__ = "data"
    id = Column(Integer, primary_key=True)

    token = Column(String(6), unique=True)
    data = Column(Text)

    def __init__(self, token, data):
        super(Base, self).__init__()
        self.data = data
        self.token = token

class User(Model):
    __tablename__ = "user"
    id = Column(Integer, primary_key=True)

    username = Column(String(12), unique=True)
    
    salt = Column(String(6))
    password = Column(String(64))

    def __init__(self, username, password):
        super(Base, self).__init__()
        self.username = username
        self.salt = User.create_salt()
        self.password = self.hash_password(password)

    @staticmethod
    def create_salt():
        return binascii.b2a_hex(os.urandom(3))

    def hash_password(self, pswd):
        return hashlib.sha256(pswd + self.salt + secret).hexdigest()

    def matches_password(self, str):
        return self.password == self.hash_password(str)