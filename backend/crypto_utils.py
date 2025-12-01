import os
from cryptography.fernet import Fernet

KEY_FILENAME = os.path.join(os.path.dirname(__file__), "llm_secret.key")

def _get_or_create_key() -> bytes:
    # Prefer environment variable for production; fallback to a file in backend/ for local dev
    env_key = os.environ.get("LLM_SECRET_KEY")
    if env_key:
        # ensure it's bytes
        k = env_key.encode() if isinstance(env_key, str) else env_key
        return k

    # fallback: check for file
    if os.path.exists(KEY_FILENAME):
        with open(KEY_FILENAME, "rb") as f:
            return f.read()

    # generate a new key and save it locally
    key = Fernet.generate_key()
    try:
        with open(KEY_FILENAME, "wb") as f:
            f.write(key)
    except Exception:
        # if write fails, silently continue; still return key
        pass
    return key

def get_fernet() -> Fernet:
    key = _get_or_create_key()
    return Fernet(key)

def encrypt_key(plaintext: str) -> bytes:
    f = get_fernet()
    return f.encrypt(plaintext.encode())

def decrypt_key(ciphertext: bytes) -> str:
    f = get_fernet()
    return f.decrypt(ciphertext).decode()

def load_provider_key(enc_filename: str = None) -> str | None:
    """Load and decrypt the stored provider key from disk if present.

    Returns the plaintext provider key or None if not found/failed.
    """
    if enc_filename is None:
        enc_filename = os.path.join(os.path.dirname(__file__), "llm_provider.enc")
    if not os.path.exists(enc_filename):
        return None
    try:
        with open(enc_filename, "rb") as f:
            data = f.read()
        return decrypt_key(data)
    except Exception:
        return None
