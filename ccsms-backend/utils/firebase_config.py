import os
import logging

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK if not already initialized"""
    import firebase_admin
    from firebase_admin import credentials
    
    if not firebase_admin._apps:
        try:
            from django.conf import settings
            import threading
            def _do_init():
                try:
                    cred_path = getattr(settings, 'FIREBASE_CREDENTIALS_PATH', None)
                    if cred_path and os.path.exists(cred_path):
                        logger.info(f"Initializing Firebase with credentials: {cred_path}")
                        cred = credentials.Certificate(cred_path)
                        firebase_admin.initialize_app(cred)
                    else:
                        logger.info("Initializing Firebase with default credentials")
                        firebase_admin.initialize_app()
                    logger.info("Firebase initialized successfully")
                except Exception as e:
                    logger.error(f"Failed inside Firebase init thread: {e}")

            init_thread = threading.Thread(target=_do_init)
            init_thread.daemon = True
            init_thread.start()
            init_thread.join(timeout=3.0) # Wait up to 3s
            
            if init_thread.is_alive():
                logger.warning("Firebase Admin initialization is taking too long (backgrounding)...")
            return True
        except Exception as e:
            logger.error(f"Failed to start Firebase initialization: {e}")
            return False
    return True

# Global variable for lazy loading
_db = None

def get_db():
    """Get or initialize Firestore client lazily with timeout protection"""
    global _db
    if _db is None:
        if initialize_firebase():
            try:
                from firebase_admin import firestore
                logger.info("Initializing Firestore client...")
                import threading
                
                result = {'db': None, 'error': None}
                
                def init_firestore():
                    try:
                        result['db'] = firestore.client()
                    except Exception as e:
                        result['error'] = e
                
                thread = threading.Thread(target=init_firestore)
                thread.daemon = True
                thread.start()
                thread.join(timeout=3.0)  # 3-second timeout
                
                if thread.is_alive():
                    logger.warning("Firestore initialization timed out - continuing without Firestore")
                    return None
                elif result['error']:
                    logger.warning(f"Failed to initialize Firestore: {result['error']} - continuing without Firestore")
                    return None
                else:
                    _db = result['db']
                    logger.info("Firestore client initialized successfully.")
                    
            except Exception as e:
                logger.warning(f"Failed to initialize Firestore: {e} - continuing without Firestore")
                return None
    return _db

# Module-level __getattr__ for lazy access
def __getattr__(name):
    if name == 'db':
        return get_db()
    if name == 'messaging':
        if initialize_firebase():
            from firebase_admin import messaging
            return messaging
        return None
    raise AttributeError(f"module {__name__} has no attribute {name}")
