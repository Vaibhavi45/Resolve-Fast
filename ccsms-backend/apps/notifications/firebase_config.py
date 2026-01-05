from utils import firebase_config as utils_firebase_config

def __getattr__(name):
    if name == 'db':
        return utils_firebase_config.db
    if name == 'messaging':
        return utils_firebase_config.messaging
    if name == 'initialize_firebase':
        return utils_firebase_config.initialize_firebase
    raise AttributeError(f"module {__name__} has no attribute {name}")
