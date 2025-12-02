# tests/test_models.py
import numpy as np
from src.models.architecture import build_cnn

def test_build_cnn_and_predict_shape():
    model = build_cnn(input_shape=(128,128,3), num_classes=2)
    # model doit exister
    assert model is not None
    # prédiction sur un batch dummy
    dummy = np.zeros((1,128,128,3), dtype=np.float32)
    preds = model.predict(dummy)
    assert preds.shape == (1,2)
